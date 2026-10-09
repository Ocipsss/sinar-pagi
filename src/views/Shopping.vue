<template>
<div class="p-4 max-w-xl mx-auto pb-24">
  <h1 class="font-black text-xl mb-4">Estimasi Belanja</h1>
  <div class="flex gap-2 mb-4">
    <input v-model.number="targetStock" type="number" class="px-3 py-2 border rounded-xl text-sm" placeholder="Target stok 30" />
    <button @click="load" class="bg-zinc-900 text-white px-4 rounded-xl text-sm font-bold">Hitung</button>
  </div>
  <div v-for="item in result.list" :key="item.id" class="flex items-center gap-3 p-3 bg-white rounded-2xl border mb-2">
    <input type="checkbox" v-model="item.checked" />
    <div class="flex-1">
      <div class="font-bold text-sm">{{item.name}} <span class="text-[10px] text-red-500">sisa {{item.qty}}</span></div>
      <div class="text-[11px] text-gray-400">Butuh {{item.butuh}} ({{item.butuhPack}} {{item.pack_unit}}) - {{formatRp(item.totalModal)}}</div>
    </div>
  </div>
  <div class="mt-4 p-4 bg-blue-600 text-white rounded-2xl">
    <div class="text-[10px] uppercase font-black opacity-70">Total Budget</div>
    <div class="text-2xl font-black">{{formatRp(totalChecked)}}</div>
    <div class="text-[11px] mt-1">{{checkedCount}} item dipilih</div>
  </div>
</div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { db } from '../db/index.js'
import { hitungEstimasiBelanja } from '../utils/calculator/product.js'
import { formatDisplay } from '../utils/currency.js'

const targetStock = ref(30)
const result = ref({ list: [], grandTotal: 0 })
const formatRp = (n) => 'Rp ' + formatDisplay(n)

const totalChecked = computed(()=> result.value.list.filter(i=>i.checked).reduce((s,i)=>s+i.totalModal,0))
const checkedCount = computed(()=> result.value.list.filter(i=>i.checked).length)

const load = async () => {
  const products = await db.products.toArray()
  result.value = hitungEstimasiBelanja(products, targetStock.value)
}
onMounted(load)
</script>