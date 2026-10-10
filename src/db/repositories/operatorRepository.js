// src/db/repositories/operatorRepository.js
import { db } from '../index.js'
import dayjs from 'dayjs'

export const operatorRepo = {
  getAll: () => (db.operators ? db.operators.toArray() : db.table('operators').toArray()),
  getById: (id) => (db.operators ? db.operators.get(id) : db.table('operators').get(id)),
  create: async (data) => {
    const id = crypto.randomUUID()
    const now = dayjs().toISOString()
    const item = { 
      id, 
      name: data.name,
      role: data.role || 'Kasir',
      pin: data.pin || '',
      updatedAt: now, 
      synced: 0 
    }
    const table = db.operators || db.table('operators')
    await table.add(item)
    return id
  },
  update: async (id, data) => {
    const now = dayjs().toISOString()
    const table = db.operators || db.table('operators')
    await table.update(id, { ...data, updatedAt: now, synced: 0 })
  },
  delete: (id) => (db.operators || db.table('operators')).delete(id)
}
