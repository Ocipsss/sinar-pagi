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
      transactionRepo.getAllItems(),
      productsDigitalService.getAll()
    ])

    const memberMap = new Map(members.map(m => [m.id, m.name]))
    const productMap = new Map(products.map(p => [p.id, p.name]))

    // 1. Format transaksi barang
    const formattedBarang = transactions.map(t => {
      const items = allItems
        .filter(item => item.transactionId === t.id)
        .map(item => ({
          ...item,
          productName: item.name || productMap.get(item.productId) || 'Produk Dihapus'
        }))

      return {
        ...t,
        trxType: 'BARANG',
        memberName: t.memberId ? (memberMap.get(t.memberId) || 'Member Tidak Ditemukan') : 'Umum / Non-Member',
        items
      }
    })

    // 2. Format transaksi digital
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
            qty: 1,
            price: d.nominal,
            subtotal: d.nominal
          }
        ]
      }
    })

    return [...formattedBarang, ...formattedDigital].sort((a, b) => new Date(b.date) - new Date(a.date))
  },

  async voidTransaction(transaction) {
    const now = dayjs().toISOString()

    if (transaction.trxType === 'BARANG') {
      if (transaction.status === 'void') throw new Error('Transaksi ini sudah dibatalkan.')

      // 1. Kembalikan stok barang
      const items = await transactionRepo.getItemsByTransactionId(transaction.id)
      for (const item of items) {
        if (item.productId) {
          const product = await productRepo.getById(item.productId)
          if (product) {
            await productRepo.update(item.productId, {
              qty: (product.qty || 0) + (item.qty || 0)
            })
          }
        }
      }

      // 2. Balikkan mutasi keuangan kas / bank
      if (transaction.paymentMethod === 'CASH' && transaction.total > 0) {
        await financeRepo.addMutation({
          accountId: 'acc_cash',
          type: 'OUT',
          amount: transaction.total,
          category: 'Pembatalan Transaksi',
          note: `Void Transaksi Kasir #${transaction.id.slice(0, 8)}`,
          refId: transaction.id
        })
      } else if (transaction.paymentMethod === 'QRIS' && transaction.total > 0) {
        await financeRepo.addMutation({
          accountId: 'acc_bank',
          type: 'OUT',
          amount: transaction.total,
          category: 'Pembatalan Transaksi',
          note: `Void Transaksi QRIS #${transaction.id.slice(0, 8)}`,
          refId: transaction.id
        })
      }

      // 3. Kurangi poin/spending & piutang member jika ada
      if (transaction.memberId) {
        const member = await memberRepo.getById(transaction.memberId)
        if (member) {
          const newSpending = Math.max(0, (member.total_spending || 0) - transaction.total)
          const newDebt = transaction.paymentMethod === 'TEMPO' 
            ? Math.max(0, (member.debt || 0) - (transaction.remaining || transaction.total))
            : (member.debt || 0)

          await memberRepo.update(transaction.memberId, {
            total_spending: newSpending,
            debt: newDebt
          })
        }
      }

      // 4. Update status transaksi menjadi void
      await db.transactions.update(transaction.id, {
        status: 'void',
        updatedAt: now,
        synced: 0
      })

    } else if (transaction.trxType === 'DIGITAL') {
      if (transaction.status === 'CANCELLED') throw new Error('Transaksi digital sudah dibatalkan.')

      const isTopup = transaction.digitalType === 'topup'
      const isCashAdmin = transaction.adminPaymentMethod === 'cash'

      // Balikkan kas digital
      if (isTopup) {
        const cashOut = transaction.nominal + (isCashAdmin ? transaction.adminFee : 0)
        if (cashOut > 0) {
          await financeRepo.addMutation({
            accountId: 'acc_cash',
            type: 'OUT',
            amount: cashOut,
            category: 'Pembatalan Transaksi Digital',
            note: `Void Top Up ${transaction.provider}`,
            refId: transaction.id
          })
        }
        const bankIn = isCashAdmin ? transaction.nominal : Math.max(0, transaction.nominal - transaction.adminFee)
        await financeRepo.addMutation({
          accountId: 'acc_bank',
          type: 'IN',
          amount: bankIn,
          category: 'Pembatalan Transaksi Digital',
          note: `Pengembalian Modal Top Up ${transaction.provider}`,
          refId: transaction.id
        })
      } else {
        const cashIn = transaction.nominal - (isCashAdmin ? transaction.adminFee : 0)
        if (cashIn > 0) {
          await financeRepo.addMutation({
            accountId: 'acc_cash',
            type: 'IN',
            amount: cashIn,
            category: 'Pembatalan Transaksi Digital',
            note: `Void Tarik Tunai ${transaction.provider}`,
            refId: transaction.id
          })
        }
        const bankOut = isCashAdmin ? transaction.nominal : transaction.nominal + transaction.adminFee
        await financeRepo.addMutation({
          accountId: 'acc_bank',
          type: 'OUT',
          amount: bankOut,
          category: 'Pembatalan Transaksi Digital',
          note: `Penarikan Saldo Tarik Tunai ${transaction.provider}`,
          refId: transaction.id
        })
      }

      await db.digital_transactions.update(transaction.id, {
        status: 'CANCELLED',
        profit: 0,
        updatedAt: now,
        synced: 0
      })
    }
  }
}
