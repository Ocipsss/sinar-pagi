# Sinar Pagi POS

Aplikasi Point of Sale (POS) untuk warung/retail kecil dengan pendekatan **cloud-first + cache lokal instan**. Semua tulis/baca dilakukan ke IndexedDB (Dexie) terlebih dahulu agar UI selalu responsif, lalu disinkronkan otomatis ke Supabase saat online.

Mendukung kasir barang, transaksi digital (pulsa/topup/tarik tunai), manajemen member & piutang, kas & bank, cetak struk via printer thermal Bluetooth, dan PDF nota.

> ⚠️ **Bukan aplikasi offline-first murni.** Aplikasi ini **membutuhkan koneksi internet** untuk sinkronisasi cloud. Mode tanpa internet hanya bertahan sampai push berikutnya tertunda — bukan untuk operasi harian tanpa jaringan.
>
> Baca [`ARCHITECTURE.md`](./ARCHITECTURE.md) §1 untuk filosofi lengkap.

---

## ✨ Fitur Utama

- **Cache lokal instan** — UI selalu responsif, data disimpan di IndexedDB via Dexie.
- **Auto-sync ke Supabase** — push/pull otomatis saat online, plus realtime channel untuk master data.
- **Multi-metode bayar** — `CASH`, `QRIS`, `TEMPO` (utang member).
- **Split Payment** — Pelanggan bisa bayar tunai sebagian, sisanya masuk Tempo (piutang).
- **Produk digital** — top up & tarik tunai (pulsa, e-wallet, bank).
- **Paket & jasa** — varian grosir (renteng/slop/dus) & biaya jasa seduh.
- **Keuangan terintegrasi** — kas laci, bank/QRIS, mutasi otomatis, piutang member, pengeluaran operasional.
- **Cetak struk** — thermal Bluetooth (ESC/POS) & PDF dengan watermark.
- **PWA** — installable, auto-update service worker.
- **Backup & restore** — export/impor JSON + cadangan ke Supabase Storage.

---

## 📋 Prasyarat

| Kebutuhan | Versi / Catatan |
|-----------|-----------------|
| Node.js | ≥ 18 |
| npm | ≥ 9 |
| Browser | **Chrome** (Android/Desktop) — wajib untuk Web Bluetooth |
| Protokol | **HTTPS** atau `localhost` — Web Bluetooth & PWA wajib secure context |
| Akun Supabase | Untuk fitur cloud. Tanpa ini, app boot tapi sync/backup nonaktif. |
| Akun Cloudinary | Untuk upload foto produk & QRIS (opsional) |

---

## 🚀 Setup Cepat

### 1. Clone & install

```bash
git clone <repo-url>
cd sinar-pagi-pos
npm install