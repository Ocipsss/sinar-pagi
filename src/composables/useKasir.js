// src/composables/useKasir.js - FIX JASA KHUSUS + SORT PAKET BY ORDER
import { ref, computed, onMounted, onUnmounted, onActivated, onDeactivated } from 'vue'
import { kasirService } from '../services/kasirService.js'
import { salesHistoryService } from '../services/salesHistoryService.js'
import { packageRepository } from '../db/repositories/packageRepository.js'
import { serviceRepository } from '../db/repositories/serviceRepository.js'
import { formatRibuan } from '../utils/formatters/currency.js'
import { useKasirStore } from '../stores/kasirStore.js'
import { useOperatorStore } from '../stores/operatorStore.js'
import { toast } from 'vue-sonner'

export function useKasir() {
  const store = useKasirStore()
  const operatorStore = useOperatorStore()

  const products = ref([])
  const members = ref([])
  const packagesList = ref([])
  const servicesList = ref([])

  const q = ref('')
  const memberQ = ref('')
  const showSearch = ref(false)
  const selectedProductForOption = ref(null)

  // State reaktif untuk metode SPLIT
  const bayarQrisNominal = ref(0)
  const bayarCashNominal = ref(0)

  const total = computed(() => store.cart.reduce((s, c) => s + c.price_sell * c.cartQty, 0))
  const kembalian = computed(() => Math.max(0, (store.bayarNominal || 0) - total.value))
  const kurangBayar = computed(() => Math.max(0, total.value - (store.bayarNominal || 0)))
  
  // Sisa bayar untuk CASH
  const sisaBayar = computed(() => {
    if (store.paymentMethod === 'TEMPO') return total.value
    if (store.paymentMethod === 'QRIS') return 0
    if (store.paymentMethod === 'SPLIT') return splitRemaining.value
    return kurangBayar.value
  })

  // Hitung sisa untuk Split (QRIS + Cash + Tempo)
  const splitRemaining = computed(() => {
    const totalTerbayar = Number(bayarQrisNominal.value || 0) + Number(bayarCashNominal.value || 0)
    return Math.max(0, total.value - totalTerbayar)
  })

  const bayarDisplay = computed({
    get: () => store.bayarNominal ? formatRibuan(store.bayarNominal) : '',
    set: (val) => {
      store.bayarNominal = parseInt(String(val).replace(/\D/g, '') || '0', 10)
    }
  })

  const filteredProducts = computed(() => {
    const qq = q.value.toLowerCase().trim()
    if (!qq) return products.value.slice(0, 15)
    return products.value
      .filter(p => p.name.toLowerCase().includes(qq) || (p.code || '').toLowerCase().includes(qq))
      .sort((a, b) => {
        const nameA = a.name.toLowerCase()
        const nameB = b.name.toLowerCase()
        const idxA = nameA.indexOf(qq)
        const idxB = nameB.indexOf(qq)
        if (idxA !== -1 && idxB !== -1) {
          if (idxA !== idxB) return idxA - idxB
          return nameA.localeCompare(nameB)
        }
        if (idxA !== -1) return -1
        if (idxB !== -1) return 1
        return 0
      })
      .slice(0, 20)
  })

  const filteredMembers = computed(() => {
    const qq = memberQ.value.toLowerCase().trim()
    if (!qq) return members.value.slice(0, 20)
    return members.value.filter(m => m.name.toLowerCase().includes(qq) || (m.phone || '').includes(qq)).slice(0, 20)
  })

  const getServiceIds = (s) => {
    if (s.productIds && Array.isArray(s.productIds) && s.productIds.length) return s.productIds
    if (s.productId) return [s.productId]
    return []
  }

  const filteredServicesByCategory = computed(() => {
    if (!selectedProductForOption.value) return []
    const product = selectedProductForOption.value

    const custom = servicesList.value.filter(s => {
      const ids = getServiceIds(s)
      return ids.length > 0 && ids.includes(product.id)
    })

    if (custom.length > 0) return custom

    const pCat = (product.category || '').toLowerCase()
    return servicesList.value.filter(s => {
      const ids = getServiceIds(s)
      return ids.length === 0 && (s.category || '').toLowerCase() === pCat
    })
  })

  const load = async () => {
    products.value = []
    members.value = []
    packagesList.value = []
    servicesList.value = []

    const [data, packages, services] = await Promise.all([
      kasirService.getInitialData(),
      packageRepository.getAll(),
      serviceRepository.getAll()
    ])
    products.value = data.products
    members.value = data.members
    packagesList.value = [...packages].sort((a,b) => (a.order ?? 999) - (b.order ?? 999))
    servicesList.value = services
    if (!store.editingTransactionId) {
      store.bayarNominal = 0
      bayarQrisNominal.value = 0
      bayarCashNominal.value = 0
    }

    if (import.meta.env.DEV) {
      const foundDeleted = data.products.filter(p => p.deleted)
      console.log(
        `[Kasir.load] Produk aktif dimuat: ${data.products.length}` +
        (foundDeleted.length ? ` | ⚠️ Masih ada ${foundDeleted.length} produk deleted di data!` : '')
      )
    }
  }

  const getProductPackages = (productId) => {
    return packagesList.value
      .filter(pkg => pkg.productId === productId)
      .sort((a,b) => (a.order ?? 999) - (b.order ?? 999))
  }

  const handleSelectProduct = (product) => {
    const pCat = (product.category || '').toLowerCase()
    const hasPackages = getProductPackages(product.id).length > 0

    const hasConfiguredServices = servicesList.value.some(s => {
      const ids = getServiceIds(s)
      return ids.includes(product.id) || (ids.length === 0 && (s.category || '').toLowerCase() === pCat)
    })

    if (hasPackages || hasConfiguredServices) {
      selectedProductForOption.value = product
    } else {
      store.addToCart(product)
      q.value = ''
      showSearch.value = false
    }
  }

  const confirmAddToCart = (product, options) => {
    const targetPrice = (options.price_sell !== undefined) ? options.price_sell : product.price_sell
    store.addToCart({ ...product, price_sell: targetPrice }, options)
    selectedProductForOption.value = null
    showSearch.value = false
    q.value = ''
  }

  const getActiveOperator = () => {
    const op = operatorStore.currentOperator
    if (!op) {
      return { id: null, name: operatorStore.operatorName || 'Kasir' }
    }
    return { id: op.id || null, name: op.name || 'Kasir' }
  }

  const checkout = async () => {
    if (!store.cart || store.cart.length === 0) {
      throw new Error('Keranjang belanja masih kosong!')
    }

    // ✅ VALIDASI: Split tender / Tempo wajib pilih member jika ada sisa
    if (store.paymentMethod === 'TEMPO' && !store.selectedMember) {
      throw new Error('Pilih member untuk metode pembayaran TEMPO')
    }
    if (store.paymentMethod === 'CASH' && store.bayarNominal < total.value && !store.selectedMember) {
      throw new Error('Pilih member jika uang tunai kurang dari total (Split Payment / Tempo)')
    }
    if (store.paymentMethod === 'SPLIT' && splitRemaining.value > 0 && !store.selectedMember) {
      throw new Error('Pilih member jika total QRIS + Cash kurang dari total belanja (Split Tender)')
    }

    const finalAmountPaid =
      store.paymentMethod === 'TEMPO'
        ? 0
        : store.paymentMethod === 'QRIS'
          ? total.value
          : store.paymentMethod === 'SPLIT'
            ? (Number(bayarQrisNominal.value) + Number(bayarCashNominal.value))
            : (Number(store.bayarNominal) || 0)

    const finalChange =
      store.paymentMethod === 'CASH'
        ? Math.max(0, finalAmountPaid - total.value)
        : store.paymentMethod === 'SPLIT'
          ? Math.max(0, finalAmountPaid - total.value)
          : 0

    const activeOperator = getActiveOperator()

    if (store.editingTransactionId) {
      // ✅ FIX: Mode Edit sekarang mengirim data pembayaran lengkap (termasuk Split Tender)
      const originalTrx = {
        id: store.editingTransactionId,
        paymentMethod: store.paymentMethod,
        memberId: store.selectedMember?.id || null,
        total: total.value
      }
      const updatedItems = store.cart.map(item => ({
        productId: item.id,
        productName: item.name,
        price: item.price_sell,
        qty: item.cartQty,
        serviceId: item.isServed ? 'SERVICE_SEDUH' : null
      }))
      const newPaymentData = {
        paymentMethod: store.paymentMethod,
        memberId: store.selectedMember?.id || null,
        amountPaid: finalAmountPaid,
        change: finalChange,
        amountQris: store.paymentMethod === 'SPLIT' ? Number(bayarQrisNominal.value) : 0,
        amountCash: store.paymentMethod === 'SPLIT' ? Number(bayarCashNominal.value) : 0
      }
      const res = await salesHistoryService.updateTransaction(originalTrx, updatedItems, newPaymentData)
      store.clearCart()
      return res
    }

    const res = await kasirService.checkout({
      cart: store.cart,
      member: store.selectedMember,
      paymentMethod: store.paymentMethod,
      operator: activeOperator,
      amountPaid: finalAmountPaid,
      change: finalChange,
      amountQris: store.paymentMethod === 'SPLIT' ? Number(bayarQrisNominal.value) : 0,
      amountCash: store.paymentMethod === 'SPLIT' ? Number(bayarCashNominal.value) : 0
    })
    store.clearCart()
    return res
  }

  let barcodeBuffer = ''
  let lastKeyTime = Date.now()

  const processBarcodeScan = (codeToScan) => {
    if (!codeToScan) return false
    const cleanCode = String(codeToScan).trim().toLowerCase()
    const matchedProduct = products.value.find(
      p => String(p.code || '').trim().toLowerCase() === cleanCode
    ) || products.value.find(
      p => String(p.name || '').trim().toLowerCase() === cleanCode
    )
    if (matchedProduct) {
      handleSelectProduct(matchedProduct)
      q.value = ''
      showSearch.value = false
      return true
    } else {
      toast.error(`Barang tidak ditemukan (${codeToScan})`)
      return false
    }
  }

  const handleGlobalKeydown = (e) => {
    if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(e.key)) return
    const activeEl = document.activeElement
    const isTypingInInput = activeEl && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName)
    const isKasirSearchInput = activeEl && activeEl.id === 'kasir-search-input'
    if (isTypingInInput && !isKasirSearchInput) return
    const currentTime = Date.now()
    if (currentTime - lastKeyTime > 50) barcodeBuffer = ''
    if (e.key === 'Enter') {
      if (isKasirSearchInput && q.value.trim().length > 0) {
        e.preventDefault()
        const codeToScan = q.value.trim()
        barcodeBuffer = ''
        processBarcodeScan(codeToScan)
      } else if (barcodeBuffer.trim().length > 0) {
        e.preventDefault()
        const scannedCode = barcodeBuffer.trim()
        barcodeBuffer = ''
        processBarcodeScan(scannedCode)
      }
    } else if (e.key.length === 1) {
      if (!isTypingInInput || (currentTime - lastKeyTime < 30)) {
        barcodeBuffer += e.key
      }
    }
    lastKeyTime = currentTime
  }

  const attachListener = () => {
    window.removeEventListener('keydown', handleGlobalKeydown)
    window.addEventListener('keydown', handleGlobalKeydown)
  }
  const detachListener = () => {
    window.removeEventListener('keydown', handleGlobalKeydown)
  }

  onMounted(attachListener)
  onUnmounted(detachListener)
  onActivated(attachListener)
  onDeactivated(detachListener)

  return {
    store,
    operatorStore,
    q, 
    memberQ, 
    products, 
    filteredProducts, 
    filteredMembers,
    total, 
    kembalian, 
    kurangBayar, 
    sisaBayar,
    splitRemaining,
    bayarQrisNominal,
    bayarCashNominal,
    bayarDisplay, 
    showSearch,
    selectedProductForOption, 
    filteredServicesByCategory,
    load, 
    handleSelectProduct, 
    confirmAddToCart, 
    getProductPackages, 
    checkout,
    processBarcodeScan
  }
}