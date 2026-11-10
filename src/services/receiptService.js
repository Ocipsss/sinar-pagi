// src/services/receiptService.js
import { jsPDF } from 'jspdf'
import EscPosEncoder from 'esc-pos-encoder'
import { settingsRepo } from '../db/repositories/settingsRepository.js'
import { usePrinter } from '../composables/usePrinter.js'
import dayjs from 'dayjs'

// Helper fungsi untuk menghitung spasi rata tengah secara presisi (32 / 48 karakter)
const centerText = (str = '', width = 32) => {
  const text = String(str).trim()
  if (!text) return ''
  if (text.length >= width) return text.slice(0, width)
  const leftPadding = Math.floor((width - text.length) / 2)
  return ' '.repeat(leftPadding) + text
}

// Format 2 kolom (Kiri rata kiri, Kanan rata kanan)
const formatTwoColumns = (leftStr, rightStr, width = 32) => {
  const cleanLeft = String(leftStr)
  const cleanRight = String(rightStr)
  const maxLeft = width - cleanRight.length - 1
  const trimmedLeft = cleanLeft.length > maxLeft ? cleanLeft.slice(0, maxLeft) : cleanLeft
  const spaceCount = Math.max(1, width - trimmedLeft.length - cleanRight.length)
  return trimmedLeft + ' '.repeat(spaceCount) + cleanRight
}

export const receiptService = {
  // 1. Cetak Struk via Bluetooth Thermal Printer
  async printThermal(transaction) {
    if (!navigator.bluetooth) {
      throw new Error('Browser ini belum mendukung Web Bluetooth. Gunakan Chrome di Android.')
    }

    const printer = usePrinter()
    let targetChar = printer.printerCharacteristic?.value || null

    if (!printer.isConnected?.value || !targetChar) {
      targetChar = await printer.connectPrinter()
    }

    if (!targetChar) {
      throw new Error('Printer Bluetooth tidak terhubung.')
    }

    const canWrite = targetChar.properties?.writeWithoutResponse || targetChar.properties?.write
    if (!canWrite) {
      throw new Error('Karakteristik printer tidak mendukung write. Coba printer lain.')
    }

    const settings = await settingsRepo.getSettings()
    const is58mm = settings.printerPaperSize !== '80mm'
    const width = is58mm ? 32 : 48
    const lineStr = '-'.repeat(width)

    const EncoderClass = typeof EscPosEncoder === 'function' ? EscPosEncoder : (EscPosEncoder.default || EscPosEncoder)
    const encoder = new EncoderClass()

    const storeName = (settings.storeName || 'WARUNG SINAR PAGI').toUpperCase()
    const address = settings.storeAddress || settings.address || ''
    const phone = settings.storePhone || settings.phone || ''

    const dateObj = transaction.date ? new Date(transaction.date) : new Date()
    const validDate = isNaN(dateObj.getTime()) ? new Date() : dateObj
    const tglStr = dayjs(validDate).format('DD/MM/YYYY')
    const jamStr = dayjs(validDate).format('HH:mm')

    // KUNCI ALIGNMENT PADA 'LEFT' SEPANJANG WAKTU
    let encoded = encoder
      .initialize()
      .align('left')

    // --- HEADER ---
    // Nama Toko -> Center Manual (Kiri diisi spasi presisi)
    encoded = encoded.line(centerText(storeName, width))

    // Alamat -> Left (Tanpa Center)
    if (address) {
      address.split('\n').forEach(addrLine => {
        if (addrLine.trim()) {
          encoded = encoded.line(addrLine.trim())
        }
      })
    }

    // Telepon -> Center Manual
    if (phone) {
      encoded = encoded.line(centerText(`Telp: ${phone}`, width))
    }

    encoded = encoded.line(lineStr)

    // --- METADATA NOTA ---
    encoded = encoded
      .line(`Nota  : #${String(transaction.id || '').slice(-5)}`)
      .line(`Tgl   : ${tglStr} ${jamStr}`)

    if (transaction.memberName) {
      encoded = encoded.line(`Member: ${transaction.memberName}`)
    }

    encoded = encoded.line(lineStr)

    // --- RINCIAN PRODUK ---
    const items = transaction.items || []
    items.forEach(item => {
      const name = String(item.name || item.productName || 'BARANG').toUpperCase()
      const qty = item.qty || item.cartQty || 1
      const price = Number(item.price || item.price_sell || 0) + Number(item.extraCharge || 0)
      const subtotalVal = item.subtotal || (price * qty)

      const detailStr = `${qty}x${price.toLocaleString('id-ID')}`
      const subtotalStr = subtotalVal.toLocaleString('id-ID')

      // Baris 1: Nama Produk
      encoded = encoded.line(name)
      // Baris 2: Qty x Harga (Kiri) & Subtotal (Kanan)
      encoded = encoded.line(formatTwoColumns(detailStr, subtotalStr, width))
    })

    encoded = encoded.line(lineStr)

    // --- TOTAL & PEMBAYARAN ---
    const totalVal = (transaction.total || 0).toLocaleString('id-ID')
    encoded = encoded.line(formatTwoColumns('TOTAL :', totalVal, width))

    const paymentMethod = String(transaction.paymentMethod || '').toLowerCase()
    if (paymentMethod === 'cash' || paymentMethod === 'tunai') {
      const bayar = transaction.amountPaid || transaction.paidAmount || transaction.total || 0
      const kembali = transaction.change !== undefined ? transaction.change : Math.max(0, bayar - (transaction.total || 0))

      const bayarStr = bayar.toLocaleString('id-ID')
      const kembaliStr = kembali.toLocaleString('id-ID')

      encoded = encoded
        .line(formatTwoColumns('BAYAR :', bayarStr, width))
        .line(formatTwoColumns('KEMBALI :', kembaliStr, width))
    } else {
      const methodStr = paymentMethod.toUpperCase()
      encoded = encoded.line(formatTwoColumns('METODE :', methodStr, width))
    }

    encoded = encoded.line(lineStr)

    // --- FOOTER & KASIR ---
    // Ucapan Terima Kasih -> Left
    const footerText = settings.receiptFooter || settings.footerNote || 'Terima kasih telah berbelanja!'
    footerText.split('\n').forEach(fLine => {
      if (fLine.trim()) {
        encoded = encoded.line(fLine.trim())
      }
    })

    // Kasir -> Center Manual
    const operator = transaction.operatorName || transaction.kasir || 'Admin'
    encoded = encoded
      .line(centerText(`Kasir: ${operator}`, width))
      .newline()
      .newline()
      .cut()

    const fullData = encoded.encode()

    // Pengiriman chunk 20 bytes via Bluetooth LE
    const chunkSize = 20
    try {
      for (let i = 0; i < fullData.length; i += chunkSize) {
        const chunk = fullData.slice(i, i + chunkSize)
        if (targetChar.properties?.writeWithoutResponse) {
          await targetChar.writeValueWithoutResponse(chunk)
        } else {
          await targetChar.writeValue(chunk)
        }
        await new Promise(resolve => setTimeout(resolve, 30))
      }
    } catch (err) {
      throw new Error(`Gagal kirim data ke printer: ${err.message}`)
    }
  },

  // 2. Unduh Nota PDF
  async downloadPdf(transaction) {
    const settings = await settingsRepo.getSettings()
    const is58mm = settings.printerPaperSize !== '80mm'
    const items = transaction.items || []

    const paperWidth = is58mm ? 58 : 80
    const estimatedHeight = 95 + (items.length * 12)

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [paperWidth, estimatedHeight]
    })

    let y = 7

    // --- HEADER PDF ---
    doc.setFont('courier', 'bold')
    doc.setFontSize(11)
    doc.text((settings.storeName || 'WARUNG SINAR PAGI').toUpperCase(), paperWidth / 2, y, { align: 'center' })

    doc.setFont('courier', 'normal')
    doc.setFontSize(8)
    if (settings.storeAddress) {
      y += 4
      doc.text(settings.storeAddress, 4, y)
    }

    if (settings.storePhone) {
      y += 3.5
      doc.text(`Telp: ${settings.storePhone}`, paperWidth / 2, y, { align: 'center' })
    }

    y += 4
    doc.text('-'.repeat(is58mm ? 32 : 45), paperWidth / 2, y, { align: 'center' })

    y += 4
    doc.text(`Nota  : #${String(transaction.id || '').slice(-5)}`, 4, y)
    y += 3.5
    doc.text(`Tgl   : ${dayjs(transaction.date || new Date()).format('DD/MM/YYYY HH:mm')}`, 4, y)

    if (transaction.memberName) {
      y += 3.5
      doc.text(`Member: ${transaction.memberName}`, 4, y)
    }

    y += 4
    doc.text('-'.repeat(is58mm ? 32 : 45), paperWidth / 2, y, { align: 'center' })

    items.forEach(item => {
      y += 4
      const name = String(item.name || item.productName || 'BARANG').toUpperCase()
      doc.text(name, 4, y)

      y += 3.5
      const qty = item.qty || item.cartQty || 1
      const price = Number(item.price || item.price_sell || 0) + Number(item.extraCharge || 0)
      const subtotalVal = item.subtotal || (price * qty)

      const qtyPrice = `${qty}x${price.toLocaleString('id-ID')}`
      const subtotal = subtotalVal.toLocaleString('id-ID')
      doc.text(qtyPrice, 4, y)
      doc.text(subtotal, paperWidth - 4, y, { align: 'right' })
    })

    y += 4
    doc.text('-'.repeat(is58mm ? 32 : 45), paperWidth / 2, y, { align: 'center' })

    y += 4
    doc.setFont('courier', 'bold')
    doc.text('TOTAL :', 4, y)
    doc.text(`Rp ${(transaction.total || 0).toLocaleString('id-ID')}`, paperWidth - 4, y, { align: 'right' })

    const isCash = String(transaction.paymentMethod || '').toLowerCase() === 'cash' || String(transaction.paymentMethod || '').toLowerCase() === 'tunai'
    if (isCash) {
      const bayar = transaction.amountPaid || transaction.paidAmount || transaction.total || 0
      const kembali = transaction.change !== undefined ? transaction.change : Math.max(0, bayar - (transaction.total || 0))

      y += 3.5
      doc.setFont('courier', 'normal')
      doc.text('BAYAR :', 4, y)
      doc.text(`Rp ${bayar.toLocaleString('id-ID')}`, paperWidth - 4, y, { align: 'right' })

      y += 3.5
      doc.text('KEMBALI :', 4, y)
      doc.text(`Rp ${kembali.toLocaleString('id-ID')}`, paperWidth - 4, y, { align: 'right' })
    } else {
      y += 3.5
      doc.setFont('courier', 'normal')
      doc.text('METODE :', 4, y)
      doc.text(String(transaction.paymentMethod || 'NON-TUNAI').toUpperCase(), paperWidth - 4, y, { align: 'right' })
    }

    y += 4
    doc.text('-'.repeat(is58mm ? 32 : 45), paperWidth / 2, y, { align: 'center' })

    // --- FOOTER PDF ---
    y += 4
    doc.setFont('courier', 'normal')
    doc.setFontSize(7)

    const footerText = settings.receiptFooter || settings.footerNote || 'Terima kasih telah berbelanja!'
    footerText.split('\n').forEach(fLine => {
      if (fLine.trim()) {
        doc.text(fLine.trim(), 4, y)
        y += 3.5
      }
    })

    const operator = transaction.operatorName || transaction.kasir || 'Admin'
    doc.text(`Kasir: ${operator}`, paperWidth / 2, y, { align: 'center' })

    doc.save(`Nota_${String(transaction.id || '').slice(-5)}_${dayjs().format('YYYYMMDD_HHmm')}.pdf`)
  }
}
