# MEMORY-v1.4.md — Sinar Pagi POS App Architecture & Refactoring Update

**Tanggal Pembaruan:** 10 Oktober 2026  
**Status Sesi:** Refactoring SoC Selesai & Pembaruan CRUD Master Data

---

## 1. Ringkasan Perubahan Utama (Key Changes)

1. **Refactoring SoC (Separation of Concerns) Secara Menyeluruh**:
   - Memisahkan seluruh transaksi database Dexie DB, kueri repository, dan logika bisnis dari komponen UI (`.vue`) ke layer Composable / Pinia Store.
   - Komponen UI sekarang murni berfokus pada render *template*, gestur pengguna, dan form binding.

2. **Opsi Jasa Seduh & Varian Dinamis Berbasis Kategori**:
   - Penambahan relasi kategori pada pengisian tarif jasa di `SettingsMenu.vue`.
   - Modul `Kasir.vue` membaca settingan tarif jasa secara otomatis berdasarkan kategori produk yang dipilih (misal: Produk kategori `Mie` hanya menampilkan tarif jasa `Mie Seduh`, Kategori `Kopi` hanya menampilkan varian `Kopi Seduh/Es`).

3. **Penyempurnaan Modul Master Data Barang (`ProductsList.vue`)**:
   - Menambahkan fitur CRUD lengkap (Edit modal & Hapus barang).
   - Memindahkan *search filtering* ke Pinia Store (`productStore.js`).

---

## 2. Peta Arsitektur & Pemisahan Layer (SoC Overview)

| File UI / View | Composable / Store Terkait | Repository / Service | Deskripsi Tanggung Jawab |
| :--- | :--- | :--- | :--- |
| `src/views/Kasir.vue` | `useKasir.js` & `kasirStore.js` | `kasirService.js`, `packageRepository.js`, `serviceRepository.js` | Menangani transaksi kasir, pilihan varian ecer/seduh per kategori, dan transaksi pending |
| `src/views/Categories.vue` | `useCategories.js` | `categoryRepository.js` | Manajemen CRUD Kategori Barang & sinkronisasi realtime |
| `src/views/Members.vue` | `useMembers.js` | `memberRepository.js` | Manajemen CRUD Member, pencatatan poin, dan pembayaran/cicilan utang |
| `src/views/SettingsMenu.vue` | `useSettingsMenu.js` | `packageRepository.js`, `serviceRepository.js`, `categoryRepository.js` | Pengaturan opsi eceran rokok & tarif jasa tambahan per kategori |
| `src/components/product/ProductForm.vue` | `useProductForm.js` | `categoryRepository.js`, `productService.js` | Form pembuatan produk baru, kalkulator grosir, dan scanner barcode |
| `src/views/ProductsList.vue` | `productStore.js` | `productRepository.js` | Tampilan daftar barang, pencarian terpusat via Store, serta aksi Edit/Hapus |

---

## 3. Detail File Refactoring Terbaru

### A. `src/db/repositories/productRepository.js`
Menambahkan method `update` dan `delete`:
```javascript
import { db } from '../index.js'
import dayjs from 'dayjs'

export const productRepo = {
  getAll: () => db.products.toArray(),
  getById: (id) => db.products.get(id),
  getByCode: (code) => db.products.where('code').equals(code).first(),
  create: (data) => db.products.add({
    ...data,
    id: crypto.randomUUID(),
    updatedAt: dayjs().toISOString(),
    synced: 0
  }),
  update: async (id, data) => {
    const now = dayjs().toISOString()
    await db.products.update(id, {
      ...data,
      updatedAt: now,
      synced: 0
    })
  },
  delete: (id) => db.products.delete(id)
}
