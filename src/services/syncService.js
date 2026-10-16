import { reactive } from 'vue'
import { db } from '../db'
import { firestore } from './firebase'
import { collection, doc, writeBatch } from 'firebase/firestore'
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
  // DIPAKSA DEFAULT FALSE: Tidak ada auto sync/realtime
  isAutoSyncEnabled: false
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
      .filter(t => (t.remaining || 0) > 0 && t.status !== 'void' && t.status !== 'CANCELLED' && !t.deleted)
      .toArray()
    const totalTrxDebt = unpaid.reduce((acc, t) => Big(acc).plus(t.remaining || 0).toString(), '0')

    const payments = await db.debt_payments
      .where('memberId').equals(memberId)
      .toArray()
    const validPayments = payments.filter(p => !p.deleted)
    const totalPaid = validPayments.reduce((acc, p) => Big(acc).plus(p.amount || 0).toString(), '0')

    const finalDebt = Math.max(0, Number(Big(totalTrxDebt).minus(totalPaid)))
    await db.members.update(memberId, { debt: finalDebt })
  } catch (e) {
    console.warn('[Sync] recalc debt fail', e)
  }
}

export const syncRealtime = {
  // Toggle opsional jika suatu saat mau nyalakan/matikan dari setting
  toggleAutoSync(enabled) {
    syncStatus.isAutoSyncEnabled = enabled
    localStorage.setItem('auto_sync_enabled', enabled ? 'true' : 'false')
    if (!enabled) {
      this.stopRealtime()
    }
  },

  // FUNGSI PUSH MANUAL DARI LOKAL KE CLOUD (DIPANGGIL SAAT TOMBOL DIKLIK)
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
        
        // Push batch per 400 dokumen (Aman dari limit Firebase 500 ops)
        for (let i = 0; i < unsynced.length; i += 400) {
          const batch = writeBatch(firestore)
          const chunk = unsynced.slice(i, i + 400)
          
          chunk.forEach(item => {
            const { synced, ...clean } = item
            batch.set(doc(firestore, tableName, item.id), clean, { merge: true })
          })
          
          await batch.commit()
          
          // Tandai di IndexedDB lokal bahwa data sudah ter-sync
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

  // MATIKAN LISTENERS REALTIME TOTAL (TIDAK ADA ONSNAPSHOT)
  initRealtimePull() {
    this.stopRealtime()
  },

  stopRealtime() {
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
      }

      window.addEventListener('online', updateOnlineStatus)
      window.addEventListener('offline', updateOnlineStatus)

      // Matikan interval polling otomatis
      this.stopRealtime()
      
      // Cukup hitung sisa data lokal yang belum ter-upload
      updateUnsyncedCount()
    } catch (e) {
      console.error('[Sync] Init error:', e?.message, e)
    }
  }
}

export const syncService = syncRealtime
export default syncRealtime
