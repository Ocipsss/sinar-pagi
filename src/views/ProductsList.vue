<template>
<div class="flex-1 overflow-auto p-4 pb-24">
  <div class="flex justify-between items-center mb-4">
    <div>
      <h1 class="font-black text-xl text-zinc-900">Daftar Barang</h1>
      <p class="text-xs text-zinc-400">Total {{ store.list.length }} barang terdaftar</p>
    </div>
    <router-link 
      to="/add-products" 
      class="bg-zinc-900 text-white px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 active:scale-95 transition"
    >
      <Plus class="w-4 h-4" /> Tambah
    </router-link>
  </div>

  <div class="relative mb-4">
    <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
    <input 
      v-model="store.searchQuery" 
      placeholder="Cari nama, barcode, atau kategori..." 
      class="w-full pl-11 pr-4 py-3 bg-white border border-zinc-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-zinc-900 shadow-sm"
    />
  </div>

  <div v-if="store.filteredProducts.length === 0" class="py-12 text-center text-zinc-400 text-xs">
    Barang tidak ditemukan
  </div>

  <div class="space-y-2">
    <div 
      v-for="p in store.filteredProducts" 
      :key="p.id" 
      class="p-4 bg-white rounded-2xl border border-zinc-100 flex items-center justify-between shadow-sm"
    >
      <div class="flex-1 pr-2">
        <div class="flex items-center gap-2">
          <span class="font-bold text-sm text-zinc-900">{{ p.name }}</span>
          <span 
            v-if="p.qty <= (p.minStock || 5)" 
            class="text-[9px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-black uppercase"
          >
            TIPIS
          </span>
        </div>
        <div class="text-[11px] text-zinc-400 mt-0.5">
          <span class="px-1.5 py-0.5 bg-zinc-100 rounded font-semibold text-zinc-600 mr-1.5">{{ p.category || 'Umum' }}</span>
          {{ p.code ? `${p.code} • ` : '' }}Stok {{ p.qty }} • Rp {{ formatRibuan(p.price_sell) }}
        </div>
      </div>

      <div class="flex items-center gap-1 shrink-0">
        <button @click="openEditModal(p)" class="p-2 text-zinc-600 hover:bg-zinc-100 rounded-xl transition">
          <Pencil class="w-4 h-4" />
        </button>
        <button @click="handleDelete(p)" class="p-2 text-red-500 hover:bg-red-50 rounded-xl transition">
          <Trash2 class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>

  <!-- Modal Edit Barang -->
  <div v-if="showModal" class="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
    <div class="w-full max-w-md bg-white rounded-t-[2rem] sm:rounded-[2rem] p-6 shadow-xl animate-in slide-in-from-bottom duration-200 max-h-[85vh] flex flex-col">
      <div class="flex justify-between items-center mb-4 shrink-0">
        <h2 class="font-black text-base">Edit Barang</h2>
        <button @click="showModal = false" class="p-2 bg-zinc-100 rounded-xl"><X class="w-4 h-4" /></button>
      </div>

      <form @submit.prevent="handleSave" class="space-y-3 overflow-auto flex-1 pr-1">
        <div>
          <label class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Nama Produk *</label>
          <input v-model="editForm.name" required class="w-full px-4 py-2.5 bg-zinc-50 border rounded-xl text-sm font-bold" />
        </div>

        <div>
          <label class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Barcode / Kode</label>
          <input v-model="editForm.code" class="w-full px-4 py-2.5 bg-zinc-50 border rounded-xl text-sm font-bold" />
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Harga Modal *</label>
            <input 
              :value="formatRp(editForm.price_modal)" 
              @input="e => editForm.price_modal = toNumber(e.target.value)" 
              type="text" 
              inputmode="numeric" 
              required 
              class="w-full px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm font-black text-zinc-900" 
            />
          </div>
          <div>
            <label class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Harga Jual *</label>
            <input 
              :value="formatRp(editForm.price_sell)" 
              @input="e => editForm.price_sell = toNumber(e.target.value)" 
              type="text" 
              inputmode="numeric" 
              required 
              class="w-full px-3 py-2.5 bg-green-50 border border-green-200 rounded-xl text-sm font-black text-zinc-900" 
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Stok Sisa</label>
            <input v-model.number="editForm.qty" type="number" class="w-full px-4 py-2.5 bg-zinc-50 border rounded-xl text-sm font-bold" />
          </div>
          <div>
            <label class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Min. Stok</label>
            <input v-model.number="editForm.minStock" type="number" class="w-full px-4 py-2.5 bg-zinc-50 border rounded-xl text-sm font-bold" />
          </div>
        </div>

        <div class="flex gap-2 pt-3">
          <button type="button" @click="showModal = false" class="flex-1 py-3 bg-zinc-100 font-bold text-xs rounded-xl">Batal</button>
          <button type="submit" class="flex-1 py-3 bg-zinc-900 text-white font-bold text-xs rounded-xl shadow-md">Simpan Perubahan</button>
        </div>
      </form>
    </div>
  </div>
</div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Plus, Search, Pencil, Trash2, X } from 'lucide-vue-next'
import { useProductsStore } from '../stores/productStore.js'
import { formatRibuan, formatRp, toNumber } from '../utils/formatters/currency.js'

const store = useProductsStore()

const showModal = ref(false)
const editingId = ref(null)
const editForm = ref({ name: '', code: '', price_modal: 0, price_sell: 0, qty: 0, minStock: 5 })

const openEditModal = (p) => {
  editingId.value = p.id
  editForm.value = { 
    name: p.name, 
    code: p.code || '', 
    price_modal: p.price_modal || 0, 
    price_sell: p.price_sell || 0, 
    qty: p.qty || 0, 
    minStock: p.minStock || 5 
  }
  showModal.value = true
}

const handleSave = async () => {
  if (!editingId.value) return
  await store.update(editingId.value, editForm.value)
  showModal.value = false
}

const handleDelete = async (p) => {
  if (confirm(`Hapus barang "${p.name}"?`)) {
    await store.remove(p.id)
  }
}

onMounted(() => {
  store.fetch()
})
</script>
