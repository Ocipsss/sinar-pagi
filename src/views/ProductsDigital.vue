<template>
  <div class="flex-1 overflow-auto p-4 pb-24 space-y-4">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="font-black text-xl text-zinc-900">Transaksi Digital</h1>
        <p class="text-xs text-zinc-400">Pulsa, PLN, E-Wallet & PPOB</p>
      </div>
      <button 
        @click="openModal" 
        class="bg-zinc-900 text-white px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 active:scale-95 transition shadow-sm"
      >
        <Plus class="w-4 h-4" /> Transaksi
      </button>
    </div>

    <!-- Stats Ringkas -->
    <div class="grid grid-cols-2 gap-3">
      <div class="bg-white border border-zinc-100 p-3.5 rounded-2xl shadow-sm">
        <div class="text-[10px] font-black text-zinc-400 uppercase">Omzet Digital Hari Ini</div>
        <div class="text-base font-black text-zinc-900 mt-0.5">Rp {{ formatRibuan(totalOmzetHariIni) }}</div>
      </div>
      <div class="bg-emerald-50 border border-emerald-100 p-3.5 rounded-2xl shadow-sm">
        <div class="text-[10px] font-black text-emerald-600 uppercase">Profit Digital Hari Ini</div>
        <div class="text-base font-black text-emerald-700 mt-0.5">Rp {{ formatRibuan(totalProfitHariIni) }}</div>
      </div>
    </div>

    <!-- Search Input -->
    <div class="relative">
      <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
      <input 
        v-model="searchQuery" 
        placeholder="Cari provider / no tujuan..." 
        class="w-full pl-11 pr-4 py-3 bg-white border border-zinc-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-zinc-900 shadow-sm"
      />
    </div>

    <!-- Empty State -->
    <div v-if="filteredTransactions.length === 0" class="py-16 text-center text-zinc-400 text-xs bg-white rounded-3xl border border-zinc-100 p-6">
      <Smartphone class="w-10 h-10 text-zinc-300 mx-auto mb-2" />
      <div class="font-bold text-zinc-500 text-sm">Belum ada transaksi digital</div>
      <p class="text-[11px] text-zinc-400 mt-1">Klik "+ Transaksi" untuk mencatat penjualan pulsa / PPOB baru</p>
    </div>

    <!-- Daftar Transaksi Digital -->
    <div v-else class="space-y-2">
      <div 
        v-for="t in filteredTransactions" 
        :key="t.id"
        class="p-4 bg-white rounded-2xl border border-zinc-100 shadow-sm flex items-center justify-between gap-3"
      >
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 bg-blue-50 text-blue-700 font-black text-[9px] rounded-md uppercase">
              {{ t.type }}
            </span>
            <span class="font-bold text-sm text-zinc-900 truncate">{{ t.provider }}</span>
          </div>
          <div class="text-xs font-semibold text-zinc-600 mt-1">
            {{ t.targetNumber || 'Tanpa No. Tujuan' }}
          </div>
          <div class="text-[10px] text-zinc-400 mt-0.5">
            Modal: Rp {{ formatRibuan(t.costPrice) }} • Profit: <strong class="text-emerald-600">Rp {{ formatRibuan(t.profit) }}</strong>
          </div>
        </div>

        <div class="text-right shrink-0">
          <div class="text-xs font-black text-zinc-900">Rp {{ formatRibuan(t.totalReceived) }}</div>
          <div class="text-[9px] text-zinc-400 font-bold uppercase mt-0.5">{{ t.adminPaymentMethod }}</div>
          <button @click="deleteTransaction(t)" class="p-1 text-red-400 hover:text-red-600 mt-1">
            <Trash2 class="w-3.5 h-3.5 ml-auto" />
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Form Tambah Transaksi Digital -->
    <div v-if="showModal" class="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div class="w-full max-w-md bg-white rounded-t-[2rem] sm:rounded-[2rem] p-6 shadow-xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-200">
        <div class="flex justify-between items-center mb-4 shrink-0">
          <div>
            <h2 class="font-black text-base text-zinc-900">Catat Transaksi Digital</h2>
            <p class="text-xs text-zinc-400">Pulsa, PLN, E-Wallet & PPOB</p>
          </div>
          <button @click="showModal = false" class="p-2 bg-zinc-100 rounded-xl">
            <X class="w-4 h-4" />
          </button>
        </div>

        <form @submit.prevent="saveTransaction" class="space-y-3 overflow-auto flex-1 pr-1">
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Jenis Produk</label>
              <select v-model="form.type" class="w-full px-3 py-2.5 bg-zinc-50 border rounded-xl text-xs font-bold">
                <option v-for="opt in typeOptions" :key="opt" :value="opt">{{ opt }}</option>
              </select>
            </div>

            <div>
              <label class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Provider / Produk *</label>
              <input v-model="form.provider" required placeholder="Telkomsel, PLN, Dana" class="w-full px-3 py-2.5 bg-zinc-50 border rounded-xl text-xs font-bold" />
            </div>
          </div>

          <div>
            <label class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">No. Tujuan / Pelanggan</label>
            <input v-model="form.targetNumber" placeholder="0812xxx / ID Pelanggan" class="w-full px-4 py-2.5 bg-zinc-50 border rounded-xl text-xs font-bold" />
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Harga Modal Agen (Rp) *</label>
              <input 
                :value="formatRp(form.costPrice)" 
                @input="e => form.costPrice = toNumber(e.target.value)" 
                type="text" 
                inputmode="numeric" 
                required 
                placeholder="Rp 0" 
                class="w-full px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-black text-zinc-900" 
              />
            </div>

            <div>
              <label class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Harga Jual (Rp) *</label>
              <input 
                :value="formatRp(form.sellingPrice)" 
                @input="e => form.sellingPrice = toNumber(e.target.value)" 
                type="text" 
                inputmode="numeric" 
                required 
                placeholder="Rp 0" 
                class="w-full px-3 py-2.5 bg-green-50 border border-green-200 rounded-xl text-xs font-black text-zinc-900" 
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Biaya Admin (Rp)</label>
              <input 
                :value="formatRp(form.adminFee)" 
                @input="e => form.adminFee = toNumber(e.target.value)" 
                type="text" 
                inputmode="numeric" 
                placeholder="Rp 0" 
                class="w-full px-3 py-2.5 bg-zinc-50 border rounded-xl text-xs font-bold" 
              />
            </div>

            <div>
              <label class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Pembayaran</label>
              <select v-model="form.adminPaymentMethod" class="w-full px-3 py-2.5 bg-zinc-50 border rounded-xl text-xs font-bold">
                <option v-for="m in paymentMethods" :key="m" :value="m">{{ m }}</option>
              </select>
            </div>
          </div>

          <div class="bg-zinc-900 text-white p-3 rounded-xl text-xs space-y-1">
            <div class="flex justify-between">
              <span class="text-zinc-400">Total Diterima:</span>
              <span class="font-black">Rp {{ formatRibuan((Number(form.sellingPrice) || 0) + (Number(form.adminFee) || 0)) }}</span>
            </div>
            <div class="flex justify-between text-emerald-400">
              <span>Estimasi Profit:</span>
              <span class="font-black">Rp {{ formatRibuan(((Number(form.sellingPrice) || 0) + (Number(form.adminFee) || 0)) - (Number(form.costPrice) || 0)) }}</span>
            </div>
          </div>

          <div class="flex gap-2 pt-2">
            <button type="button" @click="showModal = false" class="flex-1 py-3 bg-zinc-100 font-bold text-xs rounded-xl">Batal</button>
            <button type="submit" class="flex-1 py-3 bg-zinc-900 text-white font-bold text-xs rounded-xl shadow-md">Simpan Transaksi</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { Plus, Search, Trash2, X, Smartphone } from 'lucide-vue-next'
import { formatRibuan, formatRp, toNumber } from '../utils/formatters/currency.js'
import { useProductsDigital } from '../composables/useProductsDigital.js'

const {
  searchQuery,
  showModal,
  form,
  typeOptions,
  paymentMethods,
  filteredTransactions,
  totalOmzetHariIni,
  totalProfitHariIni,
  loadTransactions,
  openModal,
  saveTransaction,
  deleteTransaction
} = useProductsDigital()

onMounted(() => {
  loadTransactions()
})
</script>
