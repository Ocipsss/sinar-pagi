# MEMORY.md - Sinar Pagi POS v1.2 (FIXED HEADER)

## Status Terakhir (10 Okt 2026)
Sesi header fixed selesai. Semua halaman header posisi tetap tidak bisa di-scroll.

## Struktur Fix Global
- `src/layouts/MainLayout.vue`
    - Outer: `min-h-screen bg-zinc-900 overflow-hidden`
    - Inner wrapper: `h-screen flex flex-col overflow-hidden` + translate saat sidebar buka
    - Header: `shrink-0 h-[56px] bg-white border-b` z-40 -> FIXED GLOBAL
    - Main: `flex-1 overflow-hidden flex flex-col max-w-xl mx-auto w-full` -> tidak boleh scroll, yang scroll cuma di dalam view

## Fix Per View
- `ProductsList.vue`: root `flex-1 overflow-auto p-4 pb-24`
- `ProductsAdd.vue`: root `flex-1 overflow-auto p-4 pb-24` + ProductForm
- `Dashboard.vue`: root `flex-1 overflow-auto p-4 space-y-4 pb-24`
- `Kasir.vue` (FINAL):
    - Outer: `flex flex-col h-[calc(100dvh-56px)] overflow-hidden bg-zinc-50`
    - Search: `shrink-0 sticky top-0 z-10 bg-zinc-50 p-4`
    - Cart list: `flex-1 overflow-auto px-4 pb-4` -> SATU-SATUNYA YANG SCROLL
    - Payment: `shrink-0 sticky bottom-0 z-20 bg-zinc-900 rounded-t-[2rem] p-5 pb-7`
    - Fitur: addToCart unshift ke atas, bayarDisplay ribuan, QRIS tanpa input nominal + tombol "Bayar dengan QRIS", CASH tombol bayar muncul hanya jika bayarNominal>0 + UANG PAS
    - Member modal: fixed inset-0 z-[90] flex items-end

## Kasir Logic (useKasir.js)
- products, members load dari kasirService.getInitialData
- filteredProducts slice 15-20, filter name/code
- cart.unshift, inc/dec, splice jika qty<=0
- total, kembalian, kurangBayar computed
- bayarDisplay computed formatRibuan
- checkout: validasi TEMPO wajib member, CASH bayarNominal>=total, QRIS total otomatis

## DB & Sync
- Dexie DB: products, product_packages, categories, transactions, transaction_items, members, debt_payments, expenses, digital_transactions, services, settings
- syncService: push unsynced where synced=0 batch 400, realtime pull onSnapshot master + transactions filter today, recalc debt

## Router
- MainLayout children: '', redirect /products, products, add-products, edit-product/:id (pakai ProductsAdd), dashboard, kasir, shopping
- meta.title untuk header

## TODO / Next Session
- User mau kasih file referensi baru untuk sesi baru
- Pastikan style.css tailwind import tetap
- App.vue hanya <router-view/>

## File Referensi
- /mnt/data/src-v.1.1.txt -> source awal
- /mnt/data/src-v1.2-FIXED.txt -> source dengan MainLayout + Kasir fixed (generated)