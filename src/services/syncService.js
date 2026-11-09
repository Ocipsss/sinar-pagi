// src/services/syncService.js - ORKESTRATOR UTAMA
import { reactive } from 'vue'
import { db } from '../db'
import { supabase } from './supabase.js'
import dayjs from 'dayjs'
import { cloudinaryService } from './cloudinaryService.js'

// Import dari file pecahan
import { ALL_TABLES } from './sync/schema.js'
import { buildCategoryCache, toSupabaseRowFull, normalizePulledRow, resolveCategoryNames } from './sync/mappers.js'
import { 
  checkForCloudUpdates, 
  pullAllFromCloud, 
  pullDeltaFromCloud, 
  getIsPullingFromCloud,
  injectSyncStatus,
  registerPullCallbacks
} from './sync/pull.js'

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (e) => {
    if (e.reason?.name === 'AbortError' || e.reason?.message?.includes('aborted')) e.preventDefault()
  })
}

let isSyncing = false
let realtimeChannels = []

export const syncStatus = reactive({
  isOnline: navigator.onLine,
  isSyncing: false,
  unsyncedCount: 0,
  pendingPullCount: 0,
  lastSyncedAt: null,
  isAutoSyncEnabled: false
})

async function updateUnsyncedCount(){
  if(!db) return
  try{
    let total=0
    for(const t of ALL_TABLES){
      if(!db[t]) continue
      const c = await db[t].where('synced').equals(0).count().catch(()=>0)
      total+=c
      await new Promise(r=>setTimeout(r,20))
    }
    syncStatus.unsyncedCount=total
  }catch(e){ if(e.name!=='AbortError') console.warn(e) }
}

// Injeksi dependensi agar pull.js bisa akses state
injectSyncStatus(syncStatus)
registerPullCallbacks(updateUnsyncedCount)

// Export ulang agar file lain (seperti Login.vue) tidak error
export { checkForCloudUpdates, pullAllFromCloud, pullDeltaFromCloud, getIsPullingFromCloud }

export const syncRealtime = {
  toggleAutoSync(enabled){
    syncStatus.isAutoSyncEnabled=enabled
    localStorage.setItem('auto_sync_enabled', enabled?'true':'false')
    if(!enabled) this.stopRealtime()
  },
  async pushLocalToCloud(){
    syncStatus.isOnline=navigator.onLine
    const summary = { pushed: 0, failed: 0, skipped: 0 }

    if(!navigator.onLine || isSyncing || !db){ await updateUnsyncedCount(); return summary }
    isSyncing=true; syncStatus.isSyncing=true
    try{
      try{ await cloudinaryService.uploadPendingImages() }catch(imgErr){ console.warn('[Sync] Gagal upload pending images:', imgErr?.message) }

      const categoryCache = await buildCategoryCache()

      for(const tableName of ALL_TABLES){
        if(!db[tableName]) continue
        const unsynced = await db[tableName].where('synced').equals(0).toArray()
        if(!unsynced.length) continue

        for(let i=0;i<unsynced.length;i+=400){
          const chunk = unsynced.slice(i,i+400)
          const clean = await Promise.all(chunk.map(item=>toSupabaseRowFull(item, tableName, categoryCache)))

          let chunkOk = false
          let lastErrMsg = ''

          try {
            let { error } = await supabase.from(tableName).upsert(clean, { onConflict: 'id' })
            if(error && error.code === '23505') {
              const retry = await supabase.from(tableName).upsert(clean, { onConflict: 'id', ignoreDuplicates: true })
              error = retry.error
            }
            if(error) {
              if(error.code === 'PGRST204') {
                lastErrMsg = `[PGRST204] Kolom tidak cocok di tabel ${tableName}: ${error.message}`
                console.warn(`[Sync Schema Warning] ${lastErrMsg}`)
              } else { throw error }
            } else { chunkOk = true }
          } catch(errTable) {
            lastErrMsg = errTable?.message || String(errTable)
            console.warn(`[Sync Warning] Gagal push batch ${tableName}:`, lastErrMsg)
          }

          if (chunkOk) {
            await db[tableName].bulkUpdate(chunk.map(c=>({ key: c.id, changes: { synced: 1 } })))
            summary.pushed += chunk.length
          } else {
            summary.failed += chunk.length
            if (lastErrMsg) console.warn(`[Sync] ${chunk.length} row ${tableName} GAGAL di-push, akan di-retry. Alasan: ${lastErrMsg}`)
          }
        }
        console.log(`[Push] ${tableName}: ${unsynced.length} rows (diproses)`)
      }
      syncStatus.lastSyncedAt=dayjs().format('HH:mm')
    }catch(e){
      console.warn('[Sync] Push manual gagal:', e?.message)
      throw e
    }finally{ isSyncing=false; syncStatus.isSyncing=false; await updateUnsyncedCount() }

    if (summary.failed > 0) console.warn(`[Sync] Selesai push: ${summary.pushed} sukses, ${summary.failed} gagal (akan di-retry).`)
    return summary
  },
  initRealtimePull(){
    this.stopRealtime()
    const toWatch=['products','product_packages','services','categories','units']
    for(const tableName of toWatch){
      const channel = supabase.channel(`realtime-${tableName}`)
        .on('postgres_changes',{event:'*',schema:'public',table:tableName}, async(payload)=>{
          try{
            const isDelete=payload.eventType==='DELETE'
            if(isDelete){
              if(db[tableName]) await db[tableName].update(payload.old.id,{deleted:true,synced:1,updated_at:new Date().toISOString()})
            }else{
              if(db[tableName]) {
                const cache = await buildCategoryCache()
                const normalized = normalizePulledRow(tableName, payload.new, cache)
                await db[tableName].put(normalized)
                if (tableName === 'categories') await resolveCategoryNames()
              }
            }
            syncStatus.pendingPullCount=0
          }catch(err){ console.warn('[Realtime] fail', tableName, err.message) }
        }).subscribe()
      realtimeChannels.push(channel)
    }
  },
  stopRealtime(){ try{ realtimeChannels.forEach(ch=>supabase.removeChannel(ch)) }catch{}; realtimeChannels=[] },
  async init(){
    try{
      if(!db) return
      const updateOnlineStatus=()=>{ syncStatus.isOnline=navigator.onLine }
      window.addEventListener('online', updateOnlineStatus)
      window.addEventListener('offline', updateOnlineStatus)
      this.stopRealtime()

      const prodCount = await db.products.where('deleted').notEqual(true).count().catch(()=>db.products.count().catch(()=>0))
      if(prodCount===0 && navigator.onLine){ await pullAllFromCloud() }
      else{
        if(navigator.onLine){ pullDeltaFromCloud(); checkForCloudUpdates() }
        await updateUnsyncedCount()
      }
      if(navigator.onLine) this.initRealtimePull()
    }catch(e){ if(e.name!=='AbortError') console.error('[Sync] Init error:', e?.message, e) }
  }
}

export const syncService = syncRealtime
export default syncRealtime