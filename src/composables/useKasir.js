import { ref, computed } from 'vue'
import { kasirService } from '../services/kasirService.js'
import { formatRibuan } from '../utils/formatters/currency.js'
import { useKasirStore } from '../stores/kasirStore.js'

export function useKasir() {
  const store = useKasirStore()
  const products = ref([])
  const members = ref([])
  const q = ref('')
  const memberQ = ref('')
  const showSearch = ref(false)

  const total = computed(() => store.cart.reduce((s, c) => s + c.price_sell * c.cartQty, 0))
  const kembalian = computed(() => Math.max(0, (store.bayarNominal || 0) - total.value))
  const kurangBayar = computed(() => Math.max(0, total.value - (store.bayarNominal || 0)))

  const bayarDisplay = computed({
    get: () => store.bayarNominal ? formatRibuan(store.bayarNominal) : '',
    set: (val) => {
      const num = parseInt(String(val).replace(/\D/g, '') || '0', 10)
      store.bayarNominal = num
    }
  })

  const filteredProducts = computed(() => {
    const qq = q.value.toLowerCase().trim()
    if (!qq) return products.value.slice(0, 15)
    return products.value.filter(p => p.name.toLowerCase().includes(qq) || (p.code || '').toLowerCase().includes(qq)).slice(0, 20)
  })

  const filteredMembers = computed(() => {
    const qq = memberQ.value.toLowerCase().trim()
    if (!qq) return members.value.slice(0, 20)
    return members.value.filter(m => m.name.toLowerCase().includes(qq) || (m.phone || '').includes(qq)).slice(0, 20)
  })

  const load = async () => {
    const data = await kasirService.getInitialData()
    products.value = data.products
    members.value = data.members
  }

  const addToCart = (p) => {
    store.addToCart(p)
    q.value = ''
    showSearch.value = false
  }

  const checkout = async () => {
    if (store.paymentMethod === 'TEMPO' && !store.selectedMember) throw new Error('Pilih member untuk TEMPO')
    if (store.paymentMethod === 'CASH' && store.bayarNominal < total.value) throw new Error('Nominal kurang')

    const res = await kasirService.checkout({
      cart: store.cart,
      member: store.selectedMember,
      paymentMethod: store.paymentMethod,
      amountPaid: store.paymentMethod === 'TEMPO' ? 0 : store.paymentMethod === 'QRIS' ? total.value : store.bayarNominal
    })
    store.clearCart()
    return res
  }

  return {
    store,
    q, memberQ, products, filteredProducts, filteredMembers,
    total, kembalian, kurangBayar, bayarDisplay, showSearch,
    load, addToCart, checkout
  }
}
