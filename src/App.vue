<template>
  <router-view />
  <Toaster position="top-center" richColors />
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { Toaster, toast } from 'vue-sonner'
import { backupService } from './services/backupService.js'

let lastBackPressTime = 0
let autoBackupInterval = null

// Fungsi Auto Backup File JSON Tiap 1 Jam
const initAutoBackup = () => {
  const ONE_HOUR = 60 * 60 * 1000 // 3.600.000 ms (1 jam)

  autoBackupInterval = setInterval(async () => {
    try {
      await backupService.exportBackup()
      toast.success('Auto-backup (1 jam) berhasil diunduh!')
    } catch (err) {
      console.error('[AutoBackup] Gagal mengunduh file backup:', err)
    }
  }, ONE_HOUR)
}

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

  // Jalankan Auto Backup 1 Jam
  initAutoBackup()
})

onUnmounted(() => {
  window.removeEventListener('popstate', handleBackButton)

  // Hapus timer interval saat komponen dilepas agar tidak bocor di memory
  if (autoBackupInterval) {
    clearInterval(autoBackupInterval)
    autoBackupInterval = null
  }
})
</script>
