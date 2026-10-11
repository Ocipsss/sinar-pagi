import { db } from '../db/index.js'
import { transactionRepo } from '../db/repositories/transactionRepository.js'
import { memberRepo } from '../db/repositories/memberRepository.js'
import { productRepo } from '../db/repositories/productRepository.js'
import { productsDigitalService } from './productsDigitalService.js'

export const salesHistoryService = {
  async getCombinedHistory() {
    const [transactions, members, products, allItems, digitalTransactions] = await Promise.all([
      transactionRepo.getAll(),
      memberRepo.getAll(),
      productRepo.getAll(),
      transactionRepo.getAllItems(),
      productsDigitalService.getAll()
    ])

    const memberMap = new Map(members.map(m => [m.id, m.name]))
    const productMap = new Map(products.map(p => [p.id, p.name]))

    // 1. Format transaksi barang
    const formattedBarang = transactions.map(t => {
      const items = allItems
        .filter(item => item.transactionId === t.id)
        .map(item => ({
          ...item,
          productName: item.name || productMap.get(item.productId) || 'Produk Dihapus'
        }))

      return {
        ...t,
        trxType: 'BARANG',
        memberName: t.memberId ? (memberMap.get(t.memberId) || 'Member Tidak Ditemukan') : 'Umum / Non-Member',
        items
      }
    })

    // 2. Format transaksi digital (hitung dampak kas fisik)
    const formattedDigital = digitalTransactions.map(d => {
      const isTopup = d.type === 'topup'
      const isCashAdmin = d.adminPaymentMethod === 'cash'
      
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
        digitalType: d.type,
        provider: d.provider,
        nominal: d.nominal,
        adminFee: d.adminFee,
        adminPaymentMethod: d.adminPaymentMethod,
        total: kasImpact,
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

    // 3. Gabungkan dan urutkan berdasarkan tanggal terbaru
    return [...formattedBarang, ...formattedDigital].sort((a, b) => new Date(b.date) - new Date(a.date))
  }
}
