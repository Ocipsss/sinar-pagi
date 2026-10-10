import { ref, computed } from 'vue'
import { productsDigitalService } from '../services/productsDigitalService.js'

export function useProductsDigital() {
  const form = ref({
    type: 'topup',
    provider: '',
    nominal: null,
    adminFee: 2000,
    adminPaymentMethod: 'cash'
  })
  const loading = ref(false)

  const estimasiKas = computed(() => {
    const n = Number(form.value.nominal) || 0
    const fee = Number(form.value.adminFee) || 0
    const feeCash = form.value.adminPaymentMethod === 'cash' ? fee : 0
    return form.value.type === 'topup' ? n + feeCash : n - feeCash
  })

  const saveTransaction = async () => {
    if (!form.value.provider?.trim()) {
      alert('Pilih/isi Layanan / Provider terlebih dahulu!')
      return
    }
    if (!form.value.nominal || form.value.nominal <= 0) {
      alert('Nominal transaksi harus lebih besar dari 0!')
      return
    }

    loading.value = true
    try {
      await productsDigitalService.create(form.value)
      alert('Transaksi digital berhasil disimpan!')
      form.value = {
        type: 'topup',
        provider: '',
        nominal: null,
        adminFee: 2000,
        adminPaymentMethod: 'cash'
      }
    } catch (e) {
      alert(`Gagal menyimpan transaksi: ${e.message}`)
    } finally {
      loading.value = false
    }
  }

  return { form, estimasiKas, loading, saveTransaction }
}
