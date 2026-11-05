// src/composables/useSettings.js - VERSI SUPABASE + forceResync buat HP
import { ref } from 'vue'
import { settingsRepo } from '../db/repositories/settingsRepository.js'
import { backupService } from '../services/backupService.js'
import { toast } from 'vue-sonner'

export function useSettings() {
  const loading = ref(false)
  const form = ref({
    storeName: '',
    storeAddress: '',
    storePhone: '',
    receiptFooter: '',
    printerPaperSize: '58mm',
    autoPrintReceipt: false
  })

  const loadSettings = async () => {
    loading.value = true
    try {
      const config = await settingsRepo.getSettings()
      form.value = { ...config }
    } finally {
      loading.value = false
    }
  }

  const saveSettings = async () => {
    loading.value = true
    try {
      await settingsRepo.saveSettings(form.value)
      toast.success('Pengaturan toko berhasil disimpan!')
    } catch (e) {
      toast.error(`Gagal menyimpan: ${e.message}`)
    } finally {
      loading.value = false
    }
  }

  const exportBackup = async () => {
    try {
      await backupService.exportBackup()
      toast.success('File backup berhasil dibuat!')
    } catch (e) {
      toast.error(`Gagal membuat backup: ${e.message}`)
    }
  }

  const importBackup = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    if (!confirm('PERINGATAN: Impor backup akan memperbarui/menimpa data lokal saat ini. Lanjutkan?')) {
      event.target.value = ''
      return
    }

    try {
      await backupService.importBackup(file)
      toast.success('Data berhasil dipulihkan dari file backup! Siap push ke Supabase')
      setTimeout(() => window.location.reload(), 800)
    } catch (err) {
      toast.error(`File backup tidak valid: ${err.message}`)
    }
  }

  const backupToCloud = async () => {
    if (!navigator.onLine) {
      toast.error('Membutuhkan koneksi internet untuk cadangkan ke cloud.')
      return
    }

    loading.value = true
    try {
      await backupService.uploadBackupToCloud()
      toast.success('Berhasil mencadangkan data terbaru ke Supabase Cloud (sinarPagiBucket)!')
    } catch (e) {
      toast.error(`Gagal cadangkan ke cloud: ${e.message}`)
    } finally {
      loading.value = false
    }
  }

  const restoreFromCloud = async () => {
    if (!confirm('PERINGATAN: Restor dari Cloud akan menimpa data lokal saat ini dengan cadangan terbaru dari Supabase Storage (sinarPagiBucket). Lanjutkan?')) {
      return
    }

    loading.value = true
    try {
      await backupService.restoreFromCloud()
      toast.success('Data berhasil dipulihkan dari Supabase Cloud!')
      setTimeout(() => window.location.reload(), 800)
    } catch (err) {
      toast.error(`Gagal restor dari Cloud: ${err.message}`)
    } finally {
      loading.value = false
    }
  }

  const forceResyncAll = async () => {
    if (!confirm('Paksa tandai SEMUA data jadi belum sync? Nanti tombol Push bakal jadi 498+ dan bisa di-push ke Supabase. Lanjutkan?')) return
    loading.value = true
    try {
      const total = await backupService.markAllAsUnsynced()
      toast.success(`Berhasil! ${total} data ditandai belum sync. Sekarang klik Push!`)
      setTimeout(() => window.location.reload(), 800)
    } catch (e) {
      toast.error(`Gagal: ${e.message}`)
    } finally {
      loading.value = false
    }
  }

  const resetTransactionsData = async () => {
    const confirmation = confirm(
      'PERINGATAN DANGER!\n\nApakah Anda yakin ingin MENGHAPUS SEMUA RIWAYAT TRANSAKSI?\n\n' +
      'Data yang akan dihapus:\n' +
      '• Riwayat Penjualan Kasir & Item Nota\n' +
      '• Transaksi Digital (Topup/Tarik)\n' +
      '• Pengeluaran Operasional\n' +
      '• Mutasi Saldo Kas/Bank (Saldo direset ke Rp 0)\n' +
      '• Piutang & Poin Member (Direset ke Rp 0)\n' +
      '• Daftar Belanja Kulakan\n\n' +
      'Data Produk/Barang, Kategori, Satuan, dan Member TETAP AMAN.'
    )

    if (!confirmation) return

    loading.value = true
    try {
      await backupService.resetTransactions()
      toast.success('Semua riwayat transaksi berhasil dibersihkan!')
      setTimeout(() => window.location.reload(), 800)
    } catch (err) {
      toast.error(`Gagal mereset transaksi: ${err.message}`)
    } finally {
      loading.value = false
    }
  }

  const convertDataToUppercase = async () => {
    if (!confirm('Ubah seluruh data Barang, Kategori, Satuan, dan Paket Rokok lama menjadi KAPITAL secara permanen?')) {
      return
    }

    loading.value = true
    try {
      await backupService.convertAllToUppercase()
      toast.success('Semua data master berhasil diubah menjadi KAPITAL!')
      setTimeout(() => window.location.reload(), 800)
    } catch (err) {
      toast.error(`Gagal mengubah data ke kapital: ${err.message}`)
    } finally {
      loading.value = false
    }
  }

  return {
    form,
    loading,
    loadSettings,
    saveSettings,
    exportBackup,
    importBackup,
    backupToCloud,
    restoreFromCloud,
    forceResyncAll,
    resetTransactionsData,
    convertDataToUppercase
  }
}
