# MEMORY-V1.7.md — Sinar Pagi POS Master Documentation

> **Generated:** 11 Oktober 2026  
> **Project:** Sinar Pagi POS (Offline-First Warung Application)  
> **Previous Version:** MEMORY-V1-6.md

---

## 1. Executive Summary & Change Log (v1.6 → v1.7)

Pembaruan versi 1.7 berfokus pada **Pemurnian Arsitektur (Refactoring SoC)**, **Eliminasi Redundansi Sinkronisasi Cloud**, serta **Penyelarasan Data Real-Time** di seluruh modul utama:

1. **Member & Finance Service Alignment (Isu 1):**
   - Mengisolasi `memberRepository.js` murni untuk transaksi database IndexedDB.
   - Membuat `memberService.js` untuk mengelola transaksi utang member sekaligus mencatat mutasi saldo kas/bank (`acc_cash` / `acc_bank`) secara *atomic*.
   - Mendukung metode pembayaran utang **CASH** dan **QRIS / Bank**.

2. **Pemisahan Logika Transaksi Gabungan (Isu 2):**
   - Memurnikan `transactionRepository.js` dari *business logic* pemformatan data.
   - Membuat `salesHistoryService.js` untuk mengisolasikan penggabungan data transaksi barang (`transactions`) dan digital (`digital_transactions`), kalkulasi `kasImpact`, serta pemformatan detail nota.

3. **Dekupling Komponen UI dari Database (Isu 3):**
   - Membuat `reportService.js` untuk mengisolasi query laporan dan ekspor XLSX dari `Reports.vue`.
   - Membuat `backupService.js` untuk mengisolasi proses ekspor/impor JSON dari `Settings.vue`.
   - Memperbarui `useCategories.js` untuk menangani satuan (`units`) agar `Categories.vue` terisolasi total dari akses `unitRepo` atau `db` langsung.

4. **Automatic Cloud Sync via Dexie Hooks (Isu 4):**
   - Menghapus pemanggilan manual `syncRealtime.pushLocalToCloud()` yang tersebar di composables (`useCategories`, `useMembers`, `useOperators`) dan services (`shoppingService`).
   - Memasang *event listeners* `creating`, `updating`, dan `deleting` langsung di skema `db.tables` (`src/db/index.js`) agar setiap perubahan data lokal otomatis memicu sinkronisasi cloud.

5. **Fix Real-time Data Sync pada KeepAlive Views:**
   - Menambahkan kait `onActivated` dari Vue pada `Dashboard.vue`, `Finance.vue`, `SalesHistory.vue`, dan `Reports.vue` agar data selalu otomatis dimuat ulang saat pengguna berpindah tab navigasi tanpa perlu menekan tombol *refresh* / *Hitung Ulang*.
   - Menyelaraskan kalkulasi piutang Dashboard langsung dari agregasi kolom `debt` pada tabel `members`.

---

## 2. Peta Arsitektur Terbaru & Separation of Concerns (SoC)

| File UI / View | Composable / Store | Repository / Service | Responsibilitas Utama |
| :--- | :--- | :--- | :--- |
| `src/views/Kasir.vue` | `useKasir.js`, `kasirStore.js` | `kasirService.js`, `packageRepository.js`, `serviceRepository.js`, `financeRepository.js` | Transaksi kasir, multi-cart pending, varian ecer/seduh, cetak nota, & mutasi kas otomatis |
| `src/views/Members.vue` | `useMembers.js` | `memberRepo`, `memberService.js` | CRUD Member, akumulasi poin profit 1%, pembayaran cicilan TEMPO via CASH/QRIS |
| `src/views/SalesHistory.vue` | `useSalesHistory.js` | `salesHistoryService.js` | Penggabungan riwayat barang & digital, statistik omzet, arus kas fisik, & detail nota |
| `src/views/Dashboard.vue` | `useDashboard.js` | `dashboardService.js` | Ringkasan omzet 7 hari, barang tipis, dan total piutang real-time dari master member |
| `src/views/Finance.vue` | `useFinance.js` | `financeRepository.js` | Saldo kas laci, bank/QRIS, piutang, serta mutasi saldo otomatis dengan pemicu `onActivated` |
| `src/views/Reports.vue` | — | `reportService.js` | Pengolahan laporan omzet/profit barang vs digital, serta ekspor file Excel (.xlsx) |
| `src/views/Settings.vue` | `useSettings.js` | `settingsRepo`, `backupService.js` | Identitas toko, ukuran kertas printer, serta ekspor/impor backup JSON database |
| `src/views/Categories.vue` | `useCategories.js` | `categoryRepo`, `unitRepo` | Tabbed UI CRUD Kategori & Satuan tanpa akses DB langsung dari komponen |
| `src/views/Shopping.vue` | `useShopping.js` | `shoppingService.js`, `shoppingRepository.js` | Restock otomatis produk tipis, toggle status beli, & ekspor salin teks belanja |

---

## 3. Skema Otomatisasi Sinkronisasi Cloud (Dexie Hooks)

Di dalam `src/db/index.js`, seluruh tabel terdaftar dipasangi *hook* untuk memicu sinkronisasi otomatis:

```javascript
// Dexie Hooks pada src/db/index.js
let syncServiceInstance = null
const triggerDebouncedSync = () => {
  if (!syncServiceInstance) {
    import('../services/syncService.js').then(module => {
      syncServiceInstance = module.syncRealtime || module.default
      syncServiceInstance?.pushLocalToCloud()
    })
  } else {
    syncServiceInstance.pushLocalToCloud()
  }
}

db.tables.forEach(table => {
  table.hook('creating', function (primKey, obj, transaction) {
    transaction.on('complete', () => triggerDebouncedSync())
  })

  table.hook('updating', function (mods, primKey, obj, transaction) {
    if (mods.synced === 0 || !('synced' in mods)) {
      transaction.on('complete', () => triggerDebouncedSync())
    }
  })

  table.hook('deleting', function (primKey, obj, transaction) {
    transaction.on('complete', () => triggerDebouncedSync())
  })
})
