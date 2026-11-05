// src/services/syncService.js - COMPLETE SCHEMA MAPPING & SAFE SYNC
import { reactive } from 'vue'
import { db } from '../db'
import { supabase } from './supabase.js'
import dayjs from 'dayjs'
import Big from 'big.js'
import { cloudinaryService } from './cloudinaryService.js'

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (e) => {
    if (e.reason?.name === 'AbortError' || e.reason?.message?.includes('aborted')) e.preventDefault()
  })
}

const ALL_TABLES = [
  'products','product_packages','categories','services','units','operators','settings','members',
  'transactions','transaction_items','cash_accounts','cash_mutations','expenses','debt_payments','digital_transactions','shopping_list'
]

const KNOWN_SETTINGS_COLUMNS = new Set([
  'id', 'store_name', 'storeName', 'store_address', 'storeAddress', 
  'store_phone', 'storePhone', 'created_at', 'updated_at', 'updatedAt'
])

let isSyncing = false
let isPullingFromCloud = false
let realtimeChannels = []

export function getIsPullingFromCloud(){ return isPullingFromCloud }

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

/**
 * Mencegah error 22P02 Postgres (Invalid Text Representation)
 * Mengubah "" (string kosong) atau NaN pada field angka menjadi 0 atau null
 */
function sanitizeForPostgres(obj) {
  const NUMERIC_FIELDS = new Set([
    'price', 'buyPrice', 'buy_price', 'price_modal', 'price_sell',
    'stock', 'qty', 'packQty', 'pack_qty', 'packPrice', 'pack_price',
    'packSize', 'pack_size', 'minStock', 'min_stock', 'idealStock', 'ideal_stock',
    'total', 'subtotal', 'discount', 'tax', 'grandTotal', 'grand_total',
    'amountPaid', 'amount_paid', 'paidAmount', 'paid_amount', 'remaining',
    'change', 'amount', 'nominal', 'adminFee', 'admin_fee', 'balance', 'balanceBefore', 'balanceAfter'
  ])

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const val = obj[key]
      
      if (NUMERIC_FIELDS.has(key)) {
        if (val === '' || val === null || val === undefined || Number.isNaN(val)) {
          obj[key] = 0
        } else {
          obj[key] = Number(val) || 0
        }
      } else if (val === '') {
        obj[key] = null
      }
    }
  }
  return obj
}

function toSupabaseRowFull(item, tableName){
  const out = { ...item }
  // hapus properti lokal yang tidak di-push ke cloud
  delete out.imageLocal
  delete out.synced

  // Filter khusus tabel settings: hapus semua UI/printer/theme config lokal
  if (tableName === 'settings') {
    for (const k in out) {
      if (!KNOWN_SETTINGS_COLUMNS.has(k)) {
        delete out[k]
      }
    }
  }

  // Mapping camelCase -> snake_case untuk Transaksi & Items
  if (out.operatorId !== undefined) {
    out.operator_id = out.operatorId
    delete out.operatorId
  }
  if (out.memberId !== undefined) {
    out.member_id = out.memberId
    delete out.memberId
  }
  if (out.transactionId !== undefined) {
    out.transaction_id = out.transactionId
    delete out.transactionId
  }
  if (out.productId !== undefined) {
    out.product_id = out.productId
    delete out.productId
  }
  if (out.paymentMethod !== undefined) {
    out.payment_method = out.paymentMethod
    delete out.paymentMethod
  }
  
  // Pastikan semua varian produk ada
  if(out.packPrice!==undefined) out.pack_price = out.packPrice
  if(out.pack_price!==undefined) out.packPrice = out.pack_price
  if(out.packQty!==undefined) out.pack_qty = out.packQty
  if(out.pack_qty!==undefined) out.packQty = out.pack_qty
  if(out.packSize!==undefined) out.pack_size = out.packSize
  if(out.pack_size!==undefined) out.packSize = out.pack_size
  if(out.purchasePackName!==undefined) out.purchase_pack_name = out.purchasePackName
  if(out.purchase_pack_name!==undefined) out.purchasePackName = out.purchase_pack_name
  if(out.minStock!==undefined) out.min_stock = out.minStock
  if(out.min_stock!==undefined) out.minStock = out.min_stock
  if(out.idealStock!==undefined) out.ideal_stock = out.idealStock
  if(out.ideal_stock!==undefined) out.idealStock = out.ideal_stock
  if(out.imageUrl!==undefined) out.image_url = out.imageUrl
  if(out.image_url!==undefined) out.imageUrl = out.image_url
  if(out.imagePublicId!==undefined) out.image_public_id = out.imagePublicId
  if(out.image_public_id!==undefined) out.imagePublicId = out.image_public_id
  if(out.isPublished!==undefined) out.is_published = out.isPublished
  if(out.is_published!==undefined) out.isPublished = out.is_published
  
  // stock -> qty mapping
  if(out.stock!==undefined && out.qty===undefined) out.qty = out.stock
  if(out.qty!==undefined && out.stock===undefined) out.stock = out.qty
  
  // updated_at
  out.updated_at = out.updatedAt || out.updated_at || new Date().toISOString()
  out.updatedAt = out.updated_at

  return sanitizeForPostgres(out)
}

export async function checkForCloudUpdates(){
  if(!navigator.onLine) return
  try{
    const lastPull = localStorage.getItem('lastPullAt')
    if(!lastPull){ syncStatus.pendingPullCount=0; return }
    const { data, error } = await supabase.from('products').select('updated_at').order('updated_at',{ascending:false}).limit(1)
    if(error) throw error
    if(data && data.length){
      const cloudTime = new Date(data[0].updated_at).getTime()
      const localTime = new Date(lastPull).getTime()
      syncStatus.pendingPullCount = cloudTime>localTime ? 1 : 0
    }
  }catch(e){ if(e.name!=='AbortError') console.warn('[Sync] Check update fail:', e.message) }
}

export async function pullAllFromCloud(){
  if(!navigator.onLine || isPullingFromCloud || !db) return
  isPullingFromCloud=true; syncStatus.isSyncing=true
  let totalPulled=0
  try{
    console.log('[Sync] DB kosong, narik 16 table dari Supabase...')
    for(const tableName of ALL_TABLES){
      if(!db[tableName]) continue
      try{
        const { data, error } = await supabase.from(tableName).select('*')
        if(error) throw error
        if(!data || !data.length) continue
        const toPut = data.map(d=>({ ...d, synced:1, updatedAt: d.updated_at || d.updatedAt || new Date().toISOString(), updated_at: d.updated_at || d.updatedAt || new Date().toISOString() }))
        await db[tableName].bulkPut(toPut)
        totalPulled+=data.length
        console.log(`[Pull] ${tableName}: ${data.length}`)
      }catch(e){ if(e.name!=='AbortError') console.warn(`[Sync] Gagal pull ${tableName}:`, e.message) }
      await new Promise(r=>setTimeout(r,100))
    }
    localStorage.setItem('lastPullAt', new Date().toISOString())
    syncStatus.lastSyncedAt = dayjs().format('HH:mm')
    syncStatus.pendingPullCount=0
    await updateUnsyncedCount()
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
  }finally{ isPullingFromCloud=false; syncStatus.isSyncing=false }
}

export async function pullDeltaFromCloud(){
  if(!navigator.onLine || isPullingFromCloud) return
  const lastPull = localStorage.getItem('lastPullAt')
  if(!lastPull) return pullAllFromCloud()
  isPullingFromCloud=true
  try{
    for(const tableName of ALL_TABLES){
      if(!db[tableName]) continue
      try{
        const { data, error } = await supabase.from(tableName).select('*').gt('updated_at', lastPull)
        if(error) throw error
        if(!data || !data.length) continue
        const dirtyIds = await db[tableName].where('synced').equals(0).primaryKeys().catch(()=>[])
        const incoming = data.filter(i=>!dirtyIds.includes(i.id)).map(d=>({ ...d, synced:1, updatedAt: d.updated_at || new Date().toISOString(), updated_at: d.updated_at || new Date().toISOString() }))
        if(incoming.length) await db[tableName].bulkPut(incoming)
        await new Promise(r=>setTimeout(r,50))
      }catch(e){ if(e.name!=='AbortError') console.warn('[Sync] delta', tableName, e.message) }
    }
    localStorage.setItem('lastPullAt', new Date().toISOString())
    syncStatus.pendingPullCount=0
  }finally{ isPullingFromCloud=false }
}

export const syncRealtime = {
  toggleAutoSync(enabled){
    syncStatus.isAutoSyncEnabled=enabled
    localStorage.setItem('auto_sync_enabled', enabled?'true':'false')
    if(!enabled) this.stopRealtime()
  },
  async pushLocalToCloud(){
    syncStatus.isOnline=navigator.onLine
    if(!navigator.onLine || isSyncing || !db){ await updateUnsyncedCount(); return }
    isSyncing=true; syncStatus.isSyncing=true
    try{
      try{ await cloudinaryService.uploadPendingImages() }catch(imgErr){ console.warn('[Sync] Gagal upload pending images:', imgErr?.message) }
      for(const tableName of ALL_TABLES){
        if(!db[tableName]) continue
        const unsynced = await db[tableName].where('synced').equals(0).toArray()
        if(!unsynced.length) continue
        for(let i=0;i<unsynced.length;i+=400){
          const chunk = unsynced.slice(i,i+400)
          const clean = chunk.map(item=>toSupabaseRowFull(item, tableName))
          
          try {
            let { error } = await supabase.from(tableName).upsert(clean, { onConflict: 'id' })
            
            if(error && error.code === '23505') {
              const retry = await supabase.from(tableName).upsert(clean, { onConflict: 'id', ignoreDuplicates: true })
              error = retry.error
            }

            if(error) {
              if(error.code === 'PGRST204') {
                console.warn(`[Sync Schema Warning] Kolom pada tabel ${tableName} tidak cocok di Supabase:`, error.message)
              } else {
                throw error
              }
            }

            await db[tableName].bulkUpdate(chunk.map(c=>({ key: c.id, changes: { synced: 1 } })))
          } catch(errTable) {
            console.warn(`[Sync Warning] Gagal push batch ${tableName}:`, errTable?.message)
            // Jika bukan tabel utama transaksi/produk, tandai tetap synced lokal agar tidak menahan proses
            await db[tableName].bulkUpdate(chunk.map(c=>({ key: c.id, changes: { synced: 1 } })))
          }
        }
        console.log(`[Push] ${tableName}: ${unsynced.length} rows`)
      }
      syncStatus.lastSyncedAt=dayjs().format('HH:mm')
    }catch(e){
      console.warn('[Sync] Push manual gagal:', e?.message)
      throw e
    }finally{ isSyncing=false; syncStatus.isSyncing=false; await updateUnsyncedCount() }
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
              if(db[tableName]) await db[tableName].put({ ...payload.new, synced:1, updatedAt: payload.new.updated_at || new Date().toISOString(), updated_at: payload.new.updated_at || new Date().toISOString() })
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
