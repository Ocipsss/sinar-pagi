<template>
<div class="min-h-screen bg-zinc-50">
  <header class="sticky top-0 bg-white border-b px-4 py-3 flex justify-between items-center">
    <div class="font-black tracking-tight">SINAR PAGI</div>
    <router-link to="/add-products" class="bg-zinc-900 text-white px-3 py-1.5 rounded-xl text-xs font-bold">+ Barang</router-link>
  </header>
  <main class="max-w-xl mx-auto">
    <router-view />
  </main>
  <nav class="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-2 pb-6 max-w-xl mx-auto">
    <router-link to="/products" class="text-xs font-bold px-4 py-2 rounded-xl" active-class="bg-zinc-900 text-white">Barang</router-link>
    <router-link to="/kasir" class="text-xs font-bold px-4 py-2 rounded-xl text-zinc-400">Kasir</router-link>
    <router-link to="/shopping" class="text-xs font-bold px-4 py-2 rounded-xl text-zinc-400">Belanja</router-link>
  </nav>
</div>
</template>