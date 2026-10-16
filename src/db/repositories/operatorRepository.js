// src/db/repositories/operatorRepository.js
import { db } from '../index.js'
import dayjs from 'dayjs'

export const operatorRepo = {
  getAll: async () => {
    const table = db.operators || db.table('operators')
    const list = await table.toArray()
    // Hanya tampilkan data yang belum di-soft-delete
    return list.filter(item => !item.deleted)
  },

  getById: async (id) => {
    const table = db.operators || db.table('operators')
    const item = await table.get(id)
    return item && !item.deleted ? item : null
  },

  create: async (data) => {
    const id = crypto.randomUUID()
    const now = dayjs().toISOString()
    const item = { 
      id, 
      name: data.name,
      role: data.role || 'Kasir',
      pin: data.pin || '',
      deleted: false,
      updatedAt: now, 
      synced: 0 
    }
    const table = db.operators || db.table('operators')
    await table.add(item)
    return id
  },

  update: async (id, data) => {
    const now = dayjs().toISOString()
    const table = db.operators || db.table('operators')
    await table.update(id, { ...data, updatedAt: now, synced: 0 })
  },

  delete: async (id) => {
    const now = dayjs().toISOString()
    const table = db.operators || db.table('operators')
    // Gunakan Soft Delete agar sinkronisasi offline-first berjalan konsisten
    await table.update(id, { deleted: true, updatedAt: now, synced: 0 })
  }
}
