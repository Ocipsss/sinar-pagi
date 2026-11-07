// src/db/repositories/transactionRepository.js
import { db } from '../index.js'
import dayjs from 'dayjs'

// ✅ FIX: Helper normalisasi item transaksi
// Menangani perbedaan field antara:
// - Dexie lokal (camelCase): transactionId, productId, productName, price_sell
// - Supabase/JSON sanitasi (snake_case): transaction_id, product_id, product_name, price
// - Tipe boolean vs number pada field `deleted`
function normalizeItem(item) {
  const trxId = item.transaction_id || item.transactionId || null
  const prodId = item.product_id || item.productId || null
  const name = item.product_name || item.productName || item.name || 'Barang'
  const price = Number(item.price || item.price_sell || item.priceSell || 0)
  const qty = Number(item.qty || item.quantity || 1)
  const subtotal = Number(item.subtotal || (price * qty))

  return {
    ...item,
    // ✅ Normalisasi ID relasi (dua-duanya di-set biar aman)
    transactionId: trxId,
    transaction_id: trxId,
    productId: prodId,
    product_id: prodId,
    // ✅ Normalisasi nama produk (dua-duanya di-set)
    name,
    productName: name,
    product_name: name,
    // ✅ Normalisasi harga & qty
    price,
    price_sell: price,
    qty,
    subtotal
  }
}

// ✅ FIX: Filter soft-delete yang toleran terhadap boolean/number/string/undefined
// Item baru (dari checkout) tidak punya field `deleted` → dianggap belum dihapus.
function isNotDeleted(item) {
  const d = item?.deleted
  return d !== true && d !== 1 && d !== 'true'
}

export const transactionRepo = {
  getAll: async () => {
    const list = await db.transactions.toArray()
    return list.filter(t => isNotDeleted(t))
  },

  getById: (id) => db.transactions.get(id),

  getToday: () => db.transactions.where('date').aboveOrEqual(dayjs().startOf('day').toISOString()).toArray(),

  create: (data) => db.transactions.add(data),

  // ✅ FIX: Filter pakai isNotDeleted() + normalisasi lewat normalizeItem()
  getItemsByTransactionId: async (transactionId) => {
    const items = await db.transaction_items.toArray()
    return items
      .filter(i => {
        const trxId = i.transaction_id || i.transactionId
        return trxId === transactionId && isNotDeleted(i)
      })
      .map(normalizeItem)
  },

  // ✅ FIX: Normalisasi `transactionId` dari `transaction_id` (akar masalah detail tidak tampil)
  getAllItems: async () => {
    const items = await db.transaction_items.toArray()
    return items
      .filter(isNotDeleted)
      .map(normalizeItem)
  }
}