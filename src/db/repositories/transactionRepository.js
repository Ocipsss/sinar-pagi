import { db } from '../index.js'
import dayjs from 'dayjs'

export const transactionRepo = {
  getAll: () => db.transactions.toArray(),
  getToday: () => db.transactions.where('date').aboveOrEqual(dayjs().startOf('day').toISOString()).toArray(),
  create: (data) => db.transactions.add(data),

  // Ambil transaksi lengkap (Barang + Digital)
  getWithDetails: async () => {
    const transactions = await db.transactions.orderBy('date').reverse().toArray()
    const members = await db.members.toArray()
    const products = await db.products.toArray()
    const allItems = await db.transaction_items.toArray()

    // Ambil transaksi digital
    const digitalTable = db.digital_transactions || db.table('digital_transactions')
    const digitalTransactions = await digitalTable.orderBy('date').reverse().toArray()

    const memberMap = new Map(members.map(m => [m.id, m.name]))
    const productMap = new Map(products.map(p => [p.id, p.name]))

    // Format transaksi barang
    const formattedBarang = transactions.map(t => {
      const items = allItems
        .filter(item => item.transactionId === t.id)
        .map(item => ({
          ...item,
          productName: item.name || productMap.get(item.productId) || 'Produk Dihapus'
        }))

      return {
        ...t,
        trxType: 'BARANG', // Penanda tipe transaksi
        memberName: t.memberId ? (memberMap.get(t.memberId) || 'Member Tidak Ditemukan') : 'Umum / Non-Member',
        items
      }
    })

    // Format transaksi digital agar struktur datanya seragam
    const formattedDigital = digitalTransactions.map(d => {
      const isTopup = d.type === 'topup'
      const isCashAdmin = d.adminPaymentMethod === 'cash'
      
      // Hitung dampak kas fisik
      let kasImpact = 0
      if (isTopup) {
        kasImpact = d.nominal + (isCashAdmin ? d.adminFee : 0)
      } else {
        kasImpact = -(d.nominal - (isCashAdmin ? d.adminFee : 0))
      }

      return {
        id: d.id,
        date: d.date,
        trxType: 'DIGITAL',
        digitalType: d.type, // 'topup' atau 'tariktunai'
        provider: d.provider,
        nominal: d.nominal,
        adminFee: d.adminFee,
        adminPaymentMethod: d.adminPaymentMethod,
        total: kasImpact, // Nilai arus kas
        profit: d.profit || d.adminFee,
        paymentMethod: isCashAdmin ? 'CASH' : 'DIGITAL_SALDO',
        memberName: `Digital: ${d.provider}`,
        items: [
          {
            id: d.id,
            productName: `${isTopup ? 'TOP UP' : 'TARIK TUNAI'} ${d.provider}`,
            qty: 1,
            price: d.nominal,
            subtotal: d.nominal
          }
        ]
      }
    })

    // Gabung dan urutkan berdasarkan tanggal terbaru
    return [...formattedBarang, ...formattedDigital].sort((a, b) => new Date(b.date) - new Date(a.date))
  }
}
