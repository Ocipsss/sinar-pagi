import { defineStore } from 'pinia'
import { operatorRepo } from '../db/repositories/operatorRepository.js'

export const useOperatorStore = defineStore('operator', {
  state: () => ({
    activeOperator: null,
    operators: []
  }),

  getters: {
    isLoggedIn: (state) => !!state.activeOperator,
    operatorName: (state) => state.activeOperator?.name || 'Kasir',
    operatorRole: (state) => state.activeOperator?.role || 'Kasir'
  },

  actions: {
    async loadOperators() {
      this.operators = await operatorRepo.getAll()
      return this.operators
    },

    async login(operatorId, pinInput) {
      if (this.operators.length === 0) {
        await this.loadOperators()
      }
      
      const target = this.operators.find(o => o.id === operatorId)

      if (!target) {
        throw new Error('Operator tidak ditemukan.')
      }

      if (target.pin && target.pin !== pinInput) {
        throw new Error('PIN yang Anda masukkan salah.')
      }

      this.activeOperator = {
        id: target.id,
        name: target.name,
        role: target.role
      }

      return this.activeOperator
    },

    logout() {
      this.activeOperator = null
    }
  },

  persist: true
})
