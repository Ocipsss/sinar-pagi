import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

// Ambil kredensial Supabase dari file .env
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Kredensial Supabase tidak ditemukan.');
  console.log('💡 Variabel terdeteksi di .env:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const SANITIZED_FILE = path.join(process.cwd(), 'backup-sinarpagi-sanitized.json');

async function importToSupabase() {
  console.log('🚀 Memulai proses impor data sanitized ke Supabase...\n');

  if (!fs.existsSync(SANITIZED_FILE)) {
    console.error(`❌ File sanitized tidak ditemukan: ${SANITIZED_FILE}`);
    process.exit(1);
  }

  try {
    const rawData = fs.readFileSync(SANITIZED_FILE, 'utf-8');
    const data = JSON.parse(rawData);

    // 1. Impor Categories
    if (data.categories?.length) {
      console.log(`⏳ Mengimpor ${data.categories.length} kategori...`);
      const categoriesData = data.categories.map(c => ({
        id: c.id,
        name: c.name,
        created_at: c.created_at,
        updated_at: c.updated_at || c.created_at || new Date().toISOString()
      }));
      const { error } = await supabase.from('categories').upsert(categoriesData, { onConflict: 'id' });
      if (error) throw new Error(`Categories: ${error.message}`);
      console.log('✅ Kategori selesai.');
    }

    // 2. Impor Products (Mapping barcode -> code)
    if (data.products?.length) {
      console.log(`⏳ Mengimpor ${data.products.length} produk...`);
      const mappedProducts = data.products.map(p => ({
        id: p.id,
        category_id: p.category_id || null,
        code: p.barcode || p.code || null,
        name: p.name,
        price_modal: p.price_modal || 0,
        price_sell: p.price_sell || 0,
        qty: p.stock || p.qty || 0,
        stock: p.stock || p.qty || 0,
        unit: p.unit || 'pcs',
        image_url: p.image_url || null,
        is_active: p.is_active ?? true,
        created_at: p.created_at,
        updated_at: p.updated_at || p.created_at || new Date().toISOString()
      }));

      for (let i = 0; i < mappedProducts.length; i += 200) {
        const chunk = mappedProducts.slice(i, i + 200);
        const { error } = await supabase.from('products').upsert(chunk, { onConflict: 'id' });
        if (error) throw new Error(`Products (batch ${i}): ${error.message}`);
      }
      console.log('✅ Produk selesai.');
    }

    // 3. Impor Product Packages (Mapping multiplier -> qty_pcs)
    if (data.product_packages?.length) {
      console.log(`⏳ Mengimpor ${data.product_packages.length} paket produk...`);
      const mappedPackages = data.product_packages.map(pkg => ({
        id: pkg.id,
        product_id: pkg.product_id,
        name: pkg.name,
        multiplier: pkg.multiplier || 1,
        qty_pcs: pkg.multiplier || pkg.qty_pcs || 1,
        price_sell: pkg.price_sell || 0,
        created_at: pkg.created_at,
        updated_at: pkg.updated_at || pkg.created_at || new Date().toISOString()
      }));

      const { error } = await supabase.from('product_packages').upsert(mappedPackages, { onConflict: 'id' });
      if (error) throw new Error(`Product Packages: ${error.message}`);
      console.log('✅ Paket produk selesai.');
    }

    // 4. Impor Members
    if (data.members?.length) {
      console.log(`⏳ Mengimpor ${data.members.length} member...`);
      const mappedMembers = data.members.map(m => ({
        id: m.id,
        name: m.name,
        phone: m.phone || null,
        points: m.points || 0,
        debt: m.debt || 0,
        created_at: m.created_at,
        updated_at: m.updated_at || m.created_at || new Date().toISOString()
      }));
      const { error } = await supabase.from('members').upsert(mappedMembers, { onConflict: 'id' });
      if (error) throw new Error(`Members: ${error.message}`);
      console.log('✅ Member selesai.');
    }

    // 5. Impor Transactions
    if (data.transactions?.length) {
      console.log(`⏳ Mengimpor ${data.transactions.length} transaksi...`);
      const mappedTransactions = data.transactions.map(t => ({
        id: t.id,
        invoice_no: t.invoice_no,
        date: t.created_at,
        total: t.total_amount || 0,
        total_amount: t.total_amount || 0,
        pay_amount: t.pay_amount || 0,
        paid_amount: t.pay_amount || 0,
        amount_paid: t.pay_amount || 0,
        change: t.change_amount || 0,
        change_amount: t.change_amount || 0,
        payment_method: t.payment_method || 'CASH',
        member_id: t.member_id || null,
        notes: t.notes || null,
        created_at: t.created_at,
        updated_at: t.updated_at || t.created_at || new Date().toISOString()
      }));

      for (let i = 0; i < mappedTransactions.length; i += 200) {
        const chunk = mappedTransactions.slice(i, i + 200);
        const { error } = await supabase.from('transactions').upsert(chunk, { onConflict: 'id' });
        if (error) throw new Error(`Transactions (batch ${i}): ${error.message}`);
      }
      console.log('✅ Transaksi selesai.');
    }

    // 6. Impor Transaction Items
    if (data.transaction_items?.length) {
      console.log(`⏳ Mengimpor ${data.transaction_items.length} item transaksi...`);
      const mappedItems = data.transaction_items.map(item => ({
        id: item.id,
        transaction_id: item.transaction_id,
        product_id: item.product_id || null,
        product_name: item.product_name,
        qty: item.qty || 1,
        price: item.price || 0,
        subtotal: item.subtotal || 0,
        service_type: item.service_type || null,
        created_at: item.created_at || new Date().toISOString(),
        updated_at: item.updated_at || new Date().toISOString()
      }));

      for (let i = 0; i < mappedItems.length; i += 200) {
        const chunk = mappedItems.slice(i, i + 200);
        const { error } = await supabase.from('transaction_items').upsert(chunk, { onConflict: 'id' });
        if (error) throw new Error(`Transaction Items (batch ${i}): ${error.message}`);
      }
      console.log('✅ Item transaksi selesai.');
    }

    console.log('\n🎉 SEMUA DATA SANITIZED BERHASIL DIIMPOR KE SUPABASE!');

  } catch (err) {
    console.error('\n❌ Impor gagal:', err.message);
  }
}

importToSupabase();
