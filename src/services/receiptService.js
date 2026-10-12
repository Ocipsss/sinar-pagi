import { jsPDF } from 'jspdf'
import EscPosEncoder from 'esc-pos-encoder'
import { settingsRepo } from '../db/repositories/settingsRepository.js'
import dayjs from 'dayjs'

export const receiptService = {
  // 1. Cetak Struk via Bluetooth Thermal Printer
  async printThermal(transaction) {
    if (!navigator.bluetooth) {
      throw new Error('Browser ini belum mendukung Web Bluetooth. Gunakan Chrome di Android/Desktop.')
    }

    const settings = await settingsRepo.getSettings()
    const is58mm = settings.printerPaperSize !== '80mm'
    const encoder = new EscPosEncoder()

    // Format Perataan Kolom Text Thermal
    const width = is58mm ? 32 : 48
    const line = '-'.repeat(width)

    let encoded = encoder.initialize()
      .align('center')
      .bold(true)
      .line(settings.storeName || 'SINAR PAGI')
      .bold(false)
      .line(settings.storeAddress || '')
      .line(settings.storePhone ? `Telp: ${settings.storePhone}` : '')
      .line(line)
      .align('left')
      .line(`No. Nota : #${transaction.id.slice(0, 8)}`)
      .line(`Tanggal  : ${dayjs(transaction.date).format('DD/MM/YY HH:mm')}`)
      .line(`Kasir    : ${transaction.operatorName || 'Admin'}`)
      .line(`Pelanggan: ${transaction.memberName || 'Umum'}`)
      .line(line)

    // Daftar Item
    transaction.items.forEach(item => {
      const name = item.name || item.productName || 'Barang'
      const qtyPrice = `${item.qty} x ${item.price.toLocaleString('id-ID')}`
      const subtotal = (item.subtotal || item.price * item.qty).toLocaleString('id-ID')
      
      encoded = encoded.line(name)
      
      // Spacing kanan kiri
      const spaceCount = Math.max(1, width - qtyPrice.length - subtotal.length)
      encoded = encoded.line(`${qtyPrice}${' '.repeat(spaceCount)}${subtotal}`)
    })

    encoded = encoded.line(line)
      .align('right')
      .bold(true)
      .line(`TOTAL     : Rp ${transaction.total.toLocaleString('id-ID')}`)
      .bold(false)

    if (transaction.paymentMethod === 'CASH') {
      const bayar = transaction.amountPaid || transaction.paidAmount || transaction.total
      const kembali = Math.max(0, bayar - transaction.total)
      encoded = encoded
        .line(`BAYAR (TUNAI): Rp ${bayar.toLocaleString('id-ID')}`)
        .line(`KEMBALI      : Rp ${kembali.toLocaleString('id-ID')}`)
    } else {
      encoded = encoded.line(`METODE BAYAR : ${transaction.paymentMethod}`)
    }

    encoded = encoded
      .line(line)
      .align('center')
      .line(settings.receiptFooter || 'Terima kasih telah berbelanja!')
      .line('\n\n')
      .cut()
      .encode()

    // Koneksi Web Bluetooth GATT
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        '000018f0-0000-1000-8000-00805f9b34fb', // Standard Printer Service
        '0000ff00-0000-1000-8000-00805f9b34fb',
        '49535343-fe7d-41aa-a322-3d7a4a2d2bd0'  // Custom SPP
      ]
    })

    const server = await device.gatt.connect()
    const services = await server.getPrimaryServices()
    
    let targetCharacteristic = null
    for (const service of services) {
      const characteristics = await service.getCharacteristics()
      for (const char of characteristics) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          targetCharacteristic = char
          break
        }
      }
      if (targetCharacteristic) break
    }

    if (!targetCharacteristic) {
      throw new Error('Karakteristik printer thermal tidak ditemukan pada perangkat Bluetooth ini.')
    }

    // Kirim data bergulir per-chunk 512 byte
    const chunkSize = 512
    for (let i = 0; i < encoded.length; i += chunkSize) {
      const chunk = encoded.slice(i, i + chunkSize)
      await targetCharacteristic.writeValue(chunk)
    }

    await device.gatt.disconnect()
  },

  // 2. Unduh Nota dalam Bentuk File PDF
  async downloadPdf(transaction) {
    const settings = await settingsRepo.getSettings()
    const is58mm = settings.printerPaperSize !== '80mm'
    
    const paperWidth = is58mm ? 58 : 80
    // Estimasi tinggi dinamis sesuai jumlah item
    const estimatedHeight = 90 + (transaction.items.length * 12)

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [paperWidth, estimatedHeight]
    })

    let y = 7
    doc.setFont('courier', 'bold')
    doc.setFontSize(11)
    doc.text(settings.storeName || 'SINAR PAGI', paperWidth / 2, y, { align: 'center' })

    doc.setFont('courier', 'normal')
    doc.setFontSize(8)
    if (settings.storeAddress) {
      y += 4
      doc.text(settings.storeAddress, paperWidth / 2, y, { align: 'center' })
    }
    if (settings.storePhone) {
      y += 3.5
      doc.text(`Telp: ${settings.storePhone}`, paperWidth / 2, y, { align: 'center' })
    }

    y += 4
    doc.text('-'.repeat(is58mm ? 32 : 45), paperWidth / 2, y, { align: 'center' })

    y += 4
    doc.text(`Nota : #${transaction.id.slice(0, 8)}`, 4, y)
    y += 3.5
    doc.text(`Tgl  : ${dayjs(transaction.date).format('DD/MM/YY HH:mm')}`, 4, y)
    y += 3.5
    doc.text(`Kasir: ${transaction.operatorName || 'Admin'}`, 4, y)

    y += 4
    doc.text('-'.repeat(is58mm ? 32 : 45), paperWidth / 2, y, { align: 'center' })

    transaction.items.forEach(item => {
      y += 4
      const name = item.name || item.productName || 'Barang'
      doc.text(name, 4, y)
      
      y += 3.5
      const qtyPrice = `${item.qty} x ${item.price.toLocaleString('id-ID')}`
      const subtotal = (item.subtotal || item.price * item.qty).toLocaleString('id-ID')
      doc.text(qtyPrice, 4, y)
      doc.text(subtotal, paperWidth - 4, y, { align: 'right' })
    })

    y += 4
    doc.text('-'.repeat(is58mm ? 32 : 45), paperWidth / 2, y, { align: 'center' })

    y += 4
    doc.setFont('courier', 'bold')
    doc.text('TOTAL :', 4, y)
    doc.text(`Rp ${transaction.total.toLocaleString('id-ID')}`, paperWidth - 4, y, { align: 'right' })

    if (transaction.paymentMethod === 'CASH') {
      const bayar = transaction.amountPaid || transaction.paidAmount || transaction.total
      const kembali = Math.max(0, bayar - transaction.total)
      
      y += 3.5
      doc.setFont('courier', 'normal')
      doc.text('BAYAR :', 4, y)
      doc.text(`Rp ${bayar.toLocaleString('id-ID')}`, paperWidth - 4, y, { align: 'right' })
      
      y += 3.5
      doc.text('KEMBALI :', 4, y)
      doc.text(`Rp ${kembali.toLocaleString('id-ID')}`, paperWidth - 4, y, { align: 'right' })
    }

    y += 6
    doc.setFont('courier', 'normal')
    doc.setFontSize(7)
    doc.text(settings.receiptFooter || 'Terima kasih telah berbelanja!', paperWidth / 2, y, { align: 'center' })

    doc.save(`Nota_${transaction.id.slice(0, 8)}_${dayjs().format('YYYYMMDD_HHmm')}.pdf`)
  }
}
