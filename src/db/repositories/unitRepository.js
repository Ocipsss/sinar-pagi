// src/db/repositories/unitRepository.js
import { db } from '../index.js'
import dayjs from 'dayjs'

// ✅ Helper: cek soft-delete, toleran terhadap boolean/number/string (warisan migrasi)
function isDeleted(item) {
  if (!item) return true
  const d = item.deleted
  return d === true || d === 1 || d === 'true'
}

export const unitRepo = {
  // ✅ FIX: filter soft delete
  getAll: async () => {
    const table = db.units || db.table('units')
    const list = await table.toArray()
    return list.filter(item => !isDeleted(item))
  },

  getById: async (id) => {
    const table = db.units || db.table('units')
    const item = await table.get(id)
    return !isDeleted(item) ? item : null
  },

  create: async (name) => {
    const id = crypto.randomUUID()
    const now = dayjs().toISOString()
    const item = {
      id,
      name: String(name || '').trim(),
      deleted: false,
      updatedAt: now,
      synced: 0
    }
    const table = db.units || db.table('units')
    await table.add(item)
    return id
  },

  update: async (id, name) => {
    const now = dayjs().toISOString()
    const newName = String(name || '').trim()
    const table = db.units || db.table('units')
    const existing = await table.get(id)

    // ✅ Jangan update kalau unit sudah dihapus
    if (isDeleted(existing)) return

    await table.update(id, { name: newName, updatedAt: now, synced: 0 })
  },

  // ✅ FIX: soft delete — konsisten dengan repo lain, dan ke-push ke Supabase
  delete: async (id) => {
    const now = dayjs().toISOString()
    const table = db.units || db.table('units')
    await table.update(id, {
      deleted: true,
      updatedAt: now,
      synced: 0
    })
  }
}