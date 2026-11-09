# Arsitektur Sinar Pagi POS

> **WAJIB DIBACA** sebelum menyentuh kode, baik oleh developer baru maupun AI assistant.
> Kalau ada yang tidak jelas, **TANYA dulu — jangan asumsi.**

---

## 1. Filosofi Sinkronisasi

**Cloud = source of truth. Lokal = cache + antrian push sementara.**

- Device **selalu online**. Aplikasi **tidak** dirancang untuk beroperasi tanpa internet.
- "Offline-first" di sini berarti: **baca/tulis instan ke IndexedDB dulu agar UI cepat**,
  **bukan** berarti aplikasi tetap berfungsi saat tidak ada koneksi.
- Kalau cloud punya versi lebih baru (diedit dari device lain, dashboard Supabase, dll),
  **CLOUD YANG MENANG**.
- Konflik diselesaikan dengan **last-write-wins** (siapa push terakhir, dia menang).
  Tidak ada merge otomatis.
- `synced: 0` berarti **"belum sampai ke cloud"**, **BUKAN** "jangan disentuh cloud".

### Konsekuensi langsung

- ✅ `pullAllFromCloud` & `pullDeltaFromCloud` **BOLEH** menimpa data lokal.
- ❌ **JANGAN** tambahkan filter "lindungi row `synced: 0`" di pull.
  Ini bertentangan dengan model cloud-first.
- Kalau suatu saat butuh mencegah race (pull menimpa data lokal saat push sedang berjalan),
  tangani di level **"tunggu push selesai"** (misal flag `isPushing` global),
  **BUKAN** dengan memblokir pull selamanya.

### Anti-pattern yang sudah pernah terjadi

> Menambahkan filter `dirtyIds` di `pullAllFromCloud` untuk "melindungi data lokal
> yang belum di-push". Ini **SALAH** untuk aplikasi ini, karena membuat data lokal
> bisa "membeku" selamanya kalau push gagal, dan membuat HP tidak pernah menerima
> update cloud untuk ID yang masih dirty.

---

## 2. Stack

| Layer | Teknologi |
|---|---|
| UI | Vue 3 (Composition API, `<script setup>`) |
| State | Pinia + `pinia-plugin-persistedstate` |
| Router | Vue Router 4 |
| Lokal DB | Dexie (IndexedDB) |
| Cloud | Supabase (Postgres + Storage + Auth) |
| Gambar | Cloudinary |
| Styling | TailwindCSS |
| Notifikasi | vue-sonner |
| Ikon | lucide-vue-next |
| Barcode | html5-qrcode (kamera) + keyboard wedge (scanner USB/Bluetooth) |
| Printer | Web Bluetooth + esc-pos-encoder + jsPDF |
| PWA | vite-plugin-pwa |

---

## 3. Peta Folder

```
src/
├── main.js                  # bootstrap app (auth, pinia, router, sync init)
├── App.vue                  # root, handle tombol back PWA
├── style.css                # tailwind
├── router/
│   └── index.js             # route + guard login operator
├── layouts/
│   └── MainLayout.vue       # header, sidebar, navigasi
├── views/                   # halaman (route target)
├── components/              # komponen reusable (Sidebar, ReceiptModal, Numpad, ProductForm)
│   └── product/
├── composables/             # state reaktif per domain (useKasir, useProducts, ...)
├── stores/                  # Pinia (operatorStore, kasirStore, productStore)
├── services/                # logika domain (checkout, sync, report, receipt, ...)
│   └── sync/                # orkestrasi pull/push/mappers/schema
├── db/
│   ├── index.js             # schema Dexie
│   └── repositories/        # CRUD per table (productRepo, transactionRepo, ...)
├── schemas/                 # Zod schema validasi form
└── utils/                   # helper murni (currency, crypto, calculator)
```

---

## 4. Alur Data

```
View  →  Composable  →  Service  →  Repository  →  Dexie
                                                    │
                                                    ▼
                                          syncService (push/pull)
                                                    │
                                                    ▼
                                                Supabase
```

### Aturan wajib

- **View tidak boleh** memanggil `repository` langsung. Selalu lewat `composable` atau `service`.
- **Service tidak boleh** memanggil `view` atau `composable`. Service menerima parameter, mengembalikan hasil.
- **Repository** hanya mengurus CRUD Dexie + normalisasi field. Tidak boleh ada logika bisnis.
- **Composable** mengurus state reaktif (`ref`, `computed`, `watch`). Tidak boleh akses Dexie langsung.
- **Sync layer** (`services/sync/`) hanya dipanggil dari `syncService.js` dan `composables/useSettings`, `views/Login.vue`. Jangan panggil `pull`/`push` dari view lain tanpa alasan jelas.

---

## 5. Field Naming

- **Dexie lokal**: campur camelCase & snake_case (warisan migrasi dari Firebase → Supabase).
  Contoh: `price_modal` (snake), `priceSell` (camel), `name` (bebas).
- **Supabase**: snake_case (`price_modal`, `price_sell`, `updated_at`).
- **Konversi HANYA di** `src/services/sync/mappers.js`:
  - `toSupabaseRowFull(item, tableName)` → konversi lokal → snake_case untuk push
  - `normalizePulledRow(tableName, row)` → konversi snake_case → lokal setelah pull
- **JANGAN** konversi nama field di view, composable, service, atau repository.
  Kalau butuh alias, andalkan mapper.

### Helper normalisasi untuk kasus campur

Kalau di view/composable butuh baca field yang bisa camel atau snake,
pakai fallback eksplisit:

```js
const amountPaid = Number(t.amountPaid ?? t.amount_paid ?? 0)
```

Jangan pakai `t.amountPaid` saja kalau tidak yakin datanya dari mana.

---

## 6. Soft Delete

- Semua entity utama pakai **soft delete** (`deleted: true`), **bukan** hard delete.
- Entity: `products`, `categories`, `units`, `product_packages`, `services`, `members`, `operators`.
- **Filter `deleted`** dilakukan di **repository** (`getAll`), **bukan** di view.
- Tujuan: hapus tersinkron ke cloud. Kalau hard delete lokal, cloud tidak pernah tahu row itu sudah dihapus.

### Contoh

```js
// productRepository.js
getAll: async () => {
  const list = await db.products.toArray()
  return list.filter(p => !p.deleted)   // ✅ filter di repo
}
```

---

## 7. Mutasi Keuangan (Cash Flow)

- **Semua** perubahan saldo kas/bank **WAJIB** lewat `financeRepo.addMutation()`.
- Setiap mutasi punya `refId` ke sumbernya (transaksi, expense, debt_payment, digital, dll).
- **Void / delete** = **hapus mutasi asli via `refId`** (reverse saldo), **JANGAN** buat mutasi balik baru.

### Kenapa?

Membuat mutasi balik (`IN` untuk membatalkan `OUT`) akan:
1. Mengotori riwayat mutasi (user lihat dua baris: satu penjualan, satu koreksi).
2. Membuat `recalculateFromHistory` menghitung ganda (karena mutasi balik bukan bagian dari history asli).
3. Membingungkan audit.

### Contoh yang benar

```js
// salesHistoryService.voidTransaction
const relatedMutations = await mutationsTable.where('refId').equals(transaction.id).toArray()
for (const mut of relatedMutations) {
  const acc = await accountsTable.get(mut.accountId)
  if (acc) {
    // Reverse: kalau aslinya IN → kurangi saldo; kalau OUT → tambah saldo
    const reverseDelta = mut.type === 'IN' ? -mut.amount : mut.amount
    await accountsTable.update(mut.accountId, { balance: acc.balance + reverseDelta })
  }
  await mutationsTable.delete(mut.id)   // hapus baris mutasi asli
}
```

---

## 8. Identitas Operator

- State operator aktif: **`operatorStore.currentOperator`** (BUKAN `activeOperator`).
- Getter yang tersedia: `operatorName`, `operatorRole`, `isAdmin`, `isLoggedIn`.
- Setiap transaksi **WAJIB** menyimpan `operatorId` & `operatorName`.

### Cara ambil operator aktif di composable/service

```js
// ✅ BENAR
const op = operatorStore.currentOperator
const activeOperator = { id: op?.id || null, name: op?.name || 'Kasir' }

// ❌ SALAH
const activeOperator = operatorStore.activeOperator   // undefined
```

### Kenapa penting

Kalau `operatorId` null, laporan tidak bisa membedakan siapa yang jualan,
dan audit tidak bisa melacak transaksi per kasir.

---

## 9. DON'T — dari bug masa lalu

Larangan ini berasal dari **bug nyata** yang pernah terjadi & sudah diperbaiki.
Jangan "merapikan" kode dengan mengembalikan pola lama.

- ❌ **Jangan hardcode `amountPaid = total`** di `kasirService.checkout`.
  Kirim `amountPaid` dari UI. Untuk CASH, `amountPaid` = uang diterima user
  (bisa > total), `change` = kembalian. Untuk QRIS, `amountPaid = total`, `change = 0`.
  *(bug P0 #2 — kembalian tidak pernah tersimpan)*

- ❌ **Jangan bikin mutasi kas "pengembalian"** saat void/delete.
  Hapus mutasi asli via `refId`. Lihat poin 7.

- ❌ **Jangan simpan / baca `operatorStore.activeOperator`**.
  Tidak ada. Pakai `currentOperator` / `operatorName`. Lihat poin 8.

- ❌ **Jangan konversi snake_case ↔ camelCase di luar `mappers.js`**.
  Lihat poin 5.

- ❌ **Jangan filter `deleted` di view**. Filter di repository. Lihat poin 6.

---

## 10. DON'T — dari kesalahpahaman arsitektur

Larangan ini berasal dari **salah paham filosofi**, bukan bug faktual.

- ❌ **Jangan tambahkan filter "lindungi row `synced: 0`" di `pullAllFromCloud` /
  `pullDeltaFromCloud`** (selain yang sudah ada di `pullDeltaFromCloud` sebagai anti-dirty).
  Cloud = source of truth. Cloud boleh menimpa lokal.

  Kalau butuh anti-race (pull menimpa lokal saat push belum selesai), tangani dengan
  flag `isPushing` global di `syncService`, **bukan** dengan memblokir pull selamanya.

- ❌ **Jangan asumsikan aplikasi harus jalan tanpa internet**.
  Device selalu online. Kalau offline, tampilkan pesan "butuh koneksi", bukan
  "beroperasi dalam mode offline".

- ❌ **Jangan bikin mekanisme merge konflik**.
  Model ini pakai last-write-wins. Kalau nanti butuh multi-user bersamaan, buat
  keputusan arsitektur baru secara eksplisit — jangan diam-diam menambahkan merge.

---

## 11. Konvensi Kode

### Umum

- Vue 3 `<script setup>` untuk semua komponen.
- Pinia store untuk state global (`operatorStore`, `kasirStore`, `productStore`).
- Composable (`useXxx`) untuk state per-halaman / per-domain.
- Nama file: `PascalCase.vue` untuk komponen & view, `camelCase.js` untuk JS.

### Error handling

- Service yang bisa gagal: `throw new Error('pesan jelas')`.
- Composable yang memanggil service: `try/catch` + `toast.error(...)`.
- View: jangan catch error, biarkan composable yang handle.
- **Jangan** `console.log` untuk error yang perlu dilihat user — pakai `toast`.
- **Boleh** `console.warn` untuk debugging internal (sync, realtime).

### Format uang

- Simpan sebagai **number** di DB (bukan string, bukan format Rp).
- Tampilkan pakai `formatRibuan(val)` atau `formatRp(val)` dari `utils/formatters/currency.js`.
- Input uang: `formatRp` untuk display, `toNumber` untuk parsing balik ke number.

### Tanggal

- Simpan sebagai **ISO string** (`dayjs().toISOString()`).
- Tampilkan pakai `dayjs(...).format(...)`.
- Nama field: `date` untuk tanggal transaksi, `updatedAt` / `updated_at` untuk audit trail.

### Decimal / floating point

- Selalu `Math.round()` saat menyimpan total, subtotal, amount.
- Jangan andalkan `===` untuk perbandingan uang. Pakai selisih `Math.abs(a - b) < 0.01`.

---

## 12. Testing Manual Minimum

Sebelum commit perubahan yang menyentuh alur uang atau sync, tes minimal:

1. **Checkout CASH** dengan uang lebih → cek kembalian tersimpan di struk.
2. **Checkout QRIS** → cek mutasi masuk ke `acc_bank`.
3. **Checkout TEMPO** → cek piutang member bertambah.
4. **Edit nota** → cek mutasi kas terkoreksi, stok terkoreksi.
5. **Void nota** → cek mutasi kas reverse, stok balik, status void.
6. **Push** → cek `unsyncedCount` jadi 0, cek data muncul di Supabase.
7. **Pull** dari device lain → cek data lokal ter-update.
8. **Login operator** → cek `currentOperator` terisi dan transaksi baru punya `operatorName`.

---

## 13. Cara Kontribusi (untuk AI / Developer Baru)

1. **Baca file ini dulu** sebelum menyentuh kode.
2. Kalau ragu soal arsitektur atau maksud suatu pola: **TANYA dulu, jangan asumsi.**
3. Setiap perbaikan bug: jelaskan **secara faktual** (file + baris + efek nyata),
   bukan berdasarkan asumsi filosofi.
4. Kalau mau mengubah pola arsitektur (misal ganti model sync, ganti konvensi field),
   **diskusikan dulu** dan **update file ini** setelah disepakati.
5. Jangan hapus kode yang di-comment (`/* ... */`) tanpa konfirmasi — mungkin masih
   dipertahankan sebagai referensi historis.

---

## 14. Referensi Cepat: Siapa Memanggil Siapa

| Kebutuhan | Panggil | Jangan panggil |
|---|---|---|
| Ambil daftar produk | `useProductsStore` atau `productRepo.getAll` (via service) | `db.products.toArray()` langsung di view |
| Checkout | `kasirService.checkout` via `useKasir.checkout` | `db.transactions.add` langsung |
| Ubah saldo kas | `financeRepo.addMutation` | `db.cash_accounts.update` langsung |
| Sync pull | `syncService.pullAllFromCloud` / `pullDeltaFromCloud` | Query Supabase langsung di view |
| Format uang | `formatRibuan` / `formatRp` / `toNumber` | `toLocaleString` manual |
| Ambil operator aktif | `operatorStore.currentOperator` | `operatorStore.activeOperator` (tidak ada) |

---

*
## Keep-Alive Strategy

Semua halaman **di-cache** oleh `<keep-alive>` agar state form/pencarian
tetap utuh saat user pindah halaman dan kembali.

Konsekuensi:
- `ProductForm.vue` **tidak boleh** reset form di `onActivated`.
  Reset hanya terjadi setelah submit sukses atau user klik "Batal".
- `Kasir.vue` load data via `watch(route.path)` (bukan hanya `onMounted`)
  agar data produk tetap fresh, sementara cart tetap dipertahankan.
- Halaman yang **tidak** ingin di-cache harus punya `defineOptions({ name: '...' })`
  dan ditambahkan ke `exclude` di `MainLayout.vue`.