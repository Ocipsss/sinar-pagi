// src/composables/usePrinter.js
import { ref } from 'vue'
import { toast } from 'vue-sonner'

export function usePrinter() {
  const isPrinting = ref(false)
  const connectedDevice = ref(null)

  // GUARD: Cek Dukungan Browser & HTTPS
  const checkBluetoothSupport = () => {
    // 1. Cek Secure Context (HTTPS / Localhost)
    if (!window.isSecureContext) {
      toast.error('Web Bluetooth membutuhkan koneksi aman (HTTPS).')
      return false
    }

    // 2. Cek API Navigator Bluetooth
    if (!navigator.bluetooth) {
      toast.error('Browser ini tidak mendukung Web Bluetooth. Gunakan Google Chrome versi Desktop/Android.')
      return false
    }

    return true
  }

  const connectPrinter = async () => {
    if (!checkBluetoothSupport()) return null

    try {
      isPrinting.value = true
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', '49535343-fe7d-4ae5-8fa9-9fafd205e455']
      })

      connectedDevice.value = device
      toast.success(`Terhubung ke printer: ${device.name || 'Printer Thermal'}`)
      return device
    } catch (err) {
      if (err.name === 'NotFoundError') {
        toast.info('Pencarian printer dibatalkan.')
      } else {
        toast.error(`Gagal menghubungkan printer: ${err.message || 'Bluetooth mati atau printer tidak ditemukan'}`)
      }
      return null
    } finally {
      isPrinting.value = false
    }
  }

  const printReceipt = async (encoderBytes) => {
    if (!checkBluetoothSupport()) return false

    try {
      isPrinting.value = true

      let device = connectedDevice.value
      if (!device || !device.gatt.connected) {
        device = await connectPrinter()
      }

      if (!device) return false

      const server = await device.gatt.connect()
      
      // Cari service pencetakan thermal standar
      const services = await server.getPrimaryServices()
      if (!services || services.length === 0) {
        throw new Error('Service printer tidak ditemukan pada perangkat ini.')
      }

      let writeCharacteristic = null

      for (const service of services) {
        const characteristics = await service.getCharacteristics()
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            writeCharacteristic = char
            break
          }
        }
        if (writeCharacteristic) break
      }

      if (!writeCharacteristic) {
        throw new Error('Karakteristik Bluetooth untuk mencetak tidak ditemukan.')
      }

      // Kirim data dalam bentuk chunk (20 byte per paket) untuk stabilitas printer Bluetooth
      const chunkSize = 20
      for (let i = 0; i < encoderBytes.length; i += chunkSize) {
        const chunk = encoderBytes.slice(i, i + chunkSize)
        await writeCharacteristic.writeValue(chunk)
      }

      toast.success('Struk berhasil dikirim ke printer!')
      return true
    } catch (err) {
      console.error('Error saat mencetak via Bluetooth:', err)
      if (err.name !== 'NotFoundError') {
        toast.error(`Gagal mencetak struk: ${err.message || 'Koneksi terputus'}`)
      }
      return false
    } finally {
      isPrinting.value = false
    }
  }

  return {
    isPrinting,
    connectedDevice,
    checkBluetoothSupport,
    connectPrinter,
    printReceipt
  }
}
