# TESTING — QA Manual Checklist

Dokumen ini adalah panduan QA **manual** untuk Sinar Pagi POS. Karena proyek ini belum memiliki automated test, checklist ini **wajib** dijalankan sebelum rilis versi baru, terutama jika perubahan menyentuh:
- `kasirService.js` (alur uang & stok)
- `salesHistoryService.js` (edit & void)
- `syncService.js` / `src/services/sync/` (sinkronisasi)
- `financeRepository.js` (mutasi kas)
- `receiptService.js` (cetak struk)

---

## 🧪 Persiapan Awal

Sebelum mulai QA:
1. Gunakan **device dengan browser Chrome** (Android/Desktop).
2. Pastikan **online** (WiFi/4G stabil).
3. Buka DevTools → tab **Console** (untuk melihat error `[Sync Warning]`).
4. Siapkan data tes:
   - 1 produk dengan harga jual (misal: Indomie Rp 3.500).
   - 1 produk dengan paket (misal: Rokok per batang / slop).
   - 1 produk dengan jasa (misal: Kopi + Seduh).
   - 1 member terdaftar.
5. Siapkan printer thermal (kalau mau test cetak).

---

## 1. Login & Operator

| No | Skenario | Langkah | Expected |
|----|----------|---------|----------|
| 1.1 | Login tanpa PIN | Pilih operator tanpa PIN → klik Masuk | Berhasil, masuk ke Kasir |
| 1.2 | Login dengan PIN | Pilih operator → masukkan PIN benar → klik Masuk | Berhasil |
| 1.3 | PIN salah | Pilih operator → masukkan PIN salah → klik Masuk | Toast "PIN Otorisasi Salah!", tetap di halaman login |
| 1.4 | Buat operator default | Hapus IndexedDB → reload → klik "BUAT OPERATOR DEFAULT" | Operator ADMIN dibuat, PIN 1234, langsung masuk Kasir |
| 1.5 | Logout | Klik tombol "Shift" di Sidebar → konfirmasi | Kembali ke halaman login |
| 1.6 | Persistensi sesi | Login → close tab → buka lagi | Langsung masuk Kasir (tidak perlu login ulang) |

---

## 2. Kasir — Alur Transaksi

### 2.1 Metode CASH (Uang Pas)
| Langkah | Expected |
|---------|----------|
| Tambah produk Rp 10.000 ke keranjang | Keranjang berisi 1 item |
| Pilih metode CASH | Input bayar muncul |
| Ketik `10000` | Kembalian tampil `Rp 0` |
| Klik Bayar | Transaksi berhasil, modal struk muncul |
| Cek di Supabase → tabel `transactions` | 1 row baru dengan `amount_paid = 10000`, `change = 0` |
| Cek di Supabase → tabel `cash_mutations` | 1 row `IN` sebesar 10000 ke `acc_cash` |

### 2.2 Metode CASH (Uang Lebih)
| Langkah | Expected |
|---------|----------|
| Total Rp 10.000, ketik `20000` | Kembalian `Rp 10.000` |
| Klik Bayar | Transaksi berhasil |
| Cek `transactions` | `amount_paid = 20000`, `change = 10000` |
| Cek `cash_mutations` | `IN` sebesar **10000** (bukan 20000!) |

### 2.3 Metode CASH (Split Payment / DP) ⭐
| Langkah | Expected |
|---------|----------|
| Total Rp 50.000, ketik `30000` | Muncul peringatan merah "Uang tunai kurang. Pilih Member..." |
| Tombol Bayar disable | ✓ |
| Pilih member | Peringatan berubah jadi kuning "Masuk Tempo (Utang): Rp 20.000" |
| Tombol Bayar aktif | Teks: "Bayar Rp 30.000" |
| Klik Bayar | Transaksi berhasil, modal struk muncul |
| Cek modal struk | **TUNAI DIBAYAR: Rp 30.000**, **SISA (TEMPO): Rp 20.000** |
| Cek `transactions` | `amount_paid = 30000`, `remaining = 20000`, `status = 'unpaid'` |
| Cek `cash_mutations` | `IN` sebesar 30000 ke `acc_cash` |
| Cek `members` | Member's `debt` bertambah Rp 20.000 |
| Cetak Thermal | Struk menampilkan **SISA (TEMPO): 20.000** |
| Unduh PDF | PDF menampilkan **SISA (TEMPO): Rp 20.000** |

### 2.4 Metode QRIS
| Langkah | Expected |
|---------|----------|
| Total Rp 10.000, pilih QRIS | `amountPaid` otomatis = total (10000), tidak bisa diubah |
| Klik Bayar | Transaksi berhasil |
| Cek `transactions` | `payment_method = 'QRIS'`, `amount_paid = 10000`, `change = 0` |
| Cek `cash_mutations` | `IN` sebesar 10000 ke **`acc_bank`** (bukan `acc_cash`) |

### 2.5 Metode TEMPO
| Langkah | Expected |
|---------|----------|
| Total Rp 10.000, pilih TEMPO **tanpa** member | Modal "Pilih Member" muncul otomatis |
| Tutup modal tanpa pilih | Tombol Bayar disabled |
| Pilih member → klik Bayar | Transaksi berhasil, `amount_paid = 0`, `remaining = 10000` |
| Cek `transactions` | `status = 'unpaid'`, `due_date` +7 hari |
| Cek `cash_mutations` | **Tidak ada** mutasi baru (TEMPO tidak masuk kas) |
| Cek `members` | `debt` bertambah Rp 10.000 |

### 2.6 Paket & Jasa
| Langkah | Expected |
|---------|----------|
| Tambah produk yang punya paket (misal rokok) | Modal pilihan muncul (Mentah / 1 Batang / 1 Slop, dll) |
| Pilih "1 Slop" | Keranjang menampilkan "1 Slop [nama produk]" |
| Cek stok produk | Berkurang sejumlah `qty_pcs × cartQty` (misal 12) |
| Tambah produk dengan jasa (misal Kopi) | Modal pilihan muncul (Mentah / Seduh) |
| Pilih "Seduh" | Keranjang menampilkan "Kopi Seduh" dengan harga + service fee |

### 2.7 Barcode Wedge (Scanner Fisik)
| Langkah | Expected |
|---------|----------|
| Fokus di input search kasir | ✓ |
| Scan barcode produk dengan scanner fisik | Produk otomatis masuk keranjang |
| Ketik manual nama produk + Enter | Produk pertama yang cocok masuk keranjang |

### 2.8 Kamera Scanner (HP)
| Langkah | Expected |
|---------|----------|
| Klik ikon scan di input kasir | Kamera terbuka |
| Arahkan ke barcode | Produk otomatis masuk keranjang |
| Klik "Tutup Kamera" | Kamera mati |

---

## 3. Edit & Void Transaksi

### 3.1 Edit Nota (Ubah Qty)
| Langkah | Expected |
|---------|----------|
| Buka SalesHistory → klik transaksi → Edit di Kasir | Keranjang terisi ulang dengan data nota lama |
| Ubah qty dari 2 → 3 | Subtotal di keranjang update |
| Klik Simpan Perubahan | Transaksi berhasil diperbarui |
| Cek stok produk | Berkurang sesuai delta (qty 3 - qty 2 = 1) |
| Cek `cash_mutations` | Mutasi lama **dihapus** (via `refId`), mutasi baru dibuat sebesar total baru |

### 3.2 Void Transaksi
| Langkah | Expected |
|---------|----------|
| Buka SalesHistory → klik transaksi → Batalkan (Void) | Konfirmasi muncul |
| Konfirmasi | Transaksi berubah status jadi `void` |
| Cek stok produk | Stok kembali (restore) |
| Cek `cash_mutations` | Mutasi terkait transaksi **dihapus** (bukan dibuat mutasi reverse) |
| Cek `members` (jika TEMPO) | `debt` member berkurang sebesar `remaining` |

### 3.3 Void Transaksi Digital
| Langkah | Expected |
|---------|----------|
| Buka SalesHistory → klik transaksi digital → Batalkan | Konfirmasi muncul |
| Konfirmasi | Status `CANCELLED`, `profit = 0` |
| Cek `cash_mutations` | Mutasi terkait **dihapus** |

---

## 4. Member & Piutang

### 4.1 Bayar Utang Member
| Langkah | Expected |
|---------|----------|
| Buka Members → klik member dengan utang → Bayar Cicil Utang | Modal muncul |
| Isi nominal → pilih CASH → klik Proses | Toast sukses |
| Cek `members` | `debt` berkurang |
| Cek `debt_payments` | Row baru dengan `amount` sesuai |
| Cek `cash_mutations` | `IN` sebesar pembayaran ke `acc_cash` |

### 4.2 Bayar Utang via QRIS
| Langkah | Expected |
|---------|----------|
| Sama seperti di atas, tapi pilih QRIS | `cash_mutations` → `IN` ke **`acc_bank`** |

### 4.3 Utang Berlebih
| Langkah | Expected |
|---------|----------|
| Utang Rp 50.000, isi bayar Rp 100.000 | Toast error "melebihi sisa utang" |
| Klik Proses | Tetap di modal |

---

## 5. Keuangan (Kas, Bank, Pengeluaran)

### 5.1 Set Saldo Awal
| Langkah | Expected |
|---------|----------|
| Buka Finance → Set Saldo Awal | Modal muncul |
| Pilih `acc_cash` → isi 500000 → Simpan | Saldo Kas Laci = Rp 500.000 |
| Cek `cash_mutations` | Row `IN` sebesar 500.000 dengan category "Penyesuaian Saldo" |

### 5.2 Pengeluaran Operasional
| Langkah | Expected |
|---------|----------|
| Buka Expenses → Catat Beban → isi nominal 50000, pilih CASH | Toast sukses |
| Cek `expenses` | Row baru |
| Cek `cash_mutations` | `OUT` sebesar 50000 dari `acc_cash` |
| Hapus pengeluaran | Mutasi `OUT` terkait **dihapus**, saldo `acc_cash` kembali +50000 |

### 5.3 Belanja Kulakan (Restock)
| Langkah | Expected |
|---------|----------|
| Buka Shopping → klik checkbox item pending | Modal "Konfirmasi Pembayaran" muncul |
| Isi nominal riil, pilih Sumber Dana (Kas / Bank) → Simpan | Toast sukses |
| Cek stok produk | Bertambah sesuai qty item |
| Cek `cash_mutations` | `OUT` dari akun yang dipilih |

### 5.4 Batal Belanja Kulakan
| Langkah | Expected |
|---------|----------|
| Klik ulang checkbox item yang sudah dicentang | Konfirmasi "Batalkan status selesai beli?" |
| Konfirmasi | Stok produk **berkurang** kembali |
| Cek `cash_mutations` | `IN` baru dibuat (reverse) — ini pengecualian terdokumentasi (lihat `ARCHITECTURE.md` §7) |

---

## 6. Produk Digital (Topup / Tarik)

### 6.1 Topup Cash Admin
| Langkah | Expected |
|---------|----------|
| Pilih TOPUP, isi provider "DANA", nominal 10000, adminFee 2000, adminPayment CASH | Estimasi Kas +12000 |
| Simpan | Transaksi berhasil |
| Cek `cash_mutations` | `acc_cash` `IN` = 12000, `acc_bank` `OUT` = 10000 |

### 6.2 Topup Digital Admin
| Langkah | Expected |
|---------|----------|
| Sama, tapi adminPayment = Digital (Potong Saldo) | Estimasi Kas +10000 |
| Simpan | Transaksi berhasil |
| Cek `cash_mutations` | `acc_cash` `IN` = 10000, `acc_bank` `OUT` = 8000 (nominal - adminFee) |

### 6.3 Tarik Tunai Cash Admin
| Langkah | Expected |
|---------|----------|
| Pilih TARIK TUNAI, nominal 100000, adminFee 2000, adminPayment CASH | Estimasi Kas -98000 |
| Simpan | Transaksi berhasil |
| Cek `cash_mutations` | `acc_cash` `OUT` = 98000, `acc_bank` `IN` = 100000 |

---

## 7. Sinkronisasi Cloud

### 7.1 Push Manual
| Langkah | Expected |
|---------|----------|
| Buat transaksi baru di kasir | `unsyncedCount` bertambah |
| Klik tombol Sync di header | Loading spinner |
| Setelah selesai | Tombol berubah hijau "Backup HH:mm" |
| Cek Supabase | Data baru muncul di tabel yang sesuai |

### 7.2 Pull Delta (dari device lain)
| Langkah | Expected |
|---------|----------|
| Device A: buat produk baru | Data tersimpan lokal |
| Push dari Device A | Data masuk Supabase |
| Device B: klik tombol Pull (atau tunggu delta pull otomatis) | Produk baru muncul di Device B |

### 7.3 Realtime Master Data
| Langkah | Expected |
|---------|----------|
| Device A: edit nama produk | Data tersimpan |
| Device A: push | Data masuk Supabase |
| Device B (yang subscribe realtime) | Nama produk berubah otomatis tanpa reload (max 1-2 detik) |

### 7.4 Push Offline
| Langkah | Expected |
|---------|----------|
| Matikan internet | Badge Sync jadi "Offline" |
| Klik tombol Sync | Toast "Perangkat sedang offline" |
| Data tetap tersimpan lokal | ✓ |
| Nyalakan internet → klik Sync | Push berjalan normal |

---

## 8. Backup & Restore

### 8.1 Export JSON
| Langkah | Expected |
|---------|----------|
| Buka Settings → Unduh JSON | File `.json` ter-download |
| Buka file di text editor | Berisi semua tabel (products, transactions, dll) |

### 8.2 Import JSON
| Langkah | Expected |
|---------|----------|
| Buka Settings → Impor JSON → pilih file JSON | Konfirmasi muncul |
| Konfirmasi | Toast sukses, aplikasi reload |
| Cek data | Semua data lama tergantikan dengan data dari JSON |

### 8.3 Backup ke Cloud
| Langkah | Expected |
|---------|----------|
| Buka Settings → Push | Data ter-push |
| Cek Supabase Storage → bucket `sinarPagiBucket` | Ada file `master-YYYY-MM-DD-HHmm.json` |

### 8.4 Restore dari Cloud
| Langkah | Expected |
|---------|----------|
| (Simulasi) Hapus IndexedDB di DevTools | Data lokal kosong |
| Buka aplikasi | Otomatis pull dari cloud |
| Cek data | Produk, transaksi, dll muncul kembali |

---

## 9. Cetak Struk (Printer Thermal)

### 9.1 Pair Printer
| Langkah | Expected |
|---------|----------|
| Klik ikon Printer di header | Dialog Chrome "Pilih Printer" muncul |
| Pilih printer thermal Bluetooth | Toast "Terhubung: [nama printer]" |
| Ikon berubah hijau | ✓ |

### 9.2 Cetak Struk 58mm
| Langkah | Expected |
|---------|----------|
| Buka transaksi → klik "Cetak Thermal" | Struk tercetak rapi, tidak berantakan |
| Cek header toko, nama kasir, total, kembalian | Semua muncul |

### 9.3 Cetak Struk 80mm
| Langkah | Expected |
|---------|----------|
| Ubah Settings → Ukuran Kertas ke 80mm | Simpan |
| Cetak thermal | Struk lebih lebar (48 char per baris) |

### 9.4 Cetak Split Payment
| Langkah | Expected |
|---------|----------|
| Transaksi Split Payment (bayar 30rb, sisa 20rb) | Buka modal struk → Cetak |
| Cek struk | Baris **SISA (TEMPO): 20.000** muncul |

### 9.5 PDF Nota
| Langkah | Expected |
|---------|----------|
| Buka modal struk → Unduh PDF | File `.pdf` ter-download |
| Buka PDF | Header logo, watermark, item, total, kembalian/sisa muncul rapi |

---

## 10. Laporan (Reports)

### 10.1 Filter Periode
| Langkah | Expected |
|---------|----------|
| Buka Reports → klik "Hari Ini" | Hanya transaksi hari ini |
| Klik "7 Hari" | Transaksi 7 hari terakhir |
| Klik "Bulan Ini" | Transaksi bulan ini |
| Klik "Semua" | Semua transaksi |

### 10.2 Transaksi Void
| Langkah | Expected |
|---------|----------|
| Ada transaksi void | Transaksi void **tidak dihitung** di omzet |
| Filter "Void" | Hanya transaksi void ditampilkan |
| Total omzet | Tidak termasuk void |

### 10.3 Profit Negatif
| Langkah | Expected |
|---------|----------|
| Jual produk di bawah modal (misal modal 5000, jual 3000) | Transaksi berhasil |
| Buka Reports → cek profit | Kartu profit berubah merah |
| Teks peringatan | "Ada Produk Dijual di Bawah Modal" muncul |

### 10.4 Export Excel
| Langkah | Expected |
|---------|----------|
| Klik "Ekspor Excel" | File `.xlsx` ter-download |
| Buka di Excel | 2 sheet: "Laporan Penjualan" dan (jika ada) "Audit VOID" |

---

## 11. Dashboard

### 11.1 Metrik Hari Ini
| Langkah | Expected |
|---------|----------|
| Buka Dashboard | Metrik omzet, profit, transaksi, piutang |
| Cek angka | Sesuai dengan data hari ini (bukan data kemarin) |

### 11.2 Chart 7 Hari
| Langkah | Expected |
|---------|----------|
| Buka Dashboard | Grafik garis 7 hari |
| Hover pada titik | Tooltip muncul |

### 11.3 Stok Menipis
| Langkah | Expected |
|---------|----------|
| Produk dengan qty ≤ minStock | Muncul di widget "Stok Menipis" |
| Klik "Kulakan" | Redirect ke halaman Shopping |

---

## 12. Pengaturan (Settings)

### 12.1 Ubah Identitas Toko
| Langkah | Expected |
|---------|----------|
| Buka Settings → ubah nama toko | Simpan |
| Cetak struk | Header struk menggunakan nama baru |

### 12.2 Ubah Ukuran Kertas
| Langkah | Expected |
|---------|----------|
| Ubah 58mm → 80mm | Simpan |
| Cetak struk | Format berubah (48 char) |

### 12.3 Reset Riwayat Transaksi
| Langkah | Expected |
|---------|----------|
| Buka Settings → "Kosongkan Riwayat" | Konfirmasi 2x |
| Konfirmasi | Semua transaksi, mutasi, piutang di-reset |
| Produk & stok tetap aman | ✓ |

---

## 13. PWA & Update

### 13.1 Install PWA
| Langkah | Expected |
|---------|----------|
| Buka aplikasi di Chrome Android | Menu ⋮ → "Install app" |
| Klik Install | Ikon muncul di home screen |
| Buka dari home screen | Aplikasi berjalan fullscreen |

### 13.2 Tombol Back
| Langkah | Expected |
|---------|----------|
| Tekan tombol back sekali | Toast "Tekan sekali lagi untuk keluar" |
| Tekan dalam 2 detik | Aplikasi keluar / kembali ke halaman awal |
| Tekan setelah > 2 detik | Reset timer, toast muncul lagi |

### 13.3 Auto-Update
| Langkah | Expected |
|---------|----------|
| Deploy versi baru ke Vercel | ✓ |
| Buka aplikasi lama | Prompt "Versi baru tersedia" muncul |
| Klik Perbarui | Service worker update, reload |

---

## 14. Edge Cases (Skenario Langka)

| No | Skenario | Expected |
|----|----------|----------|
| 14.1 | Klik Bayar dua kali cepat | Hanya 1 transaksi dibuat (guard di server side / IndexedDB) |
| 14.2 | Tutup tab saat mid-transaksi | Data keranjang hilang (kecuali sudah di-hold) |
| 14.3 | Hold cart → buka cart baru → resume | Keranjang lama kembali dengan member yang sama |
| 14.4 | Hapus produk yang ada di transaksi lama | Transaksi lama tetap valid, produk tidak muncul di kasir |
| 14.5 | Produk dengan qty 0 di keranjang | Transaksi bisa disimpan, stok jadi negatif (dengan warning) |
| 14.6 | Cek barcode produk yang sudah dihapus | Toast error "Barcode sudah digunakan oleh [produk]" |
| 14.7 | Edit operator tanpa ubah PIN | PIN lama tetap berlaku |
| 14.8 | Pinjam HP kasir lain tanpa logout | Sesi tetap aktif (persist localStorage) |

---

## 📋 Cara Menggunakan Checklist Ini

1. **Sebelum rilis versi baru**, jalankan minimal **section 1–7**.
2. **Jika menyentuh printer**, jalankan juga **section 9**.
3. **Jika menyentuh laporan**, jalankan juga **section 10**.
4. **Jika menyentuh sync**, jalankan juga **section 7 & 8**.
5. **Sebelum rilis ke publik**, jalankan **semua section**.

Tandai setiap item dengan ✅ saat sukses, atau ❌ jika gagal (dan catat detailnya di issue tracker / WhatsApp).

---

## 📝 Format Bug Report

Jika menemukan bug saat QA, laporkan dengan format:
