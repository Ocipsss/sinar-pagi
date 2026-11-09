// src/services/sync/mappers.js
import { db } from '../../db'
import { TABLE_COLUMNS } from './schema.js'

// Cache kategori lokal (id -> name, name -> id) untuk lookup cepat
export async function buildCategoryCache() {
  try {
    const cats = await db.categories.toArray()
    const byId = new Map(cats.map(c => [c.id, c.name]))
    const byName = new Map(cats.map(c => [c.name, c.id]))
    return { byId, byName, list: cats }
  } catch {
    return { byId: new Map(), byName: new Map(), list: [] }
  }
}

// ✅ Normalisasi row yang baru ditarik dari Supabase (snake_case) → disamakan dengan Dexie lokal (camelCase)
export function normalizePulledRow(tableName, d, categoryCache = null) {
  const updatedAt = d.updated_at || d.updatedAt || new Date().toISOString()
  const base = { ...d, synced: 1, updatedAt, updated_at: updatedAt }

  if (tableName === 'products') {
    const categoryId = d.category_id || d.categoryId || null
    let categoryName = d.category || null
    if (categoryId && categoryCache?.byId) {
      const resolved = categoryCache.byId.get(categoryId)
      if (resolved) categoryName = resolved
    }
    const imageUrl = d.image_url || d.imageUrl || null
    const imagePublicId = d.image_public_id || d.imagePublicId || null
    const minStock = Number(d.min_stock ?? d.minStock ?? 0)
    const idealStock = Number(d.ideal_stock ?? d.idealStock ?? 0)
    const purchasePackName = d.purchase_pack_name || d.purchasePackName || ''
    const packQty = Number(d.pack_qty ?? d.packQty ?? 0)
    const packPrice = Number(d.pack_price ?? d.packPrice ?? 0)
    const packSize = Number(d.pack_size ?? d.packSize ?? 1)
    const isPublished = d.is_published !== undefined ? !!d.is_published : (d.isPublished !== undefined ? !!d.isPublished : false)
    const priceModal = Number(d.price_modal ?? d.priceModal ?? 0)
    const priceSell = Number(d.price_sell ?? d.priceSell ?? 0)
    const qty = Number(d.qty ?? 0)
    const stock = Number(d.stock ?? 0)

    return {
      ...base, category: categoryName, category_id: categoryId,
      imageUrl, image_url: imageUrl, imagePublicId, image_public_id: imagePublicId,
      minStock, min_stock: minStock, idealStock, ideal_stock: idealStock,
      purchasePackName, purchase_pack_name: purchasePackName,
      packQty, pack_qty: packQty, packPrice, pack_price: packPrice, packSize, pack_size: packSize,
      isPublished, is_published: isPublished, price_modal: priceModal, price_sell: priceSell, qty, stock
    }
  }

  if (tableName === 'transaction_items') {
    const trxId = d.transaction_id || d.transactionId || null
    const prodId = d.product_id || d.productId || null
    const name = d.product_name || d.productName || d.name || 'Barang'
    const price = Number(d.price ?? d.price_sell ?? d.priceSell ?? 0)
    const qty = Number(d.qty ?? d.quantity ?? 1)
    const subtotal = Number(d.subtotal ?? (price * qty))
    return {
      ...base, transactionId: trxId, transaction_id: trxId,
      productId: prodId, product_id: prodId, name, productName: name,
      product_name: name, price, price_sell: price, qty, subtotal
    }
  }

  if (tableName === 'transactions') {
    const memberId = d.member_id || d.memberId || null
    const operatorId = d.operator_id || d.operatorId || null
    const paymentMethod = d.payment_method || d.paymentMethod || 'CASH'
    const amountPaid = Number(d.amount_paid ?? d.amountPaid ?? d.paidAmount ?? d.paid_amount ?? d.pay_amount ?? 0)
    const paidAmount = Number(d.paid_amount ?? d.paidAmount ?? d.amount_paid ?? d.amountPaid ?? d.pay_amount ?? 0)
    const total = Number(d.total ?? d.total_amount ?? 0)
    const change = Number(d.change ?? d.change_amount ?? 0)
    return {
      ...base, memberId, member_id: memberId, operatorId, operator_id: operatorId,
      paymentMethod, payment_method: paymentMethod, amountPaid, amount_paid: amountPaid,
      paidAmount, paid_amount: paidAmount, total, total_amount: Number(d.total_amount ?? d.total ?? 0),
      change, change_amount: Number(d.change_amount ?? d.change ?? 0)
    }
  }

  if (tableName === 'digital_transactions') {
    const adminFee = Number(d.admin_fee ?? d.adminFee ?? 0)
    const adminPaymentMethod = d.admin_payment_method || d.adminPaymentMethod || 'cash'
    const nominal = Number(d.nominal ?? 0)
    const totalReceived = Number(d.total_received ?? d.totalReceived ?? 0)
    return { ...base, adminFee, admin_fee: adminFee, adminPaymentMethod, admin_payment_method: adminPaymentMethod, nominal, totalReceived, total_received: totalReceived }
  }

  if (tableName === 'shopping_list') {
    const productId = d.product_id || d.productId || null
    const isBought = d.is_bought !== undefined ? (d.is_bought ? 1 : 0) : (d.isBought ? 1 : 0)
    const estimatedPrice = Number(d.estimated_price ?? d.estimatedPrice ?? 0)
    const createdAt = d.created_at || d.createdAt || updatedAt
    return { ...base, productId, product_id: productId, isBought, is_bought: !!isBought, estimatedPrice, estimated_price: estimatedPrice, createdAt, created_at: createdAt }
  }

  if (tableName === 'cash_mutations') {
    const accountId = d.account_id || d.accountId || null
    const refId = d.ref_id || d.refId || null
    return { ...base, accountId, account_id: accountId, refId, ref_id: refId }
  }

  if (tableName === 'expenses') {
    const paymentMethod = d.payment_method || d.paymentMethod || 'CASH'
    const cashPart = Number(d.cash_part ?? d.cashPart ?? 0)
    const qrisPart = Number(d.qris_part ?? d.qrisPart ?? 0)
    return { ...base, paymentMethod, payment_method: paymentMethod, cashPart, cash_part: cashPart, qrisPart, qris_part: qrisPart }
  }

  if (tableName === 'debt_payments') {
    const transactionId = d.transaction_id || d.transactionId || null
    const memberId = d.member_id || d.memberId || null
    const paymentMethod = d.payment_method || d.paymentMethod || 'CASH'
    return { ...base, transactionId, transaction_id: transactionId, memberId, member_id: memberId, paymentMethod, payment_method: paymentMethod }
  }

  if (tableName === 'product_packages') {
    const productId = d.product_id || d.productId || null
    return { ...base, productId, product_id: productId }
  }

  if (tableName === 'services') {
    const productId = d.product_id || d.productId || null
    const productIds = d.product_ids || d.productIds || []
    return { ...base, productId, product_id: productId, productIds, product_ids: productIds }
  }

  if (tableName === 'members') {
    const totalSpending = Number(d.total_spending ?? d.totalSpending ?? 0)
    const points = Number(d.points ?? 0)
    const debt = Number(d.debt ?? 0)
    return { ...base, total_spending: totalSpending, totalSpending, points, debt }
  }

  if (tableName === 'operators') {
    const authId = d.auth_id || d.authId || null
    return { ...base, authId, auth_id: authId }
  }

  if (tableName === 'settings') {
    const storeName = d.store_name || d.storeName || ''
    const storeAddress = d.store_address || d.storeAddress || ''
    const storePhone = d.store_phone || d.storePhone || ''
    const receiptFooter = d.receipt_footer || d.receiptFooter || ''
    return { ...base, storeName, store_name: storeName, storeAddress, store_address: storeAddress, storePhone, store_phone: storePhone, receiptFooter, receipt_footer: receiptFooter }
  }

  return base
}

export function sanitizeForPostgres(obj) {
  const NUMERIC_FIELDS = new Set([
    'price', 'buyPrice', 'buy_price', 'price_modal', 'price_sell',
    'stock', 'qty', 'packQty', 'pack_qty', 'packPrice', 'pack_price',
    'packSize', 'pack_size', 'minStock', 'min_stock', 'idealStock', 'ideal_stock',
    'total', 'subtotal', 'discount', 'tax', 'grandTotal', 'grand_total',
    'amountPaid', 'amount_paid', 'paidAmount', 'paid_amount', 'remaining',
    'change', 'amount', 'nominal', 'adminFee', 'admin_fee', 'balance', 'balanceBefore', 'balanceAfter',
    'total_amount', 'pay_amount', 'change_amount', 'total_received',
    'estimated_price', 'price_buy', 'sell_price',
    'cash_part', 'qris_part', 'total_spending', 'points', 'debt',
    'multiplier', 'qty_pcs', 'order', 'price'
  ])
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const val = obj[key]
      if (NUMERIC_FIELDS.has(key)) {
        if (val === '' || val === null || val === undefined || Number.isNaN(val)) { obj[key] = 0 }
        else { obj[key] = Number(val) || 0 }
      } else if (val === '') { obj[key] = null }
    }
  }
  return obj
}

export async function toSupabaseRowFull(item, tableName, categoryCache = null){
  const out = { ...item }
  delete out.imageLocal
  delete out.synced
  delete out.imageSynced

  if (tableName === 'products') {
    const categoryName = out.category
    let categoryId = out.category_id || null
    if (!categoryId && categoryName && categoryCache?.byName) {
      categoryId = categoryCache.byName.get(categoryName) || null
    }
    out.category_id = categoryId
    delete out.category

    out.min_stock = Number(out.minStock ?? out.min_stock ?? 0)
    out.ideal_stock = Number(out.idealStock ?? out.ideal_stock ?? 0)
    out.purchase_pack_name = out.purchasePackName ?? out.purchase_pack_name ?? null
    out.pack_qty = Number(out.packQty ?? out.pack_qty ?? 0)
    out.pack_price = Number(out.packPrice ?? out.pack_price ?? 0)
    out.pack_size = Number(out.packSize ?? out.pack_size ?? 1)
    out.image_url = out.imageUrl ?? out.image_url ?? null
    out.image_public_id = out.imagePublicId ?? out.image_public_id ?? null
    out.is_published = out.isPublished ?? out.is_published ?? true

    if (out.stock !== undefined && out.qty === undefined) out.qty = out.stock
    if (out.qty !== undefined && out.stock === undefined) out.stock = out.qty

    delete out.minStock; delete out.idealStock; delete out.purchasePackName
    delete out.packQty; delete out.packPrice; delete out.packSize
    delete out.imageUrl; delete out.imagePublicId; delete out.isPublished; delete out.updatedAt
  }

  else if (tableName === 'product_packages') {
    out.product_id = out.productId ?? out.product_id ?? null; delete out.productId; delete out.updatedAt;
  }
  else if (tableName === 'categories') { delete out.updatedAt; }
  else if (tableName === 'services') {
    out.product_id = out.productId ?? out.product_id ?? null;
    out.product_ids = out.productIds ?? out.product_ids ?? [];
    if (Array.isArray(out.product_ids)) out.product_ids = JSON.parse(JSON.stringify(out.product_ids));
    delete out.productId; delete out.productIds; delete out.updatedAt;
  }
  else if (tableName === 'units') { delete out.updatedAt; }
  else if (tableName === 'operators') {
    out.auth_id = out.authId ?? out.auth_id ?? null; delete out.authId; delete out.updatedAt;
  }
  else if (tableName === 'settings') {
    out.store_name = out.storeName ?? out.store_name ?? null;
    out.store_address = out.storeAddress ?? out.store_address ?? null;
    out.store_phone = out.storePhone ?? out.store_phone ?? null;
    out.receipt_footer = out.receiptFooter ?? out.receipt_footer ?? null;
    delete out.storeName; delete out.storeAddress; delete out.storePhone; delete out.receiptFooter;
    delete out.updatedAt; delete out.printerPaperSize; delete out.autoPrintReceipt; delete out.theme; delete out.footerNote;
  }
  else if (tableName === 'members') {
    out.total_spending = Number(out.total_spending ?? out.totalSpending ?? 0);
    out.points = Number(out.points ?? 0);
    out.debt = Number(out.debt ?? 0);
    delete out.totalSpending; delete out.updatedAt;
  }
  else if (tableName === 'transactions') {
    out.member_id = out.memberId ?? out.member_id ?? null;
    out.operator_id = out.operatorId ?? out.operator_id ?? null;
    out.payment_method = out.paymentMethod ?? out.payment_method ?? 'CASH';
    const totalVal = Number(out.total ?? 0);
    const amountPaidVal = Number(out.amountPaid ?? out.amount_paid ?? out.paidAmount ?? out.paid_amount ?? out.pay_amount ?? 0);
    const changeVal = Number(out.change ?? out.change_amount ?? 0);
    out.total = totalVal; out.total_amount = totalVal;
    out.amount_paid = amountPaidVal; out.paid_amount = amountPaidVal; out.pay_amount = amountPaidVal;
    out.change = changeVal; out.change_amount = changeVal;
    delete out.memberId; delete out.operatorId; delete out.paymentMethod; delete out.amountPaid; delete out.paidAmount; delete out.updatedAt;
  }
  else if (tableName === 'transaction_items') {
    out.transaction_id = out.transactionId ?? out.transaction_id ?? null;
    out.product_id = out.productId ?? out.product_id ?? null;
    out.service_id = out.serviceId ?? out.service_id ?? null;
    out.product_name = out.productName ?? out.product_name ?? out.name ?? 'Barang';
    out.price = Number(out.price ?? out.price_sell ?? out.priceSell ?? 0);
    out.qty = Number(out.qty ?? out.quantity ?? 1);
    out.subtotal = Number(out.subtotal ?? (out.price * out.qty));
    delete out.transactionId; delete out.productId; delete out.serviceId;
    delete out.productName; delete out.name; delete out.price_sell; delete out.priceSell; delete out.quantity; delete out.updatedAt;
  }
  else if (tableName === 'cash_accounts') { delete out.updatedAt; }
  else if (tableName === 'cash_mutations') {
    out.account_id = out.accountId ?? out.account_id ?? null;
    out.ref_id = out.refId ?? out.ref_id ?? null;
    delete out.accountId; delete out.refId; delete out.updatedAt;
  }
  else if (tableName === 'expenses') {
    out.payment_method = out.paymentMethod ?? out.payment_method ?? 'CASH';
    out.cash_part = Number(out.cash_part ?? out.cashPart ?? 0);
    out.qris_part = Number(out.qris_part ?? out.qrisPart ?? 0);
    delete out.paymentMethod; delete out.cashPart; delete out.qrisPart; delete out.updatedAt;
  }
  else if (tableName === 'debt_payments') {
    out.transaction_id = out.transactionId ?? out.transaction_id ?? null;
    out.member_id = out.memberId ?? out.member_id ?? null;
    out.payment_method = out.paymentMethod ?? out.payment_method ?? 'CASH';
    delete out.transactionId; delete out.memberId; delete out.paymentMethod; delete out.updatedAt;
  }
  else if (tableName === 'digital_transactions') {
    out.admin_fee = Number(out.adminFee ?? out.admin_fee ?? 0);
    out.admin_payment_method = out.adminPaymentMethod ?? out.admin_payment_method ?? 'CASH';
    out.total_received = Number(out.totalReceived ?? out.total_received ?? 0);
    delete out.adminFee; delete out.adminPaymentMethod; delete out.totalReceived; delete out.updatedAt;
  }
  else if (tableName === 'shopping_list') {
    out.product_id = out.productId ?? out.product_id ?? null;
    const isBoughtVal = out.isBought ?? out.is_bought;
    out.is_bought = !!(isBoughtVal === true || isBoughtVal === 1 || isBoughtVal === '1');
    out.estimated_price = Number(out.estimatedPrice ?? out.estimated_price ?? 0);
    out.created_at = out.createdAt ?? out.created_at ?? out.updatedAt ?? new Date().toISOString();
    delete out.productId; delete out.isBought; delete out.estimatedPrice; delete out.createdAt; delete out.updatedAt;
  }

  if (!out.updated_at) { out.updated_at = out.updatedAt || new Date().toISOString(); }
  delete out.updatedAt;

  const allowed = TABLE_COLUMNS[tableName]
  if (allowed) {
    const allowedSet = new Set(allowed)
    for (const key of Object.keys(out)) {
      if (!allowedSet.has(key)) { delete out[key] }
    }
  }
  return sanitizeForPostgres(out)
}

export async function resolveCategoryNames() {
  try {
    const cats = await db.categories.toArray()
    if (!cats.length) return
    const byId = new Map(cats.map(c => [c.id, c.name]))
    const products = await db.products.toArray()
    let updated = 0
    for (const p of products) {
      if (p.category_id && !p.category) {
        const name = byId.get(p.category_id)
        if (name) { await db.products.update(p.id, { category: name }); updated++; }
      }
    }
    if (updated > 0) console.log(`[Sync] resolveCategoryNames: ${updated} produk diperbarui kategori-nya.`)
  } catch (e) {
    if (e.name !== 'AbortError') console.warn('[Sync] resolveCategoryNames gagal:', e.message)
  }
}