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
      toast.success('Data berhasil dipulihkan dari file backup!')
      setTimeout(() => window.location.reload(), 800)
    } catch (err) {
      toast.error(`File backup tidak valid: ${err.message}`)
    }
  }

  return {
    form,
    loading,
    loadSettings,
    saveSettings,
    exportBackup,
    importBackup
  }
}
