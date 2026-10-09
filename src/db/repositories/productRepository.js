import { db } from '../index.js'
import dayjs from 'dayjs'

export const productRepo = {
  getAll: () => db.products.toArray(),
  getByCode: (code) => db.products.where('code').equals(code).first(),
  create: (data) => db.products.add({
   ...data,
    id: crypto.randomUUID(),
    updatedAt: dayjs().toISOString(),
    synced: 0
  })
}