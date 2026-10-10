<template>
<div class="min-h-screen bg-zinc-900 overflow-hidden">
  <!-- SIDEBAR (Tambahkan will-change-transform & translate3d) -->
  <aside 
    :class="[
      'fixed top-0 left-0 h-full w-[280px] z-[60] transition-transform duration-300 ease-in-out will-change-transform', 
      isOpen ? 'translate-x-0' : '-translate-x-full'
    ]"
  >
    <SidebarComponent :groups="groups" :activePage="activePage" @select-page="handleSelect" @close="isOpen=false" />
  </aside>

  <!-- BACKDROP OVERLAY -->
  <div v-if="isOpen" @click="isOpen=false" class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"></div>

  <!-- MAIN CONTAINER (Diseimbangkan agar animasi lebih ringan) -->
  <div 
    :class="[
      'min-h-screen bg-zinc-50 flex flex-col overflow-hidden transition-transform duration-300 ease-in-out h-screen will-change-transform', 
      isOpen ? 'translate-x-[280px]' : 'translate-x-0'
    ]"
  >
    <!-- HEADER FIXED / STICKY DI ATAS -->
    <header class="shrink-0 h-[56px] w-full bg-white border-b border-zinc-100 px-4 flex justify-between items-center z-40 sticky top-0">
      <button @click="isOpen=!isOpen" class="p-2.5 bg-zinc-900 text-white rounded-xl">
        <Menu v-if="!isOpen" class="w-5 h-5"/>
        <X v-else class="w-5 h-5"/>
      </button>
      <div class="font-black text-sm">{{ activePage }}</div>
      <router-link v-if="!isKasirPage" to="/kasir" class="p-2.5 bg-zinc-900 text-white rounded-xl">
        <Store class="w-5 h-5"/>
      </router-link>
      <button v-else @click="openMember" class="p-2.5 bg-zinc-900 text-white rounded-xl">
        <Users class="w-5 h-5"/>
      </button>
    </header>

    <!-- MAIN CONTAINER -->
    <main class="flex-1 overflow-hidden flex flex-col max-w-xl mx-auto w-full relative">
      <router-view />
    </main>
  </div>
</div>
</template>



<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Menu, X, Package, Store, LayoutDashboard, Plus, Users, ShoppingCart, Tags } from 'lucide-vue-next'
import SidebarComponent from '../components/Sidebar.vue'
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
      { name: 'Kategori', icon: Tags, to: '/categories' },
      { name: 'Member', icon: Users, to: '/members' },
      { name: 'Tambah Barang', icon: Plus, to: '/add-products' }
    ]
  },
  { 
    title: 'TRANSAKSI', 
    items: [
      { name: 'Kasir', icon: Store, to: '/kasir' },
      { name: 'Belanja', icon: ShoppingCart, to: '/shopping' }
    ]
  }
])
const handleSelect = (m) => { isOpen.value=false; router.push(m.to) }
const openMember = () => window.dispatchEvent(new CustomEvent('open-member-picker'))
</script>