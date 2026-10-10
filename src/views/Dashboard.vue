<template>
<div class="flex-1 overflow-auto p-4 space-y-4 pb-24">
  <div class="bg-zinc-900 rounded-[2rem] p-6 text-white">
    <div class="text-[10px] font-black tracking-widest text-zinc-500 uppercase">Sinar Pagi • Dashboard</div>
    <div class="text-xl font-black mt-1 capitalize">{{ today }}</div>
  </div>

  <div class="grid grid-cols-2 gap-3">
    <div class="bg-white rounded-[1.5rem] border p-4">
      <div class="text-[10px] text-zinc-400 font-black">Omzet Hari Ini</div>
      <div class="font-black text-lg mt-1">Rp {{ formatRibuan(stats.omzetHariIni || 0) }}</div>
    </div>
    <div class="bg-white rounded-[1.5rem] border p-4">
      <div class="text-[10px] text-zinc-400 font-black">Piutang</div>
      <div class="font-black text-lg mt-1 text-amber-600">Rp {{ formatRibuan(stats.totalPiutang || 0) }}</div>
    </div>
  </div>

  <div class="bg-white rounded-[1.5rem] border p-5">
    <div class="font-black text-sm mb-4">Omzet 7 Hari</div>
    <div class="h-[180px]">
      <Line v-if="chartReady && chartData.labels.length > 0" :data="chartData" :options="chartOptions"/>
      <div v-else class="h-full flex items-center justify-center text-xs text-zinc-400 font-bold">
        {{ loading ? 'Memuat grafik...' : 'Belum ada data grafik' }}
      </div>
    </div>
  </div>

  <div class="bg-white rounded-[1.5rem] border p-5">
    <div class="font-black text-sm mb-3">Perlu Restock ({{ stats.lowStock || 0 }})</div>
    <div v-if="lowProducts.length === 0" class="text-xs text-zinc-400 py-2">Stok barang aman</div>
    <div v-else v-for="p in lowProducts" :key="p.id" class="py-2 border-b last:border-0 flex justify-between">
      <span class="text-sm font-bold">{{ p.name }}</span>
      <span class="text-xs font-bold text-red-500">Sisa {{ p.qty }}</span>
    </div>
  </div>
</div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler } from 'chart.js'
import { useDashboard } from '../composables/useDashboard.js'
import { formatRibuan } from '../utils/formatters/currency.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

const { stats, lowProducts, chartRaw, loading, load } = useDashboard()
const today = new Date().toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long' })

const chartReady = ref(false)
const chartData = ref({ labels:[], datasets:[] })
const chartOptions = { 
  responsive: true, 
  maintainAspectRatio: false, 
  plugins: { legend: { display: false } }, 
  scales: { y: { display: false }, x: { grid: { display: false } } } 
}

onMounted(async () => {
  try {
    await load()
    if (chartRaw.value && Array.isArray(chartRaw.value)) {
      chartData.value = { 
        labels: chartRaw.value.map(c => c.label || ''), 
        datasets: [{ 
          data: chartRaw.value.map(c => Number(c.value) || 0), 
          borderColor: '#18181b', 
          backgroundColor: 'rgba(24,24,27,0.1)', 
          fill: true, 
          tension: 0.4 
        }] 
      }
      chartReady.value = true
    }
  } catch (e) {
    console.error('Gagal memuat dashboard:', e)
  }
})
</script>
