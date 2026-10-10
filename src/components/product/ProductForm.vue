<template>
<form @submit.prevent="onSubmit" class="bg-white p-5 rounded-3xl border flex flex-col gap-4 shadow-sm">
  <div class="flex flex-col gap-1">
    <input v-model="name" placeholder="Nama Produk *" class="px-4 py-3 bg-zinc-50 border rounded-xl text-sm font-bold"/>
    <span v-if="errors.name" class="text-[10px] text-red-500">{{ errors.name }}</span>
  </div>

  <div class="flex gap-2">
    <input v-model="code" placeholder="Barcode" class="flex-1 px-4 py-3 bg-zinc-50 border rounded-xl text-sm"/>
    <button type="button" @click="start(c => code = c)" class="px-4 bg-zinc-900 text-white rounded-xl"><ScanLine class="w-4 h-4"/></button>
  </div>
  <div id="reader" class="w-full rounded-xl overflow-hidden"></div>

  <!-- Pilihan Kategori -->
  <div class="flex flex-col gap-1">
    <label class="text-[10px] text-zinc-500">Kategori</label>
    <select v-model="category" class="px-4 py-3 bg-zinc-50 border rounded-xl text-sm font-bold">
      <option value="Umum">Umum</option>
      <option v-for="cat in categories" :key="cat.id" :value="cat.name">
        {{ cat.name }}
      </option>
    </select>
  </div>

  <!-- Kalkulator Grosir -->
  <div class="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex flex-col gap-3">
    <div class="text-[10px] font-black text-blue-600 uppercase">Kalkulator Grosir</div>
    <div class="grid grid-cols-3 gap-2">
      <div class="col-span-2 flex flex-col gap-1">
        <label class="text-[10px] text-zinc-500">Harga Per Pak</label>
        <input :value="formatRp(packPrice)" @input="onPackPriceInput" inputmode="numeric" placeholder="Rp 0" class="w-full px-3 py-2.5 bg-white border rounded-xl text-sm font-bold"/>
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-[10px] text-zinc-500">Isi / Pak</label>
        <input v-model.number="packQty" type="number" inputmode="numeric" placeholder="12" class="w-full px-3 py-2.5 bg-white border rounded-xl text-sm font-bold"/>
      </div>
    </div>
    <div v-if="toNumber(packPrice) > 0" class="flex flex-col gap-1">
      <input v-model="purchasePackName" placeholder="Nama grosir: dus, slop" class="px-3 py-2.5 bg-white border rounded-xl text-sm"/>
      <div class="text-[11px] text-blue-600 bg-white p-2 rounded-xl border">Auto modal: {{ formatRp(autoModal) }}</div>
    </div>
  </div>

  <!-- Modal + Jual bersebelahan -->
  <div class="grid grid-cols-2 gap-2">
    <div class="flex flex-col gap-1">
      <label class="text-[10px] text-zinc-500">Modal / Pcs * (bisa manual)</label>
      <input :value="formatRp(price_modal)" @input="onModalInput" inputmode="numeric" placeholder="Rp 0" class="w-full px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm font-bold"/>
      <span v-if="errors.price_modal" class="text-[10px] text-red-500">{{ errors.price_modal }}</span>
    </div>
    <div class="flex flex-col gap-1">
      <label class="text-[10px] text-zinc-500">Harga Jual *</label>
      <input :value="formatRp(price_sell)" @input="onJualInput" inputmode="numeric" placeholder="Rp 0" class="w-full px-3 py-2.5 bg-green-50 border border-green-200 rounded-xl text-sm font-bold"/>
      <span class="text-[10px] text-green-600 font-bold">Margin {{ marginPersen }}%</span>
    </div>
  </div>

  <!-- Stok Awal + Min Stok bersebelahan -->
  <div class="grid grid-cols-2 gap-2">
    <div class="flex flex-col gap-1">
      <label class="text-[10px] text-zinc-500">Stok Awal</label>
      <input v-model.number="qty" type="number" placeholder="0" class="px-4 py-3 bg-zinc-50 border rounded-xl text-sm font-bold"/>
    </div>
    <div class="flex flex-col gap-1">
      <label class="text-[10px] text-zinc-500">Min. Stok</label>
      <input v-model.number="minStock" type="number" placeholder="5" class="px-4 py-3 bg-zinc-50 border rounded-xl text-sm font-bold"/>
    </div>
  </div>

  <button :disabled="isSubmitting" class="w-full bg-zinc-900 text-white py-4 rounded-2xl font-black text-sm">{{ isSubmitting? 'Menyimpan...' : 'Simpan Barang' }}</button>
</form>
</template>

<script setup>
import { computed, watch, onMounted } from 'vue'
import { ScanLine } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useProductForm } from '../../composables/useProductForm.js'
import { useProductScanner } from '../../composables/useProductScanner.js'
import { calcModalDariPack, calcMargin } from '../../utils/calculator/product.js'
import { formatRp, toNumber } from '../../utils/formatters/currency.js'
import { productService } from '../../services/productService.js'

const { 
  name, code, category, purchasePackName, packPrice, packQty, 
  price_modal, price_sell, qty, minStock, categories, loadCategories, 
  handleSubmit, errors, isSubmitting 
} = useProductForm()

const { start } = useProductScanner()
const router = useRouter()

const autoModal = computed(() => calcModalDariPack(packPrice.value, packQty.value))
const marginPersen = computed(() => calcMargin(price_sell.value, price_modal.value))

onMounted(() => {
  loadCategories()
})

const onPackPriceInput = (e) => {
  const raw = toNumber(e.target.value)
  packPrice.value = raw
  e.target.value = formatRp(raw)
}
const onModalInput = (e) => {
  const raw = toNumber(e.target.value)
  price_modal.value = raw
  e.target.value = formatRp(raw)
}
const onJualInput = (e) => {
  const raw = toNumber(e.target.value)
  price_sell.value = raw
  e.target.value = formatRp(raw)
}

watch(autoModal, (val) => { if (val > 0) price_modal.value = val })

const onSubmit = handleSubmit(async (vals) => {
  await productService.createProduct({
    name: vals.name,
    code: vals.code || '',
    category: category.value || 'Umum',
    purchasePackName: purchasePackName.value || '',
    packPrice: toNumber(packPrice.value),
    packQty: toNumber(packQty.value),
    price_modal: toNumber(price_modal.value),
    price_sell: toNumber(price_sell.value),
    qty: toNumber(qty.value),
    minStock: toNumber(minStock.value) || 5,
    unit: 'pcs'
  }, toNumber(price_modal.value))
  router.push('/products')
})
</script>
