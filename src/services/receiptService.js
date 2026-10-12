import { jsPDF } from 'jspdf'
import EscPosEncoder from 'esc-pos-encoder'
import { settingsRepo } from '../db/repositories/settingsRepository.js'
import dayjs from 'dayjs'

// Cache koneksi printer agar tidak perlu reconnect tiap cetak
let cachedDevice = null
let cachedCharacteristic = null

async function getPrinterCharacteristic() {
  if (cachedDevice && cachedDevice.gatt?.connected && cachedCharacteristic) {
    return cachedCharacteristic
  }

  let device = cachedDevice

  if (!device && navigator.bluetooth?.getDevices) {
    const devices = await navigator.bluetooth.getDevices()
    if (devices.length > 0) {
      device = devices[0]
    }
  }

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

  cachedDevice = device

  device.addEventListener('gattserverdisconnected', () => {
    cachedCharacteristic = null
  })

  const server = device.gatt.connected ? device.gatt : await device.gatt.connect()
  const services = await server.getPrimaryServices().catch(() => [])
  let targetChar = null

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
    throw new Error('Karakteristik printer thermal tidak ditemukan.')
  }

  cachedCharacteristic = targetChar
  return targetChar
}

// Helper untuk format 2 kolom rata kiri & kanan presisi
function formatTwoColumn(left, right, width) {
  const leftStr = String(left || '')
  const rightStr = String(right || '')
  const spaceAvailable = width - leftStr.length - rightStr.length

  if (spaceAvailable > 0) {
    return leftStr + ' '.repeat(spaceAvailable) + rightStr
  }

  const maxLeftLen = Math.max(1, width - rightStr.length - 1)
  const truncatedLeft = leftStr.substring(0, maxLeftLen)
  return truncatedLeft + ' ' + rightStr
}

export const receiptService = {
  // 1. Cetak Struk via Bluetooth Thermal Printer
  async printThermal(transaction) {
    if (!navigator.bluetooth) {
      throw new Error('Browser ini belum mendukung Web Bluetooth. Gunakan Chrome di Android.')
    }

    const settings = await settingsRepo.getSettings()
    const is58mm = settings.printerPaperSize !== '80mm'
    
    const EncoderClass = typeof EscPosEncoder === 'function' ? EscPosEncoder : (EscPosEncoder.default || EscPosEncoder)
    const encoder = new EncoderClass()

    const width = is58mm ? 32 : 48
    const line = '-'.repeat(width)

    let encoded = encoder.initialize()
      .align('center')
      .bold(true)
      .line(settings.storeName || 'SINAR PAGI')
      .bold(false)

    if (settings.storeAddress) {
      encoded = encoded.line(settings.storeAddress)
    }
    if (settings.storePhone) {
      encoded = encoded.line(`Telp: ${settings.storePhone}`)
    }

    encoded = encoded
      .line(line)
      .align('left')
      .line(formatTwoColumn('No. Nota', `#${transaction.id.slice(0, 8)}`, width))
      .line(formatTwoColumn('Tanggal', dayjs(transaction.date).format('DD/MM/YY HH:mm'), width))
      .line(formatTwoColumn('Kasir', transaction.operatorName || 'Admin', width))
      .line(formatTwoColumn('Pelanggan', transaction.memberName || 'Umum', width))
      .line(line)

    // Rincian Items
    transaction.items.forEach(item => {
      const name = item.name || item.productName || 'Barang'
      const qtyPrice = `${item.qty} x ${item.price.toLocaleString('id-ID')}`
      const subtotal = (item.subtotal || item.price * item.qty).toLocaleString('id-ID')
      
      encoded = encoded.line(name)
      encoded = encoded.line(formatTwoColumn(`  ${qtyPrice}`, subtotal, width))
    })

    // Block Total & Pembayaran
    encoded = encoded
      .line(line)
      .bold(true)
      .line(formatTwoColumn('TOTAL', `Rp ${transaction.total.toLocaleString('id-ID')}`, width))
      .bold(false)

    if (transaction.paymentMethod === 'CASH') {
      const bayar = transaction.amountPaid || transaction.paidAmount || transaction.total
      const kembali = Math.max(0, bayar - transaction.total)
      encoded = encoded
        .line(formatTwoColumn('TUNAI', `Rp ${bayar.toLocaleString('id-ID')}`, width))
        .line(formatTwoColumn('KEMBALI', `Rp ${kembali.toLocaleString('id-ID')}`, width))
    } else {
      encoded = encoded.line(formatTwoColumn('METODE', transaction.paymentMethod, width))
    }

    // Footer Nota
    encoded = encoded
      .line(line)
      .align('center')

    const footerText = settings.receiptFooter || 'Terima kasih telah berbelanja!'
    footerText.split('\n').forEach(fLine => {
      if (fLine.trim()) encoded = encoded.line(fLine.trim())
    })

    encoded = encoded
      .line('\n\n\n')
      .cut()
      .encode()

    const characteristic = await getPrinterCharacteristic()

    const chunkSize = 512
    for (let i = 0; i < encoded.length; i += chunkSize) {
      const chunk = encoded.slice(i, i + chunkSize)
      await characteristic.writeValue(chunk)
    }
  },

  // 2. Unduh Nota PDF
  async downloadPdf(transaction) {
    const settings = await settingsRepo.getSettings()
    const is58mm = settings.printerPaperSize !== '80mm'
    
    const paperWidth = is58mm ? 58 : 80
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
