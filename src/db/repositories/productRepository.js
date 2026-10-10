// src/db/repositories/productRepository.js
import { db } from '../index.js'
import dayjs from 'dayjs'

export const productRepo = {
  getAll: () => db.products.toArray(),
  getById: (id) => db.products.get(id),
  getByCode: (code) => db.products.where('code').equals(code).first(),
  create: (data) => db.products.add({
    ...data,
    id: crypto.randomUUID(),
    updatedAt: dayjs().toISOString(),
    synced: 0
  }),
  update: async (id, data) => {
    const now = dayjs().toISOString()
    await db.products.update(id, {
      ...data,
      updatedAt: now,
      synced: 0
    })
  },
  delete: (id) => db.products.delete(id)
}
