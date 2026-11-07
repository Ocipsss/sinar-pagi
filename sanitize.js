import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const INPUT_FILE = path.join(process.cwd(), 'backup.json');
const OUTPUT_FILE = path.join(process.cwd(), 'backup-sinarpagi-sanitized.json');

function sanitizeString(str, defaultValue = null) {
  if (typeof str !== 'string' || !str.trim()) return defaultValue;
  return str.trim();
}

function sanitizeNumber(num, defaultValue = 0, allowNegative = false) {
  const parsed = Number(num);
  if (Number.isNaN(parsed)) return defaultValue;
  return allowNegative ? parsed : Math.max(0, parsed);
}

function sanitizeBackupData() {
  console.log('🔄 Memulai sanitasi data (Fix Mapping Kategori & 16 Tabel)...');

  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ File input tidak ditemukan: ${INPUT_FILE}`);
    process.exit(1);
  }

  try {
    const rawData = fs.readFileSync(INPUT_FILE, 'utf-8');
    const rootData = JSON.parse(rawData);
    const dbData = rootData.database || rootData.data || rootData;
    const nowIso = new Date().toISOString();

    const rawProducts = Array.isArray(dbData.products) ? dbData.products : [];

    // 1. KATEGORI (`categories`) - Dual Map (ID & Nama)
    const categoryNameMap = new Map();
    const categoryIdMap = new Map();

    // A. Muat kategori resmi dari array dbData.categories (Pertahankan ID/UUID asli)
    if (Array.isArray(dbData.categories)) {
      dbData.categories
        .filter((cat) => !cat.deleted)
        .forEach((cat) => {
          const catName = sanitizeString(cat.name, '').toUpperCase();
          const catId = sanitizeString(cat.id) || crypto.randomUUID();
          if (catName) {
            const catObj = {
              id: catId,
              name: catName,
              deleted: false,
              created_at: cat.created_at || cat.createdAt || nowIso,
              updated_at: cat.updated_at || cat.updatedAt || nowIso
            };
            categoryNameMap.set(catName, catObj);
            categoryIdMap.set(catId, catObj);
          }
        });
    }

    // B. Pindai produk, daftarkan nama kategori baru dari prod.category jika belum ada di categories
    rawProducts
      .filter((prod) => !prod.deleted)
      .forEach((prod) => {
        let rawCat = prod.category || prod.category_name || prod.categoryName;
        const prodCatId = prod.category_id || prod.categoryId;

        if (prodCatId && categoryIdMap.has(prodCatId)) {
          rawCat = categoryIdMap.get(prodCatId).name;
        }

        const catName = sanitizeString(rawCat, 'UMUM').toUpperCase();
        if (!categoryNameMap.has(catName)) {
          const newId = crypto.randomUUID();
          const catObj = {
            id: newId,
            name: catName,
            deleted: false,
            created_at: nowIso,
            updated_at: nowIso
          };
          categoryNameMap.set(catName, catObj);
          categoryIdMap.set(newId, catObj);
        }
      });

    const sanitizedCategories = Array.from(categoryNameMap.values());

    // 2. PRODUK (`products`)
    const sanitizedProducts = rawProducts
      .filter((prod) => !prod.deleted)
      .map((prod) => {
        let catObj = null;

        // Step 1: Cek via string prod.category ("MINUMAN SACHET", dsb)
        const rawCatName = sanitizeString(prod.category || prod.category_name || prod.categoryName);
        if (rawCatName) {
          catObj = categoryNameMap.get(rawCatName.toUpperCase());
        }

        // Step 2: Fallback via category_id/categoryId
        if (!catObj) {
          const rawCatId = prod.category_id || prod.categoryId;
          if (rawCatId) catObj = categoryIdMap.get(rawCatId);
        }

        const cleanStock = sanitizeNumber(prod.stock || prod.qty, 0, false);
        const modalPrice = sanitizeNumber(prod.price_modal || prod.modalPrice || prod.price_buy, 0);
        const sellPrice = sanitizeNumber(prod.price_sell || prod.sellPrice || prod.price, 0);

        // Ambil Nama Kategori Asli (misal: "MINUMAN SACHET")
        const categoryName = catObj ? catObj.name : (rawCatName ? rawCatName.toUpperCase() : 'UMUM');

        return {
          id: sanitizeString(prod.id) || crypto.randomUUID(),
          category_id: catObj ? catObj.id : null, // UUID untuk Foreign Key Supabase
          category: categoryName,                 // String Nama Kategori untuk Aplikasi
          code: sanitizeString(prod.code || prod.barcode, ''),
          barcode: sanitizeString(prod.barcode || prod.code, ''),
          name: sanitizeString(prod.name, 'Tanpa Nama'),
          price_modal: modalPrice,
          price_buy: modalPrice,
          price_sell: sellPrice,
          sell_price: sellPrice,
          qty: cleanStock,
          stock: cleanStock,
          unit: sanitizeString(prod.unit, 'pcs'),
          min_stock: sanitizeNumber(prod.min_stock || prod.minStock, 0),
          ideal_stock: sanitizeNumber(prod.ideal_stock || prod.idealStock, 0),
          purchase_pack_name: sanitizeString(prod.purchase_pack_name || prod.purchasePackName, ''),
          pack_qty: sanitizeNumber(prod.pack_qty || prod.packQty, 0),
          pack_price: sanitizeNumber(prod.pack_price || prod.packPrice, 0),
          pack_size: sanitizeNumber(prod.pack_size || prod.packSize || prod.packQty, 1),
          image_url: sanitizeString(prod.image_url || prod.imageUrl || prod.image, null),
          image_public_id: sanitizeString(prod.image_public_id || prod.imagePublicId, null),
          is_published: Boolean(prod.is_published ?? prod.isPublished ?? true),
          is_active: Boolean(prod.is_active ?? true),
          deleted: false,
          created_at: prod.created_at || prod.createdAt || nowIso,
          updated_at: prod.updated_at || prod.updatedAt || nowIso
        };
      })
      .filter((prod) => prod.id && prod.name);

    const validProductIds = new Set(sanitizedProducts.map((p) => p.id));

    // 3. PAKET PRODUK (`product_packages`)
    const rawPackages = Array.isArray(dbData.product_packages) ? dbData.product_packages : (Array.isArray(dbData.productPackages) ? dbData.productPackages : []);
    const sanitizedProductPackages = rawPackages
      .filter((pkg) => !pkg.deleted)
      .map((pkg, idx) => ({
        id: sanitizeString(pkg.id) || crypto.randomUUID(),
        product_id: sanitizeString(pkg.product_id || pkg.productId),
        name: sanitizeString(pkg.name),
        multiplier: Math.max(1, sanitizeNumber(pkg.multiplier || pkg.qty_pcs || pkg.qtyPcs, 1)),
        qty_pcs: Math.max(1, sanitizeNumber(pkg.qty_pcs || pkg.qtyPcs || pkg.multiplier, 1)),
        price_sell: sanitizeNumber(pkg.price_sell || pkg.priceSell, 0),
        order: sanitizeNumber(pkg.order, idx),
        deleted: false,
        created_at: pkg.created_at || pkg.createdAt || nowIso,
        updated_at: pkg.updated_at || pkg.updatedAt || nowIso
      }))
      .filter((pkg) => pkg.id && pkg.product_id && validProductIds.has(pkg.product_id));

    // 4. MEMBERS (`members`)
    const rawMembers = Array.isArray(dbData.members) ? dbData.members : [];
    const sanitizedMembers = rawMembers
      .filter((mem) => !mem.deleted)
      .map((mem) => ({
        id: sanitizeString(mem.id) || crypto.randomUUID(),
        name: sanitizeString(mem.name),
        phone: sanitizeString(mem.phone, null),
        address: sanitizeString(mem.address, null),
        total_spending: sanitizeNumber(mem.total_spending || mem.totalSpending, 0),
        points: sanitizeNumber(mem.points, 0),
        debt: sanitizeNumber(mem.debt || mem.piutang, 0),
        deleted: false,
        created_at: mem.created_at || mem.createdAt || nowIso,
        updated_at: mem.updated_at || mem.updatedAt || nowIso
      }))
      .filter((mem) => mem.id && mem.name);

    // 5. LAYANAN / JASA (`services`)
    const rawServices = Array.isArray(dbData.services) ? dbData.services : [];
    const sanitizedServices = rawServices
      .filter((srv) => !srv.deleted)
      .map((srv) => ({
        id: sanitizeString(srv.id) || crypto.randomUUID(),
        name: sanitizeString(srv.name),
        price: sanitizeNumber(srv.price, 0),
        category: sanitizeString(srv.category, null),
        product_id: sanitizeString(srv.product_id || srv.productId, null),
        product_ids: Array.isArray(srv.product_ids || srv.productIds) ? (srv.product_ids || srv.productIds) : [],
        deleted: false,
        created_at: srv.created_at || srv.createdAt || nowIso,
        updated_at: srv.updated_at || srv.updatedAt || nowIso
      }))
      .filter((srv) => srv.id && srv.name);

    // 6. TRANSAKSI & DETAIL TRANSAKSI (`transactions` & `transaction_items`)
    const validServiceIds = new Set(sanitizedServices.map((s) => s.id));
    const validMemberIds = new Set(sanitizedMembers.map((m) => m.id));

    const rawTransactions = Array.isArray(dbData.transactions) ? dbData.transactions : [];
    const sanitizedTransactions = rawTransactions
      .map((tx) => {
        const rawMemberId = sanitizeString(tx.member_id || tx.memberId, null);
        const cleanMemberId = (rawMemberId && validMemberIds.has(rawMemberId)) ? rawMemberId : null;
        const totalVal = sanitizeNumber(tx.total_amount || tx.totalAmount || tx.total, 0);
        const paidVal = sanitizeNumber(tx.pay_amount || tx.payAmount || tx.amountPaid || tx.paidAmount || tx.amount_paid || tx.paid_amount, 0);
        const changeVal = sanitizeNumber(tx.change_amount || tx.changeAmount || tx.change, 0);

        return {
          id: sanitizeString(tx.id) || crypto.randomUUID(),
          invoice_no: sanitizeString(tx.invoice_no || tx.invoiceNo || `INV-${tx.id}`),
          date: tx.date || tx.created_at || tx.createdAt || nowIso,
          total: totalVal,
          total_amount: totalVal,
          pay_amount: paidVal,
          paid_amount: paidVal,
          amount_paid: paidVal,
          change: changeVal,
          change_amount: changeVal,
          remaining: sanitizeNumber(tx.remaining, (totalVal - paidVal > 0 ? totalVal - paidVal : 0)),
          payment_method: sanitizeString(tx.payment_method || tx.paymentMethod, 'CASH'),
          member_id: cleanMemberId,
          operator_id: sanitizeString(tx.operator_id || tx.operatorId, null),
          status: sanitizeString(tx.status, 'paid'),
          due_date: tx.due_date || tx.dueDate || null,
          notes: sanitizeString(tx.notes || tx.note, null),
          created_at: tx.created_at || tx.createdAt || tx.date || nowIso,
          updated_at: tx.updated_at || tx.updatedAt || tx.date || nowIso
        };
      })
      .filter((tx) => tx.id);

    const validTxIds = new Set(sanitizedTransactions.map((t) => t.id));

    const rawTxItems = Array.isArray(dbData.transaction_items) 
      ? dbData.transaction_items 
      : (Array.isArray(dbData.transactionItems) ? dbData.transactionItems : []);

    const sanitizedTransactionItems = rawTxItems
      .map((item) => {
        const qty = sanitizeNumber(item.qty, 1);
        const price = sanitizeNumber(item.price || item.price_sell || item.sellPrice, 0);

        const rawProductId = sanitizeString(item.product_id || item.productId, null);
        const cleanProductId = (rawProductId && validProductIds.has(rawProductId)) ? rawProductId : null;

        const rawServiceId = sanitizeString(item.service_id || item.serviceId, null);
        const cleanServiceId = (rawServiceId && validServiceIds.has(rawServiceId)) ? rawServiceId : null;

        return {
          id: sanitizeString(item.id) || crypto.randomUUID(),
          transaction_id: sanitizeString(item.transaction_id || item.transactionId),
          product_id: cleanProductId,
          service_id: cleanServiceId,
          product_name: sanitizeString(item.product_name || item.productName || item.name, 'Produk'),
          qty,
          price,
          subtotal: sanitizeNumber(item.subtotal, qty * price),
          service_type: sanitizeString(item.service_type || item.serviceType, null),
          created_at: item.created_at || item.createdAt || nowIso,
          updated_at: item.updated_at || item.updatedAt || nowIso
        };
      })
      .filter((item) => item.id && item.transaction_id && validTxIds.has(item.transaction_id));

    // 7. PEMBAYARAN HUTANG (`debt_payments`)
    const rawDebtPayments = Array.isArray(dbData.debt_payments) ? dbData.debt_payments : (Array.isArray(dbData.debtPayments) ? dbData.debtPayments : []);
    const sanitizedDebtPayments = rawDebtPayments
      .map((dp) => ({
        id: sanitizeString(dp.id) || crypto.randomUUID(),
        transaction_id: sanitizeString(dp.transaction_id || dp.transactionId, null),
        member_id: sanitizeString(dp.member_id || dp.memberId, null),
        date: dp.date || dp.created_at || dp.createdAt || nowIso,
        amount: sanitizeNumber(dp.amount, 0),
        payment_method: sanitizeString(dp.payment_method || dp.paymentMethod, 'CASH'),
        created_at: dp.created_at || dp.createdAt || nowIso,
        updated_at: dp.updated_at || dp.updatedAt || nowIso
      }))
      .filter((dp) => dp.id);

    // 8. KAS & MUTASI (`cash_accounts` & `cash_mutations`)
    const rawCashAccounts = Array.isArray(dbData.cash_accounts) ? dbData.cash_accounts : (Array.isArray(dbData.cashAccounts) ? dbData.cashAccounts : []);
    const sanitizedCashAccounts = rawCashAccounts
      .filter((acc) => !acc.deleted)
      .map((acc) => ({
        id: sanitizeString(acc.id) || crypto.randomUUID(),
        name: sanitizeString(acc.name, 'Kas Utama'),
        type: sanitizeString(acc.type, 'CASH'),
        balance: sanitizeNumber(acc.balance, 0, true),
        deleted: false,
        created_at: acc.created_at || acc.createdAt || nowIso,
        updated_at: acc.updated_at || acc.updatedAt || nowIso
      }))
      .filter((acc) => acc.id && acc.name);

    const rawCashMutations = Array.isArray(dbData.cash_mutations) ? dbData.cash_mutations : (Array.isArray(dbData.cashMutations) ? dbData.cashMutations : []);
    const sanitizedCashMutations = rawCashMutations
      .map((mut) => ({
        id: sanitizeString(mut.id) || crypto.randomUUID(),
        account_id: sanitizeString(mut.account_id || mut.accountId, null),
        date: mut.date || mut.created_at || mut.createdAt || nowIso,
        type: sanitizeString(mut.type, 'IN'),
        amount: sanitizeNumber(mut.amount, 0),
        category: sanitizeString(mut.category, null),
        note: sanitizeString(mut.note || mut.notes, null),
        ref_id: sanitizeString(mut.ref_id || mut.refId, null),
        created_at: mut.created_at || mut.createdAt || nowIso,
        updated_at: mut.updated_at || mut.updatedAt || nowIso
      }))
      .filter((mut) => mut.id);

    // 9. EXPENSES (`expenses`)
    const rawExpenses = Array.isArray(dbData.expenses) ? dbData.expenses : [];
    const sanitizedExpenses = rawExpenses
      .map((exp) => ({
        id: sanitizeString(exp.id) || crypto.randomUUID(),
        date: exp.date || exp.created_at || exp.createdAt || nowIso,
        category: sanitizeString(exp.category, 'LAIN-LAIN'),
        amount: sanitizeNumber(exp.amount, 0),
        note: sanitizeString(exp.note || exp.notes, null),
        payment_method: sanitizeString(exp.payment_method || exp.paymentMethod, 'CASH'),
        cash_part: sanitizeNumber(exp.cash_part || exp.cashPart, 0),
        qris_part: sanitizeNumber(exp.qris_part || exp.qrisPart, 0),
        created_at: exp.created_at || exp.createdAt || nowIso,
        updated_at: exp.updated_at || exp.updatedAt || nowIso
      }))
      .filter((exp) => exp.id);

    // 10. TRANSAKSI DIGITAL (`digital_transactions`)
    const rawDigitalTx = Array.isArray(dbData.digital_transactions) ? dbData.digital_transactions : (Array.isArray(dbData.digitalTransactions) ? dbData.digitalTransactions : []);
    const sanitizedDigitalTx = rawDigitalTx
      .map((dtx) => ({
        id: sanitizeString(dtx.id) || crypto.randomUUID(),
        date: dtx.date || dtx.created_at || dtx.createdAt || nowIso,
        type: sanitizeString(dtx.type, 'PULSA'),
        provider: sanitizeString(dtx.provider, null),
        nominal: sanitizeNumber(dtx.nominal, 0),
        admin_fee: sanitizeNumber(dtx.admin_fee || dtx.adminFee, 0),
        admin_payment_method: sanitizeString(dtx.admin_payment_method || dtx.adminPaymentMethod, 'CASH'),
        total_received: sanitizeNumber(dtx.total_received || dtx.totalReceived, 0),
        profit: sanitizeNumber(dtx.profit, 0),
        created_at: dtx.created_at || dtx.createdAt || nowIso,
        updated_at: dtx.updated_at || dtx.updatedAt || nowIso
      }))
      .filter((dtx) => dtx.id);

    // 11. SATUAN (`units`)
    const rawUnits = Array.isArray(dbData.units) ? dbData.units : [];
    const unitMap = new Map();

    rawUnits
      .filter((u) => !u.deleted)
      .forEach((u) => {
        const cleanName = sanitizeString(u.name, '');
        const key = cleanName.toLowerCase();
        if (cleanName && !unitMap.has(key)) {
          unitMap.set(key, {
            id: sanitizeString(u.id) || crypto.randomUUID(),
            name: cleanName,
            deleted: false,
            created_at: u.created_at || u.createdAt || nowIso,
            updated_at: u.updated_at || u.updatedAt || nowIso
          });
        }
      });

    const sanitizedUnits = Array.from(unitMap.values());

    // 12. DAFTAR BELANJA (`shopping_list`)
    const rawShoppingList = Array.isArray(dbData.shopping_list) ? dbData.shopping_list : (Array.isArray(dbData.shoppingList) ? dbData.shoppingList : []);
    const sanitizedShoppingList = rawShoppingList
      .map((sl) => ({
        id: sanitizeString(sl.id) || crypto.randomUUID(),
        product_id: sanitizeString(sl.product_id || sl.productId, null),
        is_bought: Boolean(sl.is_bought ?? sl.isBought ?? false),
        category: sanitizeString(sl.category, null),
        created_at: sl.created_at || sl.createdAt || nowIso,
        updated_at: sl.updated_at || sl.updatedAt || nowIso
      }))
      .filter((sl) => sl.id);

    // 13. OPERATOR KASIR (`operators`)
    const rawOperators = Array.isArray(dbData.operators) ? dbData.operators : [];
    const sanitizedOperators = rawOperators
      .filter((op) => !op.deleted)
      .map((op) => ({
        id: sanitizeString(op.id) || crypto.randomUUID(),
        auth_id: sanitizeString(op.auth_id || op.authId, null),
        name: sanitizeString(op.name, 'Kasir'),
        role: sanitizeString(op.role, 'kasir'),
        pin: sanitizeString(op.pin, null),
        deleted: false,
        created_at: op.created_at || op.createdAt || nowIso,
        updated_at: op.updated_at || op.updatedAt || nowIso
      }))
      .filter((op) => op.id && op.name);

    // 14. SETTINGS (`settings`)
    const rawSettings = Array.isArray(dbData.settings) ? dbData.settings : [];
    const sanitizedSettings = rawSettings
      .map((st) => ({
        id: sanitizeString(st.id, 'default_settings'),
        store_name: sanitizeString(st.store_name || st.storeName, 'Warung Sinar Pagi'),
        store_address: sanitizeString(st.store_address || st.storeAddress, null),
        store_phone: sanitizeString(st.store_phone || st.storePhone, null),
        receipt_footer: sanitizeString(st.receipt_footer || st.receiptFooter, null),
        qris_url: sanitizeString(st.qris_url || st.qrisUrl, null),
        merchant_name: sanitizeString(st.merchant_name || st.merchantName, null),
        nmid: sanitizeString(st.nmid, null),
        created_at: st.created_at || st.createdAt || nowIso,
        updated_at: st.updated_at || st.updatedAt || nowIso
      }))
      .filter((st) => st.id);

    // HASIL FINAL JSON DENGAN 16 TABEL LENGKAP
    const sanitizedData = {
      app: sanitizeString(rootData.app || dbData.app, 'Sinar Pagi POS'),
      version: sanitizeString(rootData.version || dbData.version, '1.0.0'),
      exported_at: nowIso,
      backup_schema_version: 1,
      categories: sanitizedCategories,
      products: sanitizedProducts,
      product_packages: sanitizedProductPackages,
      services: sanitizedServices,
      units: sanitizedUnits,
      operators: sanitizedOperators,
      settings: sanitizedSettings,
      members: sanitizedMembers,
      transactions: sanitizedTransactions,
      transaction_items: sanitizedTransactionItems,
      cash_accounts: sanitizedCashAccounts,
      cash_mutations: sanitizedCashMutations,
      expenses: sanitizedExpenses,
      debt_payments: sanitizedDebtPayments,
      digital_transactions: sanitizedDigitalTx,
      shopping_list: sanitizedShoppingList
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(sanitizedData, null, 2), 'utf-8');

    console.log('✅ Sanitasi data berhasil!');
    console.log(`📁 File hasil tersimpan di: ${OUTPUT_FILE}`);
    console.table({
      Categories: sanitizedCategories.length,
      Products: sanitizedProducts.length,
      ProductPackages: sanitizedProductPackages.length,
      Services: sanitizedServices.length,
      Units: sanitizedUnits.length,
      Operators: sanitizedOperators.length,
      Settings: sanitizedSettings.length,
      Members: sanitizedMembers.length,
      Transactions: sanitizedTransactions.length,
      TransactionItems: sanitizedTransactionItems.length,
      CashAccounts: sanitizedCashAccounts.length,
      CashMutations: sanitizedCashMutations.length,
      Expenses: sanitizedExpenses.length,
      DebtPayments: sanitizedDebtPayments.length,
      DigitalTransactions: sanitizedDigitalTx.length,
      ShoppingList: sanitizedShoppingList.length
    });

  } catch (error) {
    console.error('❌ Terjadi kesalahan saat sanitasi:', error.message);
  }
}

sanitizeBackupData();
