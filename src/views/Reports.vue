<!-- src/views/Reports.vue -->
<template>
<div class="flex-1 overflow-auto p-4 pb-28 space-y-4 font-sans">
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

    <!-- Keuntungan Bersih — warna dinamis berdasarkan tanda profit -->
    <div 
      :class="[
        'p-4 rounded-3xl shadow-md',
        isProfitNegative ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
      ]"
    >
      <div class="flex items-center gap-2 mb-1">
        <div class="w-7 h-7 bg-white/20 text-white rounded-xl flex items-center justify-center">
          <BadgePercent class="w-4 h-4" />
        </div>
        <span class="text-[10px] font-black text-white/80 uppercase">
          {{ isProfitNegative ? 'Kerugian' : 'Profit (Untung)' }}
        </span>
      </div>
      <div class="text-lg font-black text-white mt-1">{{ formatSigned(totalProfit) }}</div>
      <div class="text-[10px] text-white/70 mt-0.5">
        Margin ~{{ totalOmzet > 0 ? Math.round((totalProfit / totalOmzet) * 100) : 0 }}%
      </div>
    </div>
  </div>

  <!-- Breakdown Sumber Keuntungan -->
  <div class="bg-white p-4 rounded-3xl border border-zinc-100 shadow-sm space-y-3">
    <div class="font-black text-xs text-zinc-400 uppercase tracking-wider">Rincian Sumber Laba</div>
    
    <div class="grid grid-cols-2 gap-2 text-xs">
      <div class="p-3 bg-zinc-50 rounded-2xl border border-zinc-100">
        <div class="text-[10px] font-bold text-zinc-400">Toko & Barang</div>
        <div 
          :class="[
            'font-black mt-1',
            profitBarang < 0 ? 'text-red-600' : 'text-zinc-900'
          ]"
        >
          {{ formatSigned(profitBarang) }}
        </div>
        <div class="text-[10px] text-zinc-400 mt-0.5">{{ countBarang }} Transaksi</div>
      </div>

      <div class="p-3 bg-blue-50/60 rounded-2xl border border-blue-100">
        <div class="text-[10px] font-bold text-blue-600">Produk Digital</div>
        <div 
          :class="[
            'font-black mt-1',
            profitDigital < 0 ? 'text-red-600' : 'text-blue-900'
          ]"
        >
          {{ formatSigned(profitDigital) }}
        </div>
        <div class="text-[10px] text-blue-500 mt-0.5">{{ countDigital }} Transaksi</div>
      </div>
    </div>

    <!-- Info Omzet Digital (transparansi pemisahan omzet vs profit) -->
    <div class="pt-2 border-t border-zinc-100 text-[11px] flex justify-between items-center">
      <span class="text-zinc-500 font-medium">Nilai Transaksi Digital</span>
      <span class="font-black text-zinc-800">Rp {{ formatRibuan(omzetDigital) }}</span>
    </div>

    <!-- Peringatan Kerugian (hanya muncul kalau ada item dijual rugi) -->
    <div 
      v-if="profitRugiBarang < 0" 
      class="pt-2 border-t border-red-100 flex items-start gap-2 text-[11px] bg-red-50 rounded-xl p-2.5"
    >
      <div class="text-red-600 mt-0.5 shrink-0">⚠️</div>
      <div class="flex-1">
        <div class="font-bold text-red-700">Ada Produk Dijual di Bawah Modal</div>
        <div class="text-red-600 mt-0.5">
          Total kerugian: <strong>{{ formatSigned(profitRugiBarang) }}</strong>
        </div>
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
import { computed, onMounted, onActivated } from 'vue'
import { TrendingUp, BadgePercent, FileSpreadsheet } from 'lucide-vue-next'
import { useReports } from '../composables/useReports.js'
import { formatRibuan, toNumber } from '../utils/formatters/currency.js'

const {
  loading,
  selectedPeriod,
  periodOptions,
  filteredTransactions,
  totalOmzet,
  totalProfit,
  totalTrxCount,
  profitBarang,
  profitRugiBarang,   // ✅ baru dari useReports
  countBarang,
  profitDigital,
  countDigital,
  omzetDigital,       // ✅ baru dari useReports
  omzetCash,
  omzetQRIS,
  omzetTempo,
  loadData,
  handleExportToExcel
} = useReports()

// ✅ Helper: tampilkan angka dengan tanda minus yang benar (-Rp 5.000)
// formatRibuan bawaan menghapus tanda '-' karena regex [^0-9]
const formatSigned = (val) => {
  const n = Number(val) || 0
  const abs = Math.abs(n)
  const formatted = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  if (n < 0) return `-Rp ${formatted}`
  return `Rp ${formatted}`
}

// ✅ Helper: cek apakah profit negatif (untuk warna kartu)
const isProfitNegative = computed(() => Number(totalProfit.value) < 0)

onMounted(loadData)
onActivated(loadData)
</script>