<template>
<div class="min-h-screen bg-zinc-900 overflow-hidden">
  <!-- SIDEBAR -->
  <aside 
    :class="[
      'fixed top-0 left-0 h-full w-[280px] z-[60] transition-transform duration-300 ease-in-out will-change-transform', 
      isOpen ? 'translate-x-0' : '-translate-x-full'
    ]"
  >
    <SidebarComponent 
      :groups="groups" 
      :activePage="activePage" 
      @select-page="handleSelect" 
      @close="isOpen = false" 
    />
  </aside>

  <!-- BACKDROP OVERLAY -->
  <div v-if="isOpen" @click="isOpen = false" class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"></div>

  <!-- MAIN CONTAINER -->
  <div 
    :class="[
      'min-h-screen bg-zinc-50 flex flex-col overflow-hidden transition-transform duration-300 ease-in-out h-screen will-change-transform', 
      isOpen ? 'translate-x-[280px]' : 'translate-x-0'
    ]"
  >
    <!-- HEADER STICKY -->
    <header class="shrink-0 h-[56px] w-full bg-white border-b border-zinc-100 px-4 flex justify-between items-center z-40 sticky top-0">
      <div class="flex items-center gap-3">
        <button @click="isOpen = !isOpen" class="p-2.5 bg-zinc-900 text-white rounded-xl active:scale-95 transition">
          <Menu v-if="!isOpen" class="w-5 h-5"/>
          <X v-else class="w-5 h-5"/>
        </button>

        <div class="font-black text-sm text-zinc-900">{{ activePage }}</div>
      </div>

      <!-- INDIKATOR SYNC REALTIME -->
      <div class="flex items-center gap-2">
        <button 
          @click="manualSync" 
          :title="syncStatus.isOnline ? (syncStatus.isSyncing ? 'Sedang Sinkronisasi...' : 'Klik untuk sinkronisasi manual') : 'Mode Offline'"
          :class="[
            'px-2.5 py-1.5 rounded-full text-[10px] font-black flex items-center gap-1.5 border transition active:scale-95',
            !syncStatus.isOnline ? 'bg-zinc-100 text-zinc-500 border-zinc-200' :
            syncStatus.isSyncing ? 'bg-amber-50 text-amber-700 border-amber-200' :
            syncStatus.unsyncedCount > 0 ? 'bg-red-50 text-red-600 border-red-200' :
            'bg-emerald-50 text-emerald-700 border-emerald-200'
          ]"
        >
          <RefreshCw :class="['w-3 h-3', syncStatus.isSyncing && 'animate-spin']" />
          
          <span class="hidden sm:inline">
            <template v-if="!syncStatus.isOnline">Offline</template>
            <template v-else-if="syncStatus.isSyncing">Syncing...</template>
            <template v-else-if="syncStatus.unsyncedCount > 0">{{ syncStatus.unsyncedCount }} belum sync</template>
            <template v-else>Synced {{ syncStatus.lastSyncedAt || '' }}</template>
          </span>

          <!-- Indikator Dot untuk Layar HP -->
          <span 
            :class="[
              'w-2 h-2 rounded-full sm:hidden',
              !syncStatus.isOnline ? 'bg-zinc-400' :
              syncStatus.isSyncing ? 'bg-amber-500 animate-pulse' :
              syncStatus.unsyncedCount > 0 ? 'bg-red-500' : 'bg-emerald-500'
            ]"
          ></span>
        </button>

        <router-link v-if="!isKasirPage" to="/kasir" class="p-2.5 bg-zinc-900 text-white rounded-xl active:scale-95 transition">
          <Store class="w-5 h-5"/>
        </router-link>
        <button v-else @click="openMember" class="p-2.5 bg-zinc-900 text-white rounded-xl active:scale-95 transition">
          <Users class="w-5 h-5"/>
        </button>
      </div>
    </header>

    <!-- MAIN ROUTER VIEW -->
<main class="flex-1 overflow-hidden flex flex-col max-w-full md:max-w-4xl lg:max-w-6xl mx-auto w-full relative transition-all">
  <router-view v-slot="{ Component }">
    <keep-alive>
      <component :is="Component" :key="$route.fullPath" />
    </keep-alive>
  </router-view>
</main>

  </div>
</div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { 
  Menu, X, Package, Store, LayoutDashboard, Plus, 
  Users, ShoppingCart, Tags, History, Coffee, Smartphone, Wallet, RefreshCw, BarChart3, Settings 
} from 'lucide-vue-next'
import SidebarComponent from '../components/Sidebar.vue'
import { syncStatus, syncRealtime } from '../services/syncService.js'

const isOpen = ref(false)
const route = useRoute()
const router = useRouter()

const activePage = computed(() => route.meta.title || 'Barang')
const isKasirPage = computed(() => route.path.startsWith('/kasir'))

const groups = ref([
  { 
    title: 'MASTER DATA', 
    items: [
      { name: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
      { name: 'Barang', icon: Package, to: '/products' },
      { name: 'Kategori & Satuan', icon: Tags, to: '/categories' },
      { name: 'Atur Rokok & Seduh', icon: Coffee, to: '/settings-menu' },
      { name: 'Member', icon: Users, to: '/members' },
      { name: 'Tambah Barang', icon: Plus, to: '/add-products' },
      { name: 'Operator / Kasir', icon: Users, to: '/operators' },
    ]
  },
  { 
    title: 'TRANSAKSI', 
    items: [
      { name: 'Kasir', icon: Store, to: '/kasir' },
      { name: 'Produk Digital', icon: Smartphone, to: '/digital' },
      { name: 'Riwayat Penjualan', icon: History, to: '/sales-history' },
      { name: 'Belanja Kulakan', icon: ShoppingCart, to: '/shopping' }
    ]
  },
  { 
    title: 'KEUANGAN', 
    items: [
      { name: 'Kas & Keuangan', icon: Wallet, to: '/finance' },
      { name: 'Laporan & Rekap', icon: BarChart3, to: '/reports' }
    ]
  },
  { 
    title: 'PENGATURAN', 
    items: [
      { name: 'Pengaturan Toko', icon: Settings, to: '/settings' }
    ]
  }
])


const handleSelect = (m) => {
  isOpen.value = false
  if (m.to) {
    router.push(m.to)
  }
}

const manualSync = () => {
  if (syncStatus.isOnline) {
    syncRealtime.pushLocalToCloud()
  }
}

const openMember = () => window.dispatchEvent(new CustomEvent('open-member-picker'))
</script>
