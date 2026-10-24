
import { reactive } from 'vue'
import { db } from '../db'
import { firestore } from './firebase'
import { collection, doc, writeBatch, getDocs, query, where } from 'firebase/firestore'
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
  isAutoSyncEnabled: false // DEFAULT FALSE - hemat kuota
})

async function updateUnsyncedCount() {
  if (!db) return
  try {
    const allTables = [...TABLES_TO_SYNC, ...TRANSACTION_TABLES]
    const counts = await Promise.all(
      allTables.map(t => db[t]?.where('synced').equals(0).count().catch(()=>0) || 0)
    )
    syncStatus.unsyncedCount = counts.reduce((a,b)=>a+b,0)
  } catch (e) {
    console.warn('[Sync] Count check error:', e)
  }
}

// GANTI FUNGSI pullAllFromCloud DI syncService.js LU JADI INI:

export async function pullAllFromCloud() {
  if (!navigator.onLine || isPullingFromCloud || !db || !firestore) return
  isPullingFromCloud = true
  syncStatus.isSyncing = true
  try {
    console.log('[Sync] DB kosong terdeteksi, narik master dari cloud...')
    for (const tableName of TABLES_TO_SYNC) {
      if (!db[tableName]) continue
      
      // WRAP getDocs BIAR ABORTERROR GA SPAM
      let snap
      try {
        snap = await getDocs(collection(firestore, tableName))
      } catch (e) {
        if (e.name === 'AbortError' || e.message?.includes('aborted')) {
          console.warn(`[Sync] getDocs ${tableName} ke-abort, skip dulu`)
          continue // skip, lanjut tabel berikutnya, jangan spam error
        }
        throw e
      }

      if (snap.empty) continue
      const data = snap.docs.map(d => ({
        ...d.data(),
        id: d.id,
        synced: 1
      }))
      if (data.length) {
        // bulkPut nya juga dibungkus biar kalo ke-abort ga ngerusak transaksi
        try {
          await db[tableName].bulkPut(data)
          console.log(`[Pull] ${tableName}: ${data.length}`)
        } catch (e) {
          if (e.name === 'AbortError') {
            console.warn(`[Sync] bulkPut ${tableName} ke-abort, coba lagi nanti`)
            continue
          }
          throw e
        }
      }
      // kasih jeda 100ms biar Chrome HP ga kewalahan (ngurangin AbortError)
      await new Promise(r => setTimeout(r, 100))
    }
    localStorage.setItem('lastPullAt', new Date().toISOString())
    syncStatus.lastSyncedAt = dayjs().format('HH:mm')
    await updateUnsyncedCount()
  } finally {
    isPullingFromCloud = false
    syncStatus.isSyncing = false
  }
}
// Pull delta - cuma yang berubah setelah lastPull (irit kuota harian)
export async function pullDeltaFromCloud() {
  if (!navigator.onLine || isPullingFromCloud) return
  const lastPull = localStorage.getItem('lastPullAt')
  if (!lastPull) return pullAllFromCloud()

  isPullingFromCloud = true
  try {
    for (const tableName of TABLES_TO_SYNC) {
      const q = query(collection(firestore, tableName), where('updatedAt', '>', lastPull))
      const snap = await getDocs(q)
      if (snap.empty) continue
      // jangan timpa data lokal yang belum ke-push
      const dirtyIds = await db[tableName].where('synced').equals(0).primaryKeys()
      const incoming = snap.docs.map(d=>({...d.data(), id: d.id, synced: 1})).filter(i=>!dirtyIds.includes(i.id))
      if (incoming.length) await db[tableName].bulkPut(incoming)
    }
    localStorage.setItem('lastPullAt', new Date().toISOString())
  } finally {
    isPullingFromCloud = false
  }
}

async function recalculateMemberDebt(memberId) {
  if (!memberId || !db?.transactions || !db?.members || !db?.debt_payments) return
  try {
    const unpaid = await db.transactions.where('memberId').equals(memberId).filter(t => (t.remaining || 0) > 0 && t.status !== 'void' && t.status !== 'CANCELLED' && !t.deleted).toArray()
    const totalTrxDebt = unpaid.reduce((acc, t) => Big(acc).plus(t.remaining || 0).toString(), '0')
    const payments = await db.debt_payments.where('memberId').equals(memberId).toArray()
    const validPayments = payments.filter(p => !p.deleted)
    const totalPaid = validPayments.reduce((acc, p) => Big(acc).plus(p.amount || 0).toString(), '0')
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
    if (!enabled) this.stopRealtime()
  },

  async pushLocalToCloud() {
    syncStatus.isOnline = navigator.onLine
    if (!navigator.onLine || isSyncing || !db || !firestore) {
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
      console.warn('[Sync] Push manual gagal:', e?.message)
    } finally {
      isSyncing = false
      syncStatus.isSyncing = false
      await updateUnsyncedCount()
    }
  },

  initRealtimePull() { this.stopRealtime() },
  stopRealtime() { if (intervalId) { clearInterval(intervalId); intervalId = null } },

  async init() {
    try {
      if (!firestore || !db) return
      const updateOnlineStatus = () => { syncStatus.isOnline = navigator.onLine }
      window.addEventListener('online', updateOnlineStatus)
      window.addEventListener('offline', updateOnlineStatus)
      this.stopRealtime()
      // Auto bootstrap kalo DB kosong (kasus clear cache di HP)
      const prodCount = await db.products.count().catch(()=>0)
      if (prodCount === 0 && navigator.onLine) {
        await pullAllFromCloud()
      } else {
        // kalo ada data, cukup pull delta irit
        if (navigator.onLine) pullDeltaFromCloud()
      }
      //await updateUnsyncedCount()
    } catch (e) {
      console.error('[Sync] Init error:', e?.message, e)
    }
  }
}

export const syncService = syncRealtime
export default syncRealtime
