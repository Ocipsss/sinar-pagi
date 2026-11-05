// src/db/index.js - VERSI SUPABASE (Dexie tetap, tapi support updated_at + auth_id)
import Dexie from 'dexie'

export const db = new Dexie('SinarPagiDB')

db.version(1).stores({
  products: 'id, code, name, category, price_modal, price_sell, qty, unit, minStock, idealStock, purchasePackName, packQty, packPrice, updatedAt, updated_at, synced, imageSynced, deleted',
  product_packages: 'id, productId, name, order, qty_pcs, price_sell, updatedAt, updated_at, synced, deleted',
  categories: 'id, name, updatedAt, updated_at, synced, deleted',
  transactions: 'id, date, total, memberId, paymentMethod, amountPaid, paidAmount, remaining, change, status, dueDate, updatedAt, updated_at, synced',
  transaction_items: 'id, transactionId, productId, serviceId, updatedAt, updated_at, synced',
  members: 'id, name, phone, address, total_spending, points, debt, updatedAt, updated_at, synced, deleted',
  debt_payments: 'id, transactionId, memberId, date, amount, paymentMethod, updatedAt, updated_at, synced',
  shopping_list: 'id, productId, isBought, category, updatedAt, updated_at, synced',
  cash_accounts: 'id, name, type, balance, updatedAt, updated_at, synced, deleted',
  cash_mutations: 'id, date, accountId, type, amount, category, note, refId, updatedAt, updated_at, synced',
  expenses: 'id, date, category, amount, note, paymentMethod, cashPart, qrisPart, updatedAt, updated_at, synced',
  digital_transactions: 'id, date, type, provider, nominal, adminFee, adminPaymentMethod, totalReceived, profit, updatedAt, updated_at, synced',
  services: 'id, name, price, category, productId, *productIds, updatedAt, updated_at, synced, deleted',
  units: 'id, name, updatedAt, updated_at, synced, deleted',
  operators: 'id, name, role, pin, auth_id, updatedAt, updated_at, synced, deleted',
  settings: 'id, updatedAt, updated_at, synced'
})

// Migrasi lokal otomatis sekali jalan saat DB siap
db.on('ready', async () => {
  try {
    await db.services.toCollection().modify(service => {
      if (service.deleted === 0) service.deleted = false
      if (service.deleted === 1) service.deleted = true
    })
  } catch (e) {
    console.warn('[DB Migration] Gagal konversi deleted service ke Boolean:', e)
  }
})

export default db
