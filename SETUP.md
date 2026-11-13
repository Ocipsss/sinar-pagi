```markdown
# SETUP — Panduan Instalasi & Deploy

Dokumen ini memandu kamu dari nol sampai aplikasi bisa berjalan di perangkat (dev) dan ter-deploy ke produksi.

---

## 1. Prasyarat

| Kebutuhan | Catatan |
|-----------|---------|
| Node.js ≥ 18 | Cek dengan `node -v` |
| npm ≥ 9 | Cek dengan `npm -v` |
| Akun Supabase | [supabase.com](https://supabase.com) (gratis) |
| Akun Cloudinary | [cloudinary.com](https://cloudinary.com) (gratis) |
| Chrome (Android/Desktop) | Untuk fitur cetak thermal Bluetooth |

---

## 2. Setup Lokal (Development)

### 2.1 Clone & Install

```bash
git clone <repo-url> sinar-pagi-pos
cd sinar-pagi-pos
npm install
```

2.2 Konfigurasi .env

Salin file template:

```bash
cp .env.example .env
```

Buka .env dan isi variabel berikut (cara mendapatkannya dijelaskan di langkah 3 & 4):

```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
VITE_CLOUDINARY_CLOUD_NAME=vezqidog
VITE_CLOUDINARY_PRESET=sinarpagi-products
```

2.3 Jalankan Dev Server

```bash
npm run dev
```

Akses di browser: https://localhost:5173 (atau URL yang muncul di terminal).

⚠️ Web Bluetooth Wajib HTTPS: Kalau kamu mengakses lewat IP lokal (misal http://192.168.1.5:5173), fitur cetak thermal tidak akan berfungsi karena Chrome memblokir Web Bluetooth di non-HTTPS. Gunakan localhost atau domain HTTPS.

---

3. Setup Supabase

3.1 Buat Project

1. Login ke supabase.com.
2. Klik New Project.
3. Isi nama (contoh: sinar-pagi-pos), password database (simpan!), dan pilih region terdekat (contoh: Singapore).
4. Tunggu ± 2 menit sampai project siap.

3.2 Dapatkan Kredensial

1. Buka Project Settings (ikon gerigi di sidebar kiri).
2. Klik API.
3. Copy dua nilai ini:
   · Project URL → isi ke VITE_SUPABASE_URL di .env
   · anon / public key (bagian Project API keys) → isi ke VITE_SUPABASE_ANON_KEY

⚠️ JANGAN pakai service_role key! Itu memiliki akses penuh tanpa RLS dan akan membahayakan keamanan jika bocor.

### 3.3 Buat Struktur Tabel, RLS, dan Storage Bucket (Satu Kali Jalan)

Daripada menjalankan perintah SQL secara terpisah-pisah, kita sudah menyiapkan satu file *Master Migration*.

1. Buka file [`docs/SUPABASE_MIGRATION.sql`](./docs/SUPABASE_MIGRATION.sql) di text editor.
2. Copy **seluruh isi file** tersebut.
3. Buka **SQL Editor** di Supabase.
4. Klik **New Query**, lalu paste semua kodenya.
5. Klik **Run** (atau `Ctrl + Enter`).
6. Pastikan tidak ada error merah. Ini akan otomatis membuat semua tabel, relasi, seed data default, RLS policy, dan Storage Bucket untuk backup.

---

4. Setup Cloudinary

Cloudinary dipakai untuk upload foto produk & QRIS toko.

4.1 Buat Akun & Dapatkan Cloud Name

1. Daftar di cloudinary.com.
2. Setelah login, buka Dashboard.
3. Copy Cloud name (contoh: vezqidog) → isi ke VITE_CLOUDINARY_CLOUD_NAME.

4.2 Buat Unsigned Upload Preset

Ini memungkinkan browser upload gambar tanpa perlu API secret.

1. Buka Settings (ikon gerigi di pojok kanan atas) → Upload.
2. Scroll ke bawah ke bagian Upload presets.
3. Klik Add upload preset.
4. Isi:
   · Preset name: sinarpagi-products (atau nama lain)
   · Signing Mode: Unsigned ← WAJIB
   · Folder: sinar-pagi (opsional, untuk merapikan)
5. Klik Save.
6. Copy preset name-nya → isi ke VITE_CLOUDINARY_PRESET.

---

5. Verifikasi Awal (Sebelum Lanjut ke Produksi)

Setelah setup Supabase & Cloudinary, lakukan tes di lokal:

1. Jalankan npm run dev.
2. Buka browser di https://localhost:5173.
3. Login sebagai Admin default (klik "BUAT OPERATOR DEFAULT" jika belum ada).
4. Buka menu Kasir, tambahkan barang ke keranjang, lalu bayar (CASH).
5. Buka menu Settings → Sinkronisasi Cloud → klik Push.
6. Cek Supabase Dashboard → Table Editor → tabel transactions. Pastikan data transaksi barusan muncul.
7. Buka menu ProductsList → klik Tambah → coba upload gambar produk.
8. Setelah simpan, cek di Supabase → tabel products → kolom image_url harus terisi.

Jika semua langkah di atas berjalan lancar, setup Supabase & Cloudinary sudah benar.

---

6. Deploy ke Produksi

6.1 Deploy ke Vercel (Rekomendasi)

1. Push kode ke GitHub (pastikan .env sudah masuk .gitignore).
2. Login ke vercel.com → Add New → Project.
3. Import repository GitHub-mu.
4. Isi Environment Variables (sama persis dengan isi .env):
   · VITE_SUPABASE_URL
   · VITE_SUPABASE_ANON_KEY
   · VITE_CLOUDINARY_CLOUD_NAME
   · VITE_CLOUDINARY_PRESET
5. Di bagian Build & Output Settings:
   · Framework Preset: Vite
   · Build Command: npm run build (default)
   · Output Directory: dist (default)
6. Klik Deploy.
7. Setelah selesai, Vercel memberikan URL seperti https://sinar-pagi-pos.vercel.app. Akses via HTTPS sudah otomatis aktif.

6.2 Deploy ke Netlify (Alternatif)

1. Login ke netlify.com → Add new site → Import from Git.
2. Pilih repository GitHub-mu.
3. Isi Environment Variables (sama seperti langkah Vercel #4).
4. Isi Build Settings:
   · Build command: npm run build
   · Publish directory: dist
5. Klik Deploy site.
6. Aktifkan SPA Fallback (wajib untuk Vue Router):
   · Buka Site settings → Build & deploy → Post processing → SPA fallback → aktifkan.
   · ATAU buat file public/_redirects berisi:
     ```
     /*  /index.html  200
     ```

6.3 Checklist Setelah Deploy

☐ Buka URL produksi (HTTPS) di Chrome Android.
☐ Login Admin default → ganti PIN di menu Operators.
☐ Cek badge sync di header — harusnya hijau / Backup OK.
☐ Test cetak thermal Bluetooth (buka Kasir → transaksi → klik tombol Printer di header untuk pair).
☐ Test upload gambar produk di menu ProductsList.
☐ Install sebagai PWA (Chrome → menu ⋮ → "Install app").

---

7. Troubleshooting

7.1 Aplikasi Putih / Blank

· Cek Console di DevTools browser (F12). Cari error merah.
· Kemungkinan besar: .env salah atau tidak ter-load → restart npm run dev.
· Cek URL Supabase & anon key benar (tidak ada spasi, tidak terpotong).

7.2 "Supabase belum dikonfigurasi"

· Muncul di Console saat env kosong. App tetap jalan mode lokal.
· Solusi: isi VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY di .env, restart dev server.

7.3 Push Data Gagal / Badge Sync Merah

· Buka DevTools → Console. Cari error [Sync Warning].
· Kalau error violates foreign key constraint "transaction_items_service_id_fkey":
  · Jalankan SQL dari DATABASE.md (drop constraint).
· Kalau error PGRST204 (kolom tidak ada): struktur tabel Supabase beda dengan TABLE_COLUMNS di src/services/sync/schema.js. Bandingkan dengan DATABASE.md.

7.4 Printer Thermal Tidak Terdeteksi

· Wajib Chrome, tidak bisa Safari/Firefox.
· Wajib HTTPS atau localhost — bukan IP lokal di http://.
· HP harus sudah pairing printer via Bluetooth di pengaturan Android sebelum membuka aplikasi.
· Klik ikon Printer di header (pojok kanan atas) → pilih printer dari dialog Chrome.
· Kalau printer muncul tapi tidak bisa connect, coba printer lain atau matikan-nyalakan ulang printer.

7.5 Upload Gambar Gagal

· Cek Network di DevTools → cari request ke api.cloudinary.com.
· Kalau 401: upload preset bukan Unsigned. Ubah di Cloudinary Settings.
· Kalau 400: cek VITE_CLOUDINARY_CLOUD_NAME & VITE_CLOUDINARY_PRESET salah.
· Kalau gambar > 5 MB, akan gagal kompres → perkecil dulu atau naikkan batas di ProductForm.vue.

7.6 PWA Tidak Muncul Tombol Install

· Hanya muncul di Chrome/Edge (Desktop & Android) atau Safari iOS 16.4+.
· Harus HTTPS.
· Cek manifest.webmanifest bisa diakses (https://domain/manifest.webmanifest).
· Cek service worker terdaftar di DevTools → Application → Service Workers.

---

8. Update / Re-Deploy

Setiap kali ada perubahan kode:

1. Lokal: cukup npm run dev (auto reload).
2. Produksi:
   · Kalau pakai Vercel/Netlify + GitHub: cukup git push ke branch main. Deploy otomatis berjalan.
   · Setelah deploy, buka aplikasi di Chrome Android → akan muncul prompt "Versi baru tersedia. Perbarui sekarang?" (dari registerSW).
   · Klik Perbarui untuk update service worker.

```