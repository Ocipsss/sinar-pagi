// src/composables/useMembers.js
import { ref, computed } from 'vue'
import { memberRepo } from '../db/repositories/memberRepository.js'
import { memberService } from '../services/memberService.js'

export function useMembers() {
  const members = ref([])
  const searchQuery = ref('')

  const showModal = ref(false)
  const editingId = ref(null)
  const form = ref({ name: '', phone: '', address: '' })

  const showPayModal = ref(false)
  const selectedMemberForPay = ref(null)
  const payAmount = ref(0)
  const paymentMethod = ref('CASH')

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
    // syncRealtime.pushLocalToCloud() -> Dihapus, ditangani Dexie Hook
  }

  const deleteMember = async (m) => {
    if (confirm(`Hapus member "${m.name}"?`)) {
      await memberRepo.delete(m.id)
      await loadMembers()
      // syncRealtime.pushLocalToCloud() -> Dihapus, ditangani Dexie Hook
    }
  }

  const openPayModal = (m) => {
    selectedMemberForPay.value = m
    payAmount.value = m.debt || 0
    paymentMethod.value = 'CASH'
    showPayModal.value = true
  }

  const submitPayDebt = async () => {
    if (!selectedMemberForPay.value || payAmount.value <= 0) return

    await memberService.payDebt({
      memberId: selectedMemberForPay.value.id,
      amount: payAmount.value,
      paymentMethod: paymentMethod.value
    })

    showPayModal.value = false
    payAmount.value = 0
    selectedMemberForPay.value = null
    paymentMethod.value = 'CASH'

    await loadMembers()
    // syncRealtime.pushLocalToCloud() -> Dihapus, ditangani Dexie Hook
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
    paymentMethod,
    loadMembers,
    openModal,
    saveMember,
    deleteMember,
    openPayModal,
    submitPayDebt
  }
}
