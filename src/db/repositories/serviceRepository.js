// src/db/repositories/serviceRepository.js
import { db } from '../index.js'

export const serviceRepository = {
  async getAll() {
    try {
      const all = await db.services.toArray()
      return all.filter(s => !s.deleted && s.deleted !== 1)
    } catch (e) {
      console.error('getAll services error', e)
      return []
    }
  },

  async getById(id) {
    return await db.services.get(id)
  },

  async saveService(data) {
    const now = new Date().toISOString()
    const id = data.id || `srv_${Date.now()}_${Math.random().toString(36).slice(2,6)}`

    // WAJIB plain array, jangan Proxy Vue
    const plainIds = Array.isArray(data.productIds) 
      ? JSON.parse(JSON.stringify(data.productIds)) 
      : (data.productId ? [data.productId] : [])

    const payload = {
      id: String(id),
      name: (data.name || '').toUpperCase().trim(),
      price: Number(data.price) || 0,
      category: (data.category || 'UMUM').toUpperCase().trim(),
      productId: data.productId || null,
      productIds: plainIds, // ini yang bikin DataCloneError kalo ga di-plain
      updatedAt: now,
      synced: 0,
      deleted: 0
    }

    await db.services.put(payload)
    return payload
  },

  async deleteService(id) {
    await db.services.update(id, {
      deleted: 1,
      updatedAt: new Date().toISOString(),
      synced: 0
    })
  }
}