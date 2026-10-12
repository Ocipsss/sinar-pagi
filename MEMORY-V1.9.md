# MEMORY-V1.9.md — Sinar Pagi POS Master Documentation
> **Generated:** 12 Oktober 2026
> **Project:** Sinar Pagi POS (Offline-First Warung Application)
> **Previous Version:** MEMORY-V1.7.md
---
## 1. Executive Summary & Change Log (v1.7 → v1.8)
Pembaruan versi 1.8 mencakup penyempurnaan fitur operasional, sinkronisasi cloud, serta konsistensi data keuangan:
1. **Modul Produk Digital & Member (`ProductsDigital.vue` & `productsDigitalService.js`):**
   - Integrasi fitur pemilihan member pada halaman Produk Digital (Topup dan Tarik Tunai).
   - Akumulasi poin otomatis sebesar 1% dari profit biaya admin serta penambahan total belanja member secara real-time.
2. **Sinkronisasi Piutang & Riwayat Penjualan (`salesHistoryService.js` & `Dashboard.vue`):**
   - Perhitungan total piutang TEMPO pada Riwayat Penjualan dan Dashboard diselaraskan langsung dengan saldo utang aktif member (`member.debt`) untuk memastikan keakuratan setelah pembayaran cicilan.
3. **Manajemen Operator & Cloud Integration (`operatorRepository.js` & `Login.vue`):**
   - Perbaikan fungsi penghapusan operator agar secara otomatis menghapus dokumen di Cloud Firestore (`deleteDoc`).
   - Penghapusan fungsi pembuatan operator fiktif otomatis ("Kasir Utama") saat database lokal kosong guna mencegah kemunculan akun default yang tidak diinginkan pada mode Incognito.
4. **Otomatisasi Sinkronisasi & Offline-First Persistence:**
   - Pertahanan Dexie DB Hooks (`creating`, `updating`, `deleting`) pada tabel lokal yang memicu `syncRealtime.pushLocalToCloud()` secara otomatis.
---
## 2. Peta Arsitektur & Separation of Concerns (SoC)

| File UI / View | Composable / Store | Repository / Service | Responsibilitas Utama |
| :--- | :--- | :--- | :--- |
| `src/views/Login.vue` | `useOperatorStore` | `operatorRepo` | Autentikasi operator, verifikasi PIN, & manajemen sesi shift aktif |
| `src/views/Kasir.vue` | `useKasir.js`, `kasirStore.js` | `kasirService.js`, `receiptService.js` | Transaksi kasir, pending cart, varian ecer/seduh, & cetak Bluetooth/PDF |
| `src/views/SalesHistory.vue` | `useSalesHistory.js` | `salesHistoryService.js` | Riwayat transaksi barang & digital, VOID nota, & rekap piutang member. |
| `src/views/ProductsDigital.vue` | `useProductsDigital.js` | `productsDigitalService.js` | Transaksi Topup & Tarik Tunai dengan pemilihan member dan estimasi kas. |
| `src/views/Members.vue` | `useMembers.js` | `memberRepo`, `memberService.js` | CRUD Member, akumulasi poin 1%, & pembayaran cicilan utang TEMPO. |
| `src/views/Finance.vue` | `useFinance.js` | `financeRepo` | Ringkasan saldo kas laci, bank/QRIS, total piutang, dan mutasi. |

---
## 3. Skema Database IndexedDB (`SinarPagiDB` v1)
Struktur tabel Dexie IndexedDB tetap didukung penuh dengan skema 15 tabel utama dan proteksi Dexie Hooks untuk sinkronisasi otomatis ke Firebase Firestore.