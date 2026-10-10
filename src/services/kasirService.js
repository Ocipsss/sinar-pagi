// src/services/kasirService.js
import { db } from '../db/index.js'
import dayjs from 'dayjs'
import { financeRepo } from '../db/repositories/financeRepository.js'

export const kasirService = {
  async checkout({ cart, member, paymentMethod }) {
    const now = dayjs().toISOString()
    const id = crypto.randomUUID()
    const total = cart.reduce((s, c) => s + (c.price_sell * c.cartQty), 0)
    const isTempo = paymentMethod === 'TEMPO'

    if (isTempo && !member) throw new Error('Member wajib untuk TEMPO')

    let totalProfit = 0

    await db.transactions.add({
      id, 
      date: now, 
      total, 
      memberId: member?.id || null,
      paymentMethod, 
      amountPaid: isTempo ? 0 : total, 
      paidAmount: isTempo ? 0 : total,
      remaining: isTempo ? total : 0, 
      status: isTempo ? 'unpaid' : 'paid',
      dueDate: isTempo ? dayjs().add(7, 'day').toISOString() : null,
      updatedAt: now, 
      synced: 0
    })

    // Mutasi Saldo Otomatis berdasarkan Metode Pembayaran
    if (paymentMethod === 'CASH') {
      await financeRepo.addMutation({
        accountId: 'acc_cash',
        type: 'IN',
        amount: total,
        category: 'Penjualan Toko',
        note: `Transaksi Kasir (Tunai) #${id.slice(0, 8)}`,
        refId: id
      })
    } else if (paymentMethod === 'QRIS') {
      await financeRepo.addMutation({
        accountId: 'acc_bank',
        type: 'IN',
        amount: total,
        category: 'Penjualan Toko',
        note: `Transaksi Kasir (QRIS) #${id.slice(0, 8)}`,
        refId: id
      })
    }

    for (const c of cart) {
      const modal = c.price_modal || 0
      const itemProfit = (c.price_sell - modal) * c.cartQty
      totalProfit += Math.max(0, itemProfit)

      await db.transaction_items.add({
        id: crypto.randomUUID(), 
        transactionId: id, 
        productId: c.id,
        serviceId: c.isServed ? 'SERVICE_SEDUH' : null, 
        name: c.name, 
        qty: c.cartQty, 
        price: c.price_sell,
        subtotal: c.price_sell * c.cartQty, 
        updatedAt: now, 
        synced: 0
      })

      const qtyDipotong = c.packageInfo ? (c.packageInfo.qty_pcs * c.cartQty) : c.cartQty

      await db.products.update(c.id, { 
        qty: (c.qty || 0) - qtyDipotong, 
        updatedAt: now, 
        synced: 0 
      })
    }

    if (member) {
      const currentMember = await db.members.get(member.id)
      if (currentMember) {
        const earnedPoints = Math.floor(totalProfit * 0.01)
        const updatedPoints = (currentMember.points || 0) + earnedPoints
        const updatedSpending = (currentMember.total_spending || 0) + total
        const updatedDebt = isTempo ? (currentMember.debt || 0) + total : (currentMember.debt || 0)

        await db.members.update(member.id, {
          points: updatedPoints,
          total_spending: updatedSpending,
          debt: updatedDebt,
          updatedAt: now,
          synced: 0
        })
      }
    }

    return { id, total }
  },

  async getInitialData() {
    const [products, members] = await Promise.all([
      db.products.toArray(),
      db.members.toArray()
    ])
    return { products, members }
  }
}
