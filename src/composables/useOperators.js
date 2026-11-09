// src/composables/useOperators.js
import { ref, computed } from 'vue'
import { operatorRepo } from '../db/repositories/operatorRepository.js'
import { toast } from 'vue-sonner'

export function useOperators() {
  const operators = ref([])
  const searchQuery = ref('')
  const showModal = ref(false)
  const editingId = ref(null)
  const form = ref({ name: '', role: 'Kasir', pin: '' })

  const filteredOperators = computed(() => {
    const q = searchQuery.value.toLowerCase().trim()
    if (!q) return operators.value
    return operators.value.filter(o => 
      o.name.toLowerCase().includes(q) || 
      (o.role || '').toLowerCase().includes(q)
    )
  })

  const loadOperators = async () => {
    operators.value = await operatorRepo.getAll()
  }

  const openModal = (op = null) => {
    if (op) {
      editingId.value = op.id
      // ✅ FIX P1 #5: PIN di form SELALU kosong saat edit.
      // Jangan isi dengan op.pin (itu sudah hash 64 hex).
      // Kosong = "tidak ganti PIN". User isi = "ganti PIN ke nilai ini".
      form.value = { name: op.name, role: op.role || 'Kasir', pin: '' }
    } else {
      editingId.value = null
      form.value = { name: '', role: 'Kasir', pin: '' }
    }
    showModal.value = true
  }

  const saveOperator = async () => {
    const name = (form.value.name || '').trim()
    if (!name) {
      toast.error('Nama operator wajib diisi')
      return
    }

    const pinRaw = (form.value.pin || '').trim()
    const isEdit = Boolean(editingId.value)

    // ✅ FIX P1 #5: validasi PIN hanya kalau user memang mengisi PIN
    // (mode tambah: PIN opsional, mode edit: kosong = tidak ganti PIN)
    if (pinRaw) {
      if (!/^\d{4,6}$/.test(pinRaw)) {
        toast.error('PIN harus 4–6 digit angka')
        return
      }
    }

    try {
      if (isEdit) {
        // ✅ FIX P1 #5: kirim flag pinChanged secara eksplisit.
        // pin kosong → repo tidak menyentuh PIN lama.
        // pin terisi → repo akan hash & simpan PIN baru.
        await operatorRepo.update(
          editingId.value,
          {
            name,
            role: form.value.role || 'Kasir',
            pin: pinRaw  // '' = tidak ganti
          },
          { pinChanged: Boolean(pinRaw) }
        )
      } else {
        await operatorRepo.create({
          name,
          role: form.value.role || 'Kasir',
          pin: pinRaw  // '' = operator tanpa PIN
        })
      }

      showModal.value = false
      await loadOperators()
      // syncRealtime.pushLocalToCloud() -> Dihapus, ditangani Dexie Hook
    } catch (err) {
      toast.error(`Gagal menyimpan operator: ${err.message || err}`)
    }
  }

  const deleteOperator = async (op) => {
    if (confirm(`Hapus operator / kasir "${op.name}"?`)) {
      await operatorRepo.delete(op.id)
      await loadOperators()
      // syncRealtime.pushLocalToCloud() -> Dihapus, ditangani Dexie Hook
    }
  }

  return {
    operators,
    searchQuery,
    filteredOperators,
    showModal,
    editingId,
    form,
    loadOperators,
    openModal,
    saveOperator,
    deleteOperator
  }
}