// src/db/repositories/operatorRepository.js
import { db } from '../index.js'
import dayjs from 'dayjs'
import { firestore } from '../../services/firebase.js'
import { doc, deleteDoc, collection, getDocs } from 'firebase/firestore'

export const operatorRepo = {
  getAll: async () => {
    const table = db.operators || db.table('operators')
    let list = await table.toArray()
    
    // Jika data lokal kosong (seperti di mode Incognito) dan online, ambil langsung dari Cloud Firestore
    if (list.length === 0 && navigator.onLine && firestore) {
      try {
        const snapshot = await getDocs(collection(firestore, 'operators'))
        const cloudList = []
        snapshot.forEach(d => {
          cloudList.push({ id: d.id, ...d.data() })
        })
        if (cloudList.length > 0) {
          await table.bulkPut(cloudList.map(o => ({ ...o, synced: 1 })))
          list = cloudList
        }
      } catch (e) {
        console.warn('Gagal mengambil operator dari cloud:', e)
      }
    }
    return list
  },

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

  delete: async (id) => {
    const table = db.operators || db.table('operators')
    await table.delete(id)
    
    if (navigator.onLine && firestore) {
      try {
        await deleteDoc(doc(firestore, 'operators', id))
      } catch (e) {
        console.warn('Gagal menghapus operator dari cloud:', e)
      }
    }
  }
}
