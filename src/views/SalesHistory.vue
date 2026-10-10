<template>
  <div class="flex-1 overflow-auto p-4 pb-24 space-y-4">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="font-black text-xl text-zinc-900">Riwayat Penjualan</h1>
        <p class="text-xs text-zinc-400">Total {{ filteredTransactions.length }} transaksi ditemukan</p>
      </div>
    </div>

    <!-- Ringkasan Statistik -->
    <div class="grid grid-cols-2 gap-3">
      <div class="bg-white border border-zinc-100 p-3.5 rounded-2xl shadow-sm">
        <div class="text-[10px] font-black text-zinc-400 uppercase">Total Omzet</div>
        <div class="text-base font-black text-zinc-900 mt-0.5">Rp {{ formatRibuan(totalOmzet) }}</div>
      </div>
      <div class="bg-amber-50 border border-amber-100 p-3.5 rounded-2xl shadow-sm">
        <div class="text-[10px] font-black text-amber-600 uppercase">Sisa Piutang TEMPO</div>
        <div class="text-base font-black text-amber-700 mt-0.5">Rp {{ formatRibuan(totalPiutang) }}</div>
      </div>
    </div>

    <!-- Filter & Search Bar -->
    <div class="space-y-2">
      <div class="relative">
        <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input 
          v-model="searchQuery" 
          placeholder="Cari ID transaksi / nama member..." 
          class="w-full pl-11 pr-4 py-3 bg-white border border-zinc-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-zinc-900 shadow-sm"
        />
      </div>

      <div class="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button 
          v-for="f in filterOptions" 
          :key="f.value"
          @click="selectedFilter = f.value"
          :class="[
            'px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition',
            selectedFilter === f.value 
              ? 'bg-zinc-900 text-white shadow-sm' 
              : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50'
          ]"
        >
          {{ f.label }}
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="filteredTransactions.length === 0" class="py-16 text-center text-zinc-400 text-xs">
      <Receipt class="w-8 h-8 text-zinc-300 mx-auto mb-2" />
      Belum ada riwayat transaksi
    </div>

    <!-- Daftar Transaksi -->
    <div v-else class="space-y-3">
      <div 
        v-for="t in filteredTransactions" 
        :key="t.id"
        @click="selectedTransaction = t"
        class="bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm flex flex-col gap-2.5 active:scale-[0.99] transition cursor-pointer"
      >
        <div class="flex justify-between items-start">
          <div>
            <div class="font-bold text-xs text-zinc-900 flex items-center gap-1.5">
              <span>{{ t.memberName }}</span>
              <span v-if="t.memberId" class="px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded-md text-[9px] font-black">MEMBER</span>
            </div>
            <div class="text-[10px] text-zinc-400 mt-0.5 flex items-center gap-1">
              <Calendar class="w-3 h-3" />
              <span>{{ formatDate(t.date) }}</span>
            </div>
          </div>

          <div :class="[
            'px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider',
            t.paymentMethod === 'TEMPO' ? 'bg-amber-100 text-amber-700' :
            t.paymentMethod === 'QRIS' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
          ]">
            {{ t.paymentMethod }}
          </div>
        </div>

        <div class="flex justify-between items-end pt-2 border-t border-zinc-50">
          <div class="text-[11px] text-zinc-500 font-medium">
            {{ t.items.length }} Item Barang
          </div>
          <div class="text-right">
            <div class="text-[9px] text-zinc-400 font-bold uppercase">Total Transaksi</div>
            <div class="text-sm font-black text-zinc-900">Rp {{ formatRibuan(t.total) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Detail Transaksi -->
    <div v-if="selectedTransaction" class="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div class="w-full max-w-md bg-white rounded-t-[2rem] sm:rounded-[2rem] p-6 shadow-xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-200">
        <div class="flex justify-between items-start mb-4 border-b border-zinc-100 pb-3">
          <div>
            <h2 class="font-black text-base text-zinc-900">Detail Rincian Nota</h2>
            <p class="text-[11px] text-zinc-400">ID: {{ selectedTransaction.id.slice(0, 13) }}...</p>
          </div>
          <button @click="selectedTransaction = null" class="p-2 bg-zinc-100 rounded-xl">
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="bg-zinc-50 p-3 rounded-xl space-y-1.5 mb-4 text-xs">
          <div class="flex justify-between">
            <span class="text-zinc-500">Tanggal:</span>
            <span class="font-bold text-zinc-800">{{ formatDate(selectedTransaction.date) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-zinc-500">Pelanggan:</span>
            <span class="font-bold text-zinc-800">{{ selectedTransaction.memberName }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-zinc-500">Metode Bayar:</span>
            <span class="font-black text-zinc-800">{{ selectedTransaction.paymentMethod }}</span>
          </div>
        </div>

        <div class="flex-1 overflow-auto space-y-2 mb-4 pr-1">
          <div class="text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-2">Item Dibeli</div>
          <div 
            v-for="item in selectedTransaction.items" 
            :key="item.id"
            class="flex justify-between items-center py-2 border-b border-zinc-50 last:border-0"
          >
            <div>
              <div class="font-bold text-xs text-zinc-900">{{ item.productName }}</div>
              <div class="text-[10px] text-zinc-400">Rp {{ formatRibuan(item.price) }} x {{ item.qty }}</div>
            </div>
            <div class="font-black text-xs text-zinc-900">
              Rp {{ formatRibuan(item.subtotal || (item.price * item.qty)) }}
            </div>
          </div>
        </div>

        <div class="border-t border-zinc-100 pt-3 space-y-2">
          <div class="flex justify-between items-center text-sm">
            <span class="font-bold text-zinc-600">Total Akhir</span>
            <span class="font-black text-base text-zinc-900">Rp {{ formatRibuan(selectedTransaction.total) }}</span>
          </div>

          <button 
            @click="selectedTransaction = null" 
            class="w-full py-3 bg-zinc-900 text-white rounded-xl font-bold text-xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { Search, Receipt, Calendar, X } from 'lucide-vue-next'
import { formatRibuan } from '../utils/formatters/currency.js'
import { useSalesHistory } from '../composables/useSalesHistory.js'

const {
  searchQuery,
  selectedFilter,
  selectedTransaction,
  filterOptions,
  filteredTransactions,
  totalOmzet,
  totalPiutang,
  loadHistory,
  formatDate
} = useSalesHistory()

onMounted(() => {
  loadHistory()
})
</script>
