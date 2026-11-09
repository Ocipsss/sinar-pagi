// src/db/repositories/categoryRepository.js
import { db } from '../index.js'
import dayjs from 'dayjs'

// ✅ Helper: cek soft-delete, toleran terhadap boolean/number/string (warisan migrasi)
function isDeleted(item) {
  if (!item) return true
  const d = item.deleted
  return d === true || d === 1 || d === 'true'
}

export const categoryRepo = {
  // ✅ FIX: filter soft delete
  getAll: async () => {
    const list = await db.categories.toArray()
    return list.filter(item => !isDeleted(item))
  },

  getById: async (id) => {
    const item = await db.categories.get(id)
    return !isDeleted(item) ? item : null
  },

  create: async (name) => {
    const id = crypto.randomUUID()
    const now = dayjs().toISOString()
    await db.categories.add({
      id,
      name: String(name || '').trim(),
      deleted: false,
      updatedAt: now,
      synced: 0
    })
    return id
  },

  update: async (id, name) => {
    const now = dayjs().toISOString()
    const newName = String(name || '').trim()
    const oldCategory = await db.categories.get(id)

    // ✅ Jangan update kalau kategori sudah dihapus
    if (isDeleted(oldCategory)) return

    if (oldCategory && oldCategory.name !== newName) {
      const oldName = oldCategory.name

      // 1. Update nama kategori di tabel categories
      await db.categories.update(id, {
        name: newName,
        updatedAt: now,
        synced: 0
      })

      // 2. Cari semua produk yang menggunakan kategori lama, lalu perbarui ke nama baru
      // (hanya produk yang belum dihapus — produk terhapus tidak perlu diubah)
      const products = await db.products.where('category').equals(oldName).toArray()
      for (const p of products) {
        if (isDeleted(p)) continue
        await db.products.update(p.id, {
          category: newName,
          updatedAt: now,
          synced: 0
        })
      }
    } else {
      await db.categories.update(id, {
        name: newName,
        updatedAt: now,
        synced: 0
      })
    }
  },

  // ✅ FIX: soft delete — konsisten dengan repo lain, dan ke-push ke Supabase
  // (sebelumnya hard delete = kategori balik lagi setelah pull)
  delete: async (id) => {
    const now = dayjs().toISOString()
    await db.categories.update(id, {
      deleted: true,
      updatedAt: now,
      synced: 0
    })
  }
}