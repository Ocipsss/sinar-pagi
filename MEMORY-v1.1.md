# Sesi Memory v1.1 - Sinar Pagi POS

> Generated: 2026-05-13 | Base: src-v.1.1.txt | Offline-first POS warung

## 1. Tech Stack
- Vue 3 + Vite + Router, TailwindCSS v4
- Dexie.js SinarPagiDB
- Firebase Firestore (VITE_FIREBASE_*)
- Pinia + persistedstate, vee-validate + zod, big.js, html5-qrcode, lucide

## 2. Dexie Schema
products: id, code, name, category, price_modal, price_sell, qty, unit, minStock, idealStock, purchasePackName, packQty, packPrice, updatedAt, synced
product_packages, categories, members, transactions (status: paid/unpaid/partial, paymentMethod: CASH/QRIS/TEMPO), transaction_items, debt_payments, expenses, digital_transactions, services, settings

## 3. Services
- firebase.js: getFirestore init
- syncService.js: pushLocalToCloud batch 400, initRealtimePull (master + transaksi hari ini + remaining>0), recalculateMemberDebt pakai big.js, interval 60s, online listener
- productService.js: createProduct cek duplicate code via getByCode

## 4. Formatter Fix v1.1 (PENTING)
### src/utils/formatters/currency.js
```js
export const toNumber = (v) => Number(String(v??'').replace(/[^0-9]/g,'')) || 0
export const formatRp = (v) => toNumber(v) ? `Rp ${toNumber(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g,'.')}` : ''
export const formatRibuan = (v) => toNumber(v) ? toNumber(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g,'.') : ''