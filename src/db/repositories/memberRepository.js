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

  // Catat riwayat pembayaran utang saja (murni DB operation)
  addDebtPayment: async (paymentData) => {
    const now = dayjs().toISOString()
    const id = paymentData.id || crypto.randomUUID()
    await db.debt_payments.add({
      ...paymentData,
      id,
      date: paymentData.date || now,
      updatedAt: now,
      synced: 0
    })
    return id
  }
}
