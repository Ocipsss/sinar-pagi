import fs from 'node:fs';
import path from 'node:path';

const SANITIZED_FILE = path.join(process.cwd(), 'backup-sinarpagi-sanitized.json');

const REQUIRED_TABLES = [
  'categories',
  'products',
  'product_packages',
  'services',
  'units',
  'operators',
  'settings',
  'members',
  'transactions',
  'transaction_items',
  'cash_accounts',
  'cash_mutations',
  'expenses',
  'debt_payments',
  'digital_transactions',
  'shopping_list'
];

function validateSanitizedBackup() {
  console.log('🔍 Memulai Validasi File Output Sanitasi...\n');

  if (!fs.existsSync(SANITIZED_FILE)) {
    console.error(`❌ File sanitasi tidak ditemukan: ${SANITIZED_FILE}`);
    process.exit(1);
  }

  try {
    const rawData = fs.readFileSync(SANITIZED_FILE, 'utf-8');
    const data = JSON.parse(rawData);

    let totalErrors = 0;
    let totalWarnings = 0;

    const logError = (msg) => {
      console.error(`  ❌ [ERROR] ${msg}`);
      totalErrors++;
    };

    const logWarning = (msg) => {
      console.warn(`  ⚠️  [WARN] ${msg}`);
      totalWarnings++;
    };

    // 1. Validasi Keberadaan 16 Tabel
    console.log('1. Memeriksa Struktur Tabel (16 Tabel)...');
    REQUIRED_TABLES.forEach((table) => {
      if (!Array.isArray(data[table])) {
        logError(`Tabel '${table}' tidak ditemukan atau bukan merupakan Array!`);
      } else {
        console.log(`  ✓ Tabel '${table}': ${data[table].length} record`);
      }
    });

    if (totalErrors > 0) {
      console.error('\n❌ Validasi dihentikan karena struktur tabel dasar tidak lengkap.');
      process.exit(1);
    }

    // Map untuk validasi Relasi Foreign Key
    const categoryIds = new Set((data.categories || []).map((c) => c.id));
    const productIds = new Set((data.products || []).map((p) => p.id));
    const serviceIds = new Set((data.services || []).map((s) => s.id));
    const memberIds = new Set((data.members || []).map((m) => m.id));
    const transactionIds = new Set((data.transactions || []).map((t) => t.id));
    const cashAccountIds = new Set((data.cash_accounts || []).map((a) => a.id));

    // 2. Validasi Tabel Products
    console.log('\n2. Memeriksa Validitas Data Produk (`products`)...');
    (data.products || []).forEach((p, idx) => {
      if (!p.id) logError(`Produk indeks ${idx} tidak memiliki 'id'`);
      if (!p.name) logError(`Produk ID '${p.id}' tidak memiliki 'name'`);
      if (typeof p.price_sell !== 'number') logError(`Produk ID '${p.id}' price_sell bukan number`);
      if (p.category_id && !categoryIds.has(p.category_id)) {
        logError(`Produk '${p.name}' (${p.id}) me-refer ke category_id '${p.category_id}' yang tidak terdaftar!`);
      }
    });

    // 3. Validasi Tabel Product Packages
    console.log('\n3. Memeriksa Validitas Paket Produk (`product_packages`)...');
    (data.product_packages || []).forEach((pkg) => {
      if (!pkg.product_id || !productIds.has(pkg.product_id)) {
        logError(`Product Package '${pkg.id}' me-refer ke product_id '${pkg.product_id}' yang tidak valid!`);
      }
    });

    // 4. Validasi Tabel Transactions
    console.log('\n4. Memeriksa Validitas Transaksi (`transactions`)...');
    (data.transactions || []).forEach((tx) => {
      if (!tx.id) logError(`Transaksi tanpa ID terdeteksi`);
      if (!tx.invoice_no) logError(`Transaksi ID '${tx.id}' tidak memiliki 'invoice_no'`);
      if (tx.member_id && !memberIds.has(tx.member_id)) {
        logError(`Transaksi '${tx.invoice_no}' me-refer ke member_id '${tx.member_id}' yang tidak terdaftar!`);
      }
    });

    // 5. Validasi Tabel Transaction Items
    console.log('\n5. Memeriksa Validitas Item Transaksi (`transaction_items`)...');
    (data.transaction_items || []).forEach((item) => {
      if (!item.transaction_id || !transactionIds.has(item.transaction_id)) {
        logError(`Transaction Item '${item.id}' me-refer ke transaction_id '${item.transaction_id}' yang tidak ada di daftar transaksi!`);
      }
      if (item.product_id && !productIds.has(item.product_id)) {
        logWarning(`Transaction Item '${item.id}' memiliki product_id '${item.product_id}' yang sudah terhapus/tidak terdaftar.`);
      }
      if (item.service_id && !serviceIds.has(item.service_id)) {
        logWarning(`Transaction Item '${item.id}' memiliki service_id '${item.service_id}' yang sudah terhapus/tidak terdaftar.`);
      }
    });

    // 6. Validasi Mutasi Kas
    console.log('\n6. Memeriksa Validitas Mutasi Kas (`cash_mutations`)...');
    (data.cash_mutations || []).forEach((mut) => {
      if (mut.account_id && !cashAccountIds.has(mut.account_id)) {
        logWarning(`Mutasi Kas '${mut.id}' me-refer ke account_id '${mut.account_id}' yang tidak terdaftar di cash_accounts.`);
      }
    });

    // 7. Ringkasan Validasi
    console.log('\n========================================');
    console.log('📊 RINGKASAN HASIL VALIDASI');
    console.log('========================================');
    console.log(`Total Errors   : ${totalErrors}`);
    console.log(`Total Warnings : ${totalWarnings}`);

    if (totalErrors === 0) {
      console.log('\n🎉 VALIDASI SUKSES 100%! Data bersih, konsisten, dan siap di-import ke Supabase.');
    } else {
      console.error(`\n⛔ VALIDASI GAGAL! Ditemukan ${totalErrors} error fatal yang perlu diperbaiki sebelum import.`);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Terjadi kesalahan saat membaca/memproses file validasi:', error.message);
    process.exit(1);
  }
}

validateSanitizedBackup();
