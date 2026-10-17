// src/composables/useCategories.js
import { ref, computed, nextTick } from 'vue'
import { categoryRepo } from '../db/repositories/categoryRepository.js'
import { unitRepo } from '../db/repositories/unitRepository.js'

export function useCategories() {
  const categories = ref([])
  const units = ref([])
  const searchQuery = ref('')
  const showModal = ref(false)
  const formName = ref('')
  const editingId = ref(null)
  const inputRef = ref(null)

  const filteredCategories = computed(() => {
    const q = searchQuery.value.toLowerCase().trim()
    if (!q) return categories.value
    return categories.value.filter(c => c.name.toLowerCase().includes(q))
  })

  const filteredUnits = computed(() => {
    const q = searchQuery.value.toLowerCase().trim()
    if (!q) return units.value
    return units.value.filter(u => u.name.toLowerCase().includes(q))
  })

  const loadCategories = async () => {
    const data = await categoryRepo.getAll()
    categories.value = data.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }

  const loadUnits = async () => {
    const data = await unitRepo.getAll()
    units.value = data.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }

  const openModal = (cat = null) => {
    if (cat) {
      editingId.value = cat.id
      formName.value = cat.name
    } else {
      editingId.value = null
      formName.value = ''
    }
    showModal.value = true
    nextTick(() => inputRef.value?.focus())
  }

  const saveCategory = async () => {
    if (!formName.value.trim()) return

    const formattedName = formName.value.trim().toUpperCase()

    if (editingId.value) {
      await categoryRepo.update(editingId.value, formattedName)
    } else {
      await categoryRepo.create(formattedName)
    }

    showModal.value = false
    formName.value = ''
    editingId.value = null

    await loadCategories()
  }

  const deleteCategory = async (cat) => {
    if (confirm(`Hapus kategori "${cat.name}"?`)) {
      await categoryRepo.delete(cat.id)
      await loadCategories()
    }
  }

  const saveUnit = async () => {
    if (!formName.value.trim()) return

    const formattedName = formName.value.trim().toUpperCase()

    if (editingId.value) {
      await unitRepo.update(editingId.value, formattedName)
    } else {
      await unitRepo.create(formattedName)
    }

    showModal.value = false
    formName.value = ''
    editingId.value = null

    await loadUnits()
  }

  const deleteUnit = async (u) => {
    if (confirm(`Hapus satuan "${u.name}"?`)) {
      await unitRepo.delete(u.id)
      await loadUnits()
    }
  }

  return {
    categories,
    units,
    searchQuery,
    filteredCategories,
    filteredUnits,
    showModal,
    formName,
    editingId,
    inputRef,
    loadCategories,
    loadUnits,
    openModal,
    saveCategory,
    deleteCategory,
    saveUnit,
    deleteUnit
  }
}
