// src/services/salesHistoryService.js
import { db } from '../db/index.js'
import { transactionRepo } from '../db/repositories/transactionRepository.js'
import { memberRepo } from '../db/repositories/memberRepository.js'
import { productRepo } from '../db/repositories/productRepository.js'
import { financeRepo } from '../db/repositories/financeRepository.js'
import { productsDigitalService } from './productsDigitalService.js'
import dayjs from 'dayjs'

export const salesHistoryService = {
  async getCombinedHistory() {
    const [transactions, members, products, allItems, digitalTransactions] = await Promise.all([
      transactionRepo.getAll(),
      memberRepo.getAll(),
      productRepo.getAll(),
      transactionRepo.getAllItems(), // ✅ sudah dinormalisasi di repo
      productsDigitalService.getAll()
    ])

    const memberMap = new Map(members.map(m => [m.id, m.name]))
    const productMap = new Map(products.map(p => [p.id, p.name]))

    const totalPiutang = members.reduce((sum, m) => sum + (Number(m.debt) || 0), 0)

    // ✅ FIX: Index item per transactionId (O(n) bukan O(n²)),
    // supaya filter tetap jalan meskipun field masih campur camelCase/snake_case.
    const itemsByTrxId = new Map()
    for (const item of allItems) {
      const trxId = item.transactionId || item.transaction_id
      if (!trxId) continue
      if (!itemsByTrxId.has(trxId)) itemsByTrxId.set(trxId, [])
      itemsByTrxId.get(trxId).push(item)
    }

    const formattedBarang = transactions.map(t => {
      // ✅ FIX: pakai index map, tidak lagi filter linear per transaksi
      const rawItems = itemsByTrxId.get(t.id) || []

      const items = rawItems.map(item => {
        const name =
          item.productName ||
          item.product_name ||
          item.name ||
          productMap.get(item.productId || item.product_id) ||
          'Produk Dihapus'

        return {
          ...item,
          // ✅ FIX: pastikan semua alias nama & harga selalu terisi
          productName: name,
          product_name: name,
          name,
          price: Number(item.price ?? item.price_sell ?? item.priceSell ?? 0),
          price_sell: Number(item.price_sell ?? item.price ?? item.priceSell ?? 0),
          qty: Number(item.qty ?? item.quantity ?? 1),
          subtotal: Number(
            item.subtotal ??
            ((Number(item.price ?? item.price_sell ?? 0)) * (Number(item.qty ?? 1)))
          )
        }
      })

      return {
        ...t,
        trxType: 'BARANG',
        trx_type: 'BARANG', // ✅ FIX: set alias snake_case biar komponen lain aman
        memberName: t.memberId
          ? (memberMap.get(t.memberId) || 'Member Tidak Ditemukan')
          : 'Umum / Non-Member',
        items
      }
    })

    const formattedDigital = digitalTransactions.map(d => {
      const isTopup = d.type === 'topup'
      const isCashAdmin = d.adminPaymentMethod === 'cash'

      let kasImpact = 0
      if (isTopup) {
        kasImpact = d.nominal + (isCashAdmin ? d.adminFee : 0)
      } else {
        kasImpact = -(d.nominal - (isCashAdmin ? d.adminFee : 0))
      }

      return {
        id: d.id,
        date: d.date,
        trxType: 'DIGITAL',
        trx_type: 'DIGITAL', // ✅ FIX: alias
        digitalType: d.type,
        provider: d.provider,
        nominal: d.nominal,
        adminFee: d.adminFee,
        adminPaymentMethod: d.adminPaymentMethod,
        total: kasImpact,
        profit: d.profit || d.adminFee,
        status: d.status || 'SUCCESS',
        paymentMethod: isCashAdmin ? 'CASH' : 'DIGITAL_SALDO',
        memberName: `Digital: ${d.provider}`,
        items: [
          {
            id: d.id,
            productName: `${isTopup ? 'TOP UP' : 'TARIK TUNAI'} ${d.provider}`,
            product_name: `${isTopup ? 'TOP UP' : 'TARIK TUNAI'} ${d.provider}`,
            name: `${isTopup ? 'TOP UP' : 'TARIK TUNAI'} ${d.provider}`,
            qty: 1,
            price: d.nominal,
            price_sell: d.nominal,
            subtotal: d.nominal
          }
        ]
      }
    })

    const transactionsList = [...formattedBarang, ...formattedDigital].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    )

    return {
      transactions: transactionsList,
      totalPiutang
    }
  },

  // FUNGSI EDIT TRANSAKSI BARANG (ATOMIC TRANSACTION)
  async updateTransaction(originalTrx, updatedItems, newPaymentData = {}) {
    const now = dayjs().toISOString()

    return await db.transaction(
      'rw',
      [db.transactions, db.transaction_items, db.products, db.members, db.cash_accounts, db.cash_mutations],
      async () => {
        const oldItems = await transactionRepo.getItemsByTransactionId(originalTrx.id)
        const existingTrxHeader =
          (await transactionRepo.getById(originalTrx.id)) ||
          (await db.transactions.get(originalTrx.id)) ||
          originalTrx

        const newPaymentMethod = newPaymentData.paymentMethod || existingTrxHeader.paymentMethod || 'CASH'
        const newMemberId =
          newPaymentData.memberId !== undefined
            ? newPaymentData.memberId
            : (existingTrxHeader.memberId || null)

        // 1. Peta kuantitas lama vs baru untuk penyesuaian stok
        const oldQtyMap = new Map()
        oldItems.forEach(i => {
          if (i.productId) oldQtyMap.set(i.productId, (oldQtyMap.get(i.productId) || 0) + (i.qty || 0))
        })

        const newQtyMap = new Map()
        let newTotal = 0

        updatedItems.forEach(i => {
          const subtotal = (Number(i.price) || 0) * (Number(i.qty) || 0)
          newTotal += subtotal
          if (i.productId) {
            newQtyMap.set(i.productId, (newQtyMap.get(i.productId) || 0) + (Number(i.qty) || 0))
          }
        })

        // 2. Adjust stok produk berdasarkan selisih (Delta)
        const allProductIds = new Set([...oldQtyMap.keys(), ...newQtyMap.keys()])
        for (const prodId of allProductIds) {
          const oldQty = oldQtyMap.get(prodId) || 0
          const newQty = newQtyMap.get(prodId) || 0
          const delta = oldQty - newQty

          if (delta !== 0) {
            const prod = await productRepo.getById(prodId)
            if (prod) {
              await productRepo.update(prodId, {
                qty: (prod.qty || 0) + delta,
                updatedAt: now,
                synced: 0
              })
            }
          }
        }

        // 3. Re-write item transaksi
        const existingItemIds = oldItems.map(i => i.id)
        if (existingItemIds.length > 0) {
          await db.transaction_items.bulkDelete(existingItemIds)
        }

        // ✅ FIX: set field ganda + deleted:false biar konsisten & lolos filter
        const itemsToInsert = updatedItems.map(i => {
          const name = i.productName || i.name || 'Barang'
          const price = Number(i.price) || 0
          const qty = Number(i.qty) || 1
          return {
            id: crypto.randomUUID(),
            transactionId: originalTrx.id,
            transaction_id: originalTrx.id,
            productId: i.productId || null,
            product_id: i.productId || null,
            serviceId: i.serviceId || null,
            name,
            productName: name,
            product_name: name,
            qty,
            price,
            price_sell: price,
            subtotal: price * qty,
            deleted: false,
            updatedAt: now,
            updated_at: now,
            synced: 0
          }
        })
        await db.transaction_items.bulkPut(itemsToInsert)

        // 4. Rekonsiliasi Mutasi Keuangan
        const oldAccId =
          existingTrxHeader.paymentMethod === 'QRIS'
            ? 'acc_bank'
            : existingTrxHeader.paymentMethod === 'CASH'
              ? 'acc_cash'
              : null
        const newAccId =
          newPaymentMethod === 'QRIS' ? 'acc_bank' : newPaymentMethod === 'CASH' ? 'acc_cash' : null

        if (oldAccId && (existingTrxHeader.total || 0) > 0) {
          await financeRepo.addMutation({
            accountId: oldAccId,
            type: 'OUT',
            amount: existingTrxHeader.total,
            category: 'Koreksi Transaksi',
            note: `Koreksi Edit Nota #${originalTrx.id.slice(0, 8)}`,
            refId: originalTrx.id
          })
        }

        if (newAccId && newTotal > 0) {
          await financeRepo.addMutation({
            accountId: newAccId,
            type: 'IN',
            amount: newTotal,
            category: 'Penjualan Kasir',
            note: `Update Nota #${originalTrx.id.slice(0, 8)}`,
            refId: originalTrx.id
          })
        }

        // 5. Rekonsiliasi Member (Spending & Piutang)
        if (existingTrxHeader.memberId) {
          const oldMember = await memberRepo.getById(existingTrxHeader.memberId)
          if (oldMember) {
            const debtRollback =
              existingTrxHeader.paymentMethod === 'TEMPO' ? (existingTrxHeader.total || 0) : 0
            await memberRepo.update(existingTrxHeader.memberId, {
              debt: Math.max(0, (oldMember.debt || 0) - debtRollback),
              total_spending: Math.max(0, (oldMember.total_spending || 0) - (existingTrxHeader.total || 0)),
              updatedAt: now,
              synced: 0
            })
          }
        }

        if (newMemberId) {
          const newMember = await memberRepo.getById(newMemberId)
          if (newMember) {
            const addedDebt = newPaymentMethod === 'TEMPO' ? newTotal : 0
            await memberRepo.update(newMemberId, {
              debt: (newMember.debt || 0) + addedDebt,
              total_spending: (newMember.total_spending || 0) + newTotal,
              updatedAt: now,
              synced: 0
            })
          }
        }

        // 6. Update header transaksi
        const newAmountPaid =
          newPaymentMethod === 'TEMPO'
            ? 0
            : (newPaymentData.amountPaid !== undefined ? newPaymentData.amountPaid : newTotal)
        const newRemaining = newPaymentMethod === 'TEMPO' ? newTotal : 0

        await db.transactions.update(originalTrx.id, {
          total: newTotal,
          paymentMethod: newPaymentMethod,
          memberId: newMemberId,
          amountPaid: newAmountPaid,
          paidAmount: newAmountPaid,
          remaining: newRemaining,
          updatedAt: now,
          synced: 0
        })

        return { id: originalTrx.id, total: newTotal }
      }
    )
  },

  // FUNGSI PEMBATALAN TRANSAKSI / VOID (ATOMIC TRANSACTION)
  async voidTransaction(transaction) {
    const now = dayjs().toISOString()

    // ✅ FIX: handle trxType || trx_type (jaga-jaga data dari cloud)
    const trxType = transaction.trxType || transaction.trx_type

    if (trxType === 'BARANG') {
      if (transaction.status === 'void') throw new Error('Transaksi ini sudah dibatalkan.')

      await db.transaction(
        'rw',
        [db.transactions, db.transaction_items, db.products, db.members, db.cash_accounts, db.cash_mutations],
        async () => {
          const items = await transactionRepo.getItemsByTransactionId(transaction.id)

          let totalProfitRetur = 0

          // 1. Kembalikan Stok Barang secara presisi
          for (const item of items) {
            if (item.productId) {
              const product = await productRepo.getById(item.productId)
              if (product) {
                const modal = product.price_modal || 0
                const profitItem = (item.price - modal) * (item.qty || 1)
                totalProfitRetur += Math.max(0, profitItem)

                await productRepo.update(item.productId, {
                  qty: (product.qty || 0) + (item.qty || 0),
                  updatedAt: now,
                  synced: 0
                })
              }
            }
          }

          // 2. ✅ FIX: Hapus mutasi kas/bank asli berdasarkan refId, jangan buat mutasi OUT baru.
          const mutationsTable = db.cash_mutations || db.table('cash_mutations')
          const accountsTable = db.cash_accounts || db.table('cash_accounts')
          const relatedMutations = await mutationsTable.where('refId').equals(transaction.id).toArray()

          for (const mut of relatedMutations) {
            const acc = await accountsTable.get(mut.accountId)
            if (acc) {
              // Reverse mutasi: kalau aslinya IN, kurangi saldo. Kalau OUT, tambah saldo.
              const reverseDelta = mut.type === 'IN' ? -mut.amount : mut.amount
              await accountsTable.update(mut.accountId, {
                balance: (acc.balance || 0) + reverseDelta,
                updatedAt: now,
                synced: 0
              })
            }
            await mutationsTable.delete(mut.id)
          }

          // 3. Koreksi Data Member
          if (transaction.memberId) {
            const member = await memberRepo.getById(transaction.memberId)
            if (member) {
              const pointsToDeduct = Math.floor(totalProfitRetur * 0.01)
              const newPoints = Math.max(0, (member.points || 0) - pointsToDeduct)
              const newSpending = Math.max(0, (member.total_spending || 0) - transaction.total)
              const newDebt =
                transaction.paymentMethod === 'TEMPO'
                  ? Math.max(0, (member.debt || 0) - (transaction.remaining || transaction.total))
                  : (member.debt || 0)

              await memberRepo.update(transaction.memberId, {
                points: newPoints,
                total_spending: newSpending,
                debt: newDebt,
                updatedAt: now,
                synced: 0
              })
            }
          }

          // 4. Update status transaksi menjadi VOID
          await db.transactions.update(transaction.id, {
            status: 'void',
            updatedAt: now,
            synced: 0
          })
        }
      )
    } else if (trxType === 'DIGITAL') {
      if (transaction.status === 'CANCELLED') throw new Error('Transaksi digital sudah dibatalkan.')

      await db.transaction(
        'rw',
        [db.digital_transactions, db.cash_accounts, db.cash_mutations],
        async () => {
          // ✅ FIX: Hapus mutasi kas/bank asli berdasarkan refId untuk transaksi digital.
          const mutationsTable = db.cash_mutations || db.table('cash_mutations')
          const accountsTable = db.cash_accounts || db.table('cash_accounts')
          const relatedMutations = await mutationsTable.where('refId').equals(transaction.id).toArray()

          for (const mut of relatedMutations) {
            const acc = await accountsTable.get(mut.accountId)
            if (acc) {
              const reverseDelta = mut.type === 'IN' ? -mut.amount : mut.amount
              await accountsTable.update(mut.accountId, {
                balance: (acc.balance || 0) + reverseDelta,
                updatedAt: now,
                synced: 0
              })
            }
            await mutationsTable.delete(mut.id)
          }

          await db.digital_transactions.update(transaction.id, {
            status: 'CANCELLED',
            profit: 0,
            updatedAt: now,
            synced: 0
          })
        }
      )
    }
  }
}