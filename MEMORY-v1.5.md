# MEMORY-v1.5.md — Sinar Pagi POS App Architecture & Master Unit Data Update

**Tanggal Pembaruan:** 10 Oktober 2026
**Status Sesi:** Implementasi Master Data Satuan Barang & Penyesuaian Form Produk Selesai

---

## 1. Ringkasan Perubahan Utama (Key Changes v1.5)

1. **Master Data Satuan Barang (`units`)**:
   - Menambahkan tabel `units` pada schema Dexie DB (`SinarPagiDB`) di `src/db/index.js`.
   - Membuat `unitRepository.js` untuk menangani operasi CRUD master data satuan barang.
   - Menambahkan tab **Satuan Barang** di tampilan `Categories.vue` bersampingan dengan **Kategori Barang**.

2. **Fleksibilitas Input Satuan pada `ProductForm.vue`**:
   - Memindahkan pilihan **Nama Satuan** ke luar container Grosir, sejajar dengan pilihan Kategori.
   - Menghapus nilai bawaan (*hardcoded defaults*) dari opsi satuan; pilihan dipopulasi secara dinamis dari master data `units`.
   - Mengubah input nama grosir di dalam kalkulator grosir dari teks bebas menjadi pemilih **Nama Satuan Grosir** yang bersumber dari master data `units`.

3. **Pembaruan Validasi & Composable**:
   - Memperbarui `useProductForm.js` untuk memuat master data `units` via `loadUnits()`.
   - Mengatur validasi `unit` pada `product.schema.js` sebagai kolom wajib tanpa default bawaan.

---

## 2. Peta Arsitektur & Pemisahan Layer (SoC Overview)

| File UI / View | Composable / Store Terkait | Repository / Service | Deskripsi Tanggung Jawab |
| :--- | :--- | :--- | :--- |
| `src/views/Kasir.vue` | `useKasir.js` & `kasirStore.js` | `kasirService.js`, `packageRepository.js`, `serviceRepository.js` | Menangani transaksi kasir, pilihan varian ecer/seduh per kategori, dan transaksi pending |
| `src/views/Categories.vue` | `useCategories.js` | `categoryRepository.js`, `unitRepository.js` | Manajemen Tabbed UI untuk CRUD Kategori Barang & Satuan Barang |
| `src/views/Members.vue` | `useMembers.js` | `memberRepository.js` | Manajemen CRUD Member, pencatatan poin, dan pembayaran/cicilan utang |
| `src/views/SettingsMenu.vue` | `useSettingsMenu.js` | `packageRepository.js`, `serviceRepository.js`, `categoryRepository.js` | Pengaturan opsi eceran rokok & tarif jasa tambahan per kategori |
| `src/components/product/ProductForm.vue` | `useProductForm.js` | `categoryRepository.js`, `unitRepository.js`, `productService.js` | Form produk baru, kalkulator grosir dengan *select dropdown* satuan grosir/eceran, dan scanner barcode |
| `src/views/ProductsList.vue` | `productStore.js` | `productRepository.js` | Tampilan daftar barang, pencarian terpusat via Store, serta aksi Edit/Hapus |

---

## 3. Detail Implementasi & Perubahan File Utama

### A. Dexie DB Schema (`src/db/index.js`)
Menambahkan indeks tabel `units`:
```javascript
db.version(1).stores({
  products: 'id, code, name, category, price_modal, price_sell, qty, unit, minStock, idealStock, purchasePackName, packQty, packPrice, updatedAt, synced',
  units: 'id, name, updatedAt, synced',
  // ...tabel lainnya
})
