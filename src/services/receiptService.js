// src/services/receiptService.js
import { jsPDF } from 'jspdf'
import EscPosEncoder from 'esc-pos-encoder'
import { settingsRepo } from '../db/repositories/settingsRepository.js'
import { usePrinter } from '../composables/usePrinter.js'
import dayjs from 'dayjs'

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

    const { printerCharacteristic, isConnected, connectPrinter } = usePrinter()

    let targetChar = printerCharacteristic.value

    // Jika belum terhubung via header, hubungkan otomatis
    if (!isConnected.value || !targetChar) {
      targetChar = await connectPrinter()
    }

    if (!targetChar) {
      throw new Error('Printer Bluetooth tidak terhubung.')
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
      .line(formatTwoColumn('No. Nota', `#${String(transaction.id || '').slice(-8)}`, width))
      .line(formatTwoColumn('Tanggal', dayjs(transaction.date || new Date()).format('DD/MM/YY HH:mm'), width))
      .line(formatTwoColumn('Kasir', transaction.operatorName || transaction.kasir || 'Admin', width))
      .line(formatTwoColumn('Pelanggan', transaction.memberName || 'Umum', width))
      .line(line)

    // Rincian Items
    const items = transaction.items || []
    items.forEach(item => {
      const name = item.name || item.productName || 'Barang'
      const qty = item.qty || item.cartQty || 1
      const price = item.price || item.price_sell || 0
      const subtotalVal = item.subtotal || (price * qty)

      const qtyPrice = `${qty} x ${price.toLocaleString('id-ID')}`
      const subtotal = subtotalVal.toLocaleString('id-ID')
      
      encoded = encoded.line(name)
      encoded = encoded.line(formatTwoColumn(`  ${qtyPrice}`, subtotal, width))
    })

    // Block Total & Pembayaran
    encoded = encoded
      .line(line)
      .bold(true)
      .line(formatTwoColumn('TOTAL', `Rp ${(transaction.total || 0).toLocaleString('id-ID')}`, width))
      .bold(false)

    const isCash = String(transaction.paymentMethod || '').toUpperCase() === 'CASH'
    if (isCash) {
      const bayar = transaction.amountPaid || transaction.paidAmount || transaction.total || 0
      const kembali = Math.max(0, bayar - (transaction.total || 0))
      encoded = encoded
        .line(formatTwoColumn('TUNAI', `Rp ${bayar.toLocaleString('id-ID')}`, width))
        .line(formatTwoColumn('KEMBALI', `Rp ${kembali.toLocaleString('id-ID')}`, width))
    } else {
      encoded = encoded.line(formatTwoColumn('METODE', String(transaction.paymentMethod || 'NON-TUNAI').toUpperCase(), width))
    }

    // Footer Nota
    encoded = encoded
      .line(line)
      .align('center')

    const footerText = settings.receiptFooter || 'Terima kasih telah berbelanja!'
    footerText.split('\n').forEach(fLine => {
      if (fLine.trim()) encoded = encoded.line(fLine.trim())
    })

    const fullData = encoded
      .line('\n\n\n')
      .cut()
      .encode()

    // Kirim chunk data via Bluetooth
    const chunkSize = 20
    for (let i = 0; i < fullData.length; i += chunkSize) {
      const chunk = fullData.slice(i, i + chunkSize)
      if (targetChar.properties?.writeWithoutResponse) {
        await targetChar.writeValueWithoutResponse(chunk)
      } else if (targetChar.properties?.write) {
        await targetChar.writeValue(chunk)
      }
      await new Promise(resolve => setTimeout(resolve, 30))
    }
  },

  // 2. Unduh Nota PDF
  async downloadPdf(transaction) {
    const settings = await settingsRepo.getSettings()
    const is58mm = settings.printerPaperSize !== '80mm'
    const items = transaction.items || []
    
    const paperWidth = is58mm ? 58 : 80
    const estimatedHeight = 90 + (items.length * 12)

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
    doc.text(`Nota : #${String(transaction.id || '').slice(-8)}`, 4, y)
    y += 3.5
    doc.text(`Tgl  : ${dayjs(transaction.date || new Date()).format('DD/MM/YY HH:mm')}`, 4, y)
    y += 3.5
    doc.text(`Kasir: ${transaction.operatorName || transaction.kasir || 'Admin'}`, 4, y)

    y += 4
    doc.text('-'.repeat(is58mm ? 32 : 45), paperWidth / 2, y, { align: 'center' })

    items.forEach(item => {
      y += 4
      const name = item.name || item.productName || 'Barang'
      doc.text(name, 4, y)
      
      y += 3.5
      const qty = item.qty || item.cartQty || 1
      const price = item.price || item.price_sell || 0
      const subtotalVal = item.subtotal || (price * qty)

      const qtyPrice = `${qty} x ${price.toLocaleString('id-ID')}`
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

    const isCash = String(transaction.paymentMethod || '').toUpperCase() === 'CASH'
    if (isCash) {
      const bayar = transaction.amountPaid || transaction.paidAmount || transaction.total || 0
      const kembali = Math.max(0, bayar - (transaction.total || 0))
      
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

    doc.save(`Nota_${String(transaction.id || '').slice(-8)}_${dayjs().format('YYYYMMDD_HHmm')}.pdf`)
  }
}
