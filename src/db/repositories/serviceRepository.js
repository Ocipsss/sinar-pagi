// src/db/repositories/serviceRepository.js
import { db } from '../index.js'
import dayjs from 'dayjs'

export const serviceRepository = {
  // Hanya ambil jasa yang belum di-soft-delete
  getAll: async () => {
    const list = await db.services.toArray()
    return list.filter(s => !s.deleted)
  },

  getById: async (id) => {
    const item = await db.services.get(id)
    return item && !item.deleted ? item : null
  },

  saveService: async (data) => {
    const now = dayjs().toISOString()
    const id = data.id || crypto.randomUUID()
    await db.services.put({
      ...data,
      id,
      deleted: false,
      updatedAt: now,
      synced: 0
    })
    return id
  },

  deleteService: async (id) => {
    const stringId = String(id)
    const now = dayjs().toISOString()

    // Soft Delete di IndexedDB lokal agar sinkron ke cloud via syncService
    await db.services.update(stringId, {
      deleted: true,
      updatedAt: now,
      synced: 0
    })
  }
}
