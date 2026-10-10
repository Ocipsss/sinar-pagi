# MEMORY-v1.6.md — Sinar Pagi POS App Architecture & Finance Module Integration

**Tanggal Pembaruan:** 10 Oktober 2026
**Status Sesi:** Integrasi Modul Kas & Keuangan, Konsolidasi Rekening/QRIS/Digital, Penyelarasan Piutang Member, dan Fix Bug Navigasi Sidebar Selesai

---

## 1. Ringkasan Perubahan Utama (Key Changes v1.6)

1. **Modul Kas & Keuangan (`src/views/Finance.vue` & `financeRepository.js`)**:
   - Menambahkan grup menu baru **KEUANGAN** pada Sidebar dan mendaftarkan route `/finance`.
   - Mengonsolidasikan akun saldo digital/e-wallet langsung ke dalam akun **Rekening / QRIS / Wallet** (`acc_bank`) agar pencatatan kas lebih simpel.
   - Mengganti slot indikator saldo digital dengan indikator **Total Piutang Member (TEMPO)** yang terhubung langsung ke modul `members`.
   - Menambahkan fungsi **Hitung Ulang Saldo (`recalculateFromHistory`)** untuk mengalkulasi ulang akumulasi saldo secara retroaktif berdasarkan riwayat transaksi kasir (`transactions`) dan transaksi digital (`digital_transactions`).
   - Menyediakan fitur **Set Saldo Awal** manual untuk penyesuaian kas laci awal shift.

2. **Otomatisasi Mutasi Saldo pada Service Transaksi**:
   - **`kasirService.js`**: Setiap transaksi checkout dengan pembayaran `CASH` atau `QRIS` secara otomatis mencatatkan uang masuk (`IN`) ke `acc_cash` atau `acc_bank`.
   - **`productsDigitalService.js`**: Transaksi Top Up otomatis mencatat kas tunai masuk (`acc_cash`) dan pemotongan modal saldo digital (`acc_bank`). Transaksi Tarik Tunai mencatat kas tunai keluar (`acc_cash`) dan penambahan saldo penarikan (`acc_bank`).

3. **Perbaikan Bug Navigasi Sidebar (`src/components/Sidebar.vue`)**:
   - Mengatasi masalah menu yang tidak dapat diklik dengan menambahkan pemicu `router.push(m.to)` langsung di dalam event handler `handleItemClick` pada `Sidebar.vue`.
   - Memastikan navigasi route dan penutupan sidebar berjalan mulus di semua perangkat.

---

## 2. Peta Arsitektur & Pemisahan Layer (SoC Overview)

| File UI / View | Composable / Store Terkait | Repository / Service | Deskripsi Tanggung Jawab |
| :--- | :--- | :--- | :--- |
| `src/views/Finance.vue` | `useFinance.js` | `financeRepository.js` | Menampilkan total aset kas + bank, rincian akun, saldo piutang member, riwayat mutasi, serta aksi set saldo awal & hitung ulang saldo |
| `src/views/Kasir.vue` | `useKasir.js` & `kasirStore.js` | `kasirService.js`, `financeRepository.js` | Menangani transaksi kasir, pencetakan nota, dan pemicu mutasi saldo otomatis saat checkout |
| `src/views/ProductsDigital.vue` | `useProductsDigital.js` | `productsDigitalService.js`, `financeRepository.js` | Form transaksi Top Up / Tarik Tunai serta pencatatan otomatis dampak arus kas fisik & saldo bank |
| `src/components/Sidebar.vue` | - | `vue-router` | Komponen navigasi drawer dengan eksekusi *router push* langsung per item menu |
| `src/layouts/MainLayout.vue` | - | - | Layout utama aplikasi yang menampung header sticky, tombol pemicu drawer, dan `router-view` |

---

## 3. Detail Schema & Alur Arus Kas (Finance Flow)

### A. Skema Tabel Dexie (`src/db/index.js`)
```javascript
db.version(1).stores({
  cash_accounts: 'id, name, type, balance, updatedAt, synced',
  cash_mutations: 'id, date, accountId, type, amount, category, note, refId, updatedAt, synced',
  // ...tabel lainnya
})
