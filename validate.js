import fs from 'node:fs';
import path from 'node:path';

const SANITIZED_FILE = path.join(process.cwd(), 'backup-sinarpagi-sanitized.json');

function validateData() {
  console.log('🔍 Memulai validasi integritas data...\n');

  if (!fs.existsSync(SANITIZED_FILE)) {
    console.error(`❌ File sanitized tidak ditemukan: ${SANITIZED_FILE}`);
    console.log('💡 Jalankan "node sanitize.js" terlebih dahulu.');
    process.exit(1);
  }

  try {
    const rawData = fs.readFileSync(SANITIZED_FILE, 'utf-8');
    const data = JSON.parse(rawData);

    const errors = [];
    const warnings = [];

    // Map untuk lookup cepat
    const categoryIds = new Set(data.categories.map(c => c.id));
    const productIds = new Set(data.products.map(p => p.id));
    const memberIds = new Set(data.members.map(m => m.id));
    const transactionIds = new Set(data.transactions.map(t => t.id));

    // 1. Validasi Produk
    data.products.forEach(p => {
      if (p.category_id && !categoryIds.has(p.category_id)) {
        warnings.push(`[Produk] ${p.name} (ID: ${p.id}) merujuk ke category_id yang tidak ada: ${p.category_id}`);
      }
      if (p.price_sell < p.price_modal) {
        warnings.push(`[Harga] Produk ${p.name} memiliki harga jual (${p.price_sell}) lebih rendah dari modal (${p.price_modal})`);
      }
    });

    // 2. Validasi Paket Produk
    data.product_packages.forEach(pkg => {
      if (!productIds.has(pkg.product_id)) {
        errors.push(`[Paket] Package ${pkg.name} (ID: ${pkg.id}) merujuk ke product_id yang tidak valid: ${pkg.product_id}`);
      }
    });

    // 3. Validasi Transaksi & Member
    data.transactions.forEach(tx => {
      if (tx.member_id && !memberIds.has(tx.member_id)) {
        warnings.push(`[Transaksi] Invoice ${tx.invoice_no} merujuk ke member_id yang tidak ada: ${tx.member_id}`);
      }
    });

    // 4. Validasi Item Transaksi
    data.transaction_items.forEach(item => {
      if (!transactionIds.has(item.transaction_id)) {
        errors.push(`[Transaction Item] Item ID ${item.id} merujuk ke transaction_id yang tidak valid: ${item.transaction_id}`);
      }
      if (item.product_id && !productIds.has(item.product_id)) {
        warnings.push(`[Transaction Item] Item ${item.product_name} merujuk ke product_id yang sudah tidak ada di katalog: ${item.product_id}`);
      }
    });

    // Output Hasil Validasi
    console.log('--- HASIL VALIDASI ---');
    
    if (warnings.length > 0) {
      console.log(`⚠️  Ditemukan ${warnings.length} peringatan (non-fatal):`);
      warnings.forEach(w => console.log(`   - ${w}`));
    }

    if (errors.length > 0) {
      console.log(`\n❌ Ditemukan ${errors.length} error integritas data (fatal):`);
      errors.forEach(e => console.log(`   - ${e}`));
      console.log('\n❌ Validasi gagal. Perbaiki error sebelum melakukan migrasi/import.');
    } else {
      console.log('\n✅ Validasi berhasil! Data konsisten dan siap digunakan untuk migrasi.');
    }

  } catch (error) {
    console.error('❌ Terjadi kesalahan saat membaca/memvalidasi file:', error.message);
  }
}

validateData();
