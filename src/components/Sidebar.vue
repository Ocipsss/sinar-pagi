<script setup>
import { X } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

const props = defineProps({ groups: Array, activePage: String })
const emit = defineEmits(['select-page', 'close'])
const router = useRouter()

const handleItemClick = (item) => {
  emit('select-page', item)
  if (item.to) {
    router.push(item.to)
  }
}
</script>

<template>
<div class="h-full bg-zinc-900 text-white flex flex-col overflow-hidden">
  <div class="flex justify-between items-center p-6 pb-2 shrink-0">
    <span class="font-black text-lg tracking-tight">SINAR PAGI</span>
    <button @click="$emit('close')" class="p-2 bg-zinc-800 rounded-xl active:scale-95 transition">
      <X class="w-4 h-4"/>
    </button>
  </div>

  <!-- AREA MENU BISA DI-SCROLL -->
  <div class="flex-1 overflow-y-auto px-6 py-2 space-y-6">
    <div v-for="group in groups" :key="group.title">
      <div class="text-[10px] font-black tracking-widest text-zinc-500 uppercase mb-3">
        {{ group.title }}
      </div>
      <ul class="flex flex-col gap-1">
        <li 
          v-for="m in group.items" 
          :key="m.name" 
          @click="handleItemClick(m)"
          :class="[
            'px-4 py-3 rounded-2xl text-sm font-bold flex items-center gap-3 cursor-pointer transition active:scale-95', 
            activePage === m.name ? 'bg-white text-zinc-900 shadow-md' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
          ]"
        >
          <component :is="m.icon" class="w-4 h-4 shrink-0"/> 
          <span>{{ m.name }}</span>
        </li>
      </ul>
    </div>
  </div>

  <div class="shrink-0 p-6 pt-4 border-t border-zinc-800 text-[10px] text-zinc-500 font-bold">
    Sinar Pagi v1.2 FIXED
  </div>
</div>
</template>
