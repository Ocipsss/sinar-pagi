import Dexie from 'dexie'

export const db = new Dexie('SinarPagiDB')

db.version(1).stores({
  // Produk (Code/Barcode diindeks untuk scanner)
  products: 'id, code, name, category, price_modal, price_sell, qty, unit, minStock, idealStock, purchasePackName, packQty, packPrice, updatedAt, synced',

  // Paket eceran rokok: 1 batang, 1/2 bks, 1 bks
  product_packages: 'id, productId, name, qty_pcs, price_sell, updatedAt, synced',

  // Kategori
  categories: 'id, name, updatedAt, synced',

  // Transaksi Utama - support TEMPO & query piutang/remaining
  transactions: 'id, date, total, memberId, paymentMethod, amountPaid, paidAmount, remaining, change, status, dueDate, updatedAt, synced',

  // Detail item
  transaction_items: 'id, transactionId, productId, serviceId, updatedAt, synced',

  // Member + saldo utang
  members: 'id, name, phone, address, total_spending, points, debt, updatedAt, synced',

  // Tabel cicilan TEMPO
  debt_payments: 'id, transactionId, memberId, date, amount, paymentMethod, updatedAt, synced',

  // Tabel Daftar Belanja Kulakan
  shopping_list: 'id, productId, isBought, category, updatedAt, synced',
  cash_accounts: 'id, name, type, balance, updatedAt, synced',
  cash_mutations: 'id, date, accountId, type, amount, category, note, refId, updatedAt, synced',

  expenses: 'id, date, category, amount, note, paymentMethod, cashPart, qrisPart, updatedAt, synced',
  digital_transactions: 'id, date, type, provider, nominal, adminFee, adminPaymentMethod, totalReceived, profit, updatedAt, synced',
  services: 'id, name, price, updatedAt, synced',
  units: 'id, name, updatedAt, synced',
  operators: 'id, name, role, pin, updatedAt, synced',
  settings: 'id'
})

export default db
