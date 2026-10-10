// src/composables/useFinance.js
import { ref, computed } from 'vue'
import { financeRepo } from '../db/repositories/financeRepository.js'

export function useFinance() {
  const accounts = ref([])
  const mutations = ref([])
  const totalPiutang = ref(0)
  const loading = ref(false)

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

  const syncFromHistory = async () => {
    loading.value = true
    try {
      await financeRepo.recalculateFromHistory()
      await loadData()
    } finally {
      loading.value = false
    }
  }

  const setBalance = async (accountId, amount, note) => {
    await financeRepo.setInitialBalance(accountId, amount, note)
    await loadData()
  }

  const handleTransfer = async (fromAccId, toAccId, amount, note) => {
    if (amount <= 0) return
    
    await financeRepo.addMutation({
      accountId: fromAccId,
      type: 'OUT',
      amount,
      category: 'Pindah Saldo',
      note: `Transfer ke ${toAccId}: ${note}`
    })

    await financeRepo.addMutation({
      accountId: toAccId,
      type: 'IN',
      amount,
      category: 'Pindah Saldo',
      note: `Transfer dari ${fromAccId}: ${note}`
    })

    await loadData()
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
