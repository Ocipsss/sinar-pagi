import { db } from '../index.js'
import dayjs from 'dayjs'

// Repository untuk mengelola operasi tabel 'shopping_list' di Dexie DB
export const shoppingRepository = {
  async getAll() {
    // Memastikan tabel 'shopping_list' diakses dengan aman
    if (!db.shopping_list) return []
    return await db.shopping_list.toArray()
  },

  async getById(id) {
    if (!db.shopping_list) return null
    return await db.shopping_list.get(id)
  },

  async add(item) {
    const id = item.id || crypto.randomUUID()
    const now = dayjs().toISOString()
    const newItem = {
      ...item,
      id,
      isBought: item.isBought || false,
      createdAt: item.createdAt || now,
      updatedAt: now,
      synced: 0
    }
    
    // Gunakan table() dinamis jika schema Dexie belum terdefinisi secara statis
    if (db.shopping_list) {
      await db.shopping_list.put(newItem)
    } else {
      await db.table('shopping_list').put(newItem)
    }
    return newItem
  },

  async addBulk(items) {
    const now = dayjs().toISOString()
    const preparedItems = items.map(item => ({
      ...item,
      id: item.id || crypto.randomUUID(),
      isBought: item.isBought || false,
      createdAt: item.createdAt || now,
      updatedAt: now,
      synced: 0
    }))

    const table = db.shopping_list || db.table('shopping_list')
    await table.bulkPut(preparedItems)
    return preparedItems
  },

  async update(id, changes) {
    const now = dayjs().toISOString()
    const table = db.shopping_list || db.table('shopping_list')
    await table.update(id, {
      ...changes,
      updatedAt: now,
      synced: 0
    })
  },

  async delete(id) {
    const table = db.shopping_list || db.table('shopping_list')
    await table.delete(id)
  },

  async clearBought() {
    const table = db.shopping_list || db.table('shopping_list')
    const boughtItems = await table.where('isBought').equals(1).toArray()
    const ids = boughtItems.map(i => i.id)
    await table.bulkDelete(ids)
    return ids.length
  }
}