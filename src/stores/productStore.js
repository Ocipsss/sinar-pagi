import { defineStore } from 'pinia'
import { productRepo } from '../db/repositories/productRepository.js'

export const useProductsStore = defineStore('products', {
  state: () => ({ list: [], loading: false }),
  actions: {
    async fetch() { this.loading=true; this.list = await productRepo.getAll(); this.loading=false },
    async add(payload) { await productRepo.create(payload); await this.fetch() }
  },
  persist: true
})