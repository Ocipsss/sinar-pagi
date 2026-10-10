import { db } from '../index.js'
import dayjs from 'dayjs'

export const memberRepo = {
  getAll: () => db.members.toArray(),
  getById: (id) => db.members.get(id),
  
  create: async (data) => {
    const id = crypto.randomUUID()
    const now = dayjs().toISOString()
    await db.members.add({
      id,
      name: data.name,
      phone: data.phone || '',
      address: data.address || '',
      total_spending: 0,
      points: 0,
      debt: 0,
      updatedAt: now,
      synced: 0
    })
    return id
  },

  update: async (id, data) => {
    const now = dayjs().toISOString()
    await db.members.update(id, {
      ...data,
      updatedAt: now,
      synced: 0
    })
  },

  delete: (id) => db.members.delete(id),

  // Fungsi bayar cicilan utang
  payDebt: async (memberId, amount, paymentMethod = 'CASH') => {
    const now = dayjs().toISOString()
    const member = await db.members.get(memberId)
    if (!member) throw new Error('Member tidak ditemukan')

    const newDebt = Math.max(0, (member.debt || 0) - amount)
    
    // Catat histori pembayaran utang
    await db.debt_payments.add({
      id: crypto.randomUUID(),
      memberId,
      transactionId: null,
      date: now,
      amount,
      paymentMethod,
      updatedAt: now,
      synced: 0
    })

    // Update utang member
    await db.members.update(memberId, {
      debt: newDebt,
      updatedAt: now,
      synced: 0
    })

    return newDebt
  }
}
