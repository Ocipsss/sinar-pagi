import { db } from './index'; // sesuaikan dengan instansiasi Dexie Anda

/**
 * Memasukkan data ter-sanitasi ke dalam IndexedDB menggunakan Dexie bulkAdd / bulkPut
 * @param {Object} sanitizedData Data JSON yang sudah melalui proses sanitize.js
 */
export async function seedInitialData(sanitizedData) {
  if (!sanitizedData) {
    throw new Error('Data sanitasi tidak ditemukan atau kosong.');
  }

  console.log('🔄 Memulai proses impor data ke IndexedDB...');

  try {
    await db.transaction('rw', [
      db.categories,
      db.products,
      db.product_packages,
      db.members,
      db.transactions,
      db.transaction_items
    ], async () => {
      // 1. Impor Kategori
      if (Array.isArray(sanitizedData.categories) && sanitizedData.categories.length > 0) {
        await db.categories.bulkPut(sanitizedData.categories);
      }

      // 2. Impor Produk
      if (Array.isArray(sanitizedData.products) && sanitizedData.products.length > 0) {
        await db.products.bulkPut(sanitizedData.products);
      }

      // 3. Impor Paket Produk (Harga Paket)
      if (Array.isArray(sanitizedData.product_packages) && sanitizedData.product_packages.length > 0) {
        await db.product_packages.bulkPut(sanitizedData.product_packages);
      }

      // 4. Impor Member
      if (Array.isArray(sanitizedData.members) && sanitizedData.members.length > 0) {
        await db.members.bulkPut(sanitizedData.members);
      }

      // 5. Impor Transaksi
      if (Array.isArray(sanitizedData.transactions) && sanitizedData.transactions.length > 0) {
        await db.transactions.bulkPut(sanitizedData.transactions);
      }

      // 6. Impor Detail Item Transaksi
      if (Array.isArray(sanitizedData.transaction_items) && sanitizedData.transaction_items.length > 0) {
        await db.transaction_items.bulkPut(sanitizedData.transaction_items);
      }
    });

    console.log('✅ Impor data ke IndexedDB berhasil diselesaikan!');
    return { success: true, message: 'Data berhasil dimuat ke database lokal.' };
  } catch (error) {
    console.error('❌ Terjadi kesalahan saat mengimpor data ke IndexedDB:', error);
    throw error;
  }
}
