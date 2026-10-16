// src/db/repositories/packageRepository.js
import { db } from '../index.js'

export const packageRepository = {
  async getAll() {
    const list = await db.product_packages.toArray()
    // Hanya tampilkan paket yang belum di-soft-delete
    return list.filter(item => !item.deleted)
  },

  async savePackage(packageData) {
    const id = packageData.id || `pkg_${Date.now()}`
    const newItem = { 
      ...packageData, 
      id, 
      deleted: false,
      updatedAt: new Date().toISOString(),
      synced: 0 
    }
    await db.product_packages.put(newItem)
    return newItem
  },

  async deletePackage(id) {
    const stringId = String(id)
    const now = new Date().toISOString()

    // Soft Delete di lokal agar syncService aman mendorong status hapus ke Firestore
    await db.product_packages.update(stringId, { 
      deleted: true, 
      updatedAt: now, 
      synced: 0 
    })
  }
}
