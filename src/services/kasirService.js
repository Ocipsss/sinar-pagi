import { db } from '../db/index.js'
import dayjs from 'dayjs'
import { financeRepo } from '../db/repositories/financeRepository.js'

export const kasirService = {
  async checkout({ cart, member, paymentMethod, operator, amountPaid, change }) {
    const now = dayjs().toISOString()
    const id = crypto.randomUUID()

    // GUARD 2: Validasi keranjang tidak boleh kosong (dicek dulu sebelum hitung)
    if (!cart || cart.length === 0) throw new Error('Keranjang belanja masih kosong!')

    const total = Math.round(cart.reduce((s, c) => s + (Number(c.price_sell) * Number(c.cartQty)), 0))
    const isTempo = paymentMethod === 'TEMPO'
    const isCash = paymentMethod === 'CASH'
    const isQris = paymentMethod === 'QRIS'

    // GUARD 1: Validasi metode TEMPO wajib memilih member
    if (isTempo && !member) throw new Error('Member wajib dipilih untuk metode pembayaran TEMPO!')

    // ✅ FIX P0: Normalisasi amountPaid & change dari caller
    // - TEMPO: 0 (belum bayar)
    // - QRIS: pas total (uang elektronik)
    // - CASH: nominal uang diterima user (bisa >= total), change = kembalian
    let finalAmountPaid
    let finalChange

    if (isTempo) {
      finalAmountPaid = 0
      finalChange = 0
    } else if (isQris) {
      finalAmountPaid = total
      finalChange = 0
    } else {
      // CASH
      const paid = Number(amountPaid)
      finalAmountPaid = Number.isFinite(paid) && paid > 0 ? Math.round(paid) : total
      finalChange = Math.max(0, finalAmountPaid - total)
    }

    // Uang yang benar-benar masuk laci (untuk CASH) = total (setelah dikurangi kembalian)
    const cashIn = isCash ? Math.max(0, finalAmountPaid - finalChange) : 0

    let totalProfit = 0
    const stockWarnings = []

    // Atomic Dexie Transaction
    await db.transaction('rw', db.transactions, db.transaction_items, db.products, db.members, db.cash_accounts, db.cash_mutations, async () => {
      // 1. Simpan header transaksi
      const trxHeader = {
        id, 
        date: now, 
        total, 
        memberId: member?.id || null,
        operatorId: operator?.id || null,
        operatorName: operator?.name || 'Kasir',
        paymentMethod, 
        amountPaid: finalAmountPaid,
        paidAmount: finalAmountPaid,
        change: finalChange,
        changeAmount: finalChange,
        remaining: isTempo ? total : 0, 
        status: isTempo ? 'unpaid' : 'paid',
        dueDate: isTempo ? dayjs().add(7, 'day').toISOString() : null,
        updatedAt: now, 
        synced: 0
      }
      await db.transactions.add(trxHeader)

      // 2. Pencatatan mutasi kas/bank
      if (isCash) {
        // ✅ FIX: catat uang yang benar-benar masuk laci (= total setelah kembalian)
        if (cashIn > 0) {
          await financeRepo.addMutation({
            accountId: 'acc_cash',
            type: 'IN',
            amount: cashIn,
            category: 'Penjualan Toko',
            note: `Transaksi Kasir (${operator?.name || 'Kasir'}) #${id.slice(0, 8)}`,
            refId: id
          })
        }
      } else if (isQris) {
        if (total > 0) {
          await financeRepo.addMutation({
            accountId: 'acc_bank',
            type: 'IN',
            amount: total,
            category: 'Penjualan Toko',
            note: `Transaksi QRIS (${operator?.name || 'Kasir'}) #${id.slice(0, 8)}`,
            refId: id
          })
        }
      }
      // TEMPO: tidak ada mutasi kas sampai member bayar utang

      // 3. Olah item transaksi & pemotongan stok
      for (const c of cart) {
        const modal = Number(c.price_modal) || 0
        const priceSell = Number(c.price_sell) || 0
        const qty = Number(c.cartQty) || 0
        const itemProfit = (priceSell - modal) * qty
        totalProfit += Math.max(0, itemProfit)

        // Simpan item transaksi
        await db.transaction_items.add({
          id: crypto.randomUUID(), 
          transactionId: id, 
          productId: c.id,
          serviceId: c.isServed ? 'SERVICE_SEDUH' : null, 
          name: c.name, 
          qty, 
          price: priceSell,
          subtotal: priceSell * qty, 
          updatedAt: now, 
          synced: 0
        })

        // Cek ketersediaan produk di database
        const product = await db.products.get(c.id)
        if (product) {
          const qtyDipotong = c.packageInfo ? ((Number(c.packageInfo.qty_pcs) || 1) * qty) : qty
          const currentQty = Number(product.qty) || 0
          const newQty = currentQty - qtyDipotong

          if (newQty < 0) {
            stockWarnings.push(`${product.name} (Sisa Stok: ${newQty})`)
          }

          await db.products.update(c.id, { 
            qty: newQty, 
            updatedAt: now, 
            synced: 0 
          })
        }
      }

      // 4. Update data member (poin, spending, & piutang) jika ada
      if (member) {
        const currentMember = await db.members.get(member.id)
        if (currentMember) {
          const earnedPoints = Math.floor(totalProfit * 0.01)
          const updatedPoints = (currentMember.points || 0) + earnedPoints
          const updatedSpending = (currentMember.total_spending || 0) + total
          const updatedDebt = isTempo ? (currentMember.debt || 0) + total : (currentMember.debt || 0)

          await db.members.update(member.id, {
            points: updatedPoints,
            total_spending: updatedSpending,
            debt: updatedDebt,
            updatedAt: now,
            synced: 0
          })
        }
      }
    })

    return { id, total, stockWarnings }
  },

  async getInitialData() {
    const [products, members] = await Promise.all([
      db.products.toArray(),
      db.members.toArray()
    ])
    return { products, members }
  }
}