import Dexie from 'dexie'

export const db = new Dexie('SinarPagiDB')

db.version(2).stores({
  products: 'id, code, name, category, price_modal, price_sell, qty, unit, minStock, idealStock, purchasePackName, packQty, packPrice, updatedAt, synced',
  product_packages: 'id, productId, name, qty_pcs, price_sell, updatedAt, synced',
  categories: 'id, name, updatedAt, synced',
  transactions: 'id, date, total, memberId, paymentMethod, amountPaid, paidAmount, remaining, change, status, dueDate, updatedAt, synced',
  transaction_items: 'id, transactionId, productId, serviceId, updatedAt, synced',
  members: 'id, name, phone, address, total_spending, points, debt, updatedAt, synced',
  debt_payments: 'id, transactionId, memberId, date, amount, paymentMethod, updatedAt, synced',
  shopping_list: 'id, productId, isBought, category, updatedAt, synced',
  cash_accounts: 'id, name, type, balance, updatedAt, synced',
  cash_mutations: 'id, date, accountId, type, amount, category, note, refId, updatedAt, synced',
  expenses: 'id, date, category, amount, note, paymentMethod, cashPart, qrisPart, updatedAt, synced',
  digital_transactions: 'id, date, type, provider, nominal, adminFee, adminPaymentMethod, totalReceived, profit, updatedAt, synced',
  services: 'id, name, price, updatedAt, synced',
  units: 'id, name, updatedAt, synced',
  operators: 'id, name, role, pin, updatedAt, synced',
  settings: 'id, updatedAt, synced'
})

/*
// --- DEXIE HOOKS DENGAN DEBOUNCE UNTUK AUTOMATIC CLOUD SYNC ---
let syncServiceInstance = null
let getIsPullingFromCloudFn = null
let syncStatusRef = null
let syncTimeoutId = null // Timer penampung Debounce

const triggerDebouncedSync = () => {
  // Jika perubahan berasal dari download Realtime Pull, jangan dipush balik
  if (getIsPullingFromCloudFn && getIsPullingFromCloudFn()) {
    return
  }

  // Batal timer sebelumnya jika ada aktivitas penulisan baru yang berdekatan
  if (syncTimeoutId) {
    clearTimeout(syncTimeoutId)
  }

  // Pasang timer jeda 1.5 detik (1500ms)
  syncTimeoutId = setTimeout(() => {
    if (!syncServiceInstance) {
      import('../services/syncService.js').then(module => {
        syncServiceInstance = module.syncRealtime || module.default
        getIsPullingFromCloudFn = module.getIsPullingFromCloud
        syncStatusRef = module.syncStatus
        
        if (syncStatusRef?.isAutoSyncEnabled && (!getIsPullingFromCloudFn || !getIsPullingFromCloudFn())) {
          syncServiceInstance?.pushLocalToCloud()
        }
      })
    } else {
      if (syncStatusRef?.isAutoSyncEnabled) {
        syncServiceInstance.pushLocalToCloud()
      }
    }
  }, 1500)
}

// Pasang hook pada semua tabel
db.tables.forEach(table => {
  table.hook('creating', function (primKey, obj, transaction) {
    transaction.on('complete', () => {
      triggerDebouncedSync()
    })
  })

  table.hook('updating', function (mods, primKey, obj, transaction) {
    if (mods.synced === 0 || !('synced' in mods)) {
      transaction.on('complete', () => {
        triggerDebouncedSync()
      })
    }
  })

  table.hook('deleting', function (primKey, obj, transaction) {
    transaction.on('complete', () => {
      triggerDebouncedSync()
    })
  })
})

*/

export default db
