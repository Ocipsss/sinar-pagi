<template>
  <div class="flex-1 overflow-auto p-4 pb-24 space-y-6">
    <!-- Header -->
    <div>
      <h1 class="font-black text-xl text-zinc-900">Pengaturan Menu & Jasa</h1>
      <p class="text-xs text-zinc-400">Atur paket eceran rokok dan tarif jasa per kategori</p>
    </div>

    <!-- Tab Navigasi -->
    <div class="flex bg-zinc-100 p-1 rounded-2xl gap-1">
      <button 
        @click="activeTab = 'seduh'" 
        :class="['flex-1 py-2.5 rounded-xl text-xs font-bold transition', activeTab === 'seduh' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500']"
      >
        Tarif Jasa per Kategori
      </button>
      <button 
        @click="activeTab = 'rokok'" 
        :class="['flex-1 py-2.5 rounded-xl text-xs font-bold transition', activeTab === 'rokok' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500']"
      >
        Eceran Rokok
      </button>
    </div>

    <!-- TAB 1: TARIF JASA SEDUH / TAMBAHAN -->
    <div v-if="activeTab === 'seduh'" class="space-y-4">
      <div class="flex justify-between items-center">
        <h2 class="font-black text-sm text-zinc-800">Daftar Tarif Jasa</h2>
        <button 
          @click="openServiceModal()" 
          class="bg-zinc-900 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition"
        >
          <Plus class="w-4 h-4"/> Tambah Jasa
        </button>
      </div>

      <div v-if="services.length === 0" class="py-12 text-center text-zinc-400 text-xs bg-white rounded-2xl border border-zinc-100">
        Belum ada tarif jasa
      </div>

      <div v-else class="space-y-2">
        <div 
          v-for="s in services" 
          :key="s.id" 
          class="p-4 bg-white rounded-2xl border border-zinc-100 shadow-sm flex items-center justify-between"
        >
          <div>
            <div class="flex items-center gap-2">
              <span class="font-bold text-sm text-zinc-900">{{ s.name }}</span>
              <span class="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md text-[10px] font-black uppercase">
                {{ s.category || 'Umum' }}
              </span>
            </div>
            <div class="text-xs text-amber-600 font-black mt-0.5">Rp {{ formatRibuan(s.price) }}</div>
          </div>
          <div class="flex gap-1">
            <button @click="openServiceModal(s)" class="p-2 text-zinc-600 hover:bg-zinc-100 rounded-xl">
              <Pencil class="w-4 h-4"/>
            </button>
            <button @click="handleDeleteService(s)" class="p-2 text-red-500 hover:bg-red-50 rounded-xl">
              <Trash2 class="w-4 h-4"/>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: ECERAN ROKOK -->
    <div v-if="activeTab === 'rokok'" class="space-y-4">
      <div v-if="rokokProducts.length === 0" class="py-12 text-center text-zinc-400 text-xs bg-white rounded-2xl border border-zinc-100">
        Belum ada produk dengan kategori "Rokok"
      </div>

      <div v-else class="space-y-3">
        <div 
          v-for="p in rokokProducts" 
          :key="p.id" 
          class="p-4 bg-white rounded-2xl border border-zinc-100 shadow-sm space-y-3"
        >
          <div class="flex justify-between items-center border-b border-zinc-50 pb-2">
            <div>
              <div class="font-bold text-sm text-zinc-900">{{ p.name }}</div>
              <div class="text-[11px] text-zinc-400">Harga Utuh: Rp {{ formatRibuan(p.price_sell) }}</div>
            </div>
            <button 
              @click="openPackageModal(p)" 
              class="px-3 py-1.5 bg-zinc-100 text-zinc-800 rounded-xl text-xs font-bold hover:bg-zinc-200 active:scale-95 transition"
            >
              + Opsi Ecer
            </button>
          </div>

          <div class="space-y-1.5">
            <div 
              v-for="pkg in getPackagesForProduct(p.id)" 
              :key="pkg.id" 
              class="flex justify-between items-center p-2.5 bg-zinc-50 rounded-xl text-xs"
            >
              <div>
                <span class="font-bold text-zinc-800">{{ pkg.name }}</span>
                <span class="text-zinc-400 ml-2">({{ pkg.qty_pcs }} pcs/batang)</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-black text-zinc-900">Rp {{ formatRibuan(pkg.price_sell) }}</span>
                <button @click="handleDeletePackage(pkg)" class="p-1 text-red-500 hover:bg-red-100 rounded-lg">
                  <Trash2 class="w-3.5 h-3.5"/>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Form Jasa -->
    <div v-if="showServiceModal" class="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div class="w-full max-w-md bg-white rounded-t-[2rem] sm:rounded-[2rem] p-6 shadow-xl space-y-4">
        <div class="flex justify-between items-center">
          <h2 class="font-black text-base">{{ editingServiceId ? 'Edit Tarif Jasa' : 'Tambah Tarif Jasa' }}</h2>
          <button @click="showServiceModal = false" class="p-2 bg-zinc-100 rounded-xl"><X class="w-4 h-4"/></button>
        </div>

        <form @submit.prevent="handleSaveService" class="space-y-3">
          <div>
            <label class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Untuk Kategori Produk *</label>
            <select v-model="serviceForm.category" required class="w-full px-4 py-3 bg-zinc-50 border rounded-xl text-sm font-bold">
              <option v-for="cat in categoryOptions" :key="cat.id" :value="cat.name">
                {{ cat.name }}
              </option>
            </select>
          </div>
          <div>
            <label class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Nama Layanan *</label>
            <input v-model="serviceForm.name" required placeholder="Contoh: Seduh, Es Batu, dll" class="w-full px-4 py-3 bg-zinc-50 border rounded-xl text-sm font-bold"/>
          </div>
          <div>
            <label class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Biaya Jasa (Rp) *</label>
            <input 
              :value="formatRp(serviceForm.price)" 
              @input="e => serviceForm.price = toNumber(e.target.value)" 
              type="text" 
              inputmode="numeric" 
              required 
              placeholder="Rp 0" 
              class="w-full px-4 py-3 bg-zinc-50 border rounded-xl text-lg font-black text-zinc-900"
            />
          </div>
          <div class="flex gap-2 pt-2">
            <button type="button" @click="showServiceModal = false" class="flex-1 py-3 bg-zinc-100 font-bold text-xs rounded-xl">Batal</button>
            <button type="submit" class="flex-1 py-3 bg-zinc-900 text-white font-bold text-xs rounded-xl shadow-md">Simpan</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Form Paket Eceran Rokok -->
    <div v-if="showPackageModal" class="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div class="w-full max-w-md bg-white rounded-t-[2rem] sm:rounded-[2rem] p-6 shadow-xl space-y-4">
        <div class="flex justify-between items-center">
          <div>
            <h2 class="font-black text-base">Tambah Paket Eceran</h2>
            <p class="text-xs text-zinc-400">{{ selectedRokokProduct?.name }}</p>
          </div>
          <button @click="showPackageModal = false" class="p-2 bg-zinc-100 rounded-xl"><X class="w-4 h-4"/></button>
        </div>

        <form @submit.prevent="handleSavePackage" class="space-y-3">
          <div>
            <label class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Nama Varian *</label>
            <input v-model="packageForm.name" required placeholder="Contoh: 1 Batang, 1/2 Bungkus" class="w-full px-4 py-3 bg-zinc-50 border rounded-xl text-sm font-bold"/>
          </div>
          <div>
            <label class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Jumlah Batang Dipotong *</label>
            <input v-model.number="packageForm.qty_pcs" type="number" required placeholder="1" class="w-full px-4 py-3 bg-zinc-50 border rounded-xl text-sm font-bold"/>
          </div>
          <div>
            <label class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Harga Jual Varian (Rp) *</label>
            <input 
              :value="formatRp(packageForm.price_sell)" 
              @input="e => packageForm.price_sell = toNumber(e.target.value)" 
              type="text" 
              inputmode="numeric" 
              required 
              placeholder="Rp 0" 
              class="w-full px-4 py-3 bg-zinc-50 border rounded-xl text-lg font-black text-zinc-900"
            />
          </div>
          <div class="flex gap-2 pt-2">
            <button type="button" @click="showPackageModal = false" class="flex-1 py-3 bg-zinc-100 font-bold text-xs rounded-xl">Batal</button>
            <button type="submit" class="flex-1 py-3 bg-zinc-900 text-white font-bold text-xs rounded-xl shadow-md">Simpan Paket</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Plus, Pencil, Trash2, X } from 'lucide-vue-next'
import { useSettingsMenu } from '../composables/useSettingsMenu.js'
import { formatRibuan, formatRp, toNumber } from '../utils/formatters/currency.js'

const activeTab = ref('seduh')
const {
  rokokProducts,
  services,
  categoryOptions,
  loadData,
  getPackagesForProduct,
  savePackage,
  deletePackage,
  saveService,
  deleteService
} = useSettingsMenu()

// Modal State Jasa
const showServiceModal = ref(false)
const editingServiceId = ref(null)
const serviceForm = ref({ name: '', price: 0, category: 'Mie' })

// Modal State Paket Rokok
const showPackageModal = ref(false)
const selectedRokokProduct = ref(null)
const packageForm = ref({ name: '', qty_pcs: 1, price_sell: 0 })

const openServiceModal = (s = null) => {
  if (s) {
    editingServiceId.value = s.id
    serviceForm.value = { name: s.name, price: s.price, category: s.category || 'Mie' }
  } else {
    editingServiceId.value = null
    serviceForm.value = { name: 'Seduh', price: 2000, category: categoryOptions.value[0]?.name || 'Mie' }
  }
  showServiceModal.value = true
}

const handleSaveService = async () => {
  await saveService({
    id: editingServiceId.value,
    name: serviceForm.value.name,
    price: serviceForm.value.price,
    category: serviceForm.value.category
  })
  showServiceModal.value = false
}

const handleDeleteService = async (s) => {
  if (confirm(`Hapus tarif "${s.name}"?`)) {
    await deleteService(s.id)
  }
}

const openPackageModal = (p) => {
  selectedRokokProduct.value = p
  packageForm.value = { name: '', qty_pcs: 1, price_sell: 0 }
  showPackageModal.value = true
}

const handleSavePackage = async () => {
  if (!selectedRokokProduct.value) return
  await savePackage({
    productId: selectedRokokProduct.value.id,
    name: packageForm.value.name,
    qty_pcs: packageForm.value.qty_pcs,
    price_sell: packageForm.value.price_sell
  })
  showPackageModal.value = false
}

const handleDeletePackage = async (pkg) => {
  if (confirm(`Hapus opsi paket "${pkg.name}"?`)) {
    await deletePackage(pkg.id)
  }
}

onMounted(() => {
  loadData()
})
</script>
