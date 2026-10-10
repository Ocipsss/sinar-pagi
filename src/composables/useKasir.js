import { ref, computed } from 'vue'
import { kasirService } from '../services/kasirService.js'
import { formatRibuan } from '../utils/formatters/currency.js'

export function useKasir() {
  const products = ref([])
  const members = ref([])
  const q = ref('')
  const memberQ = ref('')
  const cart = ref([])
  const paymentMethod = ref('CASH')
  const selectedMember = ref(null)
  const bayarNominal = ref(0)
  const showSearch = ref(false)

  const total = computed(() => cart.value.reduce((s, c) => s + c.price_sell * c.cartQty, 0))
  const kembalian = computed(() => Math.max(0, (bayarNominal.value || 0) - total.value))
  const kurangBayar = computed(() => Math.max(0, total.value - (bayarNominal.value || 0)))

  const bayarDisplay = computed({
    get: () => bayarNominal.value? formatRibuan(bayarNominal.value) : '',
    set: (val) => {
      const num = parseInt(String(val).replace(/\D/g, '') || '0', 10)
      bayarNominal.value = num
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
    const idx = cart.value.findIndex(c => c.id === p.id)
    if (idx > -1) {
      cart.value[idx].cartQty++
      const item = cart.value.splice(idx, 1)[0]
      cart.value.unshift(item)
    } else {
      cart.value.unshift({...p, cartQty: 1 })
    }
    q.value = ''
    showSearch.value = false
  }

  const inc = (i) => {
    cart.value[i].cartQty++
  }

  const dec = (i) => {
    cart.value[i].cartQty--
    if (cart.value[i].cartQty <= 0) cart.value.splice(i, 1)
  }

  const checkout = async () => {
    if (paymentMethod.value === 'TEMPO' &&!selectedMember.value) throw new Error('Pilih member untuk TEMPO')
    if (paymentMethod.value === 'CASH' && bayarNominal.value < total.value) throw new Error('Nominal kurang')

    const res = await kasirService.checkout({
      cart: cart.value,
      member: selectedMember.value,
      paymentMethod: paymentMethod.value,
      amountPaid: paymentMethod.value === 'TEMPO'? 0 : paymentMethod.value === 'QRIS'? total.value : bayarNominal.value
    })
    cart.value = []
    bayarNominal.value = 0
    return res
  }

  return {
    q, memberQ, products, filteredProducts, filteredMembers,
    cart, total, kembalian, kurangBayar, bayarNominal, bayarDisplay,
    paymentMethod, selectedMember, showSearch,
    load, addToCart, inc, dec, checkout
  }
}