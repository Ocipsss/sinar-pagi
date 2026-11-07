// src/db/repositories/productRepository.js - FINAL v3 SOFT DELETE + CLOUDINARY OFFLINE-FIRST
import { db } from '../index.js'
import dayjs from 'dayjs'

export const productRepo = {
  getAll: async () => {
    // 1. Ambil data produk & kategori sekaligus dari Dexie lokal (OFFLINE-FIRST)
    const [products, categories] = await Promise.all([
      db.products.toArray(),
      db.categories.toArray()
    ])

    // 2. Buat Map pencarian cepat ID Kategori -> Nama Kategori
    const categoryMap = new Map(categories.map(c => [c.id, c.name]))

    // 3. Filter produk aktif dan tempelkan nama kategori ke properti 'category'
    return products
      .filter(p => !p.deleted)
      .map(p => ({
        ...p,
        category: p.category || categoryMap.get(p.category_id || p.categoryId) || 'UMUM'
      }))
  },
  getById: async (id) => {
    const item = await db.products.get(id)
    if (!item || item.deleted) return null

    // Tempelkan nama kategori jika ada
    if (item.category_id || item.categoryId) {
      const cat = await db.categories.get(item.category_id || item.categoryId)
      return {
        ...item,
        category: item.category || cat?.name || 'UMUM'
      }
    }
    return { ...item, category: item.category || 'UMUM' }
  },
  getByCode: async (code) => {
    const item = await db.products.where('code').equals(code).first()
    if (!item || item.deleted) return null

    if (item.category_id || item.categoryId) {
      const cat = await db.categories.get(item.category_id || item.categoryId)
      return {
        ...item,
        category: item.category || cat?.name || 'UMUM'
      }
    }
    return { ...item, category: item.category || 'UMUM' }
  },
  create: async (data, imageFile = null) => {
    const id = crypto.randomUUID()
    const now = dayjs().toISOString()
    const doc = {
      ...data,
      id,
      updatedAt: now,
      synced: 0,
      deleted: false,
      imageUrl: null,
      imagePublicId: null,
      imageSynced: imageFile ? 0 : 1,
      imageLocal: imageFile || undefined
    }
    if (imageFile) {
      doc.imagePublicId = `sinar-pagi/products/${id}`
    }
    await db.products.add(doc)
    return id
  },
  update: async (id, data, imageFile = null) => {
    const now = dayjs().toISOString()
    const changes = {
      ...data,
      updatedAt: now,
      synced: 0
    }
    if (imageFile) {
      changes.imageLocal = imageFile
      changes.imageSynced = 0
      const existing = await db.products.get(id)
      changes.imagePublicId = existing?.imagePublicId || `sinar-pagi/products/${id}`
    }
    await db.products.update(id, changes)
  },
  delete: async (id) => {
    // SOFT DELETE - biar 498 di HP jadi 498 juga di cloud
    const now = dayjs().toISOString()
    await db.products.update(id, {
      deleted: true,
      updatedAt: now,
      synced: 0
    })
  },
  hardDelete: (id) => db.products.delete(id)
}
