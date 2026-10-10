import { db } from '../index.js'
import dayjs from 'dayjs'

export const packageRepository = {
  getByProductId: (productId) => db.product_packages.where('productId').equals(productId).toArray(),
  getAll: () => db.product_packages.toArray(),
  savePackage: async (data) => {
    const now = dayjs().toISOString()
    const id = data.id || crypto.randomUUID()
    await db.product_packages.put({
      ...data,
      id,
      updatedAt: now,
      synced: 0
    })
    return id
  },
  deletePackage: (id) => db.product_packages.delete(id)
}
