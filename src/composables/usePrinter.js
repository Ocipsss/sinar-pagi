// src/composables/usePrinter.js
import { ref } from 'vue'
import { toast } from 'vue-sonner'

const isConnected = ref(false)
const isConnecting = ref(false)
const printerDevice = ref(null)
const printerCharacteristic = ref(null)

export function usePrinter() {
  const onDisconnected = () => {
    isConnected.value = false
    printerDevice.value = null
    printerCharacteristic.value = null
  }

  const connectPrinter = async () => {
    if (!navigator.bluetooth) {
      toast.error('Browser ini tidak mendukung Web Bluetooth')
      return null
    }

    try {
      isConnecting.value = true

      let device = printerDevice.value

      // Cek perangkat yang sudah diizinkan sebelumnya
      if (!device && navigator.bluetooth.getDevices) {
        const devices = await navigator.bluetooth.getDevices()
        if (devices.length > 0) {
          device = devices[0]
        }
      }

      // Jika belum ada, minta pilih perangkat Bluetooth
      if (!device) {
        device = await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: [
            '000018f0-0000-1000-8000-00805f9b34fb',
            '0000ff00-0000-1000-8000-00805f9b34fb',
            '0000af00-0000-1000-8000-00805f9b34fb',
            '49535343-fe7d-41aa-a322-3d7a4a2d2bd0',
            'e7810a71-73ae-4d9d-8c54-be98300d1107'
          ]
        })
      }

      printerDevice.value = device
      device.removeEventListener('gattserverdisconnected', onDisconnected)
      device.addEventListener('gattserverdisconnected', onDisconnected)

      const server = device.gatt.connected ? device.gatt : await device.gatt.connect()
      const services = await server.getPrimaryServices().catch(() => [])
      let targetChar = null

      // Cari characteristic yang mendukung WRITE atau WRITE_WITHOUT_RESPONSE
      for (const service of services) {
        const characteristics = await service.getCharacteristics().catch(() => [])
        for (const char of characteristics) {
          if (char?.properties?.write || char?.properties?.writeWithoutResponse) {
            targetChar = char
            break
          }
        }
        if (targetChar) break
      }

      if (!targetChar) {
        throw new Error('Karakteristik cetak printer thermal tidak ditemukan.')
      }

      printerCharacteristic.value = targetChar
      isConnected.value = true
      toast.success(`Terhubung ke printer: ${device.name || 'Printer Thermal'}`)
      return targetChar
    } catch (err) {
      onDisconnected()
      if (err.name !== 'NotFoundError') {
        console.error('Gagal terhubung ke printer:', err)
        toast.error(err.message || 'Gagal menghubungkan printer Bluetooth')
      }
      return null
    } finally {
      isConnecting.value = false
    }
  }

  const disconnectPrinter = () => {
    if (printerDevice.value && printerDevice.value.gatt?.connected) {
      printerDevice.value.gatt.disconnect()
    }
    onDisconnected()
    toast.info('Koneksi printer diputuskan')
  }

  const toggleConnection = () => {
    if (isConnected.value) {
      disconnectPrinter()
    } else {
      connectPrinter()
    }
  }

  return {
    isConnected,
    isConnecting,
    printerDevice,
    printerCharacteristic,
    connectPrinter,
    disconnectPrinter,
    toggleConnection
  }
}
