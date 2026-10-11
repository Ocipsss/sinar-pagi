<template>
<div class="flex-1 overflow-auto p-4 pb-28 space-y-4">
  <!-- Header & Actions -->
  <div class="flex justify-between items-center">
    <div>
      <h1 class="font-black text-xl text-zinc-900">Laporan & Rekap</h1>
      <p class="text-xs text-zinc-400">Ringkasan performa dan margin keuntungan toko</p>
    </div>
    <button 
      @click="handleExportToExcel" 
      :disabled="loading || filteredTransactions.length === 0"
      class="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-300 text-white rounded-2xl font-bold text-xs transition flex items-center gap-1.5 shadow-sm active:scale-95"
    >
      <FileSpreadsheet class="w-4 h-4" />
      <span>Ekspor Excel</span>
    </button>
  </div>

  <!-- Filter Periode Waktu -->
  <div class="flex bg-zinc-100 p-1 rounded-2xl gap-1">
    <button 
      v-for="p in periodOptions" 
      :key="p.value"
      @click="selectedPeriod = p.value"
      :class="[
        'flex-1 py-2 rounded-xl text-xs font-bold transition',
        selectedPeriod === p.value ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'
      ]"
    >
      {{ p.label }}
    </button>
  </div>

  <!-- Ringkasan Statistik Utama -->
  <div class="grid grid-cols-2 gap-3">
    <!-- Omzet -->
    <div class="bg-white border border-zinc-100 p-4 rounded-3xl shadow-sm">
      <div class="flex items-center gap-2 mb-1">
        <div class="w-7 h-7 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
          <TrendingUp class="w-4 h-4" />
        </div>
        <span class="text-[10px] font-black text-zinc-400 uppercase">Total Omzet</span>
      </div>
      <div class="text-lg font-black text-zinc-900 mt-1">Rp {{ formatRibuan(totalOmzet) }}</div>
      <div class="text-[10px] text-zinc-400 mt-0.5">{{ totalTrxCount }} Transaksi</div>
    </div>

    <!-- Keuntungan Bersih -->
    <div class="bg-emerald-500 text-white p-4 rounded-3xl shadow-md">
      <div class="flex items-center gap-2 mb-1">
        <div class="w-7 h-7 bg-white/20 text-white rounded-xl flex items-center justify-center">
          <BadgePercent class="w-4 h-4" />
        </div>
        <span class="text-[10px] font-black text-white/80 uppercase">Profit (Untung)</span>
      </div>
      <div class="text-lg font-black text-white mt-1">Rp {{ formatRibuan(totalProfit) }}</div>
      <div class="text-[10px] text-white/70 mt-0.5">Margin ~{{ totalOmzet > 0 ? Math.round((totalProfit / totalOmzet) * 100) : 0 }}%</div>
    </div>
  </div>

  <!-- Breakdown Sumber Keuntungan -->
  <div class="bg-white p-4 rounded-3xl border border-zinc-100 shadow-sm space-y-3">
    <div class="font-black text-xs text-zinc-400 uppercase tracking-wider">Rincian Sumber Laba</div>
    
    <div class="grid grid-cols-2 gap-2 text-xs">
      <div class="p-3 bg-zinc-50 rounded-2xl border border-zinc-100">
        <div class="text-[10px] font-bold text-zinc-400">Toko & Barang</div>
        <div class="font-black text-zinc-900 mt-1">Rp {{ formatRibuan(profitBarang) }}</div>
        <div class="text-[10px] text-zinc-400 mt-0.5">{{ countBarang }} Transaksi</div>
      </div>

      <div class="p-3 bg-blue-50/60 rounded-2xl border border-blue-100">
        <div class="text-[10px] font-bold text-blue-600">Produk Digital</div>
        <div class="font-black text-blue-900 mt-1">Rp {{ formatRibuan(profitDigital) }}</div>
        <div class="text-[10px] text-blue-500 mt-0.5">{{ countDigital }} Transaksi</div>
      </div>
    </div>
  </div>

  <!-- Ringkasan Per Metode Pembayaran -->
  <div class="bg-white p-4 rounded-3xl border border-zinc-100 shadow-sm space-y-3">
    <div class="font-black text-xs text-zinc-400 uppercase tracking-wider">Metode Pembayaran Kasir</div>

    <div class="space-y-2 text-xs">
      <div class="flex justify-between items-center py-1.5 border-b border-zinc-50">
        <span class="font-bold text-zinc-700">Tunai (CASH)</span>
        <span class="font-black text-zinc-900">Rp {{ formatRibuan(omzetCash) }}</span>
      </div>
      <div class="flex justify-between items-center py-1.5 border-b border-zinc-50">
        <span class="font-bold text-zinc-700">QRIS / Bank</span>
        <span class="font-black text-zinc-900">Rp {{ formatRibuan(omzetQRIS) }}</span>
      </div>
      <div class="flex justify-between items-center py-1.5">
        <span class="font-bold text-amber-600">Tempo / Piutang</span>
        <span class="font-black text-amber-600">Rp {{ formatRibuan(omzetTempo) }}</span>
      </div>
    </div>
  </div>
</div>
</template>

<script setup>
import { ref, computed, onMounted, onActivated } from 'vue'
import { TrendingUp, BadgePercent, FileSpreadsheet } from 'lucide-vue-next'
import { reportService } from '../services/reportService.js'
import { formatRibuan } from '../utils/formatters/currency.js'
import dayjs from 'dayjs'

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
    rawTransactions.value = data.rawTransactions
    rawTransactionItems.value = data.rawTransactionItems
    rawDigitalTransactions.value = data.rawDigitalTransactions
    productsMap.value = data.productsMap
  } finally {
    loading.value = false
  }
}

const filteredTransactions = computed(() => {
  const now = dayjs()
  return rawTransactions.value.filter(t => {
    if (!t.date) return false
    const d = dayjs(t.date)
    if (selectedPeriod.value === 'today') return d.isSame(now, 'day')
    if (selectedPeriod.value === 'week') return d.isAfter(now.subtract(7, 'day'))
    if (selectedPeriod.value === 'month') return d.isSame(now, 'month')
    return true
  })
})

const filteredDigitalTransactions = computed(() => {
  const now = dayjs()
  return rawDigitalTransactions.value.filter(d => {
    if (!d.date) return false
    const date = dayjs(d.date)
    if (selectedPeriod.value === 'today') return date.isSame(now, 'day')
    if (selectedPeriod.value === 'week') return date.isAfter(now.subtract(7, 'day'))
    if (selectedPeriod.value === 'month') return date.isSame(now, 'month')
    return true
  })
})

const omzetBarang = computed(() => filteredTransactions.value.reduce((s, t) => s + (t.total || 0), 0))
const countBarang = computed(() => filteredTransactions.value.length)

const profitBarang = computed(() => {
  const validTrxIds = new Set(filteredTransactions.value.map(t => t.id))
  const items = rawTransactionItems.value.filter(i => validTrxIds.has(i.transactionId))
  
  return items.reduce((sum, item) => {
    const prod = productsMap.value.get(item.productId)
    const modal = prod?.price_modal || 0
    const profitPerPcs = (item.price || 0) - modal
    return sum + (Math.max(0, profitPerPcs) * (item.qty || 1))
  }, 0)
})

const profitDigital = computed(() => filteredDigitalTransactions.value.reduce((s, d) => s + (d.profit || d.adminFee || 0), 0))
const countDigital = computed(() => filteredDigitalTransactions.value.length)

const totalOmzet = computed(() => omzetBarang.value + profitDigital.value)
const totalProfit = computed(() => profitBarang.value + profitDigital.value)
const totalTrxCount = computed(() => countBarang.value + countDigital.value)

const omzetCash = computed(() => filteredTransactions.value.filter(t => t.paymentMethod === 'CASH').reduce((s, t) => s + t.total, 0))
const omzetQRIS = computed(() => filteredTransactions.value.filter(t => t.paymentMethod === 'QRIS').reduce((s, t) => s + t.total, 0))
const omzetTempo = computed(() => filteredTransactions.value.filter(t => t.paymentMethod === 'TEMPO').reduce((s, t) => s + t.total, 0))

const handleExportToExcel = () => {
  reportService.exportToExcel(
    filteredTransactions.value,
    filteredDigitalTransactions.value,
    selectedPeriod.value
  )
}

onMounted(() => {
  loadData()
})

onActivated(() => {
  loadData()
})
</script>
