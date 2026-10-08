<template>
  <div class="min-h-screen bg-[#f7f6f1] text-zinc-900">
    <!-- HEADER - Burger Kiri + Icon Kasir Kanan -->
    <header class="sticky top-0 z-20 flex h-14 items-center justify-between bg-white px-4 shadow-sm">
      <button @click="drawer=true" class="p-2 -ml-2 text-xl">☰</button>
      <h1 class="font-bold truncate">{{ $route.meta.title || 'Sinar Pagi' }}</h1>
      <router-link to="/kasir" class="h-9 w-9 grid place-items-center rounded-xl bg-zinc-900 text-white">🧾</router-link>
    </header>

    <!-- DRAWER MENU -->
    <div v-if="drawer" class="fixed inset-0 z-30">
      <div class="absolute inset-0 bg-black/40" @click="drawer=false"></div>
      <aside class="absolute left-0 top-0 h-full w-[80%] max-w-[300px] bg-white p-4">
        <div class="mb-6 font-black text-lg">SINAR PAGI</div>
        <nav class="space-y-1">
          <router-link 
            v-for="m in menus" :key="m.to" :to="m.to" 
            @click="drawer=false"
            class="block rounded-xl px-3 py-3 text-sm font-medium"
            :class="$route.path===m.to? 'bg-zinc-900 text-white' : 'hover:bg-zinc-100'"
          >
            {{ m.icon }} {{ m.label }}
          </router-link>
        </nav>
      </aside>
    </div>

    <!-- CONTENT -->
    <main class="p-4">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const drawer = ref(false)
const menus = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/kasir', label: 'Kasir', icon: '🧾' },
  { to: '/products', label: 'Produk', icon: '📦' },
  { to: '/shopping', label: 'List Belanja', icon: '🛒' },
  { to: '/members', label: 'Member & Utang', icon: '👥' },
  { to: '/products-digital', label: 'Produk Digital', icon: '💳' },
  { to: '/expenses', label: 'Pengeluaran', icon: '💸' },
  { to: '/reports', label: 'Laporan', icon: '📈' },
  { to: '/settings', label: 'Pengaturan', icon: '⚙️' },
]
</script>