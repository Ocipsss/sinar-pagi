// src/services/dashboardService.js
import { productRepo } from '../db/repositories/productRepository.js'
import { transactionRepo } from '../db/repositories/transactionRepository.js'
import { memberRepo } from '../db/repositories/memberRepository.js'
import { productsDigitalService } from './productsDigitalService.js'
import { getBarangTipis } from '../utils/calculator/product.js'
import dayjs from 'dayjs'

export const dashboardService = {
  async getDashboardData() {
    try {
      const [products, transactions, members, allItems, digitalTrxs] = await Promise.all([
        productRepo.getAll().catch(() => []),
        transactionRepo.getAll().catch(() => []),
        memberRepo.getAll().catch(() => []),
        transactionRepo.getAllItems().catch(() => []),
        productsDigitalService.getAll().catch(() => [])
      ])

      const tipis = getBarangTipis(products || [])
      const startToday = dayjs().startOf('day').toISOString()
      
      // Filter hanya transaksi sah (bukan VOID) hari ini
      const validTrxToday = (transactions || []).filter(t => 
        t && t.date >= startToday && t.status !== 'void' && t.status !== 'CANCELLED'
      )

      // Hitung Profit Penjualan Barang Hari Ini
      const productMap = new Map((products || []).map(p => [p.id, p]))
      const validTrxIdsToday = new Set(validTrxToday.map(t => t.id))
      const todayItems = (allItems || []).filter(i => validTrxIdsToday.has(i.transactionId))
      
      const profitBarangHariIni = todayItems.reduce((sum, item) => {
        const prod = productMap.get(item.productId)
        const modal = prod?.price_modal || 0
        const profitPcs = (item.price || 0) - modal
        return sum + (Math.max(0, profitPcs) * (item.qty || 1))
      }, 0)

      // Hitung Transaksi Digital Hari Ini
      const todayDigital = (digitalTrxs || []).filter(d => d && d.date >= startToday && d.status !== 'CANCELLED')
      const profitDigitalHariIni = todayDigital.reduce((sum, d) => sum + (d.profit || d.adminFee || 0), 0)

      // Total Omzet & Profit
      const omzetBarangHariIni = validTrxToday.reduce((s, t) => s + (Number(t.total) || 0), 0)
      const totalOmzetHariIni = omzetBarangHariIni + profitDigitalHariIni
      const totalProfitHariIni = profitBarangHariIni + profitDigitalHariIni

      // Ranking Produk Terlaris Hari Ini
      const itemQtyMap = new Map()
      todayItems.forEach(item => {
        const name = item.name || item.productName || 'Barang'
        itemQtyMap.set(name, (itemQtyMap.get(name) || 0) + (item.qty || 1))
      })
      const topProducts = Array.from(itemQtyMap.entries())
        .map(([name, qty]) => ({ name, qty }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5)

      // Chart 7 Hari
      const days = Array.from({ length: 7 }, (_, i) => dayjs().subtract(6 - i, 'day'))
      const chartRaw = days.map(d => {
        const start = d.startOf('day').toISOString()
        const end = d.endOf('day').toISOString()
        const total = (transactions || [])
          .filter(t => t && t.date >= start && t.date <= end && t.status !== 'void')
          .reduce((s, t) => s + (Number(t.total) || 0), 0)
        return { label: d.format('DD MMM'), value: total, date: d }
      })

      const totalPiutang = (members || []).reduce((sum, m) => sum + (Number(m.debt) || 0), 0)
      const memberBerutang = (members || []).filter(m => (Number(m.debt) || 0) > 0).length

      return {
        products: products || [],
        tipis: tipis || [],
        topProducts,
        stats: {
          totalProducts: (products || []).length,
          lowStock: (tipis || []).length,
          totalTrxHariIni: validTrxToday.length + todayDigital.length,
          omzetHariIni: totalOmzetHariIni,
          profitHariIni: totalProfitHariIni,
          totalPiutang,
          memberBerutang
        },
        chartRaw
      }
    } catch (err) {
      console.error('Error dashboardService:', err)
      return {
        products: [], tipis: [], topProducts: [],
        stats: { totalProducts: 0, lowStock: 0, totalTrxHariIni: 0, omzetHariIni: 0, profitHariIni: 0, totalPiutang: 0, memberBerutang: 0 },
        chartRaw: []
      }
    }
  }
}
