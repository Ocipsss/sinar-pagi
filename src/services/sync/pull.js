// src/services/sync/pull.js
import { db } from '../../db'
import { supabase } from '../supabase.js'
import dayjs from 'dayjs'
import { ALL_TABLES } from './schema.js'
import { buildCategoryCache, normalizePulledRow, resolveCategoryNames } from './mappers.js'

// State lokal untuk mencegah tarik data ganda
let isPullingFromCloud = false
let updateUnsyncedCountCallback = null

// Fungsi untuk mendaftarkan callback update count dari file utama
export function registerPullCallbacks(callback) {
  updateUnsyncedCountCallback = callback
}

export function getIsPullingFromCloud() { return isPullingFromCloud }

// Status reactive di-inject dari luar agar tidak circular
export let syncStatus = null
export function injectSyncStatus(statusObj) { syncStatus = statusObj }

export async function checkForCloudUpdates(){
  if(!navigator.onLine) return
  try{
    const lastPull = localStorage.getItem('lastPullAt')
    if(!lastPull){ if(syncStatus) syncStatus.pendingPullCount=0; return }
    const { data, error } = await supabase.from('products').select('updated_at').order('updated_at',{ascending:false}).limit(1)
    if(error) throw error
    if(data && data.length){
      const cloudTime = new Date(data[0].updated_at).getTime()
      const localTime = new Date(lastPull).getTime()
      if(syncStatus) syncStatus.pendingPullCount = cloudTime>localTime ? 1 : 0
    }
  }catch(e){ if(e.name!=='AbortError') console.warn('[Sync] Check update fail:', e.message) }
}

export async function pullAllFromCloud(){
  if(!navigator.onLine || isPullingFromCloud || !db) return
  isPullingFromCloud=true; if(syncStatus) syncStatus.isSyncing=true
  let totalPulled=0
  try{
    console.log('[Sync] DB kosong, narik 16 table dari Supabase...')
    const categoryCache = await buildCategoryCache()

    for(const tableName of ALL_TABLES){
      if(!db[tableName]) continue
      try{
        const { data, error } = await supabase.from(tableName).select('*')
        if(error) throw error
        if(!data || !data.length) continue
        const toPut = data.map(d => normalizePulledRow(tableName, d, categoryCache))
        await db[tableName].bulkPut(toPut)
        totalPulled+=data.length
        console.log(`[Pull] ${tableName}: ${data.length}`)

        if (tableName === 'categories') {
          const fresh = await buildCategoryCache()
          categoryCache.byId = fresh.byId
          categoryCache.byName = fresh.byName
        }
      }catch(e){ if(e.name!=='AbortError') console.warn(`[Sync] Gagal pull ${tableName}:`, e.message) }
      await new Promise(r=>setTimeout(r,100))
    }
    await resolveCategoryNames()

    localStorage.setItem('lastPullAt', new Date().toISOString())
    if(syncStatus) {
      syncStatus.lastSyncedAt = dayjs().format('HH:mm')
      syncStatus.pendingPullCount=0
    }
    
    if (updateUnsyncedCountCallback) await updateUnsyncedCountCallback()

    if(totalPulled>0){
      const hasReloaded = sessionStorage.getItem('hasReloadedAfterFirstPull')
      if(!hasReloaded){
        console.log('[Sync] First pull selesai, reload sekali biar store ke-load')
        sessionStorage.setItem('hasReloadedAfterFirstPull','1')
        setTimeout(()=>window.location.reload(),600)
      }
    }else{
      console.log('[Sync] Supabase masih kosong (0 rows), skip reload - silakan Import JSON dulu')
    }
  }finally{ isPullingFromCloud=false; if(syncStatus) syncStatus.isSyncing=false }
}

export async function pullDeltaFromCloud(){
  if(!navigator.onLine || isPullingFromCloud) return
  const lastPull = localStorage.getItem('lastPullAt')
  if(!lastPull) return pullAllFromCloud()
  isPullingFromCloud=true
  try{
    const categoryCache = await buildCategoryCache()

    for(const tableName of ALL_TABLES){
      if(!db[tableName]) continue
      try{
        const { data, error } = await supabase.from(tableName).select('*').gt('updated_at', lastPull)
        if(error) throw error
        if(!data || !data.length) continue
        const dirtyIds = await db[tableName].where('synced').equals(0).primaryKeys().catch(()=>[])
        const incoming = data
          .filter(i => !dirtyIds.includes(i.id))
          .map(d => normalizePulledRow(tableName, d, categoryCache))
        if(incoming.length) await db[tableName].bulkPut(incoming)

        if (tableName === 'categories') {
          const fresh = await buildCategoryCache()
          categoryCache.byId = fresh.byId
          categoryCache.byName = fresh.byName
        }

        await new Promise(r=>setTimeout(r,50))
      }catch(e){ if(e.name!=='AbortError') console.warn('[Sync] delta', tableName, e.message) }
    }
    await resolveCategoryNames()

    localStorage.setItem('lastPullAt', new Date().toISOString())
    if(syncStatus) syncStatus.pendingPullCount=0
  }finally{ isPullingFromCloud=false }
}