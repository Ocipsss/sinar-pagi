
// src/db/repositories/productRepository.js - FINAL SOFT DELETE
import { db } from '../index.js'
import dayjs from 'dayjs'

export const productRepo = {
  getAll: async () => {
    const list = await db.products.toArray()
    return list.filter(p => !p.deleted)
  },
  getById: async (id) => {
    const item = await db.products.get(id)
    return item && !item.deleted ? item : null
  },
  getByCode: async (code) => {
    const item = await db.products.where('code').equals(code).first()
    return item && !item.deleted ? item : null
  },
  create: (data) => db.products.add({
    ...data,
    id: crypto.randomUUID(),
    updatedAt: dayjs().toISOString(),
    synced: 0,
    deleted: false
  }),
  update: async (id, data) => {
    const now = dayjs().toISOString()
    await db.products.update(id, {
      ...data,
      updatedAt: now,
      synced: 0
    })
  },
  delete: async (id) => {
    // SOFT DELETE - biar ke-sync ke cloud, jadi 501 -> 498 beneran kehapus di cloud juga
    const now = dayjs().toISOString()
    await db.products.update(id, {
      deleted: true,
      updatedAt: now,
      synced: 0
    })
  },
  // Hard delete beneran cuma buat dev, jangan dipake di produksi
  hardDelete: (id) => db.products.delete(id)
}
