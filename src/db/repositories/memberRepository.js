import { db } from '../index.js'
import dayjs from 'dayjs'
import { firestore } from '../../services/firebase.js'
import { doc, deleteDoc } from 'firebase/firestore'

export const memberRepo = {
  getAll: () => db.members.toArray(),
  getById: (id) => db.members.get(id),
  
  create: async (data) => {
    const id = crypto.randomUUID()
    const now = dayjs().toISOString()
    await db.members.add({
      id,
      name: (data.name || '').toUpperCase().trim(), // Otomatis KAPITAL
      phone: (data.phone || '').trim(),
      address: (data.address || '').toUpperCase().trim(),
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
    const payload = {
      ...data,
      updatedAt: now,
      synced: 0
    }
    if (data.name) payload.name = data.name.toUpperCase().trim() // Otomatis KAPITAL saat edit
    if (data.address) payload.address = data.address.toUpperCase().trim()

    await db.members.update(id, payload)
  },

  delete: async (id) => {
    const stringId = String(id)
    
    // 1. Hapus dari IndexedDB lokal
    await db.members.delete(stringId)

    // 2. Hapus dari Cloud Firestore agar tidak ter-download kembali
    if (navigator.onLine && firestore) {
      try {
        await deleteDoc(doc(firestore, 'members', stringId))
      } catch (e) {
        console.warn('Gagal menghapus member dari cloud:', e)
      }
    }
  },

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
