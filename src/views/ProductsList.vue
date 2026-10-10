<template>
<div class="flex-1 overflow-auto p-4 pb-24">
  <!-- HEADER -->
  <div class="flex justify-between items-center mb-4">
    <h1 class="font-black text-xl">Daftar Barang ({{ filtered.length }})</h1>
    <button @click="showFilter=true" class="p-2.5 bg-zinc-900 text-white rounded-xl relative">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"/></svg>
      <span v-if="isFiltered" class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full"></span>
    </button>
  </div>

  <!-- SEARCH -->
  <div class="relative mb-3">
    <input v-model="q" placeholder="Cari nama / kode..." class="w-full pl-11 pr-4 py-3 bg-white border border-zinc-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-zinc-900"/>
    <span class="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">⌕</span>
  </div>

  <!-- CHIP FILTER AKTIF -->
  <div v-if="isFiltered" class="flex gap-2 mb-3 overflow-auto">
    <span v-if="filterKategori!=='all'" class="text-[10px] bg-zinc-900 text-white px-3 py-1.5 rounded-full font-black">{{ filterKategori }} ✕</span>
    <span v-if="filterStok!=='all'" class="text-[10px] bg-zinc-900 text-white px-3 py-1.5 rounded-full font-black">{{ labelStok }} ✕</span>
    <button @click="resetFilter" class="text-[10px] bg-zinc-100 px-3 py-1.5 rounded-full font-bold">Reset</button>
  </div>

  <!-- LIST -->
  <div v-for="p in filtered" :key="p.id" class="p-4 bg-white rounded-2xl border mb-2 flex justify-between active:scale-[0.98] transition">
    <div class="flex-1">
      <div class="font-bold text-sm">{{ p.name }}</div>
      <div class="text-[11px] text-zinc-400 flex gap-2 mt-1">
        <span>{{ p.code }}</span>
        <span>•</span>
        <span :class="p.category?'text-zinc-900 font-bold':''">{{ p.category || 'Tanpa Kategori' }}</span>
        <span>•</span>
        <span>Stok {{ p.qty }}</span>
      </div>
      <div class="text-[11px] text-zinc-500 mt-1">Modal Rp {{ formatRibuan(p.price_modal) }} → Jual Rp {{ formatRibuan(p.price_sell) }}</div>
    </div>
    <div class="ml-3 flex flex-col items-end gap-1">
      <span v-if="p.qty===0" class="text-[10px] bg-zinc-900 text-white px-2 py-1 rounded-full font-black">HABIS</span>
      <span v-else-if="p.qty <= p.minStock" class="text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded-full font-black">TIPIS</span>
      <span v-else class="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-full font-black">AMAN</span>
    </div>
  </div>

  <div v-if="filtered.length===0" class="py-20 text-center text-sm text-zinc-400 font-bold">Barang tidak ditemukan</div>

  <!-- MODAL FILTER -->
  <div v-if="showFilter" class="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm flex items-end">
    <div class="w-full max-w-xl mx-auto bg-white rounded-t-[2rem] p-5 pb-8">
      <div class="w-10 h-1 bg-zinc-200 rounded-full mx-auto mb-4"></div>
      <div class="flex justify-between items-center mb-5">
        <div class="font-black text-base">Filter Barang</div>
        <button @click="showFilter=false" class="p-2 bg-zinc-100 rounded-xl text-xs font-bold">Tutup</button>
      </div>

      <div class="space-y-5">
        <div>
          <div class="text-[10px] font-black tracking-widest text-zinc-400 mb-2">KATEGORI</div>
          <div class="flex flex-wrap gap-2">
            <button v-for="c in categories" :key="c" @click="filterKategori=c" :class="['px-3 py-2 rounded-xl text-xs font-black border', filterKategori===c?'bg-zinc-900 text-white border-zinc-900':'bg-white border-zinc-200 text-zinc-600']">{{ c==='all'?'Semua':c }}</button>
          </div>
        </div>

        <div>
          <div class="text-[10px] font-black tracking-widest text-zinc-400 mb-2">STOK</div>
          <div class="grid grid-cols-2 gap-2">
            <button v-for="s in stokOptions" :key="s.value" @click="filterStok=s.value" :class="['py-3 rounded-xl text-xs font-black border text-left px-4', filterStok===s.value?'bg-zinc-900 text-white border-zinc-900':'bg-white border-zinc-200']">
              {{ s.label }}
            </button>
          </div>
        </div>

        <div>
          <div class="text-[10px] font-black tracking-widest text-zinc-400 mb-2">URUTKAN</div>
          <select v-model="sortBy" class="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold">
            <option value="name-asc">Nama A-Z</option>
            <option value="name-desc">Nama Z-A</option>
            <option value="stok-asc">Stok Terendah</option>
            <option value="stok-desc">Stok Terbanyak</option>
            <option value="harga-desc">Harga Termahal</option>
            <option value="harga-asc">Harga Termurah</option>
          </select>
        </div>

        <button @click="showFilter=false" class="w-full bg-zinc-900 text-white py-4 rounded-2xl font-black text-sm">Terapkan Filter</button>
      </div>
    </div>
  </div>
</div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useProductsStore } from '../stores/productStore.js'

const store = useProductsStore()
const q = ref('')
const filterKategori = ref('all')
const filterStok = ref('all')
const sortBy = ref('name-asc')
const showFilter = ref(false)

const formatRibuan = (n) => new Intl.NumberFormat('id-ID').format(n||0)

const categories = computed(() => {
  const cats = new Set(store.list.map(p=>p.category).filter(Boolean))
  return ['all',...Array.from(cats)]
})

const stokOptions = [
  { value:'all', label:'Semua' },
  { value:'tipis', label:'Tipis (≤ minStok)' },
  { value:'habis', label:'Habis (0)' },
  { value:'aman', label:'Aman' },
]

const labelStok = computed(()=> stokOptions.find(s=>s.value===filterStok.value)?.label || 'All')
const isFiltered = computed(()=> filterKategori.value!=='all' || filterStok.value!=='all' || q.value)

const filtered = computed(()=>{
  let list = store.list.filter(p=> {
    const matchQ =!q.value || p.name.toLowerCase().includes(q.value.toLowerCase()) || (p.code||'').toLowerCase().includes(q.value.toLowerCase())
    const matchCat = filterKategori.value==='all' || p.category===filterKategori.value
    let matchStok = true
    if(filterStok.value==='tipis') matchStok = p.qty <= (p.minStock||5) && p.qty>0
    if(filterStok.value==='habis') matchStok = p.qty===0
    if(filterStok.value==='aman') matchStok = p.qty > (p.minStock||5)
    return matchQ && matchCat && matchStok
  })

  if(sortBy.value==='name-asc') list = list.sort((a,b)=>a.name.localeCompare(b.name))
  if(sortBy.value==='name-desc') list = list.sort((a,b)=>b.name.localeCompare(a.name))
  if(sortBy.value==='stok-asc') list = list.sort((a,b)=>a.qty-b.qty)
  if(sortBy.value==='stok-desc') list = list.sort((a,b)=>b.qty-a.qty)
  if(sortBy.value==='harga-desc') list = list.sort((a,b)=>(b.price_sell||0)-(a.price_sell||0))
  if(sortBy.value==='harga-asc') list = list.sort((a,b)=>(a.price_sell||0)-(b.price_sell||0))

  return list
})

const resetFilter = () => { filterKategori.value='all'; filterStok.value='all'; q.value=''; sortBy.value='name-asc' }

onMounted(()=> store.fetch())
</script>