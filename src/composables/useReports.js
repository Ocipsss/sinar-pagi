// src/composables/useReports.js
import { ref, computed } from 'vue'
import { reportService } from '../services/reportService.js'
import { toast } from 'vue-sonner'
import dayjs from 'dayjs'

export function useReports() {
  const loading = ref(false)
  const rawTransactions = ref([])
  const rawTransactionItems = ref([])
  const rawDigitalTransactions = ref([])
  const productsMap = ref(new Map())

  const selectedPeriod = ref('today')

  const periodOptions = [
    { label: 'Hari Ini', value: 'today' },
    { label: '7 Hari', value: 'week' },
    { label: 'Bulan Ini', value: 'month' },
    { label: 'Semua', value: 'all' }
  ]

  const loadData = async () => {
    loading.value = true
    try {
      const data = await reportService.getReportData()
      rawTransactions.value = data.rawTransactions || []
      rawTransactionItems.value = data.rawTransactionItems || []
      rawDigitalTransactions.value = data.rawDigitalTransactions || []
      productsMap.value = data.productsMap || new Map()
    } catch (err) {
      toast.error(`Gagal memuat data laporan: ${err.message}`)
    } finally {
      loading.value = false
    }
  }

  // 1. FILTER TRANSAKSI BARANG: Tanggal + ABAIKAN STATUS VOID
  const filteredTransactions = computed(() => {
    const now = dayjs()
    return rawTransactions.value.filter(t => {
      if (!t.date) return false
      // Abaikan jika status void atau CANCELLED
      if (t.status === 'void' || t.status === 'CANCELLED') return false

      const d = dayjs(t.date)
      if (selectedPeriod.value === 'today') return d.isSame(now, 'day')
      if (selectedPeriod.value === 'week') return d.isAfter(now.subtract(7, 'day'))
      if (selectedPeriod.value === 'month') return d.isSame(now, 'month')
      return true
    })
  })

  // 2. FILTER TRANSAKSI DIGITAL: Tanggal + ABAIKAN STATUS CANCELLED
  const filteredDigitalTransactions = computed(() => {
    const now = dayjs()
    return rawDigitalTransactions.value.filter(d => {
      if (!d.date) return false
      // Abaikan jika status CANCELLED
      if (d.status === 'CANCELLED') return false

      const date = dayjs(d.date)
      if (selectedPeriod.value === 'today') return date.isSame(now, 'day')
      if (selectedPeriod.value === 'week') return date.isAfter(now.subtract(7, 'day'))
      if (selectedPeriod.value === 'month') return date.isSame(now, 'month')
      return true
    })
  })

  const omzetBarang = computed(() => filteredTransactions.value.reduce((s, t) => s + (t.total || 0), 0))
  const countBarang = computed(() => filteredTransactions.value.length)

  // ✅ FIX (3.11): profit dihitung apa adanya (bisa negatif kalau jual rugi)
  // Tidak lagi di-clamp 0, supaya laporan tidak menyembunyikan kerugian.
  const profitBarang = computed(() => {
    const validTrxIds = new Set(filteredTransactions.value.map(t => t.id))
    const items = rawTransactionItems.value.filter(i => validTrxIds.has(i.transactionId))
    
    return items.reduce((sum, item) => {
      const prod = productsMap.value.get(item.productId)
      const modal = Number(prod?.price_modal || 0)
      const price = Number(item.price || 0)
      const qty = Number(item.qty || 1)
      const profitPerPcs = price - modal
      // Biarkan negatif kalau rugi
      return sum + (profitPerPcs * qty)
    }, 0)
  })

  // ✅ BARU: khusus kerugian (untuk audit, opsional ditampilkan di UI)
  // Hanya menjumlahkan item yang profit per pcs-nya negatif.
  const profitRugiBarang = computed(() => {
    const validTrxIds = new Set(filteredTransactions.value.map(t => t.id))
    const items = rawTransactionItems.value.filter(i => validTrxIds.has(i.transactionId))
    
    return items.reduce((sum, item) => {
      const prod = productsMap.value.get(item.productId)
      const modal = Number(prod?.price_modal || 0)
      const price = Number(item.price || 0)
      const qty = Number(item.qty || 1)
      const profitPerPcs = price - modal
      // Ambil hanya yang rugi (negatif)
      return sum + (profitPerPcs < 0 ? (profitPerPcs * qty) : 0)
    }, 0)
  })

  const profitDigital = computed(() => filteredDigitalTransactions.value.reduce((s, d) => s + (d.profit || d.adminFee || 0), 0))
  const countDigital = computed(() => filteredDigitalTransactions.value.length)

  // ✅ FIX (3.12): pisahkan omzet digital (nilai transaksi) dari profit digital (admin fee)
  // Sebelumnya totalOmzet = omzetBarang + profitDigital (salah, campur omzet vs laba).
  // Sekarang: totalOmzet = omzetBarang + omzetDigital.
  const omzetDigital = computed(() => {
    return filteredDigitalTransactions.value.reduce((s, d) => {
      const nominal = Number(d.nominal || 0)
      const adminFee = Number(d.adminFee || 0)
      const totalReceived = Number(d.totalReceived || 0)
      // Prioritas: totalReceived (kalau ada), kalau tidak nominal + adminFee
      return s + (totalReceived > 0 ? totalReceived : (nominal + adminFee))
    }, 0)
  })

  const totalOmzet = computed(() => omzetBarang.value + omzetDigital.value)
  const totalProfit = computed(() => profitBarang.value + profitDigital.value)
  const totalTrxCount = computed(() => countBarang.value + countDigital.value)

  const omzetCash = computed(() => filteredTransactions.value.filter(t => t.paymentMethod === 'CASH' || t.paymentMethod === 'TUNAI').reduce((s, t) => s + (t.total || 0), 0))
  const omzetQRIS = computed(() => filteredTransactions.value.filter(t => t.paymentMethod === 'QRIS').reduce((s, t) => s + (t.total || 0), 0))
  const omzetTempo = computed(() => filteredTransactions.value.filter(t => t.paymentMethod === 'TEMPO').reduce((s, t) => s + (t.total || 0), 0))

  const handleExportToExcel = () => {
    try {
      reportService.exportToExcel(
        filteredTransactions.value,
        filteredDigitalTransactions.value,
        selectedPeriod.value
      )
      toast.success('Laporan berhasil diexport ke Excel!')
    } catch (err) {
      toast.error(`Gagal export Excel: ${err.message}`)
    }
  }

  return {
    loading,
    selectedPeriod,
    periodOptions,
    filteredTransactions,
    filteredDigitalTransactions,
    totalOmzet,
    totalProfit,
    totalTrxCount,
    profitBarang,
    profitRugiBarang,   // ✅ baru
    countBarang,
    profitDigital,
    countDigital,
    omzetBarang,        // ✅ baru (dipisah dari totalOmzet)
    omzetDigital,       // ✅ baru
    omzetCash,
    omzetQRIS,
    omzetTempo,
    loadData,
    handleExportToExcel
  }
}