<template>
  <div class="min-h-screen bg-[#f7f6f1] text-zinc-900 overflow-x-hidden relative">

    <!-- DRAWER MENU - FIX z-50 biar di atas -->
    <aside
      class="fixed left-0 top-0 h-full w-[75%] max-w-[280px] bg-white p-5 border-r border-zinc-200 z-[50] flex flex-col justify-between transition-opacity duration-300"
      :class="drawer? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'"
    >
      <div>
        <div class="flex items-center justify-between mb-6 pb-3 border-b border-zinc-100">
          <div class="font-black text-lg tracking-tight text-zinc-900">SINAR PAGI</div>
          <button @click="drawer = false" class="p-1 text-zinc-400 hover:text-zinc-900 text-sm">✕</button>
        </div>

        <nav class="space-y-1">
          <router-link
            v-for="m in menus"
            :key="m.to"
            :to="m.to"
            @click="drawer = false"
            class="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors"
            :class="isActive(m.to)? 'bg-zinc-900 text-white font-bold' : 'text-zinc-600 hover:bg-zinc-100'"
          >
            <span class="text-base">{{ m.icon }}</span>
            <span>{{ m.label }}</span>
          </router-link>
        </nav>
      </div>

      <div class="text-[11px] text-zinc-400 text-center font-medium">
        Sinar Pagi POS v1.0
      </div>
    </aside>

    <!-- OVERLAY - FIX z-[40] di bawah drawer di atas main -->
    <div
      v-if="drawer"
      @click="drawer = false"
      class="fixed inset-0 z-[40] bg-black/20 transition-opacity duration-300"
    ></div>

    <!-- MAIN CARD - FIX hapus pointer-events-none biar gak ngunci semua -->
    <div
      class="min-h-screen bg-[#f7f6f1] transition-transform duration-300 ease-in-out relative z-10 shadow-2xl"
      :class="drawer? 'translate-x-[75%] sm:translate-x-[280px] rounded-2xl overflow-hidden' : 'translate-x-0'"
    >
      <header class="sticky top-0 z-20 flex h-14 items-center justify-between bg-white px-4 shadow-sm border-b border-zinc-100">
        <button
          @click="drawer =!drawer"
          class="p-2 -ml-2 text-xl text-zinc-800 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
        >
          ☰
        </button>
        <h1 class="font-bold text-sm tracking-tight truncate text-zinc-900">
          {{ $route.meta.title || 'Sinar Pagi' }}
        </h1>
        <router-link to="/kasir" class="h-9 w-9 grid place-items-center rounded-xl bg-zinc-900 text-white text-sm shadow-sm active:scale-95 transition-all">
          🧾
        </router-link>
      </header>

      <main class="p-4 sm:p-6">
        <router-view />
      </main>
    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'

const drawer = ref(false)
const route = useRoute()

const menus = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/kasir', label: 'Kasir', icon: '🧾' },
  { to: '/products', label: 'Produk', icon: '📦' },
  { to: '/add-products', label: 'Tambah Produk', icon: '➕' },
  { to: '/products-digital', label: 'Produk Digital', icon: '💳' },
  { to: '/shopping', label: 'List Belanja', icon: '🛒' },
  { to: '/members', label: 'Member & Utang', icon: '👥' },
  { to: '/expenses', label: 'Pengeluaran', icon: '💸' },
  { to: '/operators', label: 'Operator / Kasir', icon: '👤' },
  { to: '/reports', label: 'Laporan', icon: '📈' },
  { to: '/settings', label: 'Pengaturan', icon: '⚙️' }
]

const isActive = (pathToMatch) => {
  return route.path === pathToMatch
}
</script>