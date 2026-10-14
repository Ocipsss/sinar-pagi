<template>
  <router-view />
  <Toaster position="top-center" richColors />
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { Toaster, toast } from 'vue-sonner'

let lastBackPressTime = 0

function handleBackButton() {
  const currentTime = new Date().getTime()
  
  // Jika tombol back dipencet lagi dalam jeda kurang dari 2 detik (2000 ms)
  if (currentTime - lastBackPressTime < 2000) {
    // Coba tutup aplikasi PWA
    window.close()
    
    // Jika browser memblokir window.close(), arahkan ke halaman blank/awal
    setTimeout(() => {
      window.location.href = 'about:blank'
    }, 100)
  } else {
    lastBackPressTime = currentTime
    
    // Tampilkan notifikasi toast menggunakan vue-sonner yang sudah ada
    toast.info('Tekan sekali lagi untuk keluar')
    
    // Dorong history state baru agar aplikasi tidak langsung kembali ke halaman sebelumnya
    history.pushState(null, null, location.href)
  }
}

onMounted(() => {
  // Kunci navigasi history agar tombol back HP dapat ditangkap
  history.pushState(null, null, location.href)
  window.addEventListener('popstate', handleBackButton)
})

onUnmounted(() => {
  window.removeEventListener('popstate', handleBackButton)
})
</script>
