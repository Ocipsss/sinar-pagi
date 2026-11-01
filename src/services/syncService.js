// src/services/syncService.js
import { reactive } from 'vue'
import { db } from '../db'
import { firestore } from './firebase'
import { collection, doc, writeBatch, getDocs, getDoc, query, where, setDoc } from 'firebase/firestore'
import dayjs from 'dayjs'
import Big from 'big.js'
import { cloudinaryService } from './cloudinaryService.js'

// SILENT AbortError agar tidak spam di console saat Vite HMR
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (e) => {
    if (e.reason?.name === 'AbortError' || e.reason?.message?.includes('aborted')) e.preventDefault()
  })
}

const TABLES_TO_SYNC = [
  'products',
  'product_packages',
  'categories',
  'services',
  'units',
  'operators',
  'settings'
]

const TRANSACTION_TABLES = []

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
  pendingPullCount: 0, // Indikator pembaruan data dari Cloud
  lastSyncedAt: null,
  isAutoSyncEnabled: false
})

async function updateUnsyncedCount() {
  if (!db) return
  try {
    let total = 0
    for (const t of [...TABLES_TO_SYNC, ...TRANSACTION_TABLES]) {
      try {
        if (!db[t]) continue
        const count = await db[t].where('synced').equals(0).count().catch(() => 0)
        total += count
        await new Promise(r => setTimeout(r, 20))
      } catch (e) {
        if (e.name !== 'AbortError') console.warn('[Sync] count', t, e)
      }
    }
    syncStatus.unsyncedCount = total
  } catch (e) {
    if (e.name !== 'AbortError') console.warn('[Sync] Count check error:', e)
  }
}

async function bumpCatalogVersion() {
  if (!navigator.onLine || !firestore) return
  try {
    await setDoc(doc(firestore, 'meta', 'catalog'), {
      version: Date.now(),
      updatedAt: new Date().toISOString(),
      pendingCount: 1 // Penanda eksplisit ada update dari perangkat pengirim
    }, { merge: true })
    console.log('[Sync] meta/catalog version bumped')
  } catch (e) {
    console.warn('[Sync] Gagal bump catalog version', e)
  }
}

// Pengecekan presisi (HANYA 1 Read ke meta/catalog) untuk mendeteksi update dari Cloud
export async function checkForCloudUpdates() {
  if (!navigator.onLine || !firestore) return
  try {
    const catalogSnap = await getDoc(doc(firestore, 'meta', 'catalog'))
    if (!catalogSnap.exists()) return

    const cloudMeta = catalogSnap.data()
    const lastPull = localStorage.getItem('lastPullAt')

    if (!cloudMeta.updatedAt) return

    const cloudTime = new Date(cloudMeta.updatedAt).getTime()
    const localTime = lastPull ? new Date(lastPull).getTime() : 0

    // Jika waktu update Cloud lebih baru dibanding lastPullAt lokal di perangkat ini
    if (cloudTime > localTime) {
      syncStatus.pendingPullCount = cloudMeta.pendingCount || 1
    } else {
      syncStatus.pendingPullCount = 0
    }
  } catch (e) {
    if (e.name !== 'AbortError') console.warn('[Sync] Check update fail:', e)
  }
}

export async function pullAllFromCloud() {
  if (!navigator.onLine || isPullingFromCloud || !db || !firestore) return
  isPullingFromCloud = true
  syncStatus.isSyncing = true
  let wasEmpty = false
  try {
    console.log('[Sync] DB kosong terdeteksi, narik master dari cloud...')
    wasEmpty = true
    for (const tableName of TABLES_TO_SYNC) {
      if (!db[tableName]) continue
      let snap
      try {
        snap = await getDocs(collection(firestore, tableName))
      } catch (e) {
        if (e.name === 'AbortError' || e.message?.includes('aborted')) continue
        console.warn(`[Sync] Gagal pull ${tableName}:`, e?.message || e)
        continue
      }
      if (snap.empty) continue
      const data = snap.docs.map(d => ({
        ...d.data(),
        id: d.id,
        synced: 1
      })).filter(item => !item.deleted)
      if (data.length) {
        try {
          await db[tableName].bulkPut(data)
          console.log(`[Pull] ${tableName}: ${data.length}`)
        } catch (e) {
          if (e.name === 'AbortError') continue
          throw e
        }
      }
      await new Promise(r => setTimeout(r, 100))
    }
    localStorage.setItem('lastPullAt', new Date().toISOString())
    syncStatus.lastSyncedAt = dayjs().format('HH:mm')
    syncStatus.pendingPullCount = 0 // Reset setelah pull full
    await updateUnsyncedCount()
    
    // Auto reload sekali saat first pull agar state Pinia & UI langsung terbarui
    if (wasEmpty) {
      console.log('[Sync] First pull selesai, reload biar store ke-load')
      setTimeout(() => window.location.reload(), 600)
    }
  } finally {
    isPullingFromCloud = false
    syncStatus.isSyncing = false
  }
}

export async function pullDeltaFromCloud() {
  if (!navigator.onLine || isPullingFromCloud) return
  const lastPull = localStorage.getItem('lastPullAt')
  if (!lastPull) return pullAllFromCloud()
  isPullingFromCloud = true
  try {
    for (const tableName of TABLES_TO_SYNC) {
      try {
        const q = query(collection(firestore, tableName), where('updatedAt', '>', lastPull))
        let snap
        try {
          snap = await getDocs(q)
        } catch (e) {
          if (e.name === 'AbortError') continue
          throw e
        }
        if (snap.empty) continue
        const dirtyIds = await db[tableName].where('synced').equals(0).primaryKeys().catch(() => [])
        const incoming = snap.docs.map(d => ({ ...d.data(), id: d.id, synced: 1 })).filter(i => !dirtyIds.includes(i.id))
        if (incoming.length) await db[tableName].bulkPut(incoming)
        await new Promise(r => setTimeout(r, 50))
      } catch (e) {
        if (e.name !== 'AbortError') console.warn('[Sync] delta', tableName, e)
      }
    }
    localStorage.setItem('lastPullAt', new Date().toISOString())
    syncStatus.pendingPullCount = 0 // Reset setelah pull delta selesai
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
    let shouldBumpCatalog = false
    try {
      try {
        await cloudinaryService.uploadPendingImages()
      } catch (imgErr) {
        console.warn('[Sync] Gagal upload pending images:', imgErr?.message)
      }
      for (const tableName of [...TABLES_TO_SYNC, ...TRANSACTION_TABLES]) {
        if (!db[tableName]) continue
        const unsynced = await db[tableName].where('synced').equals(0).toArray()
        if (!unsynced.length) continue
        if (['products', 'product_packages', 'services'].includes(tableName)) {
          shouldBumpCatalog = true
        }
        for (let i = 0; i < unsynced.length; i += 400) {
          const batch = writeBatch(firestore)
          const chunk = unsynced.slice(i, i + 400)
          chunk.forEach(item => {
            const { synced, imageLocal, ...clean } = item
            batch.set(doc(firestore, tableName, item.id), clean, { merge: true })
          })
          await batch.commit()
          await db[tableName].bulkUpdate(chunk.map(c => ({ key: c.id, changes: { synced: 1 } })))
        }
      }
      if (shouldBumpCatalog) {
        await bumpCatalogVersion()
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
      const prodCount = await db.products.where('deleted').notEqual(true).count().catch(() => db.products.count().catch(() => 0))
      if (prodCount === 0 && navigator.onLine) {
        await pullAllFromCloud()
      } else {
        if (navigator.onLine) {
          pullDeltaFromCloud()
          checkForCloudUpdates()
        }
        await updateUnsyncedCount()
      }
    } catch (e) {
      if (e.name !== 'AbortError') console.error('[Sync] Init error:', e?.message, e)
    }
  }
}

export const syncService = syncRealtime
export default syncRealtime
