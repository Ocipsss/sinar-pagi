# KNOWN ISSUES & TECH DEBT

Dokumen ini mencatat semua bug, keterbatasan, workaround, dan *tech-debt* yang **sudah diketahui** di Sinar Pagi POS.

**Tujuan:** Agar developer (atau AI assistant) tidak mengira ini bug baru, dan tidak "memperbaiki" sesuatu yang sengaja dibiarkan karena alasan historis/arsitektur.

Format penomoran: `#KI-XXX` (Known Issue).

---

## 🔴 BUG (Aktif / Perlu Perbaikan)

### #KI-001: False FK Violation pada `transaction_items.service_id` (SELESAI - Tapi Perlu Diwaspadai)
- **Status:** ✅ Fixed (13 Nov 2026) — tapi schema Supabase lama mungkin masih bermasalah.
- **Gejala:** Push gagal dengan error `violates foreign key constraint "transaction_items_service_id_fkey"`.
- **Penyebab:** `kasirService.checkout()` menyimpan `serviceId: 'SERVICE_SEDUH'` sebagai penanda item kena jasa seduh. Nilai ini **bukan row nyata** di tabel `services`. Jika schema Supabase punya FK `transaction_items.service_id → services(id)`, push akan gagal.
- **Fix:** Jalankan SQL: `alter table transaction_items drop constraint if exists transaction_items_service_id_fkey;` (lihat `DATABASE.md`).
- **Catatan Desain:** `service_id` di `transaction_items` **bukan relasi FK**. Ini string penanda (`'SERVICE_SEDUH'` atau `null`). Kode hanya membaca `!!item.serviceId` untuk boolean check, tidak pernah query `services.get(serviceId)`.

---

## 🟡 TECH DEBT (Sengaja Dibiar, Jangan "Dirapikan" Tanpa Diskusi)

### #KI-002: Magic String `'SERVICE_SEDUH'`
- **Lokasi:** `src/services/kasirService.js`, `src/composables/useKasir.js`
- **Masalah:** Nilai `'SERVICE_SEDUH'` di-hardcode sebagai penanda item kena jasa. Ini bukan ID service asli.
- **Kenapa dibiarkan:** Refactor ke `service_type` (kolom yang sudah ada di Supabase) butuh ubah 4+ file (`kasirService`, `useKasir`, `ReceiptModal`, `SalesHistory`). Risiko regresi tinggi.
- **Rencana:** Pindahkan ke kolom `service_type` di rilis versi 4.x.

### #KI-003: `receiptService` Memanggil `usePrinter()` (Service → Composable)
- **Lokasi:** `src/services/receiptService.js`
- **Masalah:** Service memanggil composable, melanggar layer rule di `ARCHITECTURE.md` §4.
- **Kenapa dibiarkan:** State Web Bluetooth (`isConnected`, `printerCharacteristic`) adalah singleton yang sengaja ditaruh di composable.
- **Rencana:** Refactor jadi singleton service murni di `services/printerService.js` jika butuh test otomatis.

### #KI-004: `ProductForm.vue` Akses `productRepo` Langsung
- **Lokasi:** `src/components/product/ProductForm.vue`
- **Masalah:** View memanggil `productRepo.getAll()` untuk cek barcode duplikat. Melanggar layer rule di `ARCHITECTURE.md` §4.
- **Kenapa dibiarkan:** Cek barcode butuh query cepat tanpa melalui `productStore` (yang mungkin belum ter-load).
- **Rencana:** Pindahkan ke `productStore.checkBarcodeExist(code)` saat refactor.

### #KI-005: `shoppingService.toggleBoughtStatus(false)` Membuat Mutasi `IN` Baru
- **Lokasi:** `src/services/shoppingService.js`
- **Masalah:** Saat batal belanja, dibuat mutasi `IN` baru, bukan hapus mutasi `OUT` lama. Melanggar ideal pattern di `ARCHITECTURE.md` §7.
- **Kenapa dibiarkan:** Menghapus mutasi lama bisa menghilangkan jejak "kapan barang itu dibeli" dari riwayat.
- **Rencana:** Diskusikan dulu jika ingin dirapikan agar konsisten dengan `refId` reverse.

### #KI-006: `settings.printerPaperSize` Tidak Bisa Diubah di Halaman Settings
- **Lokasi:** `src/views/Settings.vue` (tidak ada UI), `src/services/receiptService.js` (baca `printerPaperSize`)
- **Masalah:** Ada state `form.printerPaperSize` tapi tidak ada tombol untuk mengubahnya.
- **Kenapa dibiarkan:** Fitur 58mm sudah cukup untuk mayoritas printer thermal portabel. 80mm hanya untuk printer besar.
- **Rencana:** Tambahkan toggle 58/80mm di `Settings.vue` saat ada permintaan.

### #KI-007: `SettingsQris.vue` Bypass Dexie, Upsert Langsung ke Supabase
- **Lokasi:** `src/views/SettingsQris.vue`
- **Masalah:** Melanggar aturan bahwa semua mutasi lewat Dexie dulu. Ini satu-satunya view yang bypass.
- **Kenapa dibiarkan:** QRIS toko adalah pengaturan global yang tidak perlu offline cache. Bypass di sini masuk akal (dan terdokumentasi di `ARCHITECTURE.md` §26).
- **Rencana:** Buat `qrisService.js` jika perlu dites otomatis.

---

## 🔵 KETERBATASAN (Bukan Bug, Tapi Bukan Fitur Lengkap)

### #KI-008: Belum Ada Automated Test
- **Status:** Belum direncanakan.
- **Mitigasi:** Manual QA checklist ada di `docs/TESTING.md`.

### #KI-009: Fitur "Pembayaran Kurang" (Split Payment) Baru Ada di CASH
- **Lokasi:** `src/services/kasirService.js`
- **Masalah:** Split Payment hanya bisa dilakukan jika metode awal = CASH. Tidak bisa kombinasi QRIS + TEMPO (misal: bayar 50% QRIS, sisa TEMPO).
- **Rencana:** Fitur ini bisa ditambahkan dengan menambah parameter `paidAmount` untuk QRIS.

### #KI-010: `Login.vue` Belum Pakai Supabase Auth Password Penuh
- **Lokasi:** `src/views/Login.vue`
- **Masalah:** Login operator adalah verifikasi PIN lokal (SHA-256 di IndexedDB). Tidak memakai `supabase.auth.signInWithPassword()`.
- **Kenapa:** Aplikasi dirancang untuk berjalan sepenuhnya offline (tidak butuh sesi Supabase untuk login).
- **Rencana:** Opsional — bisa ditambahkan untuk multi-device sync yang lebih aman.

### #KI-011: Belum Ada Fitur Multi-Toko
- **Status:** Tidak direncanakan (Single-tenant by design).
- **Mitigasi:** Setiap toko punya project Supabase sendiri.

### #KI-012: Barcode Scanner Kamera Hanya untuk Produk, Belum untuk Kasir
- **Lokasi:** `src/views/Kasir.vue` — kamera ada tapi hanya muncul di mobile.
- **Masalah:** Di desktop, tidak ada tombol "Scan Kamera" (hanya barcode wedge fisik).
- **Rencana:** Bisa ditambahkan jika ada kebutuhan.

---

## 🟢 RESOLVED (Bug Lama yang Sudah Diperbaiki)

### #KI-013: Kembalian Tidak Pernah Tersimpan (v3.0)
- **Status:** ✅ Fixed di v3.0.
- **Masalah:** `amountPaid` di-hardcode = `total` untuk CASH. Kembalian selalu Rp 0 di database.
- **Fix:** Kirim `amountPaid` dari UI, hitung `change = amountPaid - total` di `kasirService.checkout()`.

### #KI-014: VOID Mengotori Riwayat Mutasi (v3.0)
- **Status:** ✅ Fixed di v3.0.
- **Masalah:** VOID membuat mutasi `OUT` baru sebagai "pengembalian" (padahal idealnya hapus mutasi asli).
- **Fix:** Hapus mutasi asli via `refId`, reverse saldo.

### #KI-015: Double Hash PIN (v3.9)
- **Status:** ✅ Fixed di v3.9.
- **Masalah:** `hashPin` dipanggil dua kali saat edit operator → PIN berubah jadi hash yang tidak bisa login.
- **Fix:** Tambahkan guard 64-char hex di `utils/crypto.js`.

### #KI-016: Produk Deleted Masih Muncul di Kasir (v3.x)
- **Status:** ✅ Fixed di v3.x.
- **Masalah:** `kasirService.getInitialData()` mengambil semua produk tanpa filter `deleted`.
- **Fix:** Pakai `productRepo.getAll()` yang sudah filter `deleted`.

---

## 📌 Catatan untuk Kontributor Baru

1. **Sebelum "memperbaiki" sesuatu yang terlihat aneh**, cek dulu di dokumen ini. Mungkin itu memang disengaja.
2. **Jika menemukan bug baru**, tambahkan entry baru dengan format `#KI-XXX` (increment nomor).
3. **Jika bug sudah diperbaiki**, jangan hapus entry — pindahkan ke bagian **🟢 RESOLVED** agar tetap jadi catatan sejarah.
4. **Jangan refactor tech-debt tanpa diskusi.** Semua tech-debt di atas punya alasan historis/arsitektur yang terdokumentasi.