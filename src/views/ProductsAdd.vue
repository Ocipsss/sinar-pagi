<template>
<div class="flex flex-col gap-3 pb-24 max-w-xl mx-auto">
  <div class="p-5 bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-3">
    <div class="flex flex-col items-center mb-2">
      <div @click="takePhoto" class="w-40 h-40 bg-gray-50 rounded-3xl flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-200 cursor-pointer">
        <img v-if="product.image" :src="product.image" class="w-full h-full object-cover" />
        <div v-else class="text-center text-gray-400 p-4"><span class="text-4xl">📷</span><span class="block text-[10px] mt-2 uppercase font-black">Foto Produk</span></div>
      </div>
    </div>

    <div>
      <label class="text-[10px] font-black text-gray-400 uppercase mb-1 block">Nama Produk</label>
      <input v-model="product.name" type="text" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" placeholder="Contoh: Indomie Goreng" />
    </div>

    <div>
      <label class="text-[10px] font-black text-gray-400 uppercase mb-1 block">Kode / Barcode</label>
      <div class="flex gap-2 h-12">
        <input v-model="product.code" type="text" class="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" placeholder="Scan atau manual..." />
        <button @click="$emit('open-scanner')" class="bg-blue-50 text-blue-600 px-4 rounded-xl">📷</button>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="text-[10px] font-black text-gray-400 uppercase mb-1 block">Kategori</label>
        <select v-model="product.category" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm">
          <option value="Umum">Umum</option>
          <option v-for="cat in listCategories" :key="cat.id" :value="cat.name">{{ cat.name }}</option>
        </select>
      </div>
      <div>
        <label class="text-[10px] font-black text-gray-400 uppercase mb-1 block">Satuan</label>
        <select v-model="product.unit" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm">
          <option value="pcs">pcs</option><option value="bks">bks</option><option value="btg">btg</option><option value="rtg">rtg</option>
        </select>
      </div>
    </div>

    <div class="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex flex-col gap-3">
      <div class="flex justify-between px-1"><span class="text-[10px] font-black text-blue-600 uppercase">Kalkulator Grosir</span><span>🧮</span></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="text-[9px] font-black text-gray-400 uppercase mb-1 block">Harga 1 Pak</label><input :value="display.pack" @input="updateNumber('pack_price', $event)" class="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold" placeholder="0" /></div>
        <div><label class="text-[9px] font-black text-gray-400 uppercase mb-1 block">Isi Per Pak</label><input v-model.number="product.pack_size" @input="updatePackSize" type="number" class="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold" /></div>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div><label class="text-[10px] font-black text-red-400 uppercase mb-1 block">Modal (/pcs)</label><input :value="display.modal" @input="updateNumber('price_modal', $event)" class="w-full px-4 py-3 bg-red-50/20 border border-gray-200 rounded-xl text-sm font-bold text-red-600" /></div>
      <div><label class="text-[10px] font-black text-green-500 uppercase mb-1 block">Jual (/pcs)</label><input :value="display.sell" @input="updateNumber('price_sell', $event)" class="w-full px-4 py-3 bg-green-50/20 border border-gray-200 rounded-xl text-sm font-bold text-green-600" /></div>
    </div>

    <div><label class="text-[10px] font-black text-gray-400 uppercase mb-1 block">Stok Awal</label><input v-model.number="product.qty" type="number" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold" /></div>
    <button @click="saveProduct" :disabled="loading" class="w-full mt-4 bg-blue-600 text-white py-4 rounded-2xl font-black uppercase">{{ loading? 'Menyimpan...' : 'Simpan Produk' }}</button>
  </div>
</div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '../db/index.js'
import { useProductForm } from '../composables/useProductForm.js'
import { generateUID } from '../utils/uid.js'

const router = useRouter()
const emit = defineEmits(['open-scanner'])

const { product, display, updateNumber, updatePackSize, resetForm } = useProductForm()
const loading = ref(false)
const listCategories = ref([])

const takePhoto = () => {
  const input = document.createElement('input'); input.type='file'; input.accept='image/*'; input.capture='environment';
  input.onchange = (e) => {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader(); reader.readAsDataURL(file);
    reader.onload = (ev) => {
      const img = new Image(); img.src = ev.target.result;
      img.onload = () => {
        const c = document.createElement('canvas'); c.width=400; c.height=400;
        const ctx=c.getContext('2d'); const min=Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width-min)/2, (img.height-min)/2, min, min, 0,0,400,400);
        product.value.image = c.toDataURL('image/jpeg',0.7)
      }
    }
  }; input.click()
}

watch(() => product.value.code, async (code) => {
  if (!code?.trim()) return
  const exist = await db.products.where('code').equals(code).first()
  if (exist) alert(`⚠️ Kode "${code}" sudah dipakai "${exist.name}"`)
})

const saveProduct = async () => {
  if(!product.value.name ||!product.value.price_sell) return alert("Nama & Harga Jual wajib!")
  loading.value = true
  try {
    if (product.value.code) {
      const dup = await db.products.where('code').equals(product.value.code).first()
      if (dup) { alert(`Gagal! Kode milik "${dup.name}"`); loading.value=false; return }
    }
    await db.products.add({
     ...JSON.parse(JSON.stringify(product.value)),
      id: generateUID(), packPrice: product.value.pack_price, packQty: product.value.pack_size,
      updatedAt: new Date().toISOString(), synced: 0
    })
    alert("Produk Berhasil!"); resetForm(); router.push('/products')
  } catch (err) { alert("Gagal: " + err.message) } finally { loading.value = false }
}

onMounted(async () => { listCategories.value = await db.categories.toArray() })
</script>