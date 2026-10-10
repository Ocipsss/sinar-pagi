import { ref, computed } from 'vue'
import { transactionRepo } from '../db/repositories/transactionRepository.js'
import dayjs from 'dayjs'
import localeId from 'dayjs/locale/id'

dayjs.locale(localeId)

export function useSalesHistory() {
  const transactions = ref([])
  const searchQuery = ref('')
  const selectedFilter = ref('ALL')
  const selectedTransaction = ref(null)
  const loading = ref(false)

  const filterOptions = [
    { label: 'Semua', value: 'ALL' },
    { label: 'Barang', value: 'BARANG' },
    { label: 'Digital', value: 'DIGITAL' },
    { label: 'Cash', value: 'CASH' },
    { label: 'QRIS', value: 'QRIS' },
    { label: 'Tempo', value: 'TEMPO' }
  ]

  const loadHistory = async () => {
    loading.value = true
    try {
      transactions.value = await transactionRepo.getWithDetails()
    } finally {
      loading.value = false
    }
  }

  const filteredTransactions = computed(() => {
    const q = searchQuery.value.toLowerCase().trim()
    return transactions.value.filter(t => {
      const matchQuery = !q || 
        (t.memberName || '').toLowerCase().includes(q) || 
        (t.provider || '').toLowerCase().includes(q) || 
        t.id.toLowerCase().includes(q)

      let matchFilter = true
      if (selectedFilter.value === 'BARANG') matchFilter = t.trxType === 'BARANG'
      else if (selectedFilter.value === 'DIGITAL') matchFilter = t.trxType === 'DIGITAL'
      else if (selectedFilter.value !== 'ALL') matchFilter = t.paymentMethod === selectedFilter.value

      return matchQuery && matchFilter
    })
  })

  // Total Omzet / Arus Kas Fisik Bersih
  const totalOmzet = computed(() => {
    return filteredTransactions.value.reduce((sum, t) => sum + (t.total || 0), 0)
  })

  // Total Piutang TEMPO khusus transaksi barang
  const totalPiutang = computed(() => {
    return filteredTransactions.value
      .filter(t => t.trxType === 'BARANG' && t.paymentMethod === 'TEMPO')
      .reduce((sum, t) => sum + (t.remaining || t.total || 0), 0)
  })

  // Total Keuntungan (Profit) gabungan
  const totalProfit = computed(() => {
    return filteredTransactions.value.reduce((sum, t) => {
      if (t.trxType === 'DIGITAL') return sum + (t.profit || 0)
      return sum // Profit transaksi barang dihitung terpisah per item jika diperlukan
    }, 0)
  })

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return dayjs(dateString).format('DD MMM YYYY • HH:mm')
  }

  return {
    transactions,
    searchQuery,
    selectedFilter,
    selectedTransaction,
    loading,
    filterOptions,
    filteredTransactions,
    totalOmzet,
    totalPiutang,
    totalProfit,
    loadHistory,
    formatDate
  }
}
