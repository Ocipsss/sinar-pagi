# Changelog

Semua perubahan penting pada proyek **Sinar Pagi POS** akan didokumentasikan di file ini.

Format berdasarkan [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
dan proyek ini mengikuti [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [3.22] - 2026-11-13

### Added
- **Retur Barang (Refund Sebagian):** Kasir kini bisa meretur sebagian barang dari nota yang sudah lunas (misalnya pelanggan hanya mengembalikan 1 dari 3 barang). Stok otomatis bertambah, uang kas/bank otomatis berkurang, dan utang member (jika TEMPO) otomatis dipotong.
- Tombol "Retur Barang" di modal detail Riwayat Penjualan.
- Modal UI retur dengan input qty per-item dan kalkulasi total refund otomatis.

---

## [3.21] - 2026-11-13

### Added
- **Split Payment (Bayar Sebagian / DP):** Kasir kini bisa menerima uang tunai kurang dari total belanja. Sisa kekurangan otomatis dicatat sebagai utang (TEMPO) ke member yang dipilih.
- Menampilkan info **SISA (TEMPO)** di modal struk, cetak Thermal Bluetooth, dan unduh PDF.
- Tombol bayar di kasir menyesuaikan nominal uang yang diinput (contoh: "Bayar Rp 30.000" meskipun total Rp 50.000).
- **Master Migration Script (`docs/SUPABASE_MIGRATION.sql`):** File SQL satu-kali-jalan untuk setup database Supabase baru (tabel, RLS, bucket storage) dengan aman tanpa error FK `service_id`.

### Fixed
- **Foreign Key `service_id` di `transaction_items`:** Menghapus constraint FK yang tidak sesuai desain (karena aplikasi menggunakan string `SERVICE_SEDUH` sebagai penanda, bukan relasi ID). Ini memperbaiki error sinkronisasi `violates foreign key constraint` saat push ke Supabase.

---

## [3.20] - 2026-11-10

### Fixed
- **PWA Back Button:** `window.close()` tidak bekerja di PWA/tab biasa. Diganti dengan `history.back()` agar browser/PWA yang mengurus keluar aplikasi secara native.
- Menambahkan toast "Tekan sekali lagi untuk keluar" saat tombol back ditekan pertama kali.

---

## [3.16] - 2026-10-15

### Fixed
- **Tombol Publish All di ProductsList:** Sebelumnya menghitung semua produk (termasuk yang sudah publish). Kini hanya menghitung produk yang **belum** publish, sehingga tombol muncul dengan angka yang benar.
- Menghindari penulisan ulang `isPublished: true` yang tidak perlu (mencegah `synced: 0` berulang dan push ulang ke cloud tanpa perubahan).

---

## [3.12] - 2026-09-20

### Fixed
- **Pemisahan Omzet vs Profit Digital di Laporan:** Sebelumnya `totalOmzet` mencampur omzet barang dengan profit digital. Kini dihitung terpisah: `omzetDigital` (nilai transaksi) vs `profitDigital` (admin fee).

### Added
- Menambahkan computed `omzetDigital` dan `profitRugiBarang` di `useReports`.
- Menampilkan peringatan merah di laporan jika ada produk yang dijual di bawah modal.

---

## [3.11] - 2026-09-18

### Fixed
- **Laporan Profit Negatif:** Sebelumnya `profitBarang` di-clamp ke 0 (menyembunyikan kerugian). Sekarang dibiarkan negatif dan ditampilkan dengan warna merah di UI.

---

## [3.9] - 2026-09-10

### Fixed
- **Double Hash PIN:** `hashPin` dipanggil dua kali saat edit operator. Ditambahkan guard 64-char hex di `utils/crypto.js` untuk mencegah double-hash.
- **Edit PIN Operator:** Form edit operator sekarang selalu menampilkan PIN kosong (tidak terisi hash). Kosong = tidak ganti PIN. Terisi = ganti PIN baru.
- Memisahkan flag `pinChanged` di `operatorRepository.update` agar bisa membedakan "tidak ganti PIN" vs "hapus PIN".

---

## [3.3] - 2026-08-25

### Fixed
- **Login Supabase:** Menghapus panggilan `signInAnonymously` (tidak ada di Supabase). Diganti dengan `getSession` — app tetap jalan mode lokal/anon jika tidak ada sesi.

---

## [3.0] - 2026-08-10

### Added
- **Fitur Paket Multi-Produk:** Satu jasa (misal "SEDUH") bisa dikonfigurasi untuk beberapa produk sekaligus.
- **Drag & Drop Varian Paket:** Urutkan varian paket (renteng, slop, dus) dengan drag & drop di `SettingsMenu.vue`.
- **Jam Digital:** `dayjs` dengan locale `id` untuk format tanggal Indonesia.
- **Chart Dashboard:** Grafik omzet 7 hari terakhir menggunakan Chart.js.
- **Export Excel:** Export laporan penjualan ke `.xlsx` via `xlsx`.

### Changed
- Migrasi cloud dari Firebase ke Supabase (Postgres + Storage + Auth).
- Migrasi hash PIN dari plaintext ke SHA-256 via `utils/crypto.js`.

---

## [2.0] - 2026-07-01

### Added
- **Offline-First Cache:** Semua baca/tulis ke IndexedDB (Dexie) dulu untuk UI cepat.
- **Auto-sync ke Cloud:** Push/pull otomatis via `syncService.js`.
- **Realtime Master Data:** Subscribe channel Supabase untuk produk, kategori, satuan, layanan.
- **Backup & Restore:** Export/impor JSON lokal + backup ke Supabase Storage (`sinarPagiBucket`).
- **PWA:** Installable, service worker auto-update.
- **Printer Bluetooth:** Cetak thermal ESC/POS via Web Bluetooth.
- **PDF Nota:** Unduh struk sebagai PDF dengan watermark logo.

### Fixed
- **Mutasi Kas Reverse:** Void/delete transaksi sekarang menghapus mutasi asli via `refId`, bukan membuat mutasi "pengembalian" (menghindari riwayat kotor).
- **Operator ID:** Setiap transaksi wajib menyimpan `operatorId` & `operatorName` untuk audit.

---

## [1.0] - 2026-06-15

### Added
- **Rilis Perdana:**
  - Login operator dengan PIN (numpad custom)
  - Kasir multi-metode bayar (CASH, QRIS, TEMPO)
  - Manajemen produk (kategori, satuan, paket, jasa)
  - Manajemen member & piutang
  - Kas & bank dengan mutasi otomatis
  - Produk digital (topup/tarik pulsa, e-wallet)
  - Pengeluaran operasional
  - Laporan omzet & profit
  - Belanja kulakan (restock)