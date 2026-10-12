# MEMORY-V1.8.md — Sinar Pagi POS Master Documentation

> **Generated:** 12 Oktober 2026[span_0](start_span)[span_0](end_span)
> **Project:** Sinar Pagi POS (Offline-First Warung Application)[span_1](start_span)[span_1](end_span)
> **Previous Version:** MEMORY-V1.7.md[span_2](start_span)[span_2](end_span)

---

## 1. Executive Summary & Change Log (v1.7 → v1.8)

Pembaruan versi 1.8 berfokus pada **Penyelarasan Source Code Secara Menyeluruh**, **Verifikasi Proteksi Akses & Sesi Operator**, **Manajemen Multi-Cart Pending Transaksi**, serta **Konsolidasi Seluruh Modul Operasional Toko**:

1. **Sesi Operator & Route Guard (`operatorStore.js` & `router/index.js`):**
   - Otentikasi kasir/operator menggunakan Pinia (`operatorStore`) dengan skema otorisasi PIN[span_3](start_span)[span_3](end_span).
   - Penerapan `router.beforeEach` untuk memproteksi seluruh *route* aplikasi dari akses tanpa login shift[span_4](start_span)[span_4](end_span).
   - Pengoperasian `Sidebar.vue` dan `Login.vue` untuk beralih *shift* operator secara aman[span_5](start_span)[span_5](end_span).

2. **Fitur Transaksi Kasir Lanjutan & Pending Cart (`kasirStore.js` & `Kasir.vue`):**
   - Pengelolaan *multi-cart* pending (`pendingCarts`) yang memungkinkan transaksi ditunda dan dipulihkan kembali kapan saja[span_6](start_span)[span_6](end_span).
   - Integrasi varian eceran rokok (1/2 bungkus, eceran per batang) dan jasa seduh/racik dinamis per kategori[span_7](start_span)[span_7](end_span).
   - Dukungan cetak struk nota fisik thermal Bluetooth (`receiptService.js` via `EscPosEncoder`) dan ekspor dokumen PDF (`jsPDF`)[span_8](start_span)[span_8](end_span).

3. **Modul Pengeluaran Operasional & Produk Digital (`Expenses.vue` & `ProductsDigital.vue`):**
   - Pencatatan beban operasional (`expenses`) yang terintegrasi langsung memotong saldo kas fisik (`acc_cash`) atau bank (`acc_bank`)[span_9](start_span)[span_9](end_span).
   - Transaksi produk digital (Topup / Tarik Tunai) dengan kalkulasi otomatis estimasi dampak kas fisik laci kasir[span_10](start_span)[span_10](end_span).

4. **Penyelarasan Seluruh Lapisan Repositori & Service (SoC Complete):**
   - Pemisahan total antara akses database (`db`), repositori data (`repositories`), logika bisnis (`services`), penyimpan status reaktif (`stores`), dan komponen antarmuka (`composables` & `views`)[span_11](start_span)[span_11](end_span).
   - Pemulihan saldo kas/bank otomatis melalui pencatatan mutasi (`cash_mutations`) dan tombol *Hitung Ulang* pada `Finance.vue`[span_12](start_span)[span_12](end_span).

5. **Otomatisasi Sinkronisasi Cloud & Offline-First Persistence:**
   - Pertahanan Dexie DB Hooks (`creating`, `updating`, `deleting`) pada 15 tabel Dexie DB (`SinarPagiDB`) yang memicu `syncRealtime.pushLocalToCloud()` secara otomatis tanpa dipanggil manual di UI[span_13](start_span)[span_13](end_span).

---

## 2. Peta Arsitektur & Separation of Concerns (SoC)

| File UI / View | Composable / Store | Repository / Service | Responsibilitas Utama |
| :--- | :--- | :--- | :--- |
| `src/views/Login.vue` | `useOperatorStore` | `operatorRepo` | Autentikasi operator, verifikasi PIN, & manajemen sesi shift aktif[span_14](start_span)[span_14](end_span). |
| `src/views/Kasir.vue` | `useKasir.js`, `kasirStore.js`, `useOperatorStore` | `kasirService.js`, `packageRepository.js`, `serviceRepository.js`, `receiptService.js` | Transaksi kasir, tunda/lanjutkan keranjang, varian ecer/seduh, cetak Bluetooth, PDF nota, & mutasi kas otomatis[span_15](start_span)[span_15](end_span). |
| `src/views/ProductsList.vue` / `ProductsAdd.vue` | `useProductsStore`, `useProductForm.js`, `useProductScanner.js` | `productRepo`, `productService.js` | CRUD Master Produk, barcode scanner, kalkulator grosir, serta penyaringan stok/kategori[span_16](start_span)[span_16](end_span). |
| `src/views/Members.vue` | `useMembers.js` | `memberRepo`, `memberService.js` | CRUD Member, akumulasi poin profit 1%, & pembayaran cicilan utang TEMPO via CASH/QRIS[span_17](start_span)[span_17](end_span). |
| `src/views/SalesHistory.vue` | `useSalesHistory.js` | `salesHistoryService.js` | Kombinasi riwayat transaksi barang & digital, pembatalan (VOID) nota, & rekap arus kas[span_18](start_span)[span_18](end_span). |
| `src/views/ProductsDigital.vue` | `useProductsDigital.js` | `productsDigitalService.js` | Transaksi Topup & Tarik Tunai pulsa/e-wallet dengan estimasi penyesuaian kas laci[span_19](start_span)[span_19](end_span). |
| `src/views/Expenses.vue` | `useExpenses.js` | `expenseService.js`, `expenseRepository.js` | Catatan pengeluaran operasional warung & pemotongan saldo kas/bank otomatis[span_20](start_span)[span_20](end_span). |
| `src/views/Finance.vue` | `useFinance.js` | `financeRepo` | Ringkasan saldo kas laci (`acc_cash`), bank/QRIS (`acc_bank`), total piutang, mutasi, & fitur *Hitung Ulang*[span_21](start_span)[span_21](end_span). |
| `src/views/Shopping.vue` | `useShopping.js` | `shoppingService.js`, `shoppingRepository.js` | Auto-restock produk tipis, konfirmasi bayar kulakan, & ekspor salin teks belanja[span_22](start_span)[span_22](end_span). |
| `src/views/Reports.vue` | — | `reportService.js` | Analisis omzet/profit barang & digital, breakdown sumber laba, serta ekspor file Excel (.xlsx)[span_23](start_span)[span_23](end_span). |
| `src/views/Dashboard.vue` | `useDashboard.js` | `dashboardService.js` | Visualisasi statistik omzet 7 hari, peringatan stok tipis, dan agregasi total piutang[span_24](start_span)[span_24](end_span). |
| `src/views/Categories.vue` | `useCategories.js` | `categoryRepo`, `unitRepo` | Navigasi tabbed CRUD Kategori & Satuan tanpa akses DB langsung[span_25](start_span)[span_25](end_span). |
| `src/views/SettingsMenu.vue` | `useSettingsMenu.js` | `packageRepository.js`, `serviceRepository.js` | Konfigurasi varian eceran rokok & tarif jasa per kategori (mis. Seduh Mie/Kopi)[span_26](start_span)[span_26](end_span). |
| `src/views/Operators.vue` | `useOperators.js` | `operatorRepo` | CRUD data operator, pengaturan peran/jabatan, & PIN otorisasi[span_27](start_span)[span_27](end_span). |
| `src/views/Settings.vue` | `useSettings.js` | `settingsRepo`, `backupService.js` | Identitas toko, header/footer nota, ukuran kertas thermal, & ekspor/impor JSON backup[span_28](start_span)[span_28](end_span). |

---

## 3. Skema Database IndexedDB (`SinarPagiDB` v1)

Seluruh data lokal disimpan pada Dexie IndexedDB dengan nama database **`SinarPagiDB`**[span_29](start_span)[span_29](end_span):

```javascript
// Database Schema pada src/db/index.js
db.version(1).stores({
  products: 'id, code, name, category, price_modal, price_sell, qty, unit, minStock, idealStock, purchasePackName, packQty, packPrice, updatedAt, synced',
  product_packages: 'id, productId, name, qty_pcs, price_sell, updatedAt, synced',
  categories: 'id, name, updatedAt, synced',
  transactions: 'id, date, total, memberId, paymentMethod, amountPaid, paidAmount, remaining, status, dueDate, updatedAt, synced',
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
  settings: 'id'
})
