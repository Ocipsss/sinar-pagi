import fs from 'node:fs';
import path from 'node:path';

// Konfigurasi Nama File Input & Output
const INPUT_FILE = path.join(process.cwd(), 'backup-sinarpagi.json');
const OUTPUT_FILE = path.join(process.cwd(), 'backup-sinarpagi-sanitized.json');

/**
 * Sanitasi string sederhana (hilangkan spasi berlebih)
 */
function sanitizeString(str, defaultValue = '') {
  if (typeof str !== 'string') return defaultValue;
  return str.trim();
}

/**
 * Sanitasi angka (pastikan number valid dan bukan NaN)
 */
function sanitizeNumber(num, defaultValue = 0) {
  const parsed = Number(num);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Main Sanitizer Function
 */
function sanitizeBackupData() {
  console.log('🔄 Memulai proses sanitasi data...');

  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ File input tidak ditemukan: ${INPUT_FILE}`);
    console.log('💡 Pastikan nama file JSON lama disesuaikan dengan variabel INPUT_FILE.');
    process.exit(1);
  }

  try {
    const rawData = fs.readFileSync(INPUT_FILE, 'utf-8');
    const data = JSON.parse(rawData);

    // 1. Sanitasi Metadata
    const sanitizedMetadata = {
      app: sanitizeString(data.app, 'Sinar Pagi POS'),
      version: sanitizeString(data.version, '1.0.0'),
      exported_at: data.exported_at || new Date().toISOString(),
      backup_schema_version: 1
    };

    // 2. Sanitasi Kategori
    const sanitizedCategories = Array.isArray(data.categories)
      ? data.categories
          .map((cat) => ({
            id: sanitizeString(cat.id),
            name: sanitizeString(cat.name).toUpperCase(),
            created_at: cat.created_at || new Date().toISOString()
          }))
          .filter((cat) => cat.id && cat.name)
      : [];

    // 3. Sanitasi Produk
    const sanitizedProducts = Array.isArray(data.products)
      ? data.products
          .map((prod) => ({
            id: sanitizeString(prod.id),
            barcode: sanitizeString(prod.barcode),
            name: sanitizeString(prod.name),
            category_id: sanitizeString(prod.category_id || prod.categoryId),
            price_modal: sanitizeNumber(prod.price_modal || prod.modalPrice, 0),
            price_sell: sanitizeNumber(prod.price_sell || prod.sellPrice, 0),
            stock: sanitizeNumber(prod.stock || prod.qty, 0),
            unit: sanitizeString(prod.unit, 'pcs'),
            image_url: sanitizeString(prod.image_url || prod.imageUrl || prod.image),
            is_active: Boolean(prod.is_active ?? true),
            created_at: prod.created_at || new Date().toISOString(),
            updated_at: prod.updated_at || new Date().toISOString()
          }))
          .filter((prod) => prod.id && prod.name)
      : [];

    // Set ID produk valid untuk pengecekan relasi (mencegah orphaned packages)
    const validProductIds = new Set(sanitizedProducts.map((p) => p.id));

    // 4. Sanitasi Paket Produk (Harga Paket / Varian) + Clean Orphaned Packages
    const sanitizedProductPackages = Array.isArray(data.product_packages || data.productPackages)
      ? (data.product_packages || data.productPackages)
          .map((pkg) => ({
            id: sanitizeString(pkg.id),
            product_id: sanitizeString(pkg.product_id || pkg.productId),
            name: sanitizeString(pkg.name),
            multiplier: Math.max(1, sanitizeNumber(pkg.multiplier, 1)),
            price_sell: sanitizeNumber(pkg.price_sell || pkg.priceSell, 0),
            created_at: pkg.created_at || new Date().toISOString()
          }))
          .filter((pkg) => pkg.id && pkg.product_id && validProductIds.has(pkg.product_id))
      : [];

    // 5. Sanitasi Member / Pelanggan
    const sanitizedMembers = Array.isArray(data.members)
      ? data.members
          .map((mem) => ({
            id: sanitizeString(mem.id),
            name: sanitizeString(mem.name),
            phone: sanitizeString(mem.phone),
            points: sanitizeNumber(mem.points, 0),
            debt: sanitizeNumber(mem.debt || mem.piutang, 0),
            created_at: mem.created_at || new Date().toISOString()
          }))
          .filter((mem) => mem.id && mem.name)
      : [];

    // 6. Sanitasi Transaksi & Item Transaksi
    const sanitizedTransactions = Array.isArray(data.transactions)
      ? data.transactions
          .map((tx) => ({
            id: sanitizeString(tx.id),
            invoice_no: sanitizeString(tx.invoice_no || tx.invoiceNo),
            total_amount: sanitizeNumber(tx.total_amount || tx.totalAmount, 0),
            pay_amount: sanitizeNumber(tx.pay_amount || tx.payAmount, 0),
            change_amount: sanitizeNumber(tx.change_amount || tx.changeAmount, 0),
            payment_method: sanitizeString(tx.payment_method || tx.paymentMethod, 'CASH'),
            member_id: sanitizeString(tx.member_id || tx.memberId, null),
            notes: sanitizeString(tx.notes),
            created_at: tx.created_at || new Date().toISOString()
          }))
          .filter((tx) => tx.id)
      : [];

    const sanitizedTransactionItems = Array.isArray(data.transaction_items || data.transactionItems)
      ? (data.transaction_items || data.transactionItems)
          .map((item) => ({
            id: sanitizeString(item.id),
            transaction_id: sanitizeString(item.transaction_id || item.transactionId),
            product_id: sanitizeString(item.product_id || item.productId),
            product_name: sanitizeString(item.product_name || item.productName),
            qty: sanitizeNumber(item.qty, 1),
            price: sanitizeNumber(item.price, 0),
            subtotal: sanitizeNumber(item.subtotal, 0),
            service_type: sanitizeString(item.service_type || item.serviceType, null)
          }))
          .filter((item) => item.id && item.transaction_id)
      : [];

    // Gabungkan kembali struktur data
    const sanitizedData = {
      ...sanitizedMetadata,
      categories: sanitizedCategories,
      products: sanitizedProducts,
      product_packages: sanitizedProductPackages,
      members: sanitizedMembers,
      transactions: sanitizedTransactions,
      transaction_items: sanitizedTransactionItems
    };

    // Tulis ke file baru tanpa menyentuh file asli
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(sanitizedData, null, 2), 'utf-8');

    console.log('✅ Sanitasi data berhasil!');
    console.log(`📁 File hasil sanitasi disimpan ke: ${OUTPUT_FILE}`);
    console.log('📊 Ringkasan Data Sanitized:');
    console.table({
      Categories: sanitizedCategories.length,
      Products: sanitizedProducts.length,
      ProductPackages: sanitizedProductPackages.length,
      Members: sanitizedMembers.length,
      Transactions: sanitizedTransactions.length,
      TransactionItems: sanitizedTransactionItems.length
    });
  } catch (error) {
    console.error('❌ Terjadi kesalahan saat memproses sanitasi:', error.message);
  }
}

// Jalankan script
sanitizeBackupData();
