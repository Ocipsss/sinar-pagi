import { ref, computed } from 'vue'
import { digitalTransactionRepo } from '../db/repositories/digitalTransactionRepository.js'
import { syncRealtime } from '../services/syncService.js'

export function useProductsDigital() {
  const transactions = ref([])
  const searchQuery = ref('')
  const loading = ref(false)
  const showModal = ref(false)

  const form = ref({
    type: 'PULSA',
    provider: 'Telkomsel',
    targetNumber: '',
    nominal: 0,
    costPrice: 0,
    sellingPrice: 0,
    adminFee: 0,
    adminPaymentMethod: 'CASH',
    status: 'SUCCESS'
  })

  const typeOptions = ['PULSA', 'PAKET DATA', 'PLN', 'E-WALLET', 'VOUCHER GAME', 'LAINNYA']
  const paymentMethods = ['CASH', 'QRIS']

  const loadTransactions = async () => {
    loading.value = true
    try {
      transactions.value = await digitalTransactionRepo.getAll()
    } finally {
      loading.value = false
    }
  }

  const filteredTransactions = computed(() => {
    const q = searchQuery.value.toLowerCase().trim()
    if (!q) return transactions.value
    return transactions.value.filter(t => 
      t.provider.toLowerCase().includes(q) || 
      t.type.toLowerCase().includes(q) ||
      (t.targetNumber || '').includes(q)
    )
  })

  const totalOmzetHariIni = computed(() => {
    const today = new Date().toISOString().slice(0, 10)
    return transactions.value
      .filter(t => t.date.startsWith(today))
      .reduce((sum, t) => sum + (t.totalReceived || 0), 0)
  })

  const totalProfitHariIni = computed(() => {
    const today = new Date().toISOString().slice(0, 10)
    return transactions.value
      .filter(t => t.date.startsWith(today))
      .reduce((sum, t) => sum + (t.profit || 0), 0)
  })

  const openModal = () => {
    form.value = {
      type: 'PULSA',
      provider: 'Telkomsel',
      targetNumber: '',
      nominal: 0,
      costPrice: 0,
      sellingPrice: 0,
      adminFee: 0,
      adminPaymentMethod: 'CASH',
      status: 'SUCCESS'
    }
    showModal.value = true
  }

  const saveTransaction = async () => {
    if (!form.value.provider || !form.value.sellingPrice) return

    await digitalTransactionRepo.create(form.value)
    showModal.value = false
    await loadTransactions()
    syncRealtime.pushLocalToCloud()
  }

  const deleteTransaction = async (t) => {
    if (confirm(`Hapus catatan transaksi ${t.provider} - ${t.targetNumber}?`)) {
      await digitalTransactionRepo.delete(t.id)
      await loadTransactions()
      syncRealtime.pushLocalToCloud()
    }
  }

  return {
    transactions,
    searchQuery,
    loading,
    showModal,
    form,
    typeOptions,
    paymentMethods,
    filteredTransactions,
    totalOmzetHariIni,
    totalProfitHariIni,
    loadTransactions,
    openModal,
    saveTransaction,
    deleteTransaction
  }
}
