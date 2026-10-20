// src/composables/useKasir.js
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

    return products.value
      .filter(p => {
        const nameMatch = p.name.toLowerCase().includes(qq)
        const codeMatch = (p.code || '').toLowerCase().includes(qq)
        return nameMatch || codeMatch
      })
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

  const filteredServicesByCategory = computed(() => {
    if (!selectedProductForOption.value) return []
    const pCat = (selectedProductForOption.value.category || '').toLowerCase()
    return servicesList.value.filter(s => (s.category || '').toLowerCase() === pCat)
  })

  const load = async () => {
    const [data, packages, services] = await Promise.all([
      kasirService.getInitialData(),
      packageRepository.getAll(),
      serviceRepository.getAll()
    ])
    products.value = data.products
    members.value = data.members
    packagesList.value = packages
    servicesList.value = services

    // Jangan reset bayarNominal jika sedang dalam mode edit transaksi
    if (!store.editingTransactionId) {
      store.bayarNominal = 0
    }
  }

  const getProductPackages = (productId) => {
    return packagesList.value.filter(pkg => pkg.productId === productId)
  }

  const handleSelectProduct = (product) => {
    const pCat = (product.category || '').toLowerCase()
    const isPackageCategory = ['rokok', 'permen'].includes(pCat)
    const hasPackages = getProductPackages(product.id).length > 0
    const hasConfiguredServices = servicesList.value.some(s => (s.category || '').toLowerCase() === pCat)

    if ((isPackageCategory && hasPackages) || (!isPackageCategory && hasConfiguredServices)) {
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

  const checkout = async () => {
    if (store.paymentMethod === 'TEMPO' && !store.selectedMember) throw new Error('Pilih member untuk TEMPO')
    if (store.paymentMethod === 'CASH' && store.bayarNominal < total.value) throw new Error('Nominal kurang')

    // 1. JIKA MODE EDIT TRANSAKSI
    if (store.editingTransactionId) {
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

      // Sertakan metode bayar, member, dan nominal bayar terbaru yang dipilih kasir
      const newPaymentData = {
        paymentMethod: store.paymentMethod,
        memberId: store.selectedMember?.id || null,
        amountPaid: store.paymentMethod === 'TEMPO' ? 0 : store.paymentMethod === 'QRIS' ? total.value : store.bayarNominal
      }

      const res = await salesHistoryService.updateTransaction(originalTrx, updatedItems, newPaymentData)
      store.clearCart()
      return res
    }

    // 2. JIKA TRANSAKSI BARU
    const res = await kasirService.checkout({
      cart: store.cart,
      member: store.selectedMember,
      paymentMethod: store.paymentMethod,
      operator: operatorStore.activeOperator,
      amountPaid: store.paymentMethod === 'TEMPO' ? 0 : store.paymentMethod === 'QRIS' ? total.value : store.bayarNominal
    })
    store.clearCart()
    return res
  }

  // --- LOGIKA SCANNER BARCODE FISIK (HID MODE) ---
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
    const isTypingInInput = activeEl && (
      activeEl.tagName === 'INPUT' || 
      activeEl.tagName === 'TEXTAREA' || 
      activeEl.tagName === 'SELECT'
    )

    const isKasirSearchInput = activeEl && activeEl.id === 'kasir-search-input'
    if (isTypingInInput && !isKasirSearchInput) return

    const currentTime = Date.now()

    if (currentTime - lastKeyTime > 50) {
      barcodeBuffer = ''
    }

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

  onMounted(() => {
    attachListener()
  })

  onUnmounted(() => {
    detachListener()
  })

  onActivated(() => {
    attachListener()
  })

  onDeactivated(() => {
    detachListener()
  })

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
