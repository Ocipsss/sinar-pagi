// src/db/repositories/packageRepository.js
import { db } from '../index.js'
import { doc, deleteDoc } from 'firebase/firestore'
import { firestore } from '../../services/firebase.js'

export const packageRepository = {
  async getAll() {
    return await db.product_packages.toArray()
  },

  async savePackage(packageData) {
    const id = packageData.id || `pkg_${Date.now()}`
    const newItem = { 
      ...packageData, 
      id, 
      updatedAt: new Date().toISOString(),
      synced: 0 
    }
    await db.product_packages.put(newItem)
    return newItem
  },

  async deletePackage(id) {
    const stringId = String(id)

    // 1. Hapus dari Dexie IndexedDB lokal
    await db.product_packages.delete(stringId)

    // 2. Hapus langsung dari Cloud Firestore agar tidak ditarik lagi oleh listener/onSnapshot
    if (navigator.onLine && firestore) {
      try {
        const docRef = doc(firestore, 'product_packages', stringId)
        await deleteDoc(docRef)
      } catch (err) {
        console.error('Gagal menghapus paket di Firestore:', err)
      }
    }
  }
}
