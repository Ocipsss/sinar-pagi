// src/composables/useFinance.js
import { ref, computed, onMounted, onUnmounted, onActivated, onDeactivated } from 'vue'
import { liveQuery } from 'dexie'
import { db } from '../db/index.js'
import { financeRepo } from '../db/repositories/financeRepository.js'
import { toast } from 'vue-sonner'

export function useFinance() {
  const accounts = ref([])
  const mutations = ref([])
  const totalPiutang = ref(0)
  const loading = ref(false)
  
  let subscription = null

  const totalSaldo = computed(() => accounts.value.reduce((s, a) => s + (a.balance || 0), 0))

  const loadData = async () => {
    loading.value = true
    try {
      accounts.value = await financeRepo.getAccounts()
      mutations.value = await financeRepo.getMutations()
      totalPiutang.value = await financeRepo.getTotalPiutang()
    } finally {
      loading.value = false
    }
  }

  const subscribeData = () => {
    if (subscription) return

    loading.value = true

    subscription = liveQuery(async () => {
      const accs = await financeRepo.getAccounts()
      const muts = await financeRepo.getMutations()
      const piutang = await financeRepo.getTotalPiutang()
      return { accs, muts, piutang }
    }).subscribe({
      next: (result) => {
        accounts.value = result.accs || []
        mutations.value = result.muts || []
        totalPiutang.value = result.piutang || 0
        loading.value = false
      },
      error: (err) => {
        console.error('[Finance] LiveQuery error:', err)
        loading.value = false
      }
    })
  }

  const unsubscribeData = () => {
    if (subscription) {
      subscription.unsubscribe()
      subscription = null
    }
  }

  // ✅ Pastikan listener jalan di kedua skenario:
  // - onMounted: kalau Finance.vue TIDAK di dalam keep-alive
  // - onActivated: kalau Finance.vue di dalam keep-alive (kasus di MainLayout.vue)
  onMounted(subscribeData)
  onActivated(subscribeData)
  onDeactivated(unsubscribeData)
  onUnmounted(unsubscribeData)

  const syncFromHistory = async () => {
    loading.value = true
    try {
      await financeRepo.recalculateFromHistory()
      toast.success('Berhasil menghitung ulang saldo dan piutang!')
    } catch (err) {
      toast.error(`Gagal menghitung ulang: ${err.message}`)
    } finally {
      loading.value = false
    }
  }

  const setBalance = async (accountId, amount, note) => {
    const targetAmount = Number(amount)

    if (isNaN(targetAmount) || targetAmount < 0) {
      toast.error('Nominal saldo awal tidak boleh bernilai negatif!')
      return false
    }

    await financeRepo.setInitialBalance(accountId, targetAmount, note)
    toast.success('Saldo awal berhasil diperbarui!')
    return true
  }

  const handleTransfer = async (fromAccId, toAccId, amount, note) => {
    const transferAmount = Number(amount)

    if (isNaN(transferAmount) || transferAmount <= 0) {
      toast.error('Nominal transfer harus lebih besar dari 0!')
      return
    }
    
    await financeRepo.addMutation({
      accountId: fromAccId, type: 'OUT', amount: transferAmount,
      category: 'Pindah Saldo', note: `Transfer ke ${toAccId}: ${note}`
    })

    await financeRepo.addMutation({
      accountId: toAccId, type: 'IN', amount: transferAmount,
      category: 'Pindah Saldo', note: `Transfer dari ${fromAccId}: ${note}`
    })

    toast.success('Transfer saldo berhasil!')
  }

  return {
    accounts,
    mutations,
    totalSaldo,
    totalPiutang,
    loading,
    loadData,
    syncFromHistory,
    setBalance,
    handleTransfer
  }
}