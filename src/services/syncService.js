import { db } from '../db'
import { firestore } from './firebase'
import { collection, doc, writeBatch, query, where, onSnapshot } from 'firebase/firestore'
import dayjs from 'dayjs'
import Big from 'big.js'

const TABLES_TO_SYNC = [
  'products',
  'product_packages',
  'categories',
  'members',
  'services'
]

const TRANSACTION_TABLES = [
  'transactions',
  'transaction_items',
  'expenses',
  'digital_transactions',
  'debt_payments'
]

let isSyncing = false
let unsubscribers = []
let intervalId = null

async function recalculateMemberDebt(memberId) {
  if (!memberId ||!db?.transactions ||!db?.members) return
  try {
    const unpaid = await db.transactions
     .where('memberId').equals(memberId)
     .filter(t => t.remaining > 0)
     .toArray()
    const totalDebt = unpaid.reduce((acc, t) => Big(acc).plus(t.remaining || 0).toString(), '0')
    await db.members.update(memberId, { debt: Number(totalDebt) })
  } catch (e) {
    console.warn('[Sync] recalc debt fail', e)
  }
}

export const syncRealtime = {
  async pushLocalToCloud() {
    if (!navigator.onLine || isSyncing ||!db ||!firestore) return
    isSyncing = true
    try {
      for (const tableName of [...TABLES_TO_SYNC,...TRANSACTION_TABLES]) {
        if (!db[tableName]) continue
        const unsynced = await db[tableName].where('synced').equals(0).toArray()
        if (!unsynced.length) continue
        for (let i = 0; i < unsynced.length; i += 400) {
          const batch = writeBatch(firestore)
          const chunk = unsynced.slice(i, i + 400)
          chunk.forEach(item => {
            const { synced,...clean } = item
            batch.set(doc(firestore, tableName, item.id), clean, { merge: true })
          })
          await batch.commit()
          await db[tableName].bulkUpdate(chunk.map(c => ({ key: c.id, changes: { synced: 1 } })))
        }
      }
    } catch (e) {
      console.warn('[Sync] push fail', e?.message)
    } finally {
      isSyncing = false
    }
  },

  initRealtimePull() {
    this.stopRealtime()
    console.log('[Sync] Realtime ON')

    if (!firestore) {
      console.warn('[Sync] firestore belum siap')
      return
    }

    const today = dayjs().startOf('day').toISOString()

    const handleError = (err) => {
      if (err?.name === 'AbortError' || err?.code === 'aborted' || err?.message?.includes('aborted')) {
        return // ini normal pas HMR / stopRealtime, biarin
      }
      console.error('[Sync] Snapshot error:', err)
    }

    // 1. Master data
    TABLES_TO_SYNC.forEach(tableName => {
      try {
        const q = collection(firestore, tableName)
        const unsub = onSnapshot(q, async (snapshot) => {
          if (isSyncing) return
          for (const change of snapshot.docChanges()) {
            try {
              const cloudData = change.doc.data()
              const local = await db[tableName]?.get(change.doc.id)
              if (change.type === 'removed') {
                if (local) await db[tableName].delete(change.doc.id)
                continue
              }
              if (tableName === 'members') {
                if (!local || cloudData.updatedAt > local.updatedAt) {
                  const localDebt = local?.debt
                  await db[tableName].put({...cloudData, id: change.doc.id, synced: 1, debt: localDebt?? cloudData.debt })
                  await recalculateMemberDebt(change.doc.id)
                }
              } else {
                if (!local || cloudData.updatedAt > local.updatedAt) {
                  await db[tableName].put({...cloudData, id: change.doc.id, synced: 1 })
                }
              }
            } catch (e) {}
          }
        }, handleError)
        unsubscribers.push(unsub)
      } catch (e) {}
    })

    // 2. Transaksi hari ini
    TRANSACTION_TABLES.forEach(tableName => {
      try {
        const q = query(collection(firestore, tableName), where('updatedAt', '>=', today))
        const unsub = onSnapshot(q, async (snapshot) => {
          if (isSyncing) return
          for (const change of snapshot.docChanges()) {
            if (change.type === 'removed') continue
            try {
              const cloudData = change.doc.data()
              const local = await db[tableName]?.get(change.doc.id)
              if (!local || cloudData.updatedAt > local.updatedAt) {
                await db[tableName].put({...cloudData, id: change.doc.id, synced: 1 })
                if (tableName === 'transactions' || tableName === 'debt_payments') {
                  await recalculateMemberDebt(cloudData.memberId)
                }
              }
            } catch (e) {}
          }
        }, handleError)
        unsubscribers.push(unsub)
      } catch (e) {}
    })

    // 3. FIX UTANG LAMA
    try {
      const qUnpaid = query(collection(firestore, 'transactions'), where('remaining', '>', 0))
      const unsubUnpaid = onSnapshot(qUnpaid, async (snapshot) => {
        if (isSyncing) return
        for (const change of snapshot.docChanges()) {
          if (change.type === 'removed') continue
          try {
            const cloudData = change.doc.data()
            const local = await db.transactions.get(change.doc.id)
            if (!local || cloudData.updatedAt > local.updatedAt) {
              await db.transactions.put({...cloudData, id: change.doc.id, synced: 1 })
              await recalculateMemberDebt(cloudData.memberId)
            }
          } catch (e) {}
        }
      }, handleError)
      unsubscribers.push(unsubUnpaid)
    } catch (e) {}
  },

  stopRealtime() {
    try {
      unsubscribers.forEach(unsub => {
        try { unsub() } catch {}
      })
    } catch {}
    unsubscribers = []
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  },

  init() {
    try {
      if (!firestore ||!db) {
        console.warn('[Sync] skip init, db/firestore belum siap')
        return
      }
      window.addEventListener('online', () => this.pushLocalToCloud())
      if (intervalId) clearInterval(intervalId)
      intervalId = setInterval(() => this.pushLocalToCloud(), 60 * 1000)
      this.initRealtimePull()
      this.pushLocalToCloud()
    } catch (e) {
      console.error('[Sync] init error:', e?.message, e)
    }
  }
}

export const syncService = syncRealtime
export default syncRealtime