import { ref } from 'vue'
import { Html5Qrcode } from 'html5-qrcode'

export function useProductScanner() {
  const isScanning = ref(false)
  let qr = null

  const start = async (onDetected) => {
    isScanning.value = true
    qr = new Html5Qrcode("reader")
    await qr.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 },
      (decoded) => { onDetected(decoded); stop() }, null)
  }
  const stop = async () => { try{ await qr?.stop() }catch{} isScanning.value=false }

  return { isScanning, start, stop }
}