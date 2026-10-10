import { defineStore } from 'pinia'

export const useKasirStore = defineStore('kasir', {
  state: () => ({
    cart: [],
    selectedMember: null,
    paymentMethod: 'CASH',
    bayarNominal: 0,
    pendingCarts: [] // tempat menyimpan transaksi tertunda
  }),
  actions: {
    addToCart(product) {
      const idx = this.cart.findIndex(c => c.id === product.id)
      if (idx > -1) {
        this.cart[idx].cartQty++
        const item = this.cart.splice(idx, 1)[0]
        this.cart.unshift(item)
      } else {
        this.cart.unshift({ ...product, cartQty: 1 })
      }
    },
    inc(index) {
      if (this.cart[index]) this.cart[index].cartQty++
    },
    dec(index) {
      if (this.cart[index]) {
        this.cart[index].cartQty--
        if (this.cart[index].cartQty <= 0) {
          this.cart.splice(index, 1)
        }
      }
    },
    clearCart() {
      this.cart = []
      this.selectedMember = null
      this.bayarNominal = 0
      this.paymentMethod = 'CASH'
    },
    // Fitur Tunda Transaksi
    holdCurrentCart(label = '') {
      if (this.cart.length === 0) return
      this.pendingCarts.push({
        id: crypto.randomUUID(),
        createdAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        label: label || this.selectedMember?.name || `Transaksi #${this.pendingCarts.length + 1}`,
        cart: [...this.cart],
        selectedMember: this.selectedMember,
        paymentMethod: this.paymentMethod
      })
      this.clearCart()
    },
    // Fitur Lanjutkan Transaksi yang Ditunda
    resumeCart(pendingId) {
      const idx = this.pendingCarts.findIndex(p => p.id === pendingId)
      if (idx > -1) {
        const item = this.pendingCarts.splice(idx, 1)[0]
        this.cart = item.cart
        this.selectedMember = item.selectedMember
        this.paymentMethod = item.paymentMethod || 'CASH'
      }
    },
    removePending(pendingId) {
      this.pendingCarts = this.pendingCarts.filter(p => p.id !== pendingId)
    }
  },
  persist: true
})
