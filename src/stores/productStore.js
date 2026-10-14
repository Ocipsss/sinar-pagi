// src/stores/productStore.js
import { defineStore } from 'pinia'
import { productRepo } from '../db/repositories/productRepository.js'

export const useProductsStore = defineStore('products', {
  state: () => ({ 
    list: [], 
    searchQuery: '',
    loading: false 
  }),

  getters: {
    filteredProducts: (state) => {
      const q = state.searchQuery.toLowerCase().trim()
      if (!q) return state.list

      return state.list
        .filter(p => 
          p.name.toLowerCase().includes(q) || 
          (p.code || '').toLowerCase().includes(q) ||
          (p.category || '').toLowerCase().includes(q)
        )
        .sort((a, b) => {
          const nameA = a.name.toLowerCase()
          const nameB = b.name.toLowerCase()

          const idxA = nameA.indexOf(q)
          const idxB = nameB.indexOf(q)

          if (idxA !== -1 && idxB !== -1) {
            if (idxA !== idxB) return idxA - idxB
            return nameA.localeCompare(nameB)
          }

          if (idxA !== -1) return -1
          if (idxB !== -1) return 1

          return 0
        })
    }
  },

  actions: {
    async fetch() { 
      this.loading = true
      this.list = await productRepo.getAll()
      this.loading = false 
    },
    async add(payload) { 
      await productRepo.create(payload)
      await this.fetch() 
      // Push ke cloud ditangani otomatis oleh Dexie Hook di src/db/index.js
    },
    async update(id, payload) {
      await productRepo.update(id, payload)
      await this.fetch()
      // Push ke cloud ditangani otomatis oleh Dexie Hook di src/db/index.js
    },
    async remove(id) {
      await productRepo.delete(id)
      await this.fetch()
      // Push ke cloud ditangani otomatis oleh Dexie Hook di src/db/index.js
    }
  },
  persist: true
})
