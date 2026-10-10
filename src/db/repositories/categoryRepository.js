import { db } from '../index.js'
import dayjs from 'dayjs'

export const categoryRepo = {
  getAll: () => db.categories.toArray(),
  getById: (id) => db.categories.get(id),
  create: async (name) => {
    const id = crypto.randomUUID()
    const now = dayjs().toISOString()
    await db.categories.add({
      id,
      name,
      updatedAt: now,
      synced: 0
    })
    return id
  },
  update: async (id, name) => {
    const now = dayjs().toISOString()
    await db.categories.update(id, {
      name,
      updatedAt: now,
      synced: 0
    })
  },
  delete: (id) => db.categories.delete(id)
}
