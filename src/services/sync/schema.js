// src/services/sync/schema.js
import { db } from '../../db'

// ✅ FIX (3.13): ALL_TABLES sekarang otomatis dibaca dari schema Dexie.
// Filter untuk membuang tabel internal Dexie.
export const ALL_TABLES = db.tables
  .map(t => t.name)
  .filter(name => !name.startsWith('_'))

// Whitelist kolom per tabel sesuai schema Supabase.
// Hanya kolom di whitelist yang akan dikirim ke cloud.
export const TABLE_COLUMNS = {
  products: [
    'id', 'category_id', 'code', 'name', 'price_modal', 'price_sell',
    'qty', 'stock', 'unit', 'min_stock', 'ideal_stock', 'purchase_pack_name',
    'pack_qty', 'pack_price', 'pack_size', 'image_url', 'image_public_id',
    'is_published', 'is_active', 'deleted', 'created_at', 'updated_at',
    'barcode', 'price_buy', 'sell_price'
  ],
  product_packages: [
    'id', 'product_id', 'name', 'multiplier', 'qty_pcs', 'price_sell',
    'order', 'deleted', 'created_at', 'updated_at', 'product_id_alt'
  ],
  categories: [
    'id', 'name', 'deleted', 'created_at', 'updated_at'
  ],
  services: [
    'id', 'name', 'price', 'category', 'product_id', 'product_ids',
    'deleted', 'created_at', 'updated_at'
  ],
  units: [
    'id', 'name', 'deleted', 'created_at', 'updated_at'
  ],
  operators: [
    'id', 'auth_id', 'name', 'role', 'pin', 'deleted', 'created_at', 'updated_at'
  ],
  settings: [
    'id', 'store_name', 'store_address', 'store_phone', 'created_at', 'updated_at',
    'receipt_footer', 'qris_url', 'merchant_name', 'nmid'
  ],
  members: [
    'id', 'name', 'phone', 'address', 'total_spending', 'points', 'debt',
    'deleted', 'created_at', 'updated_at'
  ],
  transactions: [
    'id', 'invoice_no', 'date', 'total', 'total_amount', 'amount_paid',
    'paid_amount', 'pay_amount', 'remaining', 'change', 'change_amount',
    'payment_method', 'status', 'due_date', 'member_id', 'operator_id',
    'notes', 'created_at', 'updated_at'
  ],
  transaction_items: [
    'id', 'transaction_id', 'product_id', 'service_id', 'product_name',
    'qty', 'price', 'subtotal', 'service_type', 'created_at', 'updated_at'
  ],
  cash_accounts: [
    'id', 'name', 'type', 'balance', 'deleted', 'created_at', 'updated_at'
  ],
  cash_mutations: [
    'id', 'account_id', 'date', 'type', 'amount', 'category', 'note', 'ref_id',
    'created_at', 'updated_at'
  ],
  expenses: [
    'id', 'date', 'category', 'amount', 'note', 'payment_method',
    'cash_part', 'qris_part', 'created_at', 'updated_at'
  ],
  debt_payments: [
    'id', 'transaction_id', 'member_id', 'date', 'amount', 'payment_method',
    'created_at', 'updated_at'
  ],
  digital_transactions: [
    'id', 'date', 'type', 'provider', 'nominal', 'admin_fee',
    'admin_payment_method', 'total_received', 'profit', 'created_at', 'updated_at'
  ],
  shopping_list: [
    'id', 'product_id', 'is_bought', 'category', 'name', 'qty', 'unit',
    'estimated_price', 'notes', 'created_at', 'updated_at'
  ]
}