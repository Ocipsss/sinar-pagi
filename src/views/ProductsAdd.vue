<template>
<div class="flex flex-col gap-3 pb-24 max-w-xl mx-auto">
  <div class="p-5 bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-3">

    <!-- FOTO -->
    <div class="flex flex-col items-center mb-2">
      <div @click="takePhoto" class="w-40 h-40 bg-gray-50 rounded-3xl flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-200 relative cursor-pointer active:scale-95 transition">
        <img v-if="product.image" :src="product.image" class="w-full h-full object-cover" />
        <div v-else class="text-center text-gray-400 p-4">
          <span class="text-4xl">📷</span>
          <span class="block text-[10px] mt-2 uppercase font-black">Foto Produk</span>
        </div>
      </div>
    </div>

    <div>
      <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Nama Produk</label>
      <input v-model="product.name" type="text" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-zinc-900 focus:bg-white" placeholder="Contoh: Indomie Goreng" />
    </div>

    <div>
      <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Kode / Barcode</label>
      <div class="flex items-stretch gap-2 h-12">
        <input v-model="product.code" type="text" class="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-zinc-900 focus:bg-white" placeholder="Scan atau manual..." />
        <button @click="$emit('open-scanner')" class="bg-blue-50 text-blue-600 px-4 rounded-xl flex items-center justify-center active:bg-blue-100">
          <span class="text-xl">📷</span>
        </button>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Kategori</label>
        <select v-model="product.category" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-zinc-900">
          <option value="Umum">Umum</option>
          <option v-for="cat in listCategories" :key="cat.id" :value="cat.name">{{ cat.name }}</option>
        </select>
      </div>
      <div>
        <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Satuan</label>
        <select v-model="product.unit" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm">
          <option value="pcs">pcs</option>
          <option value="bks">bks</option>
          <option value="btg">btg</option>
          <option value="rtg">rtg</option>
        </select>
      </div>
    </div>

    <hr class="border-gray-50 my-1" />

    <div class="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex flex-col gap-3">
      <div class="flex justify-between items-center px-1">
        <span class="text-[10px] font-black text-blue-600 uppercase tracking-widest">Kalkulator Grosir</span>
        <span>🧮</span>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-[9px] font-black text-gray-400 uppercase mb-1 block">Harga 1 Pak</label>
          <input :value="displayPack" @input="updateNumber('pack_price', $event)" type="text" inputmode="numeric" class="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold" placeholder="0" />
        </div>
        <div>
          <label class="text-[9px] font-black text-gray-400 uppercase mb-1 block">Isi Per Pak</label>
          <input v-model.number="product.pack_size" @input="updatePackSize" @focus="clearInitialSize" type="number" class="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold" placeholder="1" />
        </div>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1 block">Harga Modal (/pcs)</label>
        <input :value="displayModal" @input="updateNumber('price_modal', $event)" type="text" inputmode="numeric" class="w-full px-4 py-3 bg-red-50/20 border border-gray-200 rounded-xl text-sm font-bold text-red-600" placeholder="0" />
      </div>
      <div>
        <label class="text-[10px] font-black text-green-500 uppercase tracking-widest mb-1 block">Harga Jual (/pcs)</label>
        <input :value="displaySell" @input="updateNumber('price_sell', $event)" type="text" inputmode="numeric" class="w-full px-4 py-3 bg-green-50/20 border border-gray-200 rounded-xl text-sm font-bold text-green-600" placeholder="0" />
      </div>
    </div>

    <div>
      <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Stok Awal</label>
      <input v-model.number="product.qty" type="number" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold" placeholder="0" />
    </div>

    <button @click="saveProduct" :disabled="loading" class="w-full mt-4 bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg uppercase active:scale-95 transition disabled:opacity-50">
      {{ loading? 'Menyimpan...' : 'Simpan Produk' }}
    </button>
  </div>
</div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '../db/index.js'

const router = useRouter()
const emit = defineEmits(['open-scanner'])
const loading = ref(false)

const product = ref({
  id: '',
  image: null,
  name: '',
  code: '',
  category: 'Umum',
  unit: 'pcs',
  price_modal: 0,
  price_sell: 0,
  qty: 0,
  pack_price: 0,
  pack_size: 1
})

const displayModal = ref("")
const displaySell = ref("")
const displayPack = ref("")
const listCategories = ref([])

const formatDisplay = (val) => {
  if (!val) return ""
  return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

const updateNumber = (field, event) => {
  let rawValue = event.target.value.replace(/\D/g, "")
  let numValue = parseInt(rawValue) || 0
  product.value[field] = numValue

  if (field === 'price_modal') displayModal.value = formatDisplay(numValue)
  if (field === 'price_sell') displaySell.value = formatDisplay(numValue)
  if (field === 'pack_price') {
    displayPack.value = formatDisplay(numValue)
    if (product.value.pack_size > 0) {
      const unitModal = Math.round(numValue / product.value.pack_size)
      product.value.price_modal = unitModal
      displayModal.value = formatDisplay(unitModal)
    }
  }
}

const clearInitialSize = () => {
  if (product.value.pack_size === 1) product.value.pack_size = null
}

const updatePackSize = () => {
  if (product.value.pack_price > 0 && product.value.pack_size > 0) {
    const unitModal = Math.round(product.value.pack_price / product.value.pack_size)
    product.value.price_modal = unitModal
    displayModal.value = formatDisplay(unitModal)
  }
}

const takePhoto = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.capture = 'environment'
  input.onchange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target.result
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const size = 400
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        const min = Math.min(img.width, img.height)
        const sx = (img.width - min) / 2
        const sy = (img.height - min) / 2
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size)
        product.value.image = canvas.toDataURL('image/jpeg', 0.7)
      }
    }
  }
  input.click()
}

// Validasi kode realtime - sama kayak logika lama
watch(() => product.value.code, async (newCode) => {
  if (newCode && newCode.trim()!== "") {
    const exist = await db.products.where('code').equals(newCode).first()
    if (exist) {
      alert(`⚠️ Kode "${newCode}" sudah dipakai "${exist.name}"`)
    }
  }
})

const loadCategories = async () => {
  const data = await db.categories.toArray()
  listCategories.value = data
}

const saveProduct = async () => {
  if(!product.value.name ||!product.value.price_sell) {
    alert("Nama dan Harga Jual wajib diisi!")
    return
  }
  loading.value = true
  try {
    if (product.value.code) {
      const existing = await db.products.where('code').equals(product.value.code).first()
      if (existing) {
        alert(`Gagal! Kode sudah milik "${existing.name}"`)
        loading.value = false
        return
      }
    }

    const finalId = window.generateUID? window.generateUID() : crypto.randomUUID()

    const productData = {
     ...JSON.parse(JSON.stringify(product.value)),
      id: finalId,
      // mapping ke schema Dexie kamu yang lama
      code: product.value.code,
      name: product.value.name,
      category: product.value.category,
      unit: product.value.unit,
      price_modal: product.value.price_modal,
      price_sell: product.value.price_sell,
      qty: product.value.qty,
      packPrice: product.value.pack_price,
      packQty: product.value.pack_size,
      image: product.value.image,
      updatedAt: new Date().toISOString(),
      synced: 0
    }

    await db.products.add(productData)

    // trigger sync kalau ada service kamu
    if (navigator.onLine) {
      try {
        const { syncService } = await import('../services/syncService.js')
        syncService.pushLocalToCloud?.()
      } catch {}
    }

    alert("Produk Berhasil Disimpan!")
    product.value = { id: '', image: null, name: '', code: '', category: 'Umum', unit: 'pcs', price_modal: 0, price_sell: 0, qty: 0, pack_price: 0, pack_size: 1 }
    displayModal.value = ""; displaySell.value = ""; displayPack.value = ""

    const scrollContainer = document.querySelector('.content-scroll') || document.querySelector('main')
    if (scrollContainer) scrollContainer.scrollTo({ top: 0, behavior: 'smooth' })

    router.push('/products')
  } catch (err) {
    alert("Gagal menyimpan: " + err.message)
  } finally {
    loading.value = false
  }
}

onMounted(loadCategories)
</script>