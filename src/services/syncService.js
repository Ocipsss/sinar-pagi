import { reactive } from 'vue'
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
  'services',
  'units',
  'operators',
  'cash_accounts',
  'settings'
]

const TRANSACTION_TABLES = [
  'transactions',
  'transaction_items',
  'expenses',
  'digital_transactions',
  'debt_payments',
  'shopping_list',
  'cash_mutations'
]

let isSyncing = false
let unsubscribers = []
let intervalId = null

let isPullingFromCloud = false

export function getIsPullingFromCloud() {
  return isPullingFromCloud
}

export const syncStatus = reactive({
  isOnline: navigator.onLine,
  isSyncing: false,
  unsyncedCount: 0,
  lastSyncedAt: null,
  isAutoSyncEnabled: localStorage.getItem('auto_sync_enabled') !== 'false'
})

async function updateUnsyncedCount() {
  if (!db) return
  let total = 0
  try {
    for (const tableName of [...TABLES_TO_SYNC, ...TRANSACTION_TABLES]) {
      if (db[tableName]) {
        const count = await db[tableName].where('synced').equals(0).count()
        total += count
      }
    }
    syncStatus.unsyncedCount = total
  } catch (e) {
    console.warn('[Sync] Count check error:', e)
  }
}

async function recalculateMemberDebt(memberId) {
  if (!memberId || !db?.transactions || !db?.members || !db?.debt_payments) return
  try {
    const unpaid = await db.transactions
      .where('memberId').equals(memberId)
      .filter(t => (t.remaining || 0) > 0 && t.status !== 'void' && t.status !== 'CANCELLED')
      .toArray()
    const totalTrxDebt = unpaid.reduce((acc, t) => Big(acc).plus(t.remaining || 0).toString(), '0')

    const payments = await db.debt_payments
      .where('memberId').equals(memberId)
      .toArray()
    const totalPaid = payments.reduce((acc, p) => Big(acc).plus(p.amount || 0).toString(), '0')

    const finalDebt = Math.max(0, Number(Big(totalTrxDebt).minus(totalPaid)))
    await db.members.update(memberId, { debt: finalDebt })
  } catch (e) {
    console.warn('[Sync] recalc debt fail', e)
  }
}

export const syncRealtime = {
  toggleAutoSync(enabled) {
    syncStatus.isAutoSyncEnabled = enabled
    localStorage.setItem('auto_sync_enabled', enabled ? 'true' : 'false')

    if (enabled) {
      this.initRealtimePull()
      this.pushLocalToCloud()
    } else {
      this.stopRealtime()
    }
  },

  async pushLocalToCloud() {
    syncStatus.isOnline = navigator.onLine
    if (!syncStatus.isAutoSyncEnabled || !navigator.onLine || isSyncing || !db || !firestore) {
      await updateUnsyncedCount()
      return
    }
    
    isSyncing = true
    syncStatus.isSyncing = true

    try {
      for (const tableName of [...TABLES_TO_SYNC, ...TRANSACTION_TABLES]) {
        if (!db[tableName]) continue
        const unsynced = await db[tableName].where('synced').equals(0).toArray()
        if (!unsynced.length) continue
        
        for (let i = 0; i < unsynced.length; i += 400) {
          const batch = writeBatch(firestore)
          const chunk = unsynced.slice(i, i + 400)
          chunk.forEach(item => {
            const { synced, ...clean } = item
            batch.set(doc(firestore, tableName, item.id), clean, { merge: true })
          })
          await batch.commit()
          await db[tableName].bulkUpdate(chunk.map(c => ({ key: c.id, changes: { synced: 1 } })))
        }
      }
      syncStatus.lastSyncedAt = dayjs().format('HH:mm')
    } catch (e) {
      console.warn('[Sync] push fail', e?.message)
    } finally {
      isSyncing = false
      syncStatus.isSyncing = false
      await updateUnsyncedCount()
    }
  },

  initRealtimePull() {
    this.stopRealtime()

    if (!syncStatus.isAutoSyncEnabled || !firestore) return

    const handleError = (err) => {
      if (err?.name === 'AbortError' || err?.code === 'aborted' || err?.message?.includes('aborted')) return
      console.error('[Sync] Snapshot error:', err)
    }

    TABLES_TO_SYNC.forEach(tableName => {
      try {
        const q = collection(firestore, tableName)
        const unsub = onSnapshot(q, async (snapshot) => {
          if (isSyncing) return
          isPullingFromCloud = true
          let hasProductChanges = false

          try {
            for (const change of snapshot.docChanges()) {
              try {
                const cloudData = change.doc.data()
                const local = await db[tableName]?.get(change.doc.id)
                if (change.type === 'removed') {
                  if (local) await db[tableName].delete(change.doc.id)
                  if (tableName === 'products') hasProductChanges = true
                  continue
                }
                if (tableName === 'members') {
                  if (!local || cloudData.updatedAt > local.updatedAt) {
                    const localDebt = local?.debt
                    await db[tableName].put({ ...cloudData, id: change.doc.id, synced: 1, debt: localDebt ?? cloudData.debt })
                    await recalculateMemberDebt(change.doc.id)
                  }
                } else {
                  if (!local || cloudData.updatedAt > local.updatedAt) {
                    await db[tableName].put({ ...cloudData, id: change.doc.id, synced: 1 })
                    if (tableName === 'products') hasProductChanges = true
                  }
                }
              } catch (e) {}
            }
            await updateUnsyncedCount()

            if (hasProductChanges) {
              window.dispatchEvent(new CustomEvent('products-updated-from-cloud'))
            }
          } finally {
            isPullingFromCloud = false
          }
        }, handleError)
        unsubscribers.push(unsub)
      } catch (e) {}
    })

    TRANSACTION_TABLES.forEach(tableName => {
      try {
        const q = collection(firestore, tableName)
        const unsub = onSnapshot(q, async (snapshot) => {
          if (isSyncing) return
          isPullingFromCloud = true
          try {
            for (const change of snapshot.docChanges()) {
              if (change.type === 'removed') continue
              try {
                const cloudData = change.doc.data()
                const local = await db[tableName]?.get(change.doc.id)
                if (!local || cloudData.updatedAt > local.updatedAt) {
                  await db[tableName].put({ ...cloudData, id: change.doc.id, synced: 1 })
                  if (tableName === 'transactions' || tableName === 'debt_payments') {
                    await recalculateMemberDebt(cloudData.memberId)
                  }
                }
              } catch (e) {}
            }
            await updateUnsyncedCount()
          } finally {
            isPullingFromCloud = false
          }
        }, handleError)
        unsubscribers.push(unsub)
      } catch (e) {}
    })

    try {
      const qUnpaid = query(collection(firestore, 'transactions'), where('remaining', '>', 0))
      const unsubUnpaid = onSnapshot(qUnpaid, async (snapshot) => {
        if (isSyncing) return
        isPullingFromCloud = true
        try {
          for (const change of snapshot.docChanges()) {
            if (change.type === 'removed') continue
            try {
              const cloudData = change.doc.data()
              const local = await db.transactions.get(change.doc.id)
              if (!local || cloudData.updatedAt > local.updatedAt) {
                await db.transactions.put({ ...cloudData, id: change.doc.id, synced: 1 })
                await recalculateMemberDebt(cloudData.memberId)
              }
            } catch (e) {}
          }
          await updateUnsyncedCount()
        } finally {
          isPullingFromCloud = false
        }
      }, handleError)
      unsubscribers.push(unsubUnpaid)
    } catch (e) {}
  },

  stopRealtime() {
    try {
      unsubscribers.forEach(unsub => { try { unsub() } catch {} })
    } catch {}
    unsubscribers = []
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  },

  init() {
    try {
      if (!firestore || !db) return
      
      const updateOnlineStatus = () => {
        syncStatus.isOnline = navigator.onLine
        if (navigator.onLine && syncStatus.isAutoSyncEnabled) this.pushLocalToCloud()
      }

      window.addEventListener('online', updateOnlineStatus)
      window.addEventListener('offline', updateOnlineStatus)

      if (intervalId) clearInterval(intervalId)
      intervalId = setInterval(() => {
        if (syncStatus.isAutoSyncEnabled) this.pushLocalToCloud()
      }, 30 * 1000)

      if (syncStatus.isAutoSyncEnabled) {
        this.initRealtimePull()
        this.pushLocalToCloud()
      }
      updateUnsyncedCount()
    } catch (e) {
      console.error('[Sync] init error:', e?.message, e)
    }
  }
}

export const syncService = syncRealtime
export default syncRealtime
