<script setup>
import { X, LogOut } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useOperatorStore } from '../stores/operatorStore.js'

const props = defineProps({ groups: Array, activePage: String })
const emit = defineEmits(['select-page', 'close'])

const router = useRouter()
const operatorStore = useOperatorStore()

const handleItemClick = (item) => {
  emit('select-page', item)
  if (item.to) {
    router.push(item.to)
  }
}

const handleLogout = () => {
  if (confirm('Akhiri shift & keluar dari akun operator ini?')) {
    operatorStore.logout()
    router.push('/login')
  }
}
</script>

<template>
<div class="h-full bg-zinc-900 text-white flex flex-col overflow-hidden">
  <!-- Header App & Operator Active -->
  <div class="p-6 pb-4 shrink-0 space-y-3">
    <div class="flex justify-between items-center">
      <span class="font-black text-lg tracking-tight">SINAR PAGI</span>
      <button @click="$emit('close')" class="p-2 bg-zinc-800 rounded-xl active:scale-95 transition">
        <X class="w-4 h-4"/>
      </button>
    </div>

    <!-- Info Operator Aktif & Tombol Switch Shift -->
    <div class="bg-zinc-800/80 p-3 rounded-2xl border border-zinc-700/50 flex items-center justify-between">
      <div class="min-w-0 flex-1 pr-2">
        <div class="text-[9px] font-black text-zinc-400 uppercase tracking-wider">Shift Aktif</div>
        <div class="font-bold text-xs text-white truncate">{{ operatorStore.operatorName }}</div>
      </div>
      <button 
        @click="handleLogout" 
        title="Ganti Operator / Keluar Shift"
        class="px-2.5 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl font-bold text-[10px] flex items-center gap-1 active:scale-95 transition shrink-0"
      >
        <LogOut class="w-3 h-3" /> Shift
      </button>
    </div>
  </div>

  <!-- Area Menu Scroll -->
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
