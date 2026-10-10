import { db } from '../db/index.js'
import dayjs from 'dayjs'

export const kasirService = {
  async checkout({ cart, member, paymentMethod }) {
    const now = dayjs().toISOString()
    const id = crypto.randomUUID()
    const total = cart.reduce((s,c)=> s + (c.price_sell * c.cartQty), 0)
    const isTempo = paymentMethod === 'TEMPO'

    if(isTempo &&!member) throw new Error('Member wajib untuk TEMPO')

    await db.transactions.add({
      id, date: now, total, memberId: member?.id || null,
      paymentMethod, amountPaid: isTempo?0:total, paidAmount: isTempo?0:total,
      remaining: isTempo?total:0, status: isTempo?'unpaid':'paid',
      dueDate: isTempo? dayjs().add(7,'day').toISOString():null,
      updatedAt: now, synced: 0
    })

    for(const c of cart){
      await db.transaction_items.add({
        id: crypto.randomUUID(), transactionId: id, productId: c.id,
        serviceId: null, qty: c.cartQty, price: c.price_sell,
        subtotal: c.price_sell * c.cartQty, updatedAt: now, synced:0
      })
      await db.products.update(c.id, { qty: (c.qty||0) - c.cartQty, updatedAt: now, synced:0 })
    }

    if(isTempo){
      await db.members.update(member.id, { debt: (member.debt||0)+total, updatedAt: now, synced:0 })
    }

    return { id, total }
  },

  async getInitialData() {
    const [products, members] = await Promise.all([db.products.toArray(), db.members.toArray()])
    return { products, members }
  }
}