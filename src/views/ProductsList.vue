<template>
<div class="max-w-xl mx-auto p-4 pb-24">
  <h1 class="font-black text-xl mb-4">Daftar Barang ({{store.list.length}})</h1>
  <input v-model="q" placeholder="Cari..." class="w-full px-4 py-3 bg-white border rounded-2xl mb-4 text-sm"/>
  <div v-for="p in filtered" :key="p.id" class="p-4 bg-white rounded-2xl border mb-2 flex justify-between">
    <div>
      <div class="font-bold text-sm">{{p.name}}</div>
      <div class="text-[11px] text-zinc-400">{{p.code}} | Stok {{p.qty}} | Modal Rp {{p.price_modal}}</div>
    </div>
    <span v-if="p.qty <= p.minStock" class="text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded-full h-fit">TIPIS</span>
  </div>
</div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useProductsStore } from '../stores/productStore.js'
const store = useProductsStore()
const q = ref('')
const filtered = computed(()=> store.list.filter(p=> p.name.toLowerCase().includes(q.value.toLowerCase())))
onMounted(()=> store.fetch())
</script>