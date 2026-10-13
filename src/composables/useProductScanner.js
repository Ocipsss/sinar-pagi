import { ref, onUnmounted } from 'vue'
import { Html5Qrcode } from 'html5-qrcode'

export function useProductScanner() {
  const isScanning = ref(false)
  let qr = null

  const start = async (onDetected) => {
    if (isScanning.value) {
      await stop()
      return
    }

    try {
      isScanning.value = true
      qr = new Html5Qrcode("reader")
      await qr.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        (decoded) => {
          onDetected(decoded)
          stop()
        },
        null
      )
    } catch (err) {
      console.error("Gagal membuka kamera:", err)
      isScanning.value = false
      throw new Error("Kamera tidak dapat diakses atau tidak ditemukan.")
    }
  }

  const stop = async () => {
    if (qr && isScanning.value) {
      try {
        await qr.stop()
        qr.clear()
      } catch (e) {
        console.warn("Gagal menghentikan scanner:", e)
      } finally {
        isScanning.value = false
        qr = null
      }
    }
  }

  // Bersihkan kamera otomatis saat komponen ditutup
  onUnmounted(() => {
    stop()
  })

  return { isScanning, start, stop }
}
