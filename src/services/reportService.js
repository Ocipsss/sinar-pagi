// src/services/reportService.js
import { db } from '../db/index.js'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'

export const reportService = {
  async getReportData() {
    const [trxs, items, digitals, prods] = await Promise.all([
      db.transactions.toArray(),
      db.transaction_items.toArray(),
      db.digital_transactions.toArray(),
      db.products.toArray()
    ])

    // Memisahkan transaksi valid dengan transaksi VOID
    const validTransactions = trxs.filter(t => t.status !== 'void' && t.status !== 'CANCELLED')
    const voidTransactions = trxs.filter(t => t.status === 'void' || t.status === 'CANCELLED')
    const validDigitalTransactions = digitals.filter(d => d.status !== 'CANCELLED')

    return {
      rawTransactions: trxs, // Seluruh data untuk rekam audit jika diperlukan
      validTransactions,     // Hanya transaksi sah untuk kalkulasi Omzet & Profit
      voidTransactions,      // Rekap pembatalan nota
      rawTransactionItems: items,
      rawDigitalTransactions: digitals,
      validDigitalTransactions,
      productsMap: new Map(prods.map(p => [p.id, p]))
    }
  },

  exportToExcel(filteredTransactions, filteredDigitalTransactions, selectedPeriod) {
    const validDataToExport = []
    const voidDataToExport = []

    // 1. Data Transaksi Kasir Sah (Abaikan VOID dari Omzet Utama)
    filteredTransactions.forEach(t => {
      const isVoid = t.status === 'void' || t.status === 'CANCELLED'
      
      const row = {
        Tanggal: dayjs(t.date).format('YYYY-MM-DD HH:mm'),
        Tipe: 'Penjualan Barang',
        'ID Nota': t.id.slice(0, 8),
        'Metode Bayar': t.paymentMethod,
        'Total Omzet (Rp)': isVoid ? 0 : t.total,
        'Status Bayar': isVoid ? 'VOID / Dibatalkan' : t.status
      }

      if (isVoid) {
        voidDataToExport.push({ ...row, 'Nominal Dibatalkan (Rp)': t.total })
      } else {
        validDataToExport.push(row)
      }
    })

    // 2. Data Transaksi Digital Sah
    filteredDigitalTransactions.forEach(d => {
      const isCancelled = d.status === 'CANCELLED'
      const row = {
        Tanggal: dayjs(d.date).format('YYYY-MM-DD HH:mm'),
        Tipe: `Digital (${d.provider || 'Topup/Tarik'})`,
        'ID Nota': d.id.slice(0, 8),
        'Metode Bayar': d.adminPaymentMethod === 'cash' ? 'Tunai' : 'Potong Saldo',
        'Total Omzet (Rp)': isCancelled ? 0 : (d.nominal + (d.adminFee || 0)),
        'Status Bayar': isCancelled ? 'CANCELLED' : 'Lunas'
      }

      if (!isCancelled) {
        validDataToExport.push(row)
      }
    })

    const workbook = XLSX.utils.book_new()

    // Sheet 1: Penjualan Sah (Omzet Bersih)
    const worksheetValid = XLSX.utils.json_to_sheet(validDataToExport)
    XLSX.utils.book_append_sheet(workbook, worksheetValid, 'Laporan Penjualan')

    // Sheet 2: Audit Pembatalan (Jika ada nota VOID)
    if (voidDataToExport.length > 0) {
      const worksheetVoid = XLSX.utils.json_to_sheet(voidDataToExport)
      XLSX.utils.book_append_sheet(workbook, worksheetVoid, 'Audit VOID')
    }

    const fileName = `Laporan_SinarPagi_${selectedPeriod}_${dayjs().format('YYYYMMDD')}.xlsx`
    XLSX.writeFile(workbook, fileName)
  }
}
