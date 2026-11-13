# ROADMAP — Rencana Pengembangan

Dokumen ini mencatat visi pengembangan **Sinar Pagi POS** ke depan. Gunakan dokumen ini sebagai acuan saat ingin menambah fitur baru atau membereskan *tech-debt*, agar arah pengembangan tetap fokus dan tidak melebar ke mana-mana.

**Status saat ini:** Versi `3.23` (Split Payment, Retur Barang, dan Split Tender sudah rilis).

---

## 🎯 Visi Jangka Panjang
Menjadi aplikasi POS *offline-first* (cache instan) yang **paling ringan, cepat, dan andal** untuk warung/retail kecil. Bisa dioperasikan dengan satu tangan di HP Android, tanpa butuh hardware mahal selain printer thermal Bluetooth murah.

---

## 🏃 Prioritas Saat Ini (Next Sprint)

Ini adalah hal-hal yang **paling mendesak** untuk dikerjakan selanjutnya:

- [ ] **UI Pengaturan Ukuran Kertas**: Menambahkan tombol toggle 58mm/80mm di `Settings.vue` (saat ini hanya bisa diubah lewat database).
- [ ] **Pajak / PPN**: Menambahkan opsi pajak opsional (misal 11%) di pengaturan toko, otomatis terhitung di struk.
- [ ] **Diskon Nota**: Fitur untuk memasukkan nominal diskon (potongan harga) di akhir transaksi, bukan hanya mengubah harga satuan.

---

## 🚀 Fitur yang Direncanakan (Backlog)

### 1. Peningkatan Sistem Kasir
- [x] ~~**Split Payment QRIS + TEMPO**: ...~~ *(Selesai di v3.23)*
- [x] ~~**Retur Barang (Refund)**: ...~~ *(Selesai di v3.22)*
- [ ] **Pajak / PPN**: Menambahkan opsi pajak opsional (misal 11%) di pengaturan toko, otomatis terhitung di struk.
- [ ] **Diskon Nota**: Fitur untuk memasukkan nominal diskon (potongan harga) di akhir transaksi, bukan hanya mengubah harga satuan.

### 2. Peningkatan Cetak & Hardware
- [ ] **UI Pengaturan Ukuran Kertas**: Menambahkan tombol toggle 58mm/80mm di `Settings.vue` (saat ini hanya bisa diubah lewat database).
- [ ] **Cetak Label Harga Barcode**: Fitur untuk mencetak label stiker barcode harga produk langsung dari printer thermal.
- [ ] **Dukungan Printer LAN / USB**: Saat ini hanya mendukung Bluetooth. (Catatan: WebUSB/WebSerial hanya jalan di Chrome Desktop, tidak di Android).
- [ ] **Auto-Cetak**: Opsi di Settings untuk otomatis mencetak struk segera setelah transaksi selesai tanpa perlu klik tombol (fitur ini sudah ada `autoPrintReceipt` di settings, tapi belum diimplementasi penuh di UI).

### 3. Manajemen Stok & Inventori
- [ ] **Stok Opname (Stock Audit)**: Fitur untuk menghitung fisik stok di rak dan membandingkannya dengan stok di sistem, lalu menyesuaikan selisihnya.
- [ ] **Riwayat Pergerakan Stok (Kardus)**: Menampilkan kapan barang masuk (dari kulakan), kapan barang keluar (dari penjualan), dan kapan di-void.
- [ ] **Barcode Generator**: Fitur untuk generate gambar barcode dari kode produk, lalu bisa di-scan pakai HP.

### 4. Laporan & Analitik
- [ ] **Export Laporan PDF**: Saat ini laporan hanya bisa diekspor ke Excel. Tambahkan ekspor PDF yang rapi untuk dicetak.
- [ ] **Filter Laporan per Operator**: Menampilkan performa penjualan per kasir (siapa yang jual paling banyak hari ini).
- [ ] **Grafik Penjualan Bulanan**: Grafik garis 7 hari di Dashboard bisa ditambah opsi 30 hari atau 12 bulan.
- [ ] **Prediksi Restock Pintar**: Analisis penjualan rata-rata per produk untuk memprediksi kapan barang akan habis, dan otomatis menyarankan jumlah restock.

### 5. Sistem & Keamanan
- [ ] **Integrasi Supabase Auth (Email/Password)**: Saat ini login hanya pakai PIN lokal. Tambahkan opsi login via Supabase Auth jika aplikasi dipakai di banyak device oleh banyak kasir sekaligus.
- [ ] **Role-Based Access Control (RBAC)**: Batasi akses halaman tertentu berdasarkan role operator (misal: Kasir biasa tidak bisa buka halaman Laporan atau Keuangan, hanya Admin yang bisa).
- [ ] **Auto-Lock Screen**: Layar terkunci otomatis jika tidak ada aktivitas selama X menit (untuk mencegah orang lain memakai HP kasir yang ditinggal).
- [ ] **Multi-Toko (SaaS)**: (Jangka panjang) Mengubah arsitektur dari single-tenant menjadi multi-tenant agar bisa dijual sebagai layanan SaaS ke warung lain.

### 6. Otomatisasi Test & Kualitas Kode
- [ ] **Unit Test (Vitest)**: Menulis test untuk `kasirService.checkout`, `salesHistoryService.voidTransaction`, dan `financeRepository`.
- [ ] **E2E Test (Playwright)**: Simulasi alur login → tambah produk → bayar → cek laporan.
- [ ] **Strict TypeScript**: Migrasi bertahap dari JavaScript ke TypeScript (dimulai dari `services/` dan `db/repositories/`).

---

## 🧹 Tech-Debt yang Perlu Dibereskan

Ini adalah daftar perbaikan arsitektur yang **belum mendesak** tapi perlu diselesaikan agar kode tetap sehat jangka panjang. (Selaras dengan `docs/KNOWN_ISSUES.md`).

- [ ] **Refactor `SERVICE_SEDUH` (Magic String)**: Pindahkan penanda ini dari `service_id` ke kolom `service_type` yang sudah ada di Supabase.
- [ ] **Refactor `receiptService`**: Hilangkan ketergantungan langsung ke `usePrinter()` (composable). Buat `printerService.js` murni (singleton) yang bisa dipanggil dari mana saja.
- [ ] **Refactor `ProductForm.vue`**: Hilangkan pemanggilan langsung `productRepo` dari view. Pindahkan ke `productStore.checkBarcodeExist()`.
- [ ] **Refactor Batal Kulakan**: Konsistenkan `shoppingService.toggleBoughtStatus(false)` agar menggunakan `refId` reverse (seperti VOID transaksi) alih-alih membuat mutasi `IN` baru.
- [ ] **Refactor `SettingsQris.vue`**: Pindahkan logika upsert ke Supabase dari view ke service (`qrisService.js`).
- [ ] **Refactor `Login.vue`**: Hilangkan duplikasi logika `ensureSupabaseSession` dan pindahkan ke `authService.js`.

---

## 📌 Catatan Penggunaan Dokumen Ini

1. **Saat memulai sprint baru**, pilih 1-3 item dari **Prioritas Saat Ini**.
2. **Saat menemukan ide fitur baru**, tambahkan ke bagian **Backlog** (jangan langsung dikerjakan tanpa perencanaan).
3. **Jika kamu menyelesaikan sebuah fitur**, jangan hapus dari dokumen ini. Beri tanda `[x]` pada checkbox-nya agar ada catatan historisnya.
4. **Jika ada perubahan arsitektur besar** (misal ganti Supabase ke backend lain), dokumentasikan alasannya di `ARCHITECTURE.md` dan `CHANGELOG.md`.