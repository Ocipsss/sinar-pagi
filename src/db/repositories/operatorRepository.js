// src/db/repositories/operatorRepository.js
import { db } from '../index.js'
import dayjs from 'dayjs'
// ✅ FIX (3.9): pakai hashPin dari satu sumber
import { hashPin } from '../../utils/crypto.js'

export const operatorRepo = {
  getAll: async () => {
    const table = db.operators || db.table('operators')
    const list = await table.toArray()
    // Mengamankan pengecekan deleted (boolean, number, atau undefined)
    return list.filter(item => item.deleted !== true && item.deleted !== 1 && item.deleted !== 'true')
  },

  getById: async (id) => {
    const table = db.operators || db.table('operators')
    const item = await table.get(id)
    const isDeleted = item && (item.deleted === true || item.deleted === 1 || item.deleted === 'true')
    return item && !isDeleted ? item : null
  },

  create: async (data) => {
    // Gunakan data.id jika ada (seperti op-admin), jika tidak ada baru buat randomUUID
    const id = data.id || crypto.randomUUID()
    const now = dayjs().toISOString()
    const hashedPin = data.pin ? await hashPin(data.pin) : ''
    const item = { 
      id, 
      name: data.name,
      role: data.role || 'Kasir',
      pin: hashedPin,
      deleted: false,
      updatedAt: now, 
      synced: 0 
    }
    const table = db.operators || db.table('operators')
    await table.put(item)
    return id
  },

  update: async (id, data) => {
    const now = dayjs().toISOString()
    const table = db.operators || db.table('operators')
    const payload = { ...data }
    if (payload.pin) {
      payload.pin = await hashPin(payload.pin)
    }
    await table.update(id, { ...payload, updatedAt: now, synced: 0 })
  },

  delete: async (id) => {
    const now = dayjs().toISOString()
    const table = db.operators || db.table('operators')
    // Gunakan Soft Delete agar sinkronisasi offline-first berjalan konsisten
    await table.update(id, { deleted: true, updatedAt: now, synced: 0 })
  }
}