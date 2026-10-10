// src/composables/useCategories.js
import { ref, computed, nextTick } from 'vue'
import { categoryRepo } from '../db/repositories/categoryRepository.js'
import { syncRealtime } from '../services/syncService.js'

export function useCategories() {
  const categories = ref([])
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

  const loadCategories = async () => {
    categories.value = await categoryRepo.getAll()
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

    if (editingId.value) {
      await categoryRepo.update(editingId.value, formName.value.trim())
    } else {
      await categoryRepo.create(formName.value.trim())
    }

    showModal.value = false
    formName.value = ''
    editingId.value = null

    await loadCategories()
    syncRealtime.pushLocalToCloud()
  }

  const deleteCategory = async (cat) => {
    if (confirm(`Hapus kategori "${cat.name}"?`)) {
      await categoryRepo.delete(cat.id)
      await loadCategories()
      syncRealtime.pushLocalToCloud()
    }
  }

  return {
    categories,
    searchQuery,
    filteredCategories,
    showModal,
    formName,
    editingId,
    inputRef,
    loadCategories,
    openModal,
    saveCategory,
    deleteCategory
  }
}
