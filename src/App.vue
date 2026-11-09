<template>
  <router-view />
  <Toaster position="top-center" richColors />
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { Toaster, toast } from 'vue-sonner'

let lastBackPressTime = 0
let backHandlerAttached = false

// ✅ FIX (3.20): window.close() tidak bekerja di PWA/tab biasa.
// Ganti jadi history.back() — biarkan browser/PWA yang handle keluar.
// Kalau tidak bisa back lagi (sudah di halaman awal), cukup tampilkan toast.
function handleBackButton() {
  const currentTime = Date.now()
  const withinDoublePress = (currentTime - lastBackPressTime) < 2000

  if (withinDoublePress) {
    // Tekan kedua dalam 2 detik → keluar dengan cara yang didukung browser
    try {
      // Coba tutup window (kalau memang dibuka via window.open / PWA standalone)
      // Kalau tidak bisa, biarkan browser yang memutuskan lewat history.back()
      if (window.history.length > 1) {
        window.history.back()
      } else {
        // Sudah di halaman awal — tidak ada yang bisa di-back
        // Di PWA standalone, back dari halaman awal = keluar app (native behavior)
        // Di tab biasa, ini tidak bisa dipaksa dari JS, jadi cukup info
        window.history.back()
      }
    } catch {
      // Fallback terakhir: kalau history.back() gagal total, biarkan saja
      // (jangan paksa about:blank seperti versi lama)
    }
  } else {
    lastBackPressTime = currentTime
    toast.info('Tekan sekali lagi untuk keluar')
    // Push state dummy agar back berikutnya tetap memicu popstate
    try {
      history.pushState({ ...history.state }, '', location.href)
    } catch {
      // Kalau pushState gagal (misal di iframe atau context aneh), abaikan
    }
  }
}

function attachListener() {
  if (backHandlerAttached) return
  // Pastikan ada state supaya back pertama memicu popstate
  try {
    history.pushState({ ...history.state }, '', location.href)
  } catch {}
  window.addEventListener('popstate', handleBackButton)
  backHandlerAttached = true
}

function detachListener() {
  if (!backHandlerAttached) return
  window.removeEventListener('popstate', handleBackButton)
  backHandlerAttached = false
}

onMounted(() => {
  attachListener()
})

onUnmounted(() => {
  detachListener()
})
</script>