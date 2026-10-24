
// src/db/index.js - v3 CLOUDINARY SUPPORT
import Dexie from 'dexie'

export const db = new Dexie('SinarPagiDB')

db.version(3).stores({
  products: 'id, code, name, category, price_modal, price_sell, qty, unit, minStock, idealStock, purchasePackName, packQty, packPrice, updatedAt, synced, imageSynced, deleted',
  product_packages: 'id, productId, name, qty_pcs, price_sell, updatedAt, synced, deleted',
  categories: 'id, name, updatedAt, synced, deleted',
  transactions: 'id, date, total, memberId, paymentMethod, amountPaid, paidAmount, remaining, change, status, dueDate, updatedAt, synced',
  transaction_items: 'id, transactionId, productId, serviceId, updatedAt, synced',
  members: 'id, name, phone, address, total_spending, points, debt, updatedAt, synced, deleted',
  debt_payments: 'id, transactionId, memberId, date, amount, paymentMethod, updatedAt, synced',
  shopping_list: 'id, productId, isBought, category, updatedAt, synced',
  cash_accounts: 'id, name, type, balance, updatedAt, synced, deleted',
  cash_mutations: 'id, date, accountId, type, amount, category, note, refId, updatedAt, synced',
  expenses: 'id, date, category, amount, note, paymentMethod, cashPart, qrisPart, updatedAt, synced',
  digital_transactions: 'id, date, type, provider, nominal, adminFee, adminPaymentMethod, totalReceived, profit, updatedAt, synced',
  services: 'id, name, price, updatedAt, synced, deleted',
  units: 'id, name, updatedAt, synced, deleted',
  operators: 'id, name, role, pin, updatedAt, synced, deleted',
  settings: 'id, updatedAt, synced'
}).upgrade(tx => {
  // migrasi dari v2 ke v3: set default imageSynced=1 buat produk lama yang ga ada gambar
  return tx.table('products').toCollection().modify(p => {
    if (p.imageSynced === undefined) p.imageSynced = 1
    if (p.deleted === undefined) p.deleted = false
  })
})

export default db
