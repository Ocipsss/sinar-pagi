<template>
<div class="flex flex-col flex-1 h-full overflow-hidden">
  <!-- Search & Bar Atas -->
  <div class="p-4 shrink-0">
    <div class="relative flex gap-2">
      <div class="relative flex-1">
        <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400"/>
        <input v-model="q" @focus="showSearch=true" placeholder="Ketik nama / barcode..." class="w-full pl-11 pr-11 py-4 bg-white border border-zinc-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-zinc-900 shadow-sm"/>
        <button v-if="q" @click="q=''" class="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-zinc-100 rounded-full"><X class="w-3 h-3"/></button>
      </div>

      <!-- Tombol Lihat Transaksi Tertunda (Pending) -->
      <button 
        @click="showPendingModal = true" 
        class="relative px-4 bg-amber-500 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 active:scale-95 transition"
      >
        <Clock class="w-4 h-4"/>
        <span class="hidden sm:inline">Pending</span>
        <span v-if="store.pendingCarts.length > 0" class="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black border-2 border-white">
          {{ store.pendingCarts.length }}
        </span>
      </button>
    </div>

    <!-- Dropdown Rekomendasi Barang -->
    <div v-if="showSearch && q.length>0" class="relative">
      <div class="absolute z-30 w-full mt-2 bg-white border border-zinc-100 rounded-2xl shadow-xl max-h-[320px] overflow-auto">
        <div v-if="filteredProducts.length===0" class="p-4 text-center text-xs text-zinc-400">Barang tidak ditemukan</div>
        <div v-for="p in filteredProducts" :key="p.id" @click="addToCart(p)" class="p-4 border-b last:border-0 border-zinc-50 flex justify-between active:bg-zinc-50 cursor-pointer">
          <div><div class="font-bold text-sm">{{ p.name }}</div><div class="text-[11px] text-zinc-500">Stok {{ p.qty }} • Rp {{ formatRibuan(p.price_sell) }}</div></div>
          <div class="text-[10px] bg-zinc-900 text-white px-2.5 py-1 rounded-full h-fit font-black">+</div>
        </div>
      </div>
    </div>

    <!-- Pilihan Member Aktif -->
    <div v-if="store.selectedMember" class="mt-3 text-[10px] bg-zinc-900 text-white px-2.5 py-1.5 rounded-full font-black w-fit flex items-center gap-2">
      Member: {{ store.selectedMember.name }} 
      <button @click="store.selectedMember=null" class="bg-white/20 rounded-full w-4 h-4 flex items-center justify-center">✕</button>
    </div>
  </div>

  <!-- Area Keranjang Belanja -->
  <div class="flex-1 overflow-auto px-4 pb-4">
    <div class="bg-white border border-zinc-100 rounded-[1.5rem] p-4">
      <div class="flex justify-between items-center mb-3">
        <div class="font-black text-[10px] text-zinc-400 tracking-widest uppercase">
          Keranjang • {{ store.cart.length }} item
        </div>
        <!-- Tombol Tunda Transaksi ini -->
        <button 
          v-if="store.cart.length > 0" 
          @click="store.holdCurrentCart()" 
          class="text-[10px] bg-amber-50 text-amber-700 font-bold px-3 py-1.5 rounded-xl border border-amber-200 flex items-center gap-1 active:scale-95 transition"
        >
          <PauseCircle class="w-3.5 h-3.5"/> Tunda Transaksi
        </button>
      </div>

      <div v-if="store.cart.length===0" class="py-24 text-center">
        <ShoppingBag class="w-8 h-8 text-zinc-300 mx-auto mb-2"/>
        <div class="text-sm font-bold text-zinc-400">Keranjang Kosong</div>
        <div class="text-[11px] text-zinc-400">Ketik nama barang di atas</div>
      </div>

      <div v-else class="space-y-1">
        <div v-for="(c,i) in store.cart" :key="c.id" class="flex gap-3 py-3 border-b border-zinc-50 last:border-0">
          <div class="flex-1">
            <div class="font-bold text-[13px] leading-tight">{{ c.name }}</div>
            <div class="text-[11px] text-zinc-500">Rp {{ formatRibuan(c.price_sell) }} x {{ c.cartQty }}</div>
          </div>
          <div class="flex items-center gap-2">
            <button @click="store.dec(i)" class="w-8 h-8 bg-zinc-100 rounded-full font-black">-</button>
            <span class="w-6 text-center text-sm font-black">{{ c.cartQty }}</span>
            <button @click="store.inc(i)" class="w-8 h-8 bg-zinc-900 text-white rounded-full font-black">+</button>
          </div>
          <div class="w-[80px] text-right font-black text-[13px]">Rp {{ formatRibuan(c.price_sell * c.cartQty) }}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Area Pembayaran / Checkout -->
  <div v-if="store.cart.length>0" class="shrink-0 bg-zinc-900 rounded-t-[2rem] p-5 pb-7 shadow-[0_-20px_60px_rgba(0,0,0,0.35)]">
    <div class="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4"></div>
    <div class="grid grid-cols-3 gap-2 mb-4">
      <button v-for="m in ['CASH','QRIS','TEMPO']" :key="m" @click="handleMethod(m)" :class="['py-2.5 rounded-xl text-[11px] font-black border transition', store.paymentMethod===m? 'bg-white text-zinc-900 border-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400']">{{ m }}</button>
    </div>

    <div v-if="store.paymentMethod==='CASH'" class="space-y-3">
      <div class="flex justify-between items-center"><span class="text-zinc-400 text-xs">Total</span><span class="font-black text-xl text-white">Rp {{ formatRibuan(total) }}</span></div>
      <div class="relative"><span class="absolute left-4 top-1/2 -translate-y-1/2 font-black text-zinc-500 text-sm">Rp</span><input :value="bayarDisplay" @input="e => bayarDisplay = e.target.value" type="text" inputmode="numeric" placeholder="0" class="w-full pl-12 pr-4 py-3.5 bg-white text-zinc-900 rounded-2xl font-black text-lg focus:outline-none"/></div>
      <button @click="store.bayarNominal=total" class="w-full py-2.5 bg-white/10 border border-white/10 text-white rounded-xl text-[11px] font-black">UANG PAS Rp {{ formatRibuan(total) }}</button>
      <div v-if="store.bayarNominal>0" class="flex justify-between text-xs pt-2 border-t border-zinc-800"><span class="text-zinc-400">Kembalian</span><span :class="['font-black', kurangBayar>0?'text-red-400':'text-green-400']">{{ kurangBayar>0? `Kurang Rp ${formatRibuan(kurangBayar)}` : `Rp ${formatRibuan(kembalian)}` }}</span></div>
    </div>

    <div v-if="store.paymentMethod==='QRIS'" class="mb-4">
      <div class="flex justify-between items-center"><span class="text-zinc-400 text-xs">Total Bayar</span><span class="font-black text-xl text-white">Rp {{ formatRibuan(total) }}</span></div>
    </div>

    <div v-if="store.paymentMethod==='TEMPO'" class="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-[11px] font-black text-amber-400 mb-4">
      TEMPO → {{ store.selectedMember?.name || 'Pilih member' }}
    </div>

    <button v-if="store.paymentMethod==='QRIS' || store.paymentMethod==='TEMPO' || (store.paymentMethod==='CASH' && store.bayarNominal>0)" :disabled="(store.paymentMethod==='CASH' && store.bayarNominal < total) || (store.paymentMethod==='TEMPO' && !store.selectedMember)" @click="onCheckout" class="w-full bg-white disabled:bg-zinc-700 disabled:text-zinc-500 text-zinc-900 py-4 rounded-2xl font-black text-sm mt-2">
      {{ store.paymentMethod==='QRIS'? 'Bayar dengan QRIS' : `Bayar Rp ${formatRibuan(total)}` }}
    </button>
  </div>
</div>

<!-- Modal Member Picker -->
<div v-if="showMemberPicker" class="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm flex items-end">
  <div class="w-full max-w-xl mx-auto bg-white rounded-t-[2rem] p-5 max-h-[80vh] flex flex-col">
    <div class="flex justify-between items-center mb-4">
      <div class="font-black text-sm">{{ store.paymentMethod==='TEMPO'? 'Wajib Pilih Member' : 'Pilih Member' }}</div>
      <button @click="showMemberPicker=false" class="p-2 bg-zinc-100 rounded-xl"><X class="w-4 h-4"/></button>
    </div>
    <input v-model="memberQ" placeholder="Cari nama / hp..." class="w-full px-4 py-3 bg-zinc-50 border rounded-xl text-sm mb-3"/>
    <div class="flex-1 overflow-auto">
      <div v-for="m in filteredMembers" :key="m.id" @click="selectMember(m)" class="p-3 border-b border-zinc-50 flex justify-between cursor-pointer">
        <div><div class="font-bold text-sm">{{ m.name }}</div><div class="text-[11px] text-zinc-500">Utang Rp {{ formatRibuan(m.debt||0) }}</div></div>
        <span class="text-xs font-black">Pilih</span>
      </div>
    </div>
  </div>
</div>

<!-- Modal Transaksi Pending -->
<div v-if="showPendingModal" class="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
  <div class="w-full max-w-md bg-white rounded-t-[2rem] sm:rounded-[2rem] p-6 shadow-xl max-h-[80vh] flex flex-col">
    <div class="flex justify-between items-center mb-4">
      <div>
        <h2 class="font-black text-base">Transaksi Ditunda</h2>
        <p class="text-xs text-zinc-400">Total {{ store.pendingCarts.length }} transaksi tertunda</p>
      </div>
      <button @click="showPendingModal = false" class="p-2 bg-zinc-100 rounded-xl"><X class="w-4 h-4"/></button>
    </div>

    <div v-if="store.pendingCarts.length === 0" class="py-12 text-center text-zinc-400 text-xs">
      Tidak ada transaksi yang ditunda
    </div>

    <div v-else class="flex-1 overflow-auto space-y-3">
      <div v-for="p in store.pendingCarts" :key="p.id" class="p-4 border border-zinc-100 rounded-2xl bg-zinc-50 flex justify-between items-center">
        <div>
          <div class="font-black text-sm text-zinc-900">{{ p.label }}</div>
          <div class="text-[11px] text-zinc-500 mt-0.5">{{ p.createdAt }} • {{ p.cart.length }} item</div>
          <div class="text-xs font-bold text-zinc-900 mt-1">Total: Rp {{ formatRibuan(p.cart.reduce((s,c)=>s+(c.price_sell*c.cartQty),0)) }}</div>
        </div>
        <div class="flex gap-1">
          <button @click="restorePending(p.id)" class="px-3 py-2 bg-zinc-900 text-white rounded-xl font-bold text-xs">Lanjutkan</button>
          <button @click="store.removePending(p.id)" class="p-2 text-red-500 hover:bg-red-50 rounded-xl"><Trash2 class="w-4 h-4"/></button>
        </div>
      </div>
    </div>
  </div>
</div>

<div v-if="showSearch" @click="showSearch=false" class="fixed inset-0 z-20"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { Search, X, ShoppingBag, Clock, PauseCircle, Trash2 } from 'lucide-vue-next'
import { useKasir } from '../composables/useKasir.js'
import { formatRibuan } from '../utils/formatters/currency.js'

const { store, q, memberQ, filteredProducts, filteredMembers, total, kembalian, kurangBayar, bayarDisplay, showSearch, load, addToCart, checkout } = useKasir()

const showMemberPicker = ref(false)
const showPendingModal = ref(false)

const handleMethod = (m) => { 
  store.paymentMethod = m
  if (m === 'QRIS') store.bayarNominal = total.value
  if (m === 'TEMPO' && !store.selectedMember) showMemberPicker.value = true 
}

const selectMember = (m) => { 
  store.selectedMember = m
  showMemberPicker.value = false 
}

const restorePending = (pendingId) => {
  store.resumeCart(pendingId)
  showPendingModal.value = false
}

const onCheckout = async () => { 
  try { 
    await checkout()
    alert('Berhasil') 
  } catch(e) { 
    alert(e.message) 
  } 
}

watch(total, t => { if (store.paymentMethod === 'QRIS') store.bayarNominal = t })

const openMemberHandler = () => showMemberPicker.value = true

onMounted(() => { 
  load()
  window.addEventListener('open-member-picker', openMemberHandler) 
})

onUnmounted(() => window.removeEventListener('open-member-picker', openMemberHandler))
</script>
