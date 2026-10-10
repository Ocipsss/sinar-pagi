// src/composables/useMembers.js
import { ref, computed } from 'vue'
import { memberRepo } from '../db/repositories/memberRepository.js'
import { syncRealtime } from '../services/syncService.js'

export function useMembers() {
  const members = ref([])
  const searchQuery = ref('')

  // State Modal Form (Tambah / Edit)
  const showModal = ref(false)
  const editingId = ref(null)
  const form = ref({ name: '', phone: '', address: '' })

  // State Modal Bayar Utang
  const showPayModal = ref(false)
  const selectedMemberForPay = ref(null)
  const payAmount = ref(0)

  const filteredMembers = computed(() => {
    const q = searchQuery.value.toLowerCase().trim()
    if (!q) return members.value
    return members.value.filter(m => m.name.toLowerCase().includes(q) || (m.phone || '').includes(q))
  })

  const loadMembers = async () => {
    members.value = await memberRepo.getAll()
  }

  const openModal = (m = null) => {
    if (m) {
      editingId.value = m.id
      form.value = { name: m.name, phone: m.phone || '', address: m.address || '' }
    } else {
      editingId.value = null
      form.value = { name: '', phone: '', address: '' }
    }
    showModal.value = true
  }

  const saveMember = async () => {
    if (!form.value.name.trim()) return

    if (editingId.value) {
      await memberRepo.update(editingId.value, form.value)
    } else {
      await memberRepo.create(form.value)
    }

    showModal.value = false
    await loadMembers()
    syncRealtime.pushLocalToCloud()
  }

  const deleteMember = async (m) => {
    if (confirm(`Hapus member "${m.name}"?`)) {
      await memberRepo.delete(m.id)
      await loadMembers()
      syncRealtime.pushLocalToCloud()
    }
  }

  const openPayModal = (m) => {
    selectedMemberForPay.value = m
    payAmount.value = m.debt || 0
    showPayModal.value = true
  }

  const submitPayDebt = async () => {
    if (!selectedMemberForPay.value || payAmount.value <= 0) return

    await memberRepo.payDebt(selectedMemberForPay.value.id, payAmount.value)
    showPayModal.value = false
    payAmount.value = 0
    selectedMemberForPay.value = null

    await loadMembers()
    syncRealtime.pushLocalToCloud()
  }

  return {
    members,
    searchQuery,
    filteredMembers,
    showModal,
    editingId,
    form,
    showPayModal,
    selectedMemberForPay,
    payAmount,
    loadMembers,
    openModal,
    saveMember,
    deleteMember,
    openPayModal,
    submitPayDebt
  }
}
