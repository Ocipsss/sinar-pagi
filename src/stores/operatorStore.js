import { defineStore } from 'pinia'
import { operatorRepo } from '../db/repositories/operatorRepository.js'
import { syncService, pullAllFromCloud } from '../services/syncService.js'
import { db } from '../db/index.js'
// ✅ FIX (3.9): pakai hashPin dari satu sumber (utils/crypto.js)
import { hashPin } from '../utils/crypto.js'

export const useOperatorStore = defineStore('operator', {
  state: () => ({
    operators: [],
    currentOperator: JSON.parse(localStorage.getItem('current_operator') || 'null'),
    loading: false
  }),

  getters: {
    isLoggedIn: (state) => !!state.currentOperator,
    operatorName: (state) => state.currentOperator?.name || 'Kasir',
    operatorRole: (state) => state.currentOperator?.role || 'kasir',
    isAdmin: (state) => state.currentOperator?.role?.toLowerCase() === 'admin'
  },

  actions: {
    async loadOperators() {
      this.loading = true
      try {
        let list = await operatorRepo.getAll()

        // Jika lokal kosong dan online, coba tarik dulu dari cloud
        if (list.length === 0 && navigator.onLine) {
          // ✅ FIX: pullAllFromCloud adalah named export, bukan method syncService
          await pullAllFromCloud()
          list = await operatorRepo.getAll()
        }

        // Hapus duplikat nama di memori jika ada sisa data lama
        const uniqueOperators = []
        const seenNames = new Set()
        for (const op of list) {
          if (!seenNames.has(op.name)) {
            seenNames.add(op.name)
            uniqueOperators.push(op)
          }
        }

        this.operators = uniqueOperators
      } catch (err) {
        console.error('[OperatorStore] Load fail:', err.message)
      } finally {
        this.loading = false
      }
    },

    async createDefaultOperator() {
      const fixedId = 'op-admin'
      const hashedPin = await hashPin('1234')
      const now = new Date().toISOString()
      
      const adminObj = {
        id: fixedId,
        name: 'ADMIN (OWNER)',
        role: 'admin',
        pin: hashedPin,
        deleted: false,
        updatedAt: now,
        synced: 0
      }

      // Gunakan put agar menimpa record ID op-admin yang ada (tidak membuat ID baru)
      const table = db.operators || db.table('operators')
      await table.put(adminObj)
      await this.loadOperators()
      return adminObj
    },

    async login(operatorId, inputPin) {
      const table = db.operators || db.table('operators')
      const op = await table.get(operatorId)
      
      if (!op || op.deleted) {
        throw new Error('Operator tidak ditemukan!')
      }

      if (op.pin) {
        const hashedInput = await hashPin(inputPin)
        if (hashedInput !== op.pin && inputPin !== op.pin) {
          throw new Error('PIN Otorisasi Salah!')
        }
      }

      const sessionObj = {
        id: op.id,
        name: op.name,
        role: op.role
      }

      this.currentOperator = sessionObj
      localStorage.setItem('current_operator', JSON.stringify(sessionObj))
      return sessionObj
    },

    logout() {
      this.currentOperator = null
      localStorage.removeItem('current_operator')
    }
  }
})