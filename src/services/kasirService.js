import { db } from '../db/index.js'
import dayjs from 'dayjs'
import { financeRepo } from '../db/repositories/financeRepository.js'
import { productRepo } from '../db/repositories/productRepository.js'
import { memberRepo } from '../db/repositories/memberRepository.js'

export const kasirService = {
  async checkout({ cart, member, paymentMethod, operator, amountPaid, change, amountQris, amountCash }) {
    const now = dayjs().toISOString()
    const id = crypto.randomUUID()

    // GUARD 2: Validasi keranjang tidak boleh kosong (dicek dulu sebelum hitung)
    if (!cart || cart.length === 0) throw new Error('Keranjang belanja masih kosong!')

    const total = Math.round(cart.reduce((s, c) => s + (Number(c.price_sell) * Number(c.cartQty)), 0))
    const isTempo = paymentMethod === 'TEMPO'
    const isCash = paymentMethod === 'CASH'
    const isQris = paymentMethod === 'QRIS'
    const isSplit = paymentMethod === 'SPLIT'

    // GUARD 1: Validasi metode TEMPO wajib memilih member
    if (isTempo && !member) throw new Error('Member wajib dipilih untuk metode pembayaran TEMPO!')
    
    // Normalisasi nilai input
    const finalAmountQris = Number(amountQris) || 0
    const finalAmountCashInput = Number(amountCash) || 0

    let finalAmountPaid = 0
    let finalChange = 0
    let sisaBayar = 0

    if (isTempo) {
      finalAmountPaid = 0
      finalChange = 0
      sisaBayar = total
    } else if (isQris) {
      finalAmountPaid = total
      finalChange = 0
      sisaBayar = 0
    } else if (isSplit) {
      // FITUR BARU: Split Tender (QRIS + CASH + TEMPO)
      const totalTerbayar = finalAmountQris + finalAmountCashInput
      if (totalTerbayar < total) {
        if (!member) {
          throw new Error('Pelanggan wajib dipilih jika total pembayaran kurang dari total belanja (Split Tender)!')
        }
        sisaBayar = total - totalTerbayar
      } else {
        sisaBayar = 0
      }
      finalAmountPaid = totalTerbayar
      finalChange = Math.max(0, totalTerbayar - total)
    } else {
      // CASH Murni
      const paid = Number(amountPaid)
      finalAmountPaid = Number.isFinite(paid) && paid > 0 ? Math.round(paid) : total
      
      if (finalAmountPaid < total) {
        // Split Payment (DP / Bayar Kurang) Cash + Tempo
        if (!member) {
          throw new Error('Pelanggan wajib dipilih jika uang tunai kurang dari total (Split Payment / Tempo)!')
        }
        finalChange = 0
        sisaBayar = total - finalAmountPaid
      } else {
        finalChange = Math.max(0, finalAmountPaid - total)
        sisaBayar = 0
      }
    }

    // Uang yang benar-benar masuk laci (CASH)
    let cashIn = 0
    if (isCash) {
      cashIn = Math.max(0, finalAmountPaid - finalChange)
    } else if (isSplit) {
      // Jika split dan ada kembalian, potong dari uang cash
      cashIn = Math.max(0, finalAmountCashInput - finalChange)
    }

    let totalProfit = 0
    const stockWarnings = []

    // Atomic Dexie Transaction
    await db.transaction('rw', db.transactions, db.transaction_items, db.products, db.members, db.cash_accounts, db.cash_mutations, async () => {
      // 1. Simpan header transaksi
      const trxHeader = {
        id, 
        date: now, 
        total, 
        memberId: member?.id || null,
        operatorId: operator?.id || null,
        operatorName: operator?.name || 'Kasir',
        paymentMethod, 
        amountPaid: finalAmountPaid,
        paidAmount: finalAmountPaid,
        change: finalChange,
        changeAmount: finalChange,
        remaining: sisaBayar, 
        status: sisaBayar > 0 ? 'unpaid' : 'paid',
        dueDate: sisaBayar > 0 ? dayjs().add(7, 'day').toISOString() : null,
        updatedAt: now, 
        synced: 0
      }
      await db.transactions.add(trxHeader)

      // 2. Pencatatan mutasi kas/bank
      if (isCash) {
        if (cashIn > 0) {
          await financeRepo.addMutation({
            accountId: 'acc_cash',
            type: 'IN',
            amount: cashIn,
            category: 'Penjualan Toko',
            note: `Transaksi Kasir (${operator?.name || 'Kasir'}) #${id.slice(0, 8)}`,
            refId: id
          })
        }
      } else if (isQris) {
        if (total > 0) {
          await financeRepo.addMutation({
            accountId: 'acc_bank',
            type: 'IN',
            amount: total,
            category: 'Penjualan Toko',
            note: `Transaksi QRIS (${operator?.name || 'Kasir'}) #${id.slice(0, 8)}`,
            refId: id
          })
        }
      } else if (isSplit) {
        // Mutasi QRIS ke Bank
        if (finalAmountQris > 0) {
          await financeRepo.addMutation({
            accountId: 'acc_bank',
            type: 'IN',
            amount: finalAmountQris,
            category: 'Penjualan Toko',
            note: `Transaksi Split (QRIS) #${id.slice(0, 8)}`,
            refId: id
          })
        }
        // Mutasi CASH ke Laci
        if (cashIn > 0) {
          await financeRepo.addMutation({
            accountId: 'acc_cash',
            type: 'IN',
            amount: cashIn,
            category: 'Penjualan Toko',
            note: `Transaksi Split (Cash) #${id.slice(0, 8)}`,
            refId: id
          })
        }
      }
      // TEMPO: tidak ada mutasi kas sampai member bayar utang

      // 3. Olah item transaksi & pemotongan stok
      for (const c of cart) {
        const modal = Number(c.price_modal) || 0
        const priceSell = Number(c.price_sell) || 0
        const qty = Number(c.cartQty) || 0
        const itemProfit = (priceSell - modal) * qty
        totalProfit += Math.max(0, itemProfit)

        // Simpan item transaksi
        await db.transaction_items.add({
          id: crypto.randomUUID(), 
          transactionId: id, 
          productId: c.id,
          serviceId: c.isServed ? 'SERVICE_SEDUH' : null, 
          name: c.name, 
          qty, 
          price: priceSell,
          subtotal: priceSell * qty, 
          updatedAt: now, 
          synced: 0
        })

        // Cek ketersediaan produk di database
        const product = await db.products.get(c.id)
        if (product) {
          const qtyDipotong = c.packageInfo ? ((Number(c.packageInfo.qty_pcs) || 1) * qty) : qty
          const currentQty = Number(product.qty) || 0
          const newQty = currentQty - qtyDipotong

          if (newQty < 0) {
            stockWarnings.push(`${product.name} (Sisa Stok: ${newQty})`)
          }

          await db.products.update(c.id, { 
            qty: newQty, 
            updatedAt: now, 
            synced: 0 
          })
        }
      }

      // 4. Update data member (poin, spending, & piutang) jika ada
      if (member) {
        const currentMember = await db.members.get(member.id)
        if (currentMember) {
          const earnedPoints = Math.floor(totalProfit * 0.01)
          const updatedPoints = (currentMember.points || 0) + earnedPoints
          const updatedSpending = (currentMember.total_spending || 0) + total
          const updatedDebt = (currentMember.debt || 0) + sisaBayar

          await db.members.update(member.id, {
            points: updatedPoints,
            total_spending: updatedSpending,
            debt: updatedDebt,
            updatedAt: now,
            synced: 0
          })
        }
      }
    })

    return { id, total, stockWarnings }
  },

  async getInitialData() {
    const [products, members] = await Promise.all([
      productRepo.getAll(),
      memberRepo.getAll()
    ])
    return { products, members }
  }
}