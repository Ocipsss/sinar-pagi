<template>
  <div class="w-full space-y-5 pb-8">
    <!-- Header Utama (Full Width) -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-zinc-100">
      <div class="space-y-0.5">
        <h2 class="text-xl font-black tracking-tight text-zinc-900">Dashboard Toko</h2>
        <p class="text-xs font-medium text-zinc-500">{{ todayFormatted }}</p>
      </div>
      <div class="flex items-center gap-3">
        <div class="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200/60 flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Sistem Online</span>
        </div>
        <router-link to="/kasir" class="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all">
          <span class="text-sm">🧾</span>
          <span>Buka Kasir</span>
        </router-link>
      </div>
    </div>

    <!-- Ringkasan Statistik Utama (Responsive Grid) -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <!-- Omset -->
      <div class="bg-white p-5 rounded-2xl shadow-sm border border-zinc-100 flex flex-col justify-between space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-zinc-500">Omset Hari Ini</span>
          <div class="w-8 h-8 rounded-xl bg-zinc-100 grid place-items-center text-sm">💰</div>
        </div>
        <div>
          <div class="text-xl md:text-2xl font-black text-zinc-900 tracking-tight">
            Rp {{ formatRupiah(summary.todayOmset) }}
          </div>
          <p class="text-[11px] text-zinc-400 mt-1 font-medium">{{ summary.todayTxCount }} Transaksi Terproses</p>
        </div>
      </div>

      <!-- Laba -->
      <div class="bg-white p-5 rounded-2xl shadow-sm border border-zinc-100 flex flex-col justify-between space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-zinc-500">Estimasi Laba</span>
          <div class="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 grid place-items-center text-sm">📈</div>
        </div>
        <div>
          <div class="text-xl md:text-2xl font-black text-emerald-600 tracking-tight">
            Rp {{ formatRupiah(summary.todayProfit) }}
          </div>
          <p class="text-[11px] text-zinc-400 mt-1 font-medium">Estimasi Bersih Harian</p>
        </div>
      </div>

      <!-- Pengeluaran -->
      <div class="bg-white p-5 rounded-2xl shadow-sm border border-zinc-100 flex flex-col justify-between space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-zinc-500">Pengeluaran</span>
          <div class="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 grid place-items-center text-sm">💸</div>
        </div>
        <div>
          <div class="text-xl md:text-2xl font-black text-rose-600 tracking-tight">
            Rp {{ formatRupiah(summary.todayExpenses) }}
          </div>
          <p class="text-[11px] text-zinc-400 mt-1 font-medium">Biaya Operasional Toko</p>
        </div>
      </div>

      <!-- Utang TEMPO -->
      <div class="bg-white p-5 rounded-2xl shadow-sm border border-zinc-100 flex flex-col justify-between space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-zinc-500">Total Piutang TEMPO</span>
          <div class="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 grid place-items-center text-sm">👥</div>
        </div>
        <div>
          <div class="text-xl md:text-2xl font-black text-amber-600 tracking-tight">
            Rp {{ formatRupiah(summary.totalDebt) }}
          </div>
          <p class="text-[11px] text-zinc-400 mt-1 font-medium">Sisa Utang Member</p>
        </div>
      </div>
    </div>

    <!-- Layout Dua Kolom Seimbang (Monitoring & Peringatan) -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
      
      <!-- Kolom Kiri: Peringatan Stok Menipis -->
      <div class="bg-white p-5 rounded-2xl shadow-sm border border-zinc-100 space-y-4 flex flex-col justify-between">
        <div class="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div class="flex items-center gap-2">
            <span class="text-lg">⚠️</span>
            <h3 class="font-bold text-sm text-zinc-900">Stok Menipis / Perlu Belanja</h3>
          </div>
          <router-link to="/products" class="text-xs font-bold text-zinc-700 hover:text-black">
            Lihat Stok →
          </router-link>
        </div>

        <div v-if="lowStockProducts.length === 0" class="py-12 text-center text-xs text-zinc-400 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
          Semua stok barang masih aman 👌
        </div>

        <div v-else class="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
          <div 
            v-for="prod in lowStockProducts" 
            :key="prod.id" 
            class="p-3 bg-zinc-50 border border-zinc-200/70 rounded-xl flex justify-between items-center hover:bg-zinc-100/60 transition-colors"
          >
            <div>
              <div class="font-bold text-xs text-zinc-900">{{ prod.name }}</div>
              <div class="text-[10px] text-zinc-500 mt-0.5">Kode: {{ prod.code }} | Kategori: {{ prod.category }}</div>
            </div>
            <div class="text-right">
              <span class="inline-block px-2.5 py-1 bg-rose-100 text-rose-700 font-bold text-xs rounded-lg">
                Sisa {{ prod.qty }} {{ prod.unit }}
              </span>
              <div class="text-[10px] text-zinc-400 mt-0.5">Batas Min: {{ prod.minStock || 5 }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Kolom Kanan: Ringkasan Aktivitas Transaksi Terakhir -->
      <div class="bg-white p-5 rounded-2xl shadow-sm border border-zinc-100 space-y-4 flex flex-col justify-between">
        <div class="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div class="flex items-center gap-2">
            <span class="text-lg">🕒</span>
            <h3 class="font-bold text-sm text-zinc-900">Transaksi Terbaru Hari Ini</h3>
          </div>
          <router-link to="/reports" class="text-xs font-bold text-zinc-700 hover:text-black">
            Laporan Lengkap →
          </router-link>
        </div>

        <div v-if="recentTransactions.length === 0" class="py-12 text-center text-xs text-zinc-400 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
          Belum ada transaksi tercatat hari ini
        </div>

        <div v-else class="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
          <div 
            v-for="tx in recentTransactions" 
            :key="tx.id" 
            class="p-3 bg-zinc-50 border border-zinc-200/70 rounded-xl flex justify-between items-center"
          >
            <div>
              <div class="font-bold text-xs text-zinc-900">
                Rp {{ formatRupiah(tx.total) }} 
                <span class="text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-700 ml-1">
                  {{ tx.paymentMethod }}
                </span>
              </div>
              <div class="text-[10px] text-zinc-400 mt-0.5">{{ formatTime(tx.date) }}</div>
            </div>
            <div class="text-right">
              <span 
                class="px-2 py-0.5 text-[10px] font-bold rounded-md"
                :class="tx.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'"
              >
                {{ tx.status === 'completed' ? 'Lunas' : 'TEMPO' }}
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import dayjs from 'dayjs'
import Big from 'big.js'
import { db } from '../db'

const todayFormatted = computed(() => dayjs().format('DD MMMM YYYY'))

const summary = ref({
  todayOmset: 0,
  todayProfit: 0,
  todayExpenses: 0,
  todayTxCount: 0,
  totalDebt: 0
})

const lowStockProducts = ref([])
const recentTransactions = ref([])

const formatRupiah = (val) => {
  if (!val) return '0'
  return new Intl.NumberFormat('id-ID').format(val)
}

const formatTime = (isoString) => {
  if (!isoString) return ''
  return dayjs(isoString).format('HH:mm')
}

const loadDashboardData = async () => {
  try {
    const todayStart = dayjs().startOf('day').toISOString()
    const todayEnd = dayjs().endOf('day').toISOString()

    // 1. Ambil Transaksi Hari Ini
    const todayTx = await db.transactions
      .where('date')
      .between(todayStart, todayEnd, true, true)
      .toArray()

    let omset = Big(0)
    summary.value.todayTxCount = todayTx.length

    for (const tx of todayTx) {
      omset = omset.plus(tx.total || 0)
    }
    summary.value.todayOmset = omset.toNumber()
    recentTransactions.value = todayTx.slice(-5).reverse() // 5 transaksi terbaru

    // 2. Ambil Pengeluaran Hari Ini
    const todayExp = await db.expenses
      .where('date')
      .between(todayStart, todayEnd, true, true)
      .toArray()

    let expenses = Big(0)
    for (const exp of todayExp) {
      expenses = expenses.plus(exp.amount || 0)
    }
    summary.value.todayExpenses = expenses.toNumber()

    // 3. Hitung Total Utang Member
    const members = await db.members.toArray()
    let debtSum = Big(0)
    for (const m of members) {
      debtSum = debtSum.plus(m.debt || 0)
    }
    summary.value.totalDebt = debtSum.toNumber()

    // 4. Ambil Barang Stok Menipis
    const allProducts = await db.products.toArray()
    lowStockProducts.value = allProducts.filter(p => p.qty <= (p.minStock || 5))

  } catch (err) {
    console.error('Gagal memuat data dashboard:', err)
  }
}

onMounted(() => {
  loadDashboardData()
})
</script>
