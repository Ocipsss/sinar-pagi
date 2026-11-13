// src/composables/useSalesHistory.js
import { ref, computed } from 'vue'
import { salesHistoryService } from '../services/salesHistoryService.js'
import { toast } from 'vue-sonner'
import dayjs from 'dayjs'
import localeId from 'dayjs/locale/id'

dayjs.locale(localeId)

export function useSalesHistory() {
  const transactions = ref([])
  const totalPiutang = ref(0)
  const searchQuery = ref('')
  const selectedFilter = ref('TODAY')
  const selectedTransaction = ref(null)
  const loading = ref(false)

  // State untuk modal retur
  const returningTransaction = ref(null)

  const filterOptions = [
    { label: 'Hari Ini', value: 'TODAY' },
    { label: 'Semua', value: 'ALL' },
    { label: 'Barang', value: 'BARANG' },
    { label: 'Digital', value: 'DIGITAL' },
    { label: 'Cash', value: 'CASH' },
    { label: 'QRIS', value: 'QRIS' },
    { label: 'Tempo', value: 'TEMPO' },
    { label: 'Void', value: 'VOID' }
  ]

  const loadHistory = async () => {
    loading.value = true
    try {
      const data = await salesHistoryService.getCombinedHistory()
      transactions.value = data.transactions || []
      totalPiutang.value = data.totalPiutang || 0
    } catch (e) {
      toast.error(`Gagal memuat riwayat: ${e.message}`)
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

  // ✅ FITUR BARU: Proses Retur Barang (Refund Sebagian)
  const handleReturn = async (transaction, itemsToReturn) => {
    if (!itemsToReturn || itemsToReturn.length === 0) {
      toast.error('Pilih minimal 1 barang yang ingin diretur!')
      return
    }

    loading.value = true
    try {
      const res = await salesHistoryService.processReturn(transaction, itemsToReturn)
      
      toast.success(`Retur berhasil! Total pengembalian: Rp ${res.totalRefund.toLocaleString('id-ID')}`)
      
      returningTransaction.value = null
      selectedTransaction.value = null // Tutup modal detail
      await loadHistory()
    } catch (e) {
      toast.error(`Gagal memproses retur: ${e.message}`)
    } finally {
      loading.value = false
    }
  }

  const filteredTransactions = computed(() => {
    const q = searchQuery.value.toLowerCase().trim()

    return transactions.value.filter(t => {
      // 1. Filter Pencarian Teks
      const matchQuery = !q || 
        (t.memberName || '').toLowerCase().includes(q) || 
        (t.provider || '').toLowerCase().includes(q) || 
        (t.id || '').toLowerCase().includes(q) ||
        t.items?.some(item => (item.productName || item.name || '').toLowerCase().includes(q))

      // 2. Filter Kategori / Tanggal Hari Ini
      let matchFilter = true
      if (selectedFilter.value === 'TODAY') {
        matchFilter = dayjs(t.date).isSame(dayjs(), 'day')
      } else if (selectedFilter.value === 'BARANG') {
        matchFilter = t.trxType === 'BARANG'
      } else if (selectedFilter.value === 'DIGITAL') {
        matchFilter = t.trxType === 'DIGITAL'
      } else if (selectedFilter.value === 'CASH') {
        matchFilter = (t.paymentMethod === 'CASH' || t.paymentMethod === 'TUNAI')
      } else if (selectedFilter.value === 'QRIS') {
        matchFilter = t.paymentMethod === 'QRIS'
      } else if (selectedFilter.value === 'TEMPO') {
        matchFilter = t.paymentMethod === 'TEMPO'
      } else if (selectedFilter.value === 'VOID') {
        matchFilter = (t.status === 'void' || t.status === 'CANCELLED')
      }

      return matchQuery && matchFilter
    })
  })

  // Total omzet otomatis mengabaikan transaksi VOID
  const totalOmzet = computed(() => {
    return filteredTransactions.value
      .filter(t => t.status !== 'void' && t.status !== 'CANCELLED')
      .reduce((sum, t) => sum + (t.total || 0), 0)
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
    handleReturn, // ✅ Export fungsi retur
    returningTransaction, // ✅ Export state modal retur
    formatDate
  }
}