import Dexie from 'dexie'

export const db = new Dexie('SinarPagiDB')

db.version(1).stores({
  // Produk (Code/Barcode diindeks untuk scanner)
  products: 'id, code, name, category, price_modal, price_sell, qty, unit, minStock, idealStock, purchasePackName, packQty, packPrice, updatedAt, synced',

  // Paket eceran rokok: 1 batang, 1/2 bks, 1 bks
  product_packages: 'id, productId, name, qty_pcs, price_sell, updatedAt, synced',

  // Kategori
  categories: 'id, name, updatedAt, synced',

  // Transaksi Utama - support TEMPO
  // status: paid | unpaid | partial
  // paymentMethod: CASH | QRIS | TEMPO
  transactions: 'id, date, total, memberId, paymentMethod, amountPaid, paidAmount, remaining, change, status, dueDate, updatedAt, synced',

  // Detail item - 1 baris udah include jasa seduh
  // serviceId null kalau tidak diseduh
  transaction_items: 'id, transactionId, productId, serviceId, updatedAt, synced',

  // Member + saldo utang
  members: 'id, name, phone, address, total_spending, points, debt, updatedAt, synced',

  // Tabel baru untuk cicilan TEMPO
  debt_payments: 'id, transactionId, memberId, date, amount, paymentMethod, updatedAt, synced',

  expenses: 'id, date, category, amount, note, paymentMethod, cashPart, qrisPart, updatedAt, synced',
  digital_transactions: 'id, date, type, provider, nominal, adminFee, adminPaymentMethod, totalReceived, profit, updatedAt, synced',
  services: 'id, name, price, updatedAt, synced',
  units: 'id, name, updatedAt, synced',
  operators: 'id, name, role, pin, updatedAt, synced',
  settings: 'id'
})

export default db