import { ref, computed } from 'vue'
import { salesHistoryService } from '../services/salesHistoryService.js'
import { toast } from 'vue-sonner'
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
      transactions.value = await salesHistoryService.getCombinedHistory()
    } finally {
      loading.value = false
    }
  }

  const handleVoid = async (transaction) => {
    if (!confirm(`Apakah Anda yakin ingin membatalkan (VOID) nota ${transaction.id.slice(0, 8)}?\nStok barang dan kas/bank akan dikembalikan.`)) {
      return
    }

    loading.value = true
    try {
      await salesHistoryService.voidTransaction(transaction)
      toast.success('Transaksi berhasil dibatalkan!')
      selectedTransaction.value = null
      await loadHistory()
    } catch (e) {
      toast.error(`Gagal membatalkan transaksi: ${e.message}`)
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

  const totalOmzet = computed(() => {
    return filteredTransactions.value
      .filter(t => t.status !== 'void' && t.status !== 'CANCELLED')
      .reduce((sum, t) => sum + (t.total || 0), 0)
  })

  const totalPiutang = computed(() => {
    return filteredTransactions.value
      .filter(t => t.trxType === 'BARANG' && t.paymentMethod === 'TEMPO' && t.status !== 'void')
      .reduce((sum, t) => sum + (t.remaining || t.total || 0), 0)
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
    loadHistory,
    handleVoid,
    formatDate
  }
}
