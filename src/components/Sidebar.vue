<script setup>
import { X } from 'lucide-vue-next'
defineProps({ groups: Array, activePage: String })
defineEmits(['select-page','close'])
</script>

<template>
<div class="h-full bg-zinc-900 text-white flex flex-col p-6">
  <div class="flex justify-between items-center mb-8">
    <span class="font-black text-lg tracking-tight">SINAR PAGI</span>
    <button @click="$emit('close')" class="p-2 bg-zinc-800 rounded-xl"><X class="w-4 h-4"/></button>
  </div>

  <div v-for="group in groups" :key="group.title" class="mb-6">
    <div class="text-[10px] font-black tracking-widest text-zinc-500 uppercase mb-3">{{ group.title }}</div>
    <ul class="flex flex-col gap-1">
      <li v-for="m in group.items" :key="m.name" @click="$emit('select-page', m)"
        :class="['px-4 py-3 rounded-2xl text-sm font-bold flex items-center gap-3 cursor-pointer transition', activePage===m.name? 'bg-white text-zinc-900' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white']">
        <component :is="m.icon" class="w-4 h-4"/> <span>{{ m.name }}</span>
      </li>
    </ul>
  </div>
  <div class="mt-auto pt-6 border-t border-zinc-800 text-[10px] text-zinc-500 font-bold">Sesi v1.1</div>
</div>
</template>