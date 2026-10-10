import { db } from '../index.js'
import dayjs from 'dayjs'

export const serviceRepository = {
  getAll: () => db.services.toArray(),
  getById: (id) => db.services.get(id),
  saveService: async (data) => {
    const now = dayjs().toISOString()
    const id = data.id || crypto.randomUUID()
    await db.services.put({
      ...data,
      id,
      updatedAt: now,
      synced: 0
    })
    return id
  },
  deleteService: (id) => db.services.delete(id)
}
