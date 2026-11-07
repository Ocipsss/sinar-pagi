import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Muat variabel lingkungan dari file .env
dotenv.config();

const SUPABASE_URL = 
  process.env.VITE_SUPABASE_URL || 
  process.env.SUPABASE_URL || 
  process.env.PUBLIC_SUPABASE_URL;

const SUPABASE_KEY = 
  process.env.VITE_SUPABASE_ANON_KEY || 
  process.env.SUPABASE_ANON_KEY || 
  process.env.SUPABASE_KEY || 
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Kredensial Supabase tidak ditemukan di environment variable (.env).');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const SANITIZED_FILE = path.join(process.cwd(), 'backup-sinarpagi-sanitized.json');

// Helper fungsi upsert per-batch (chunking 200 baris)
async function batchUpsert(tableName, dataArray, onConflictField = 'id', chunkSize = 200) {
  if (!dataArray || dataArray.length === 0) return;
  console.log(`⏳ Mengimpor ${dataArray.length} data ke tabel '${tableName}'...`);

  for (let i = 0; i < dataArray.length; i += chunkSize) {
    const chunk = dataArray.slice(i, i + chunkSize);
    const { error } = await supabase.from(tableName).upsert(chunk, { onConflict: onConflictField });
    if (error) {
      throw new Error(`[${tableName}] Batch ke-${Math.floor(i / chunkSize) + 1} gagal: ${error.message}`);
    }
  }
  console.log(`✅ Tabel '${tableName}' selesai.`);
}

async function importToSupabase() {
  console.log('🚀 Memulai proses impor data sanitized ke Supabase (16 Tabel)... \n');

  if (!fs.existsSync(SANITIZED_FILE)) {
    console.error(`❌ File sanitized tidak ditemukan: ${SANITIZED_FILE}`);
    process.exit(1);
  }

  try {
    const rawData = fs.readFileSync(SANITIZED_FILE, 'utf-8');
    const data = JSON.parse(rawData);

    // 1. Categories
    if (data.categories?.length) {
      const payload = data.categories.map(c => ({
        id: c.id,
        name: c.name,
        created_at: c.created_at,
        updated_at: c.updated_at || c.created_at
      }));
      await batchUpsert('categories', payload);
    }

    // 2. Units (Dibersihkan dari duplikasi nama secara insensitif huruf)
    if (data.units?.length) {
      const uniqueUnitsMap = new Map();
      data.units.forEach(u => {
        const cleanName = u.name ? u.name.trim() : '';
        const key = cleanName.toLowerCase();
        if (cleanName && !uniqueUnitsMap.has(key)) {
          uniqueUnitsMap.set(key, {
            id: u.id,
            name: cleanName,
            created_at: u.created_at,
            updated_at: u.updated_at || u.created_at
          });
        }
      });

      const payload = Array.from(uniqueUnitsMap.values());
      // Gunakan ignoreDuplicates atau onConflict ke 'name' untuk menangani UNIQUE constraint name
      await batchUpsert('units', payload, 'name');
    }

    // 3. Products
    if (data.products?.length) {
      const payload = data.products.map(p => ({
        id: p.id,
        category_id: p.category_id || null,
        code: p.code || p.barcode || null,
        barcode: p.code || p.barcode || null,
        name: p.name,
        price_modal: p.price_modal || 0,
        price_buy: p.price_modal || 0,
        price_sell: p.price_sell || 0,
        sell_price: p.price_sell || 0,
        qty: p.qty || p.stock || 0,
        stock: p.stock || p.qty || 0,
        unit: p.unit || 'pcs',
        min_stock: p.min_stock || 0,
        ideal_stock: p.ideal_stock || 0,
        purchase_pack_name: p.purchase_pack_name || null,
        pack_qty: p.pack_qty || 0,
        pack_price: p.pack_price || 0,
        pack_size: p.pack_size || 1,
        image_url: p.image_url || null,
        image_public_id: p.image_public_id || null,
        is_published: p.is_published ?? true,
        is_active: p.is_active ?? true,
        created_at: p.created_at,
        updated_at: p.updated_at || p.created_at
      }));
      await batchUpsert('products', payload);
    }

    // 4. Product Packages
    if (data.product_packages?.length) {
      const payload = data.product_packages.map(pkg => ({
        id: pkg.id,
        product_id: pkg.product_id,
        name: pkg.name,
        multiplier: pkg.multiplier || 1,
        qty_pcs: pkg.qty_pcs || pkg.multiplier || 1,
        price_sell: pkg.price_sell || 0,
        order: pkg.order || 0,
        created_at: pkg.created_at,
        updated_at: pkg.updated_at || pkg.created_at
      }));
      await batchUpsert('product_packages', payload);
    }

    // 5. Members
    if (data.members?.length) {
      const payload = data.members.map(m => ({
        id: m.id,
        name: m.name,
        phone: m.phone || null,
        address: m.address || null,
        total_spending: m.total_spending || 0,
        points: m.points || 0,
        debt: m.debt || 0,
        created_at: m.created_at,
        updated_at: m.updated_at || m.created_at
      }));
      await batchUpsert('members', payload);
    }

    // 6. Cash Accounts
    if (data.cash_accounts?.length) {
      const payload = data.cash_accounts.map(acc => ({
        id: acc.id,
        name: acc.name,
        type: acc.type || 'CASH',
        balance: acc.balance || 0,
        created_at: acc.created_at,
        updated_at: acc.updated_at || acc.created_at
      }));
      await batchUpsert('cash_accounts', payload);
    }

    // 7. Operators
    if (data.operators?.length) {
      const payload = data.operators.map(op => ({
        id: op.id,
        auth_id: op.auth_id || null,
        name: op.name,
        role: op.role || 'kasir',
        pin: op.pin || null,
        created_at: op.created_at,
        updated_at: op.updated_at || op.created_at
      }));
      await batchUpsert('operators', payload);
    }

    // 8. Services
    if (data.services?.length) {
      const payload = data.services.map(srv => ({
        id: srv.id,
        name: srv.name,
        price: srv.price || 0,
        category: srv.category || null,
        product_id: srv.product_id || null,
        created_at: srv.created_at,
        updated_at: srv.updated_at || srv.created_at
      }));
      await batchUpsert('services', payload);
    }

    // 9. Settings
    if (data.settings?.length) {
      const payload = data.settings.map(st => ({
        id: st.id,
        store_name: st.store_name || null,
        store_address: st.store_address || null,
        store_phone: st.store_phone || null,
        receipt_footer: st.receipt_footer || null,
        updated_at: st.updated_at || new Date().toISOString()
      }));
      await batchUpsert('settings', payload);
    }

    // 10. Transactions
    if (data.transactions?.length) {
      const payload = data.transactions.map(t => ({
        id: t.id,
        invoice_no: t.invoice_no || null,
        date: t.date || t.created_at,
        total: t.total_amount || 0,
        total_amount: t.total_amount || 0,
        pay_amount: t.pay_amount || 0,
        paid_amount: t.pay_amount || 0,
        amount_paid: t.pay_amount || 0,
        change: t.change_amount || 0,
        change_amount: t.change_amount || 0,
        payment_method: t.payment_method || 'CASH',
        member_id: t.member_id || null,
        status: t.status || 'PAID',
        due_date: t.due_date || null,
        notes: t.notes || null,
        created_at: t.created_at,
        updated_at: t.updated_at || t.created_at
      }));
      await batchUpsert('transactions', payload);
    }

    // 11. Transaction Items
    if (data.transaction_items?.length) {
      const payload = data.transaction_items.map(item => ({
        id: item.id,
        transaction_id: item.transaction_id,
        product_id: item.product_id || null,
        service_id: item.service_id || null,
        product_name: item.product_name,
        qty: item.qty || 1,
        price: item.price || 0,
        subtotal: item.subtotal || 0,
        service_type: item.service_type || null,
        created_at: item.created_at || new Date().toISOString(),
        updated_at: item.updated_at || new Date().toISOString()
      }));
      await batchUpsert('transaction_items', payload);
    }

    // 12. Debt Payments
    if (data.debt_payments?.length) {
      const payload = data.debt_payments.map(dp => ({
        id: dp.id,
        transaction_id: dp.transaction_id || null,
        member_id: dp.member_id || null,
        date: dp.date,
        amount: dp.amount || 0,
        payment_method: dp.payment_method || 'CASH',
        created_at: dp.created_at,
        updated_at: dp.updated_at || dp.created_at
      }));
      await batchUpsert('debt_payments', payload);
    }

    // 13. Cash Mutations
    if (data.cash_mutations?.length) {
      const payload = data.cash_mutations.map(mut => ({
        id: mut.id,
        account_id: mut.account_id || null,
        date: mut.date,
        type: mut.type || 'IN',
        amount: mut.amount || 0,
        category: mut.category || null,
        note: mut.note || null,
        ref_id: mut.ref_id || null,
        created_at: mut.created_at,
        updated_at: mut.updated_at || mut.created_at
      }));
      await batchUpsert('cash_mutations', payload);
    }

    // 14. Expenses
    if (data.expenses?.length) {
      const payload = data.expenses.map(exp => ({
        id: exp.id,
        date: exp.date,
        category: exp.category,
        amount: exp.amount || 0,
        note: exp.note || null,
        payment_method: exp.payment_method || 'CASH',
        cash_part: exp.cash_part || 0,
        qris_part: exp.qris_part || 0,
        created_at: exp.created_at,
        updated_at: exp.updated_at || exp.created_at
      }));
      await batchUpsert('expenses', payload);
    }

    // 15. Digital Transactions
    if (data.digital_transactions?.length) {
      const payload = data.digital_transactions.map(dtx => ({
        id: dtx.id,
        date: dtx.date,
        type: dtx.type,
        provider: dtx.provider || null,
        nominal: dtx.nominal || 0,
        admin_fee: dtx.admin_fee || 0,
        admin_payment_method: dtx.admin_payment_method || 'CASH',
        total_received: dtx.total_received || 0,
        profit: dtx.profit || 0,
        created_at: dtx.created_at,
        updated_at: dtx.updated_at || dtx.created_at
      }));
      await batchUpsert('digital_transactions', payload);
    }

    // 16. Shopping List
    if (data.shopping_list?.length) {
      const payload = data.shopping_list.map(sl => ({
        id: sl.id,
        product_id: sl.product_id || null,
        is_bought: sl.is_bought ?? false,
        category: sl.category || null,
        created_at: sl.created_at,
        updated_at: sl.updated_at || sl.created_at
      }));
      await batchUpsert('shopping_list', payload);
    }

    console.log('\n🎉 SEMUA DATA SANITIZED BERHASIL DIIMPOR KE SUPABASE!');

  } catch (err) {
    console.error('\n❌ Impor gagal:', err.message);
  }
}

importToSupabase();
