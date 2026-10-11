# MEMORY-V1-6.md — Sinar Pagi POS Master Documentation

> **Generated:** 10 Oktober 2026  
> **Project:** Sinar Pagi POS (Offline-First Warung Application)

---

## 1. Tech Stack & Library
- **Core:** Vue 3 + Vite + Vue Router, TailwindCSS v4
- **Database Local:** Dexie.js (`SinarPagiDB`)
- **Database Cloud & Sync:** Firebase Firestore (`VITE_FIREBASE_*`)
- **State & Validation:** Pinia + `pinia-plugin-persistedstate`, Vee-Validate + Zod
- **Utilities:** Big.js (Akurasi Presisi Keuangan), Day.js, HTML5-QRCode, Lucide Vue Next

---

## 2. Layout Structure & Responsive Fixes
### Layout Global (`src/layouts/MainLayout.vue`)
- **Outer Container:** `min-h-screen bg-zinc-900 overflow-hidden`
- **Inner Wrapper:** `h-screen flex flex-col overflow-hidden` dengan pemicu `translate` saat sidebar dibuka.
- **Header:** `shrink-0 h-[56px] bg-white border-b z-40` *(Fixed Header Global)*
- **Main Area:** `flex-1 overflow-hidden flex flex-col max-w-xl mx-auto w-full` *(Proses scroll hanya terjadi di dalam inner view masing-masing)*

### Penyesuaian Per View (View-Specific Layout)
- **`Kasir.vue`:**
  - Outer: `flex flex-col h-[calc(100dvh-56px)] overflow-hidden bg-zinc-50`
  - Search Bar: `shrink-0 sticky top-0 z-10 bg-zinc-50 p-4`
  - Cart List: `flex-1 overflow-auto px-4 pb-4` *(Satu-satunya kontainer yang dapat di-scroll)*
  - Payment Drawer: `shrink-0 sticky bottom-0 z-20 bg-zinc-900 rounded-t-[2rem] p-5 pb-7`
- **`ProductsList.vue` / `ProductsAdd.vue` / `Dashboard.vue`:** Root `flex-1 overflow-auto p-4 pb-24`

---

## 3. Skema Database Dexie (`src/db/index.js`)

```javascript
db.version(1).stores({
  products: 'id, code, name, category, price_modal, price_sell, qty, unit, minStock, idealStock, purchasePackName, packQty, packPrice, updatedAt, synced',
  units: 'id, name, updatedAt, synced',
  categories: 'id, name, updatedAt, synced',
  product_packages: 'id, productId, packName, packQty, packPrice, updatedAt, synced',
  members: 'id, name, phone, address, total_spending, points, debt, updatedAt, synced',
  transactions: 'id, code, date, total, modal_total, profit, paymentMethod, status, memberId, bayarNominal, kembalian, debtAmount, updatedAt, synced',
  transaction_items: 'id, transactionId, productId, productName, qty, price_sell, price_modal, subtotal, profit, serviceName, serviceFee, updatedAt, synced',
  debt_payments: 'id, memberId, amount, paymentMethod, date, note, updatedAt, synced',
  expenses: 'id, date, title, amount, category, note, updatedAt, synced',
  digital_transactions: 'id, date, type, nominal, admin_fee, total_pay, status, note, updatedAt, synced',
  services: 'id, categoryId, name, price, updatedAt, synced',
  cash_accounts: 'id, name, type, balance, updatedAt, synced',
  cash_mutations: 'id, date, accountId, type, amount, category, note, refId, updatedAt, synced',
  settings: 'key, value'
})
```

---

## 4. Peta Arsitektur & Separation of Concerns (SoC)

| File UI / View | Composable / Store | Repository / Service | Responsibilitas Utama |
| :--- | :--- | :--- | :--- |
| `src/views/Kasir.vue` | `useKasir.js`, `kasirStore.js` | `kasirService.js`, `packageRepository.js`, `serviceRepository.js`, `financeRepository.js` | Transaksi kasir, multi-cart pending, varian ecer/seduh, cetak nota, & mutasi kas otomatis |
| `src/views/ProductsList.vue` | `productStore.js` | `productRepository.js` | Tampilan daftar barang, pencarian terpusat via Store, serta aksi Edit/Hapus |
| `src/components/product/ProductForm.vue` | `useProductForm.js` | `categoryRepository.js`, `unitRepository.js`, `productService.js` | Form produk, kalkulator grosir dengan dropdown unit dinamis, scanner barcode |
| `src/views/Categories.vue` | `useCategories.js` | `categoryRepository.js`, `unitRepository.js` | Tabbed UI untuk CRUD Kategori & Satuan Barang |
| `src/views/Members.vue` | `useMembers.js` | `memberRepository.js` | CRUD Member, akumulasi poin profit 1%, histori & pembayaran cicilan TEMPO |
| `src/views/SalesHistory.vue` | `useSalesHistory.js` | `transactionRepository.js` | Filter transaksi, statistik omzet & piutang real-time, detail nota |
| `src/views/Finance.vue` | `useFinance.js` | `financeRepository.js` | Manajemen saldo kas & bank, rekalkulasi otomatis, set saldo awal |
| `src/views/ProductsDigital.vue` | `useProductsDigital.js` | `productsDigitalService.js`, `financeRepository.js` | Transaksi Top Up & Tarik Tunai beserta dampaknya pada kas fisik & rekening |
| `src/views/SettingsMenu.vue` | `useSettingsMenu.js` | `packageRepository.js`, `serviceRepository.js`, `categoryRepository.js` | Konfigurasi varian eceran & tarif jasa seduh per kategori |
| `src/components/Sidebar.vue` | — | `vue-router` | Drawer navigasi utama dengan pemicu `router.push()` langsung |

---

## 5. Logika Bisnis Modul Utama

### A. Formatters (`src/utils/formatters/currency.js`)
```javascript
export const toNumber = (v) => Number(String(v ?? '').replace(/[^0-9]/g, '')) || 0
export const formatRp = (v) => toNumber(v) ? `Rp ${toNumber(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}` : ''
export const formatRibuan = (v) => toNumber(v) ? toNumber(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''
```

### B. Transaksi Kasir, Multi-Cart & Poin Member
1. **Multi-Cart / Pending Cart (`kasirStore.js`):**
   - Mendukung penyimpanan banyak keranjang belanja (multi-cart) tertunda lengkap dengan label nama pelanggan.
   - Menggunakan Pinia Store dengan `pinia-plugin-persistedstate` agar keranjang tidak hilang saat pindah halaman.
2. **Aturan Pembayaran Checkout:**
   - **CASH:** Membutuhkan validasi `bayarNominal >= total`.
   - **QRIS:** Nominal bayar diset otomatis sesuai total belanja.
   - **TEMPO:** Wajib memilih member terdaftar; sisa tagihan dicatat sebagai utang (`debt`).
3. **Akumulasi Poin Member (1% Profit):**
   - Setiap transaksi member yang sukses dihitung nilai keuntungan bersihnya:
     $$\text{Profit} = \text{Harga Jual} - \text{Harga Modal}$$
   - Member memperoleh poin sebesar $1\%$ dari total keuntungan:
     $$\text{Poin} = \lfloor \text{Total Profit} \times 0.01 \rfloor$$

### C. Modul Keuangan & Arus Kas (Finance Flow)
1. **Pencatatan Otomatis Mutasi Saldo:**
   - **Kasir (CASH/QRIS):** Transaksi checkout otomatis mencatat kas masuk (`IN`) ke akun `acc_cash` (Tunai) atau `acc_bank` (QRIS).
   - **Digital Top Up:** Mencatat tunai masuk ke `acc_cash` dan pemotongan modal saldo digital dari `acc_bank`.
   - **Digital Tarik Tunai:** Mencatat penarikan kas tunai dari `acc_cash` dan penambahan saldo penarikan ke `acc_bank`.
2. **Fitur Rekalkulasi Saldo (`recalculateFromHistory`):**
   - Mengalkulasi ulang seluruh akumulasi saldo secara retroaktif berdasarkan riwayat transaksi kasir (`transactions`) dan transaksi digital (`digital_transactions`).

### D. Penanganan Modul Date/Time
Format tanggal Indonesia dikonfigurasi melalui instance Day.js:
```javascript
import dayjs from 'dayjs'
import localeId from 'dayjs/locale/id'

dayjs.locale(localeId)
```

---

## 6. Sinkronisasi Data Cloud (`syncService.js`)
- **Push Local to Cloud:** Mengirimkan data lokal bertanda `synced = 0` secara berurutan dalam batch 400 item.
- **Realtime Pull:** Mendengarkan listener Firestore untuk data Master Data, Transaksi Hari Ini, serta status utang aktif (`remaining > 0`).
- **Sync Interval:** Berjalan otomatis setiap 60 detik serta saat status koneksi berubah menjadi *online*.