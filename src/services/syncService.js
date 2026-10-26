// src/services/syncService.js
import { reactive } from 'vue'
import { db } from '../db'
import { firestore } from './firebase'
import { collection, doc, writeBatch, getDocs, query, where } from 'firebase/firestore'
import dayjs from 'dayjs'
import Big from 'big.js'
import { cloudinaryService } from './cloudinaryService.js' // <-- Tambahan import service cloudinary

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

export function getIsPullingFromCloud() { return isPullingFromCloud }

export const syncStatus = reactive({
  isOnline: navigator.onLine,
  isSyncing: false,
  unsyncedCount: 0,
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
        const c = await db[t].where('synced').equals(0).count().catch(()=>0)
        total += c
        await new Promise(r=>setTimeout(r, 20))
      } catch(e) {
        if (e.name !== 'AbortError') console.warn('[Sync] count', t, e)
      }
    }
    syncStatus.unsyncedCount = total
  } catch (e) {
    if (e.name !== 'AbortError') console.warn('[Sync] Count check error:', e)
  }
}

export async function pullAllFromCloud() {
  if (!navigator.onLine || isPullingFromCloud || !db || !firestore) return
  isPullingFromCloud = true
  syncStatus.isSyncing = true
  try {
    console.log('[Sync] DB kosong terdeteksi, narik master dari cloud...')
    for (const tableName of TABLES_TO_SYNC) {
      if (!db[tableName]) continue
      let snap
      try {
        snap = await getDocs(collection(firestore, tableName))
      } catch (e) {
        if (e.name === 'AbortError' || e.message?.includes('aborted')) {
          console.warn(`[Sync] getDocs ${tableName} ke-abort, skip`)
          continue
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
        try {
          await db[tableName].bulkPut(data)
          console.log(`[Pull] ${tableName}: ${data.length}`)
        } catch (e) {
          if (e.name === 'AbortError') {
            console.warn(`[Sync] bulkPut ${tableName} ke-abort`)
            continue
          }
          throw e
        }
      }
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
        } catch(e) {
          if (e.name === 'AbortError') continue
          throw e
        }
        if (snap.empty) continue
        const dirtyIds = await db[tableName].where('synced').equals(0).primaryKeys().catch(()=>[])
        const incoming = snap.docs.map(d=>({...d.data(), id: d.id, synced: 1})).filter(i=>!dirtyIds.includes(i.id))
        if (incoming.length) await db[tableName].bulkPut(incoming)
        await new Promise(r=>setTimeout(r, 50))
      } catch(e) {
        if (e.name !== 'AbortError') console.warn('[Sync] delta', tableName, e)
      }
    }
    localStorage.setItem('lastPullAt', new Date().toISOString())
  } finally {
    isPullingFromCloud = false
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
      // ===== PERBAIKAN UTAMA: UPLOAD GAMBAR PENDING KE CLOUDINARY TERLEBIH DAHULU =====
      try {
        await cloudinaryService.uploadPendingImages()
      } catch (imgErr) {
        console.warn('[Sync] Gagal upload pending images ke Cloudinary:', imgErr?.message)
      }
      // ==============================================================================

      for (const tableName of [...TABLES_TO_SYNC, ...TRANSACTION_TABLES]) {
        if (!db[tableName]) continue
        const unsynced = await db[tableName].where('synced').equals(0).toArray()
        if (!unsynced.length) continue
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
      const prodCount = await db.products.where('deleted').notEqual(true).count().catch(()=>db.products.count().catch(()=>0))
      if (prodCount === 0 && navigator.onLine) {
        await pullAllFromCloud()
      } else {
        if (navigator.onLine) pullDeltaFromCloud()
        await updateUnsyncedCount()
      }
    } catch (e) {
      if (e.name !== 'AbortError') console.error('[Sync] Init error:', e?.message, e)
    }
  }
}

export const syncService = syncRealtime
export default syncRealtime
