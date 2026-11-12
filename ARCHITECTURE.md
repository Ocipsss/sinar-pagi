📄 ARCHITECTURE.md — (v2)

```markdown
# Arsitektur Sinar Pagi POS

> **WAJIB DIBACA** sebelum menyentuh kode, baik oleh developer baru maupun AI assistant.
> Kalau ada yang tidak jelas, **TANYA dulu — jangan asumsi.**

**Versi dokumen:** 2.0
**Terakhir diverifikasi terhadap kode:** berdasarkan `src.txt` (full snapshot)

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
  tangani di level **"tunggu push selesai"** (flag `isSyncing`/`isPullingFromCloud`),
  **BUKAN** dengan memblokir pull selamanya.

### Anti-pattern yang sudah pernah terjadi

> Menambahkan filter `dirtyIds` di `pullAllFromCloud` untuk "melindungi data lokal
> yang belum di-push". Ini **SALAH** untuk aplikasi ini, karena membuat data lokal
> bisa "membeku" selamanya kalau push gagal, dan membuat HP tidak pernah menerima
> update cloud untuk ID yang masih dirty.

> **Catatan implementasi aktual:** `pullDeltaFromCloud` **memang** punya filter
> `dirtyIds` (lihat `src/services/sync/pull.js`). Ini adalah **satu-satunya
> pengecualian yang diizinkan** dan hanya ada di delta pull, bukan full pull.
> Alasannya: delta pull dipanggil di background sambil user bekerja; menimpa row
> yang sedang di-push akan memicu feedback loop. Kalau ingin mengubah ini,
> diskusikan dulu.

---

## 2. Stack

| Layer | Teknologi |
|---|---|
| UI | Vue 3 (Composition API, `<script setup>`) |
| State | Pinia + `pinia-plugin-persistedstate` |
| Router | Vue Router 4 |
| Lokal DB | Dexie (IndexedDB) |
| Cloud | Supabase (Postgres + Storage + Auth) |
| Gambar | Cloudinary (unsigned upload preset) |
| Styling | TailwindCSS (v4, `@import "tailwindcss"`) |
| Notifikasi | vue-sonner |
| Ikon | lucide-vue-next |
| Form validation | **vee-validate** + **Zod** (via `toTypedSchema` custom) |
| Kalkulasi uang | **big.js** (hindari float error) |
| Barcode | html5-qrcode (kamera) + keyboard wedge (scanner USB/Bluetooth) |
| Printer | Web Bluetooth + `esc-pos-encoder` + `jsPDF` |
| Chart | chart.js + vue-chartjs |
| Excel export | `xlsx` |
| PWA | vite-plugin-pwa (`registerSW`) |
| Tanggal | dayjs + locale `id` |
| Auth | Supabase Auth (opsional; app tetap bisa jalan tanpa sesi) |

---

## 3. Peta Folder (dengan Tanggung Jawab)

```

src/
├── main.js                  # bootstrap: PWA registerSW, pinia, router, initDeviceAuth → mount
├── App.vue                  # root, handle tombol back PWA (double-press 2 detik)
├── style.css                # @import "tailwindcss"
├── router/
│   └── index.js             # route + guard login operator
├── layouts/
│   └── MainLayout.vue       # header, sidebar, nav kategori dropdown, keep-alive
├── views/                   # halaman (route target), PASCALCASE.vue
│   ├── Login.vue            # pilih operator + numpad PIN, ensureSupabaseSession
│   ├── Kasir.vue            # layar kasir utama, barcode wedge + kamera
│   ├── ProductsList.vue     # daftar barang + filter + publish toggle
│   ├── ProductsAdd.vue      # wrapper ProductForm
│   ├── SalesHistory.vue     # riwayat + edit ke kasir + void + quick print
│   ├── Reports.vue          # rekap omzet/profit per periode + export Excel
│   ├── Finance.vue          # saldo kas/bank/piutang (liveQuery)
│   ├── Expenses.vue         # pengeluaran operasional
│   ├── Dashboard.vue        # ringkasan metrik + chart 7 hari
│   ├── Members.vue          # master member + bayar utang
│   ├── Operators.vue        # master operator + PIN
│   ├── Categories.vue       # tab kategori & satuan
│   ├── Shopping.vue         # daftar belanja kulakan
│   ├── Settings.vue         # identitas toko, sync, backup, reset
│   ├── SettingsMenu.vue     # tarif jasa + harga paket (drag & drop)
│   ├── SettingsQris.vue     # upload QRIS toko ke Supabase (pengecualian)
│   └── ProductsDigital.vue  # transaksi topup/tarik digital
├── components/
│   ├── Sidebar.vue
│   ├── Numpad.vue           # numpad PIN login
│   ├── ReceiptModal.vue     # dialog struk + tombol print/PDF
│   └── product/
│       └── ProductForm.vue  # form produk (create & edit)
├── composables/             # state reaktif per domain
│   ├── useKasir.js          # cart, barcode wedge, kamera
│   ├── useProducts.js       # (di productStore)
│   ├── useProductForm.js    # vee-validate + Zod
│   ├── useProductScanner.js # html5-qrcode wrapper
│   ├── useCategories.js     # kategori + satuan (tab)
│   ├── useMembers.js
│   ├── useOperators.js
│   ├── useExpenses.js
│   ├── useFinance.js        # liveQuery Dexie
│   ├── useReports.js
│   ├── useSalesHistory.js
│   ├── useShopping.js
│   ├── useSettings.js
│   ├── useSettingsMenu.js
│   ├── useProductsDigital.js
│   ├── usePrinter.js        # singleton state Web Bluetooth
│   ├── useDashboard.js
│   └── useRupiah.js, useProductCalculator.js, useHeaderAction.js  # (di-comment)
├── stores/                  # Pinia global
│   ├── operatorStore.js     # currentOperator + login/logout, hashPin
│   ├── kasirStore.js        # cart, pendingCarts, editingTransactionId (persist: true)
│   └── productStore.js      # list produk (persist: true)
├── services/                # logika domain, TIDAK state reaktif
│   ├── supabase.js          # client + stub mode bila env kosong
│   ├── authService.js       # initDeviceAuth, signInOperator, logout
│   ├── kasirService.js      # checkout (atomic Dexie transaction)
│   ├── salesHistoryService.js # getCombined, update, void
│   ├── memberService.js     # payDebt
│   ├── expenseService.js    # add/delete (reverse mutasi via refId)
│   ├── shoppingService.js   # toggleBoughtStatus (stok ±, kas ±)
│   ├── productsDigitalService.js # topup/tarik + mutasi
│   ├── reportService.js     # rekap + export XLSX
│   ├── dashboardService.js  # metrik dashboard
│   ├── receiptService.js    # thermal ESC/POS + PDF
│   ├── cloudinaryService.js # upload pending images (background)
│   ├── backupService.js     # export/import JSON + upload/restore ke Supabase Storage
│   ├── productService.js
│   ├── syncService.js       # orkestrator utama (lihat §11)
│   └── sync/
│       ├── schema.js        # ALL_TABLES, TABLE_PUSH_ORDER, TABLE_COLUMNS
│       ├── mappers.js       # toSupabaseRowFull, normalizePulledRow, sanitize
│       └── pull.js          # pullAll, pullDelta, checkForCloudUpdates, realtime deps
├── db/
│   ├── index.js             # schema Dexie + migrasi lokal
│   └── repositories/        # CRUD per tabel, filter soft delete di sini
│       ├── productRepository.js, categoryRepository.js, unitRepository.js,
│       ├── packageRepository.js, serviceRepository.js,
│       ├── memberRepository.js, operatorRepository.js,
│       ├── transactionRepository.js, digitalTransactionRepository.js (commented),
│       ├── financeRepository.js, expenseRepository.js,
│       ├── shoppingRepository.js, settingsRepository.js
├── schemas/
│   └── product.schema.js    # Zod schema produk
└── utils/
├── crypto.js            # hashPin (SHA-256) — satu-satunya sumber hash
├── calculator/product.js # big.js: modal dari pack, margin
└── formatters/currency.js # toNumber, formatRp, formatRibuan

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
  - **Pengecualian:** `ProductForm.vue` memanggil `productRepo.getAll()` untuk cek barcode duplikat.
    Ini tech-debt yang diketahui, jangan ditambah kasus baru.
- **Service tidak boleh** memanggil `view` atau `composable`. Service menerima parameter, mengembalikan hasil.
  - **Pengecualian:** `receiptService` memanggil `usePrinter()` karena singleton state
    Web Bluetooth memang dirancang di composable. Jangan tiru pola ini untuk domain lain.
- **Repository** hanya mengurus CRUD Dexie + normalisasi field. Tidak boleh ada logika bisnis.
- **Composable** mengurus state reaktif (`ref`, `computed`, `watch`). Tidak boleh akses Dexie langsung.
  - **Pengecualian:** `useFinance` memakai `liveQuery(db)` — ini sah karena intinya adalah
    "subscribe reaktif", bukan query data mentah.
- **Sync layer** (`services/sync/`) hanya dipanggil dari `syncService.js`, `composables/useSettings`,
  `views/Login.vue`, dan `stores/operatorStore.js`. Jangan panggil `pull`/`push` dari view lain
  tanpa alasan jelas.
- **Pengecualian mutlak:** `views/SettingsQris.vue` melakukan **upsert langsung** ke Supabase
  (bukan via Dexie). Ini karena QRIS toko adalah pengaturan toko global yang tidak perlu
  offline cache. Kalau mau merapikan, buat `qrisService` — tapi jangan sampai memaksakan
  lewat Dexie.

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

Jangan pakai t.amountPaid saja kalau tidak yakin datanya dari mana.

Aturan mappers.js lebih detail

· normalizePulledRow selalu mengisi kedua versi (camel + snake) untuk field kritis
  (relasi ID, nama, harga, status pembayaran). Ini disengaja agar view lama & baru sama-sama aman.
· toSupabaseRowFull menghapus field lokal-only sebelum push:
  synced, imageSynced, imageLocal, updatedAt, dan semua alias camelCase
  yang sudah dipetakan ke snake_case.
· Setelah mapping, wajib lewat sanitizeForPostgres(obj) untuk cast numeric field
  dan ubah string kosong jadi null.
· Setelah sanitasi, wajib difilter oleh TABLE_COLUMNS[tableName]. Kolom yang
  tidak ada di whitelist akan di-delete. Ini mencegah error PGRST204 (kolom tidak ada).

---

6. Soft Delete

· Semua entity utama pakai soft delete (deleted: true), bukan hard delete.
· Entity: products, categories, units, product_packages, services, members, operators.
· Filter deleted dilakukan di repository (getAll), bukan di view.
· Tujuan: hapus tersinkron ke cloud. Kalau hard delete lokal, cloud tidak pernah tahu row itu sudah dihapus.

Contoh

```js
// productRepository.js
getAll: async () => {
  const list = await db.products.toArray()
  return list.filter(p => !p.deleted)   // ✅ filter di repo
}
```

Toleransi tipe deleted

Field deleted bisa berupa true, 1, atau 'true' karena warisan migrasi.
Repository wajib pakai helper yang toleran:

```js
function isDeleted(item) {
  if (!item) return true
  const d = item.deleted
  return d === true || d === 1 || d === 'true'
}
```

Jangan langsung if (item.deleted) — 'true' (string) truthy tapi 'false' juga truthy.
Selalu pakai helper di atas.

Pengecualian soft delete

· expenses, shopping_list, transactions, transaction_items, cash_mutations,
  debt_payments, digital_transactions tidak pakai soft delete.
  Void transaksi = ubah status (bukan hapus). Expense dihapus = hard delete + reverse mutasi.

---

7. Mutasi Keuangan (Cash Flow)

· Semua perubahan saldo kas/bank WAJIB lewat financeRepo.addMutation().
· Setiap mutasi punya refId ke sumbernya (transaksi, expense, debt_payment, digital, dll).
· Void / delete = hapus mutasi asli via refId (reverse saldo), JANGAN buat mutasi balik baru.

Kenapa?

Membuat mutasi balik (IN untuk membatalkan OUT) akan:

1. Mengotori riwayat mutasi (user lihat dua baris: satu penjualan, satu koreksi).
2. Membuat recalculateFromHistory menghitung ganda (karena mutasi balik bukan bagian dari history asli).
3. Membingungkan audit.

Contoh yang benar

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

Aturan akun default

· acc_cash = Kas Laci (Tunai)
· acc_bank = Rekening / QRIS / Wallet
· acc_digital sudah dihapus. Kalau ada data lama dengan accountId: 'acc_digital',
  financeRepo.updateBalance & addMutation otomatis remap ke acc_bank.
  Jangan tambahkan akun baru tanpa diskusi.

Aturan mapping metode bayar → akun

Metode Akun tujuan mutasi
CASH / TUNAI acc_cash
QRIS / BANK acc_bank
TEMPO (tidak ada mutasi sampai member bayar)
Digital cash admin acc_cash
Digital potong saldo acc_bank

Edit nota (updateTransaction)

Edit nota BUKAN sekadar update baris. Ini juga wajib:

1. Reverse mutasi lama via refId (hapus + reverse saldo).
2. Buat mutasi baru sesuai nilai baru.
3. Sesuaikan stok produk dengan delta (oldQty - newQty).
4. Rollback member lama (debt, total_spending) lalu apply ke member baru.
5. Update amountPaid & change — jangan asumsikan amountPaid = total untuk CASH.

Lihat salesHistoryService.updateTransaction untuk implementasi referensi.

Pembatalan belanja kulakan

shoppingService.toggleBoughtStatus dengan newStatus = false:

· Kurangi stok produk (karena stok sempat ditambah saat ditandai dibeli)
· Buat mutasi IN (bukan hapus mutasi lama)

⚠️ Ini menyimpang dari pola ideal §7. Alasan historis: item belanja mungkin
sudah tercampur dengan item lain, dan menghapus mutasi lama bisa menghilangkan
jejak "kapan barang itu dibeli". Kalau mau dirapikan agar konsisten dengan
refId reverse, diskusikan dulu — jangan asal ubah.

---

8. Identitas Operator

· State operator aktif: operatorStore.currentOperator (BUKAN activeOperator).
· Getter yang tersedia: operatorName, operatorRole, isAdmin, isLoggedIn.
· Setiap transaksi WAJIB menyimpan operatorId & operatorName.

Cara ambil operator aktif di composable/service

```js
// ✅ BENAR
const op = operatorStore.currentOperator
const activeOperator = { id: op?.id || null, name: op?.name || 'Kasir' }

// ❌ SALAH
const activeOperator = operatorStore.activeOperator   // undefined
```

Kenapa penting

Kalau operatorId null, laporan tidak bisa membedakan siapa yang jualan,
dan audit tidak bisa melacak transaksi per kasir.

Login & PIN

· Login = pilih operator → masukkan PIN (via Numpad) → operatorStore.login(id, pin).
· PIN di-hash SHA-256 lewat utils/crypto.js → hashPin().
· Hash hanya dilakukan di dua tempat: operatorRepo.create/update dan operatorStore.login.
· hashPin punya guard: kalau input sudah 64-char hex, tidak di-hash ulang.
  Ini mencegah double-hash saat edit operator.
· Jangan menyimpan PIN plaintext ke DB. Kalau tidak ada PIN (pin === ''),
  operator boleh login tanpa PIN.

Persistensi sesi

· currentOperator disimpan dobel:
  1. pinia-plugin-persistedstate (state operator di localStorage)
  2. manual localStorage.setItem('current_operator', ...) di login() dan dihapus di logout().
  Ini disengaja agar bisa dibaca sebelum Pinia hydrate (mis. di route guard).
  Jangan hapus salah satu tanpa mengubah router.beforeEach.

Supabase Auth vs Operator lokal

· Operator bukan user Supabase Auth. Tabel operators punya kolom auth_id
  yang boleh kosong.
· ensureSupabaseSession() di Login.vue hanya cek apakah ada sesi Supabase;
  kalau tidak ada, app tetap jalan (RLS Supabase harus mengizinkan anon role
  untuk tabel publik seperti products, categories, dll).
· Jangan menganggap operator harus punya akun Supabase Auth.

---

9. DON'T — dari bug masa lalu

Larangan ini berasal dari bug nyata yang pernah terjadi & sudah diperbaiki.
Jangan "merapikan" kode dengan mengembalikan pola lama.

· ❌ Jangan hardcode amountPaid = total di kasirService.checkout.
  Kirim amountPaid dari UI. Untuk CASH, amountPaid = uang diterima user
  (bisa > total), change = kembalian. Untuk QRIS, amountPaid = total, change = 0.
  (bug P0 #2 — kembalian tidak pernah tersimpan)
· ❌ Jangan bikin mutasi kas "pengembalian" saat void/delete.
  Hapus mutasi asli via refId. Lihat poin 7.
· ❌ Jangan simpan / baca operatorStore.activeOperator.
  Tidak ada. Pakai currentOperator / operatorName. Lihat poin 8.
· ❌ Jangan konversi snake_case ↔ camelCase di luar mappers.js.
  Lihat poin 5.
· ❌ Jangan filter deleted di view. Filter di repository. Lihat poin 6.
· ❌ Jangan panggil hashPin dua kali. hashPin punya guard 64-hex, tapi
  lebih baik hindari. Hash hanya di repo & login. Lihat poin 8.
· ❌ Jangan reset form di onActivated ProductForm kecuali memang
  initialData === null. Form edit harus tetap terisi saat user bolak-balik halaman. Lihat §17.
· ❌ Jangan pakai deleted: 0 / deleted: 1 untuk row baru. Selalu boolean true/false.
  Toleransi baca tetap ada di repo (isDeleted), tapi data baru jangan menambah keragaman.
· ❌ Jangan ubah TABLE_PUSH_ORDER tanpa memeriksa dependency FK di Supabase.
  Contoh: products butuh categories sudah ada. Kalau urutan diubah, push akan
  gagal 23503 foreign_key_violation.

---

10. DON'T — dari kesalahpahaman arsitektur

Larangan ini berasal dari salah paham filosofi, bukan bug faktual.

· ❌ Jangan tambahkan filter "lindungi row synced: 0" di pullAllFromCloud.
  Cloud = source of truth. Cloud boleh menimpa lokal.
  Di pullDeltaFromCloud filter dirtyIds sudah ada dan diizinkan sebagai
  anti-race (lihat §1 catatan implementasi). Jangan menambah filter serupa di
  pullAllFromCloud.
· ❌ Jangan asumsikan aplikasi harus jalan tanpa internet.
  Device selalu online. Kalau offline, tampilkan pesan "butuh koneksi", bukan
  "beroperasi dalam mode offline".
· ❌ Jangan bikin mekanisme merge konflik.
  Model ini pakai last-write-wins. Kalau nanti butuh multi-user bersamaan, buat
  keputusan arsitektur baru secara eksplisit — jangan diam-diam menambahkan merge.
· ❌ Jangan hapus stub Supabase (createStubSupabase di supabase.js).
  Stub ini memungkinkan app boot saat env kosong (dev lokal, first deploy, dsb).
  Kalau supabase di-null-kan, seluruh app crash di initDeviceAuth.
· ❌ Jangan panggil Supabase langsung dari view (selain SettingsQris.vue
  yang memang pengecualian terdokumentasi). Semua lewat service/sync.

---

11. Sync Layer (Detail Teknis)

File

File Tanggung jawab
services/syncService.js Orkestrator: syncStatus, pushLocalToCloud, init, initRealtimePull, toggleAutoSync
services/sync/schema.js ALL_TABLES (dari db.tables), TABLE_PUSH_ORDER (FK-aware), TABLE_COLUMNS (whitelist)
services/sync/mappers.js toSupabaseRowFull, normalizePulledRow, sanitizeForPostgres, buildCategoryCache, resolveCategoryNames
services/sync/pull.js pullAllFromCloud, pullDeltaFromCloud, checkForCloudUpdates, injectSyncStatus, registerPullCallbacks

syncStatus (reactive)

```js
{
  isOnline, isSyncing, unsyncedCount, pendingPullCount,
  lastSyncedAt, isAutoSyncEnabled
}
```

· unsyncedCount dihitung ulang via updateUnsyncedCount() (loop semua tabel,
  hitung synced === 0). Dipanggil setiap selesai push/pull.
· pendingPullCount adalah indikator kasar (0/1) dari checkForCloudUpdates:
  bandingkan updated_at terbaru di cloud vs localStorage.lastPullAt.
· isAutoSyncEnabled disimpan di localStorage.auto_sync_enabled.

pushLocalToCloud() — alur

1. Kalau offline / isSyncing / !db → early return { pushed: 0, failed: 0, skipped: 0 }.
2. Set isSyncing = true.
3. Upload gambar pending via cloudinaryService.uploadPendingImages() (best-effort, error di-console.warn).
4. Build categoryCache (id↔name untuk resolve products.category_id).
5. Loop TABLE_PUSH_ORDER (bukan ALL_TABLES):
   · Ambil where('synced').equals(0) di tabel itu.
   · Chunk 400 row.
   · toSupabaseRowFull → sanitizeForPostgres → filter TABLE_COLUMNS.
   · upsert(clean, { onConflict: 'id' }).
   · Retry sekali jika 23505.
   · PGRST204 (kolom tidak cocok) → console.warn, jangan throw. Row tetap synced: 0, akan retry.
   · Sukses → bulkUpdate({ synced: 1 }).
6. Set lastSyncedAt = dayjs().format('HH:mm').
7. finally: reset isSyncing, update unsyncedCount.

Return: { pushed, failed, skipped }.

pullAllFromCloud() — alur

1. Guard: !navigator.onLine || isPullingFromCloud || !db → return.
2. Set isPullingFromCloud = true, syncStatus.isSyncing = true.
3. Build categoryCache.
4. Loop ALL_TABLES: select('*') tanpa filter, normalizePulledRow, bulkPut.
5. Setelah categories di-pull, rebuild cache agar produk berikutnya resolve nama kategori.
6. resolveCategoryNames() untuk produk yang belum punya category (nama).
7. Set lastPullAt.
8. updateUnsyncedCountCallback().
9. Kalau total > 0 dan sessionStorage.hasReloadedAfterFirstPull belum ada → reload sekali
   (agar store Pinia ke-load dengan data baru).

pullDeltaFromCloud() — alur

1. Guard sama, plus butuh lastPullAt (kalau tidak ada, panggil pullAllFromCloud).
2. Loop ALL_TABLES: select('*').gt('updated_at', lastPull).
3. Filter dirtyIds — where('synced').equals(0).primaryKeys(). Row yang
   masih dirty dilewati (tidak di-bulkPut).
4. Set lastPullAt.

Realtime (initRealtimePull)

· Subscribe channel Supabase untuk tabel: products, product_packages,
  services, categories, units.
· eventType === 'DELETE' → set lokal deleted: true, synced: 1.
· Selain itu → normalizePulledRow lalu put (overwrite).
· Kalau categories berubah → resolveCategoryNames().
· Tidak subscribe tabel transaksi/keuangan (terlalu ramai, cukup pull manual).

Inisialisasi (init())

1. Pasang listener online / offline → update syncStatus.isOnline.
2. Kalau products kosong dan online → pullAllFromCloud().
3. Kalau tidak kosong → pullDeltaFromCloud() + checkForCloudUpdates() + update count.
4. Kalau online → initRealtimePull().

Urutan push (TABLE_PUSH_ORDER)

```
categories, units, settings, operators,
products, product_packages, services,
members,
transactions, transaction_items, digital_transactions,
cash_accounts, cash_mutations, expenses, debt_payments,
shopping_list
```

Tabel baru otomatis masuk di akhir (ALL_TABLES minus EXPLICIT_PUSH_ORDER).
Kalau tabel baru punya dependency FK, tambahkan ke EXPLICIT_PUSH_ORDER.

---

12. Cloudinary (Gambar Produk Offline-First)

Field

Field lokal Field Supabase Keterangan
imageLocal (Blob) (tidak dipush) Blob lokal, dihapus setelah upload sukses
imagePublicId image_public_id sinar-pagi/products/{id}
imageUrl image_url URL secure Cloudinary
imageSynced (0/1) (tidak dipush) 0 = belum upload, 1 = sudah

Alur

1. User pilih gambar di ProductForm → compressImage() (max 800px, JPEG 0.7) → simpan Blob ke imageLocal, imageSynced: 0.
2. Push berikutnya memanggil cloudinaryService.uploadPendingImages():
   · Ambil where('imageSynced').equals(0).
   · POST ke api.cloudinary.com/v1_1/{cloud}/image/upload dengan upload_preset.
   · Sukses → set imageUrl, imagePublicId, imageSynced: 1, hapus imageLocal.
   · synced: 0 agar URL baru ikut push ke Supabase.
3. toSupabaseRowFull membuang imageLocal & imageSynced sebelum push.

Konfigurasi

· VITE_CLOUDINARY_CLOUD_NAME & VITE_CLOUDINARY_PRESET di .env.
· Kalau kosong → uploadPendingImages langsung return, tidak error.

---

13. Backup & Restore

Lokal (JSON)

· backupService.exportBackup() — dump semua tabel Dexie ke JSON, download via Blob.
· backupService.importBackup(file) — parse, clear tabel yang ada di file, bulkPut semua row dengan synced: 0 & updatedAt/updated_at = now.

Cloud (Supabase Storage)

· Bucket: sinarPagiBucket.
· uploadBackupToCloud() — dump semua tabel → upload master-YYYY-MM-DD-HHmm.json.
· restoreFromCloud() — list 1 file terbaru → download → processImportData.
· processImportData selalu set synced: 0 pada semua row yang diimpor,
  agar push berikutnya mengirim ulang ke Supabase.

Utilitas lain di backupService

· markAllAsUnsynced() — paksa semua row synced: 0 (tombol "paksa resync").
  Jarang dipakai; ada di useSettings.forceResyncAll tapi tombolnya dihapus
  dari Settings.vue setelah bug sync diperbaiki. Fungsi tetap ada untuk pemakaian manual.
· resetTransactions() — hapus transaksi, items, expenses, digital, debt_payments,
  cash_mutations, shopping_list; reset saldo & piutang member ke 0.
· convertAllToUppercase() — uppercase nama di products, categories, units,
  product_packages, members.

---

14. Printer & Struk

usePrinter (singleton)

· State global (di luar fungsi, di modul):
  isConnected, isConnecting, isPrinting, printerDevice, connectedDevice, printerCharacteristic.
· Karena singleton, semua komponen berbagi koneksi printer yang sama.
· connectPrinter() — navigator.bluetooth.requestDevice dengan optionalServices
  000018f0-... dan 49535343-... (printer thermal umum).
· printReceipt(bytes) — chunk 20 byte, writeValue / writeValueWithoutResponse,
  delay 30ms antar chunk.

receiptService

· printThermal(transaction) — pakai esc-pos-encoder, format 32 kolom (58mm) / 48 kolom (80mm).
  · Ambil settings (printerPaperSize, storeName, storeAddress, storePhone, receiptFooter).
  · Header toko → metadata nota → rincian item → total & bayar → footer → cut.
  · Pakai karakter ESC/POS mentah (initialize, font A, left margin 0).
· downloadPdf(transaction) — jsPDF dengan ukuran kertas [58 | 80, estimatedHeight].
  · Watermark logo transparan (opacity 0.08) di tengah.
  · Header + item + total + metode bayar + footer + kasir.

Yang harus dihindari

· ❌ Jangan memanggil printThermal tanpa await settingsRepo.getSettings()
  — setting bisa berubah.
· ❌ Jangan asumsikan printer connected di setiap transaksi. Selalu cek
  isConnected / re-connect.
· ❌ Jangan kirim data > 512 byte sekaligus (chunk!).

---

15. Digital Transaction (Topup / Tarik Tunai)

Domain khusus di productsDigitalService.create():

Topup

· Uang diterima dari pelanggan (cash) = nominal + adminFee (kalau admin cash) / nominal (kalau admin digital).
· Uang dikirim ke provider = nominal (kalau admin cash) / nominal - adminFee (kalau admin digital).
· Mutasi:
  · acc_cash IN = nominal + (isCashAdmin ? adminFee : 0)
  · acc_bank OUT = isCashAdmin ? nominal : Math.max(0, nominal - adminFee)

Tarik Tunai

· Uang diserahkan ke pelanggan = nominal - (isCashAdmin ? adminFee : 0).
· Uang diterima dari provider = nominal (cash admin) / nominal + adminFee (digital admin).
· Mutasi:
  · acc_cash OUT = nominal - (isCashAdmin ? adminFee : 0)
  · acc_bank IN = isCashAdmin ? nominal : nominal + adminFee

Profit

profit = adminFee (dihitung sebagai laba digital).

Poin member (kalau ada)

earnedPoints = Math.floor(adminFee * 0.01) — 1% dari admin fee, bukan dari nominal.
total_spending += nominal + adminFee.

Jangan

· ❌ Jangan mencampur omzet digital dengan profit digital di laporan.
  Lihat §16.
· ❌ Jangan lupa update profit: 0 saat transaksi digital di-void.

---

16. Laporan & Profit

reportService.getReportData() mengembalikan:

· rawTransactions — semua transaksi (termasuk void)
· validTransactions — transaksi non-void
· voidTransactions — hanya void
· rawTransactionItems — semua item
· rawDigitalTransactions — semua digital
· validDigitalTransactions — digital non-CANCELLED
· productsMap — Map<productId, product> untuk lookup modal

useReports computed:

· omzetBarang = Σ total transaksi barang valid
· omzetDigital = Σ (totalReceived || nominal + adminFee) transaksi digital valid
· totalOmzet = omzetBarang + omzetDigital ← jangan campur dengan profit digital
· profitBarang = Σ ((price - modal) × qty) — boleh negatif kalau jual rugi
· profitRugiBarang = Σ ((price - modal) × qty) yang hanya negatif (audit kerugian)
· profitDigital = Σ admin fee
· totalProfit = profitBarang + profitDigital
· omzetCash/QRIS/Tempo — breakdown metode bayar (hanya barang)

Aturan

· ❌ Jangan clamp profitBarang ke 0. Kalau jual rugi, laporan harus menunjukkan rugi.
· ❌ Jangan campur omzet & profit. omzetDigital adalah nilai transaksi,
  profitDigital adalah admin fee. Keduanya berbeda.
· ✅ Kalau profitBarang negatif, tampilkan warna merah di UI (sudah di Reports.vue).

---

17. Keep-Alive Strategy (Detail per Halaman)

Semua halaman di-cache oleh <keep-alive> kecuali:
ProductsAdd, Kasir (di-exclude di MainLayout.vue).

Konsekuensi per halaman

Halaman Lifecycle yang dipakai Catatan
ProductForm.vue onMounted + onActivated Reset form hanya di onActivated kalau initialData === null. Edit harus tetap terisi.
Kasir.vue onMounted + onActivated + watch(route.path) watch memastikan data fresh saat kembali ke /kasir. Cart dipertahankan via kasirStore.persist.
Finance.vue useFinance subscribe liveQuery di onMounted & onActivated, unsubscribe di onDeactivated/onUnmounted Data auto-update realtime.
Dashboard.vue onMounted + onActivated Re-load metrik.
Reports.vue onMounted + onActivated Re-load laporan.
Expenses.vue onMounted + onActivated Re-load.
SalesHistory.vue onMounted + onActivated Re-load.
Settings.vue onMounted + onUnmounted Subscribe liveQuery untuk unsyncedCount, unsubscribe di unmount.
ProductsList.vue onMounted + onActivated + onUnmounted + onDeactivated Attach/detach global keydown (barcode wedge).
Categories.vue onMounted Cukup load sekali.
Members.vue onMounted Cukup load sekali.
Operators.vue onMounted Cukup load sekali.
Shopping.vue onMounted Cukup load sekali.
SettingsMenu.vue onMounted + onActivated Re-load menu (bisa berubah dari halaman lain).
SettingsQris.vue onMounted Load dari Supabase langsung.

Aturan

· ❌ Jangan reset form di onActivated kecuali untuk create mode.
· ✅ Untuk halaman yang punya global keydown listener (barcode wedge), attach di
  onMounted + onActivated, detach di onUnmounted + onDeactivated.
  Kalau tidak, listener akan dobel saat user bolak-balik halaman.
· ✅ Untuk halaman yang subscribe liveQuery, unsubscribe di onDeactivated dan
  onUnmounted (defensif).

---

18. Barcode Wedge (Scanner USB/Bluetooth)

Pola di useKasir dan ProductsList:

· Global keydown listener di window.
· Buffer karakter (barcodeBuffer), reset kalau jeda > 50ms antar key.
· Saat Enter ditekan:
  · Kalau di input search kasir → proses q.value sebagai barcode.
  · Kalau buffer punya isi → proses buffer sebagai barcode.
· Saat user mengetik di input selain search input → abaikan (jangan tangkap).
· Saat key berjarak < 30ms (scanner) di dalam input search → tetap masuk buffer.

Aturan

· ❌ Jangan proses Enter biasa (user menekan Enter di form) sebagai scan.
· ✅ Selalu cek e.target.tagName — jangan intersep input/textarea/select lain.
· ✅ Kalau ada listener baru, attach di onMounted/onActivated dan detach di
  onUnmounted/onDeactivated.

---

19. Konvensi Kode

Umum

· Vue 3 <script setup> untuk semua komponen.
· Pinia store untuk state global (operatorStore, kasirStore, productStore).
· Composable (useXxx) untuk state per-halaman / per-domain.
· Nama file: PascalCase.vue untuk komponen & view, camelCase.js untuk JS.

Form validation

· Gunakan vee-validate (useForm, useField) + Zod schema (schemas/product.schema.js).
· Konversi Zod → vee-validate via helper toTypedSchema lokal di composable
  (bukan library tambahan). Lihat useProductForm.js untuk contoh.
· Jangan validasi manual dengan if (!name) return di view; taruh di schema.

Error handling

· Service yang bisa gagal: throw new Error('pesan jelas').
· Composable yang memanggil service: try/catch + toast.error(...).
· View: jangan catch error, biarkan composable yang handle.
· Jangan console.log untuk error yang perlu dilihat user — pakai toast.
· Boleh console.warn untuk debugging internal (sync, realtime).

Format uang

· Simpan sebagai number di DB (bukan string, bukan format Rp).
· Tampilkan pakai formatRibuan(val) atau formatRp(val) dari utils/formatters/currency.js.
· Input uang: formatRp untuk display, toNumber untuk parsing balik ke number.
· Untuk kalkulasi margin/modal dari pack: pakai big.js (utils/calculator/product.js),
  bukan float mentah.

Tanggal

· Simpan sebagai ISO string (dayjs().toISOString()).
· Tampilkan pakai dayjs(...).format(...).
· Nama field: date untuk tanggal transaksi, updatedAt / updated_at untuk audit trail.

Decimal / floating point

· Selalu Math.round() saat menyimpan total, subtotal, amount.
· Jangan andalkan === untuk perbandingan uang. Pakai selisih Math.abs(a - b) < 0.01.
· Kalkulasi kompleks (modal per pcs, margin) → pakai big.js.

Console di production

· console.log hanya untuk debug dev. Pakai import.meta.env.DEV guard
  kalau log-nya berisiko berisik di production.
· console.warn boleh untuk sync/realtime (berguna saat troubleshooting user).

---

20. Testing Manual Minimum

Sebelum commit perubahan yang menyentuh alur uang atau sync, tes minimal:

1. Checkout CASH dengan uang lebih → cek kembalian tersimpan di struk.
2. Checkout QRIS → cek mutasi masuk ke acc_bank.
3. Checkout TEMPO → cek piutang member bertambah.
4. Edit nota → cek mutasi kas terkoreksi, stok terkoreksi.
5. Void nota → cek mutasi kas reverse, stok balik, status void.
6. Push → cek unsyncedCount jadi 0, cek data muncul di Supabase.
7. Pull dari device lain → cek data lokal ter-update.
8. Login operator → cek currentOperator terisi dan transaksi baru punya operatorName.
9. Sync push saat ada produk + kategori baru bersamaan → cek tidak ada
   error 23503 (FK) karena urutan push benar.
10. Upload gambar produk → cek imageSynced: 0 → setelah push jadi 1,
    imageUrl terisi, imageLocal terhapus.
11. Topup digital cash admin → cek acc_cash IN = nominal + adminFee,
    acc_bank OUT = nominal.
12. Kulakan ditandai dibeli → cek stok produk bertambah & acc_cash/acc_bank OUT.
13. Batal kulakan → cek stok produk berkurang & mutasi IN (bukan hapus mutasi).
14. Laporan dengan transaksi jual rugi → cek profit negatif tampil merah, bukan 0.

---

21. Cara Kontribusi (untuk AI / Developer Baru)

1. Baca file ini dulu sebelum menyentuh kode.
2. Kalau ragu soal arsitektur atau maksud suatu pola: TANYA dulu, jangan asumsi.
3. Setiap perbaikan bug: jelaskan secara faktual (file + baris + efek nyata),
   bukan berdasarkan asumsi filosofi.
4. Kalau mau mengubah pola arsitektur (misal ganti model sync, ganti konvensi field),
   diskusikan dulu dan update file ini setelah disepakati.
5. Jangan hapus kode yang di-comment (/* ... */) tanpa konfirmasi — mungkin masih
   dipertahankan sebagai referensi historis.
6. Kalau menambah tabel Dexie baru:
   · Daftarkan di db/index.js (db.version(N).stores({...})).
   · Pastikan ALL_TABLES (sync/schema) otomatis menangkapnya (dari db.tables).
   · Tambahkan ke TABLE_COLUMNS di sync/schema.js.
   · Kalau punya FK, tambahkan ke EXPLICIT_PUSH_ORDER.
   · Buat repo di db/repositories/.
7. Kalau menambah halaman baru:
   · Tambahkan route di router/index.js.
   · Tambahkan ke navCategories di MainLayout.vue.
   · Tentukan lifecycle: onMounted saja (statis) atau onMounted + onActivated (fresh).
   · Kalau tidak ingin di-cache, tambahkan nama ke exclude di <keep-alive>.
8. Kalau menambah service/composable baru: patuhi layer di §4.

---

22. Referensi Cepat: Siapa Memanggil Siapa

Kebutuhan Panggil Jangan panggil
Ambil daftar produk useProductsStore atau productRepo.getAll (via service) db.products.toArray() langsung di view
Checkout kasirService.checkout via useKasir.checkout db.transactions.add langsung
Ubah saldo kas financeRepo.addMutation db.cash_accounts.update langsung
Sync pull syncService.pullAllFromCloud / pullDeltaFromCloud Query Supabase langsung di view
Sync push syncService.pushLocalToCloud() supabase.from(...).upsert langsung
Format uang formatRibuan / formatRp / toNumber toLocaleString manual
Ambil operator aktif operatorStore.currentOperator operatorStore.activeOperator (tidak ada)
Hash PIN hashPin dari utils/crypto.js crypto.subtle.digest manual
Upload gambar cloudinaryService.uploadPendingImages() POST ke Cloudinary langsung
Backup cloud backupService.uploadBackupToCloud() supabase.storage.upload langsung
Cek Supabase aktif isSupabaseConfigured() Cek import.meta.env di view
Subscribe data DB liveQuery Dexie di composable setInterval polling
Cari barcode cepat processBarcodeScan (useKasir) Filter manual di view

---

23. Environment Variables (.env)

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_CLOUDINARY_CLOUD_NAME=vezqidog
VITE_CLOUDINARY_PRESET=sinarpagi-products
```

Kalau VITE_SUPABASE_* kosong → app boot dengan stub Supabase (mode lokal,
sync/backup/cloud nonaktif). Jangan throw di supabase.js.

---

24. PWA & Update

· registerSW dari vite-plugin-pwa.
· onNeedRefresh → confirm() → updateSW(true).
· onOfflineReady → log saja.
· Tombol back di App.vue:
  · Tekan 2x dalam 2 detik → window.history.back() (browser/PWA native behavior).
  · Tekan 1x → toast "Tekan sekali lagi untuk keluar" + history.pushState dummy
    agar popstate tetap terpicu.
· popstate listener di-attach di onMounted, detach di onUnmounted.

---

25. Database Schema (Dexie)

Semua tabel didefinisikan di db/index.js (version 1):

```
products, product_packages, categories, transactions, transaction_items,
members, debt_payments, shopping_list, cash_accounts, cash_mutations,
expenses, digital_transactions, services, units, operators, settings
```

Index per tabel mencakup id (primary), updatedAt/updated_at, synced,
deleted (untuk tabel soft-delete), dan field kunci pencarian.

Migrasi lokal otomatis di db.on('ready') — konversi deleted service ke boolean.

Jangan menambah version baru tanpa migrasi & diskusi.

---

26. Pengecualian yang Terdokumentasi

Beberapa tempat sengaja menyimpang dari aturan umum. Jangan "dirapikan"
tanpa diskusi:

1. ProductForm.vue akses productRepo langsung untuk cek barcode duplikat.
2. receiptService memanggil usePrinter() (service → composable).
3. SettingsQris.vue upsert Supabase langsung (bypass Dexie).
4. shoppingService.toggleBoughtStatus(false) membuat mutasi IN baru,
   bukan hapus mutasi lama (lihat §7 catatan).
5. pullDeltaFromCloud pakai filter dirtyIds (anti-race), tapi pullAllFromCloud tidak.
6. useFinance akses db langsung via liveQuery.
7. operatorStore menyimpan currentOperator dobel (pinia persist + localStorage manual).

---

· 

Keep-Alive Strategy

Semua halaman di-cache oleh <keep-alive> agar state form/pencarian
tetap utuh saat user pindah halaman dan kembali.

Konsekuensi:

· ProductForm.vue tidak boleh reset form di onActivated.
  Reset hanya terjadi setelah submit sukses atau user klik "Batal".
· Kasir.vue load data via watch(route.path) (bukan hanya onMounted)
  agar data produk tetap fresh, sementara cart tetap dipertahankan.
· Halaman yang tidak ingin di-cache harus punya defineOptions({ name: '...' })
  dan ditambahkan ke exclude di MainLayout.vue.

```

---

## 📌 Ringkasan Perubahan dari v1 → v2

| Poin | Perubahan |
|---|---|
| §1 | Tambah catatan eksplisit tentang filter `dirtyIds` di `pullDeltaFromCloud` |
| §2 | Tambah `vee-validate`, `big.js`, `chart.js`, `xlsx`, `jsPDF`, `esc-pos-encoder` |
| §3 | Peta folder diperluas + komentar per file + daftar `sync/` subfiles |
| §4 | Tambah pengecualian akses layer (5 pengecualian terdokumentasi) |
| §5 | Tambah detail `mappers.js`: `sanitizeForPostgres`, `TABLE_COLUMNS` filter |
| §6 | Tambah helper `isDeleted` toleran + pengecualian soft delete |
| §7 | Tambah tabel mapping metode → akun + aturan edit nota + catatan `shoppingService` |
| §8 | Tambah flow login PIN, hashPin rules, persistensi dobel, Supabase Auth vs lokal |
| §9-10 | Tambah larangan: hashPin double, `deleted` 0/1, ubah `TABLE_PUSH_ORDER`, hapus stub Supabase |
| **§11 (baru)** | Sync layer detail: `syncStatus`, `pushLocalToCloud`, `pullAll`, `pullDelta`, realtime, urutan push |
| **§12 (baru)** | Cloudinary offline-first |
| **§13 (baru)** | Backup & restore (lokal + cloud) |
| **§14 (baru)** | Printer & struk (thermal + PDF) |
| **§15 (baru)** | Digital transaction accounting rules |
| **§16 (baru)** | Laporan & profit (jangan clamp, jangan campur omzet/profit) |
| §17 | Per-halaman lifecycle table |
| **§18 (baru)** | Barcode wedge pattern |
| §19 | Tambah vee-validate, big.js, console rules |
| §20 | Tambah 6 skenario testing baru (FK order, gambar, digital, kulakan batal, laporan rugi) |
| §21 | Tambah checklist saat tambah tabel/halaman/service baru |
| §22 | Tambah 6 baris referensi cepat (sync push, hashPin, cloudinary, dll) |
| **§23 (baru)** | Environment variables |
| **§24 (baru)** | PWA & update |
| **§25 (baru)** | Database schema Dexie |
| **§26 (baru)** | Daftar pengecualian terdokumentasi |
| Keep-Alive | Dipertahankan di akhir dokumen, diperkuat dengan §17 |

Semua penambahan didasarkan pada **kode aktual di `src.txt`**, bukan asumsi. Kalau ada pola di kode yang Anda rasa **belum** benar dan ingin diubah, tandai dulu sebagai "tech debt" sebelum dijadikan aturan di dokumen ini.