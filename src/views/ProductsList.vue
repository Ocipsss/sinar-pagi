<!-- src/views/ProductsList.vue -->
<template>
<div class="flex-1 overflow-auto p-4 pb-24">
  <!-- HEADER -->
  <div class="flex justify-between items-center mb-4">
    <div>
      <h1 class="font-black text-xl text-zinc-900">Daftar Barang ({{ filtered.length }})</h1>
      <p class="text-xs text-zinc-400">Kelola master data produk toko</p>
    </div>
    <div class="flex gap-2">
      <router-link to="/add-products" class="bg-zinc-900 text-white px-3.5 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-1.5 active:scale-95 transition shadow-sm">
        <Plus class="w-4 h-4"/> Tambah
      </router-link>
      <button @click="showFilter=true" class="p-2.5 bg-white border border-zinc-200 text-zinc-700 rounded-2xl relative active:scale-95 transition shadow-sm">
        <Filter class="w-4 h-4"/>
        <span v-if="isFiltered" class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full"></span>
      </button>
    </div>
  </div>

  <!-- SEARCH -->
  <div class="relative mb-3">
    <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400"/>
    <input 
      id="product-search-input"
      v-model="q" 
      placeholder="Ketik nama / scan barcode..." 
      class="w-full pl-11 pr-20 py-3 bg-white border border-zinc-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-zinc-900 shadow-sm"
    />
    
    <!-- TOMBOL SCANNER KAMERA KHUSUS HP (Tampil di HP: block md:hidden) -->
    <button 
      type="button"
      @click="toggleCameraScanner"
      class="absolute right-10 top-1/2 -translate-y-1/2 p-1.5 bg-zinc-900 text-white rounded-xl block md:hidden active:scale-95 transition flex items-center justify-center"
      title="Scan Kamera"
    >
      <ScanLine class="w-3.5 h-3.5" />
    </button>

    <button v-if="q" @click="q=''" class="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-zinc-100 rounded-full text-zinc-400 hover:text-zinc-600">
      <X class="w-3.5 h-3.5"/>
    </button>
  </div>

  <!-- CONTAINER KAMERA SCANNER LIST BARANG (Hanya HP) -->
  <div v-show="isScanning" class="mb-3 bg-black rounded-2xl overflow-hidden relative border border-zinc-700 shadow-lg block md:hidden">
    <div id="reader-products" class="w-full"></div>
    <button 
      @click="stopScanner"
      class="absolute top-3 right-3 z-10 px-3 py-1.5 bg-red-600 text-white rounded-xl text-xs font-black shadow-md active:scale-95 transition"
    >
      Tutup Kamera
    </button>
  </div>

  <!-- CHIP FILTER AKTIF -->
  <div v-if="isFiltered" class="flex gap-2 mb-3 overflow-auto">
    <span v-if="filterKategori!=='all'" class="text-[10px] bg-zinc-900 text-white px-3 py-1.5 rounded-full font-black">{{ filterKategori }} ✕</span>
    <span v-if="filterStok!=='all'" class="text-[10px] bg-zinc-900 text-white px-3 py-1.5 rounded-full font-black">{{ labelStok }} ✕</span>
    <button @click="resetFilter" class="text-[10px] bg-zinc-100 px-3 py-1.5 rounded-full font-bold">Reset</button>
  </div>

  <!-- LIST BARANG -->
  <div v-for="p in filtered" :key="p.id" class="p-4 bg-white rounded-2xl border border-zinc-100 mb-2 flex justify-between items-center shadow-sm">
    <div class="flex-1 min-w-0 pr-2">
      <div class="font-bold text-sm text-zinc-900 truncate">{{ p.name }}</div>
      <div class="text-[11px] text-zinc-400 flex items-center gap-1.5 mt-0.5">
        <span>{{ p.code || 'Tanpa Barcode' }}</span>
        <span>•</span>
        <span class="font-bold text-zinc-700">{{ p.category || 'Umum' }}</span>
        <span>•</span>
        <span>Stok: <strong class="text-zinc-900">{{ p.qty }} {{ p.unit || 'pcs' }}</strong></span>
      </div>
      <div class="text-[11px] text-zinc-500 mt-1">
        Modal Rp {{ formatRibuan(p.price_modal) }} → <strong class="text-emerald-700">Jual Rp {{ formatRibuan(p.price_sell) }}</strong>
      </div>
    </div>

    <div class="flex flex-col items-end gap-2 shrink-0">
      <div>
        <span v-if="p.qty===0" class="text-[10px] bg-zinc-900 text-white px-2.5 py-1 rounded-full font-black">HABIS</span>
        <span v-else-if="p.qty <= (p.minStock || 5)" class="text-[10px] bg-red-100 text-red-600 px-2.5 py-1 rounded-full font-black">TIPIS</span>
        <span v-else class="text-[10px] bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-black">AMAN</span>
      </div>

      <!-- AKSI EDIT & HAPUS -->
      <div class="flex items-center gap-1">
        <button @click="openEditModal(p)" title="Edit Barang" class="p-2 text-zinc-600 hover:bg-zinc-100 rounded-xl transition">
          <Pencil class="w-4 h-4"/>
        </button>
        <button @click="handleDelete(p)" title="Hapus Barang" class="p-2 text-red-500 hover:bg-red-50 rounded-xl transition">
          <Trash2 class="w-4 h-4"/>
        </button>
      </div>
    </div>
  </div>

  <div v-if="filtered.length===0" class="py-20 text-center text-sm text-zinc-400 font-bold">Barang tidak ditemukan</div>

  <!-- MODAL EDIT BARANG (PRODUCT FORM) -->
  <div v-if="showEditModal" class="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
    <div class="w-full max-w-lg bg-white rounded-t-[2rem] sm:rounded-[2rem] p-5 shadow-xl max-h-[90vh] flex flex-col">
      <div class="flex justify-between items-center mb-3 shrink-0">
        <h2 class="font-black text-base text-zinc-900">Edit Data Barang</h2>
        <button @click="showEditModal=false" class="p-2 bg-zinc-100 rounded-xl"><X class="w-4 h-4"/></button>
      </div>

      <div class="overflow-auto flex-1 pr-1">
        <ProductForm :initialData="selectedProduct" @success="handleEditSuccess" />
      </div>
    </div>
  </div>

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
import { ref, computed, onMounted, onUnmounted, onActivated, onDeactivated } from 'vue'
import { Plus, Search, Filter, Pencil, Trash2, X, ScanLine } from 'lucide-vue-next'
import { useProductsStore } from '../stores/productStore.js'
import { useProductScanner } from '../composables/useProductScanner.js'
import { formatRibuan } from '../utils/formatters/currency.js'
import ProductForm from '../components/product/ProductForm.vue'
import { toast } from 'vue-sonner'

const store = useProductsStore()
const { isScanning, stop: stopScanner } = useProductScanner()

const q = ref('')
const filterKategori = ref('all')
const filterStok = ref('all')
const sortBy = ref('name-asc')
const showFilter = ref(false)

const showEditModal = ref(false)
const selectedProduct = ref(null)

const toggleCameraScanner = async () => {
  if (isScanning.value) {
    await stopScanner()
  } else {
    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      const qr = new Html5Qrcode("reader-products")
      isScanning.value = true
      await qr.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        (decoded) => {
          q.value = decoded.trim()
          qr.stop().then(() => qr.clear()).catch(() => {})
          isScanning.value = false
          toast.success(`Barcode terbaca: ${decoded}`)
        },
        null
      )
    } catch (err) {
      isScanning.value = false
      toast.error('Gagal mengakses kamera HP')
    }
  }
}

const categories = computed(() => {
  const cats = new Set(store.list.map(p => p.category).filter(Boolean))
  return ['all', ...Array.from(cats)]
})

const stokOptions = [
  { value: 'all', label: 'Semua' },
  { value: 'tipis', label: 'Tipis (≤ minStok)' },
  { value: 'habis', label: 'Habis (0)' },
  { value: 'aman', label: 'Aman' },
]

const labelStok = computed(() => stokOptions.find(s => s.value === filterStok.value)?.label || 'All')
const isFiltered = computed(() => filterKategori.value !== 'all' || filterStok.value !== 'all' || q.value)

const filtered = computed(() => {
  let list = store.list.filter(p => {
    const matchQ = !q.value || p.name.toLowerCase().includes(q.value.toLowerCase()) || (p.code || '').toLowerCase().includes(q.value.toLowerCase())
    const matchCat = filterKategori.value === 'all' || p.category === filterKategori.value
    let matchStok = true
    if (filterStok.value === 'tipis') matchStok = p.qty <= (p.minStock || 5) && p.qty > 0
    if (filterStok.value === 'habis') matchStok = p.qty === 0
    if (filterStok.value === 'aman') matchStok = p.qty > (p.minStock || 5)
    return matchQ && matchCat && matchStok
  })

  if (sortBy.value === 'name-asc') list = list.sort((a, b) => a.name.localeCompare(b.name))
  if (sortBy.value === 'name-desc') list = list.sort((a, b) => b.name.localeCompare(a.name))
  if (sortBy.value === 'stok-asc') list = list.sort((a, b) => a.qty - b.qty)
  if (sortBy.value === 'stok-desc') list = list.sort((a, b) => b.qty - a.qty)
  if (sortBy.value === 'harga-desc') list = list.sort((a, b) => (b.price_sell || 0) - (a.price_sell || 0))
  if (sortBy.value === 'harga-asc') list = list.sort((a, b) => (a.price_sell || 0) - (b.price_sell || 0))

  return list
})

const resetFilter = () => {
  filterKategori.value = 'all'
  filterStok.value = 'all'
  q.value = ''
  sortBy.value = 'name-asc'
}

const openEditModal = (p) => {
  selectedProduct.value = p
  showEditModal.value = true
}

const handleEditSuccess = () => {
  showEditModal.value = false
  selectedProduct.value = null
}

const handleDelete = async (p) => {
  if (confirm(`Hapus barang "${p.name}"?`)) {
    await store.remove(p.id)
  }
}

// --- LOGIKA LISTENER BARCODE SCANNER HID ---
let barcodeBuffer = ''
let lastKeyTime = Date.now()

const handleGlobalKeydown = (e) => {
  if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(e.key)) return

  const activeEl = document.activeElement
  const isTypingInInput = activeEl && (
    activeEl.tagName === 'INPUT' || 
    activeEl.tagName === 'TEXTAREA' || 
    activeEl.tagName === 'SELECT'
  )

  const isProductSearchInput = activeEl && activeEl.id === 'product-search-input'
  if (isTypingInInput && !isProductSearchInput) return

  const currentTime = Date.now()

  if (currentTime - lastKeyTime > 50) {
    barcodeBuffer = ''
  }

  if (e.key === 'Enter') {
    if (barcodeBuffer.trim().length > 0) {
      e.preventDefault()
      q.value = barcodeBuffer.trim()
      barcodeBuffer = ''
    }
  } else if (e.key.length === 1) {
    if (!isTypingInInput || (currentTime - lastKeyTime < 30)) {
      barcodeBuffer += e.key
    }
  }

  lastKeyTime = currentTime
}

const attachListener = () => {
  window.removeEventListener('keydown', handleGlobalKeydown)
  window.addEventListener('keydown', handleGlobalKeydown)
}

const detachListener = () => {
  window.removeEventListener('keydown', handleGlobalKeydown)
}

onMounted(() => {
  store.fetch()
  attachListener()
})

onUnmounted(() => {
  detachListener()
  stopScanner()
})

onActivated(() => {
  attachListener()
})

onDeactivated(() => {
  detachListener()
  stopScanner()
})
</script>
