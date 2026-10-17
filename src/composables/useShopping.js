// src/composables/useShopping.js
import { ref, computed, watch } from 'vue'
import { shoppingService } from '../services/shoppingService.js'
import { productRepo } from '../db/repositories/productRepository.js'
import { categoryRepo } from '../db/repositories/categoryRepository.js'

export function useShopping() {
  const items = ref([])
  const products = ref([])
  const categories = ref([])
  const searchQuery = ref('')
  const activeFilter = ref('ALL') // ALL, PENDING, BOUGHT
  const loading = ref(false)

  // State Modal Tambah Belanjaan & Searchbar Master Produk
  const showAddModal = ref(false)
  const isCustomItem = ref(false)
  const selectedProduct = ref(null)
  const productSearch = ref('')

  const form = ref({
    productId: null,
    name: '',
    category: 'Umum',
    qty: 0,
    unit: 'pcs',
    estimatedPrice: 0,
    notes: ''
  })

  // Watcher: Hitung otomatis estimasi modal berdasarkan input qty & modal per pcs
  watch(
    () => form.value.qty,
    (newQty) => {
      if (selectedProduct.value) {
        const qtyNum = Number(newQty) || 0
        const unitModal = selectedProduct.value.price_modal || 0
        form.value.estimatedPrice = Math.round(unitModal * qtyNum)
      }
    }
  )

  // Filter Master Produk berdasarkan query di modal
  const filteredMasterProducts = computed(() => {
    const q = productSearch.value.toLowerCase().trim()
    if (!q) return []
    return products.value
      .filter(p => p.name.toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q))
      .slice(0, 10)
  })

  // State Modal Konfirmasi Bayar Kulakan
  const showPayModal = ref(false)
  const targetItemForPay = ref(null)
  const payForm = ref({
    actualPrice: 0,
    accountId: 'acc_cash'
  })

  const totalItems = computed(() => items.value.length)
  const boughtItemsCount = computed(() => items.value.filter(i => i.isBought).length)
  const pendingItemsCount = computed(() => items.value.filter(i => !i.isBought).length)
  
  const estimatedTotalCost = computed(() => {
    return items.value.reduce((sum, item) => sum + (Number(item.estimatedPrice) || 0), 0)
  })

  const boughtTotalCost = computed(() => {
    return items.value
      .filter(i => i.isBought)
      .reduce((sum, item) => sum + (Number(item.estimatedPrice) || 0), 0)
  })

  const filteredItems = computed(() => {
    const q = searchQuery.value.toLowerCase().trim()
    return items.value.filter(item => {
      const matchQuery = !q || 
        item.name.toLowerCase().includes(q) || 
        (item.category || '').toLowerCase().includes(q)
      
      const matchFilter = 
        activeFilter.value === 'ALL' ||
        (activeFilter.value === 'PENDING' && !item.isBought) ||
        (activeFilter.value === 'BOUGHT' && item.isBought)

      return matchQuery && matchFilter
    })
  })

  const loadData = async () => {
    loading.value = true
    try {
      const [shoppingData, productData, categoryData] = await Promise.all([
        shoppingService.getShoppingItems(),
        productRepo.getAll(),
        categoryRepo.getAll()
      ])
      items.value = shoppingData
      products.value = productData
      categories.value = categoryData
    } finally {
      loading.value = false
    }
  }

  const handleAutoRestock = async () => {
    loading.value = true
    try {
      const addedCount = await shoppingService.populateLowStockItems()
      await loadData()
      return addedCount
    } finally {
      loading.value = false
    }
  }

  const handleToggleClick = (item) => {
    if (!item.isBought) {
      targetItemForPay.value = item
      payForm.value = {
        actualPrice: item.estimatedPrice || 0,
        accountId: 'acc_cash'
      }
      showPayModal.value = true
    } else {
      if (confirm(`Batalkan status selesai beli "${item.name}"?\nStok barang dan kas/bank akan dikembalikan.`)) {
        submitToggleBought(item, { accountId: 'acc_cash', actualPrice: item.estimatedPrice })
      }
    }
  }

  const submitToggleBought = async (item, options) => {
    await shoppingService.toggleBoughtStatus(item, options)
    showPayModal.value = false
    targetItemForPay.value = null
    await loadData()
  }

  const openModal = () => {
    isCustomItem.value = false
    selectedProduct.value = null
    productSearch.value = '' // Reset searchbar saat modal dibuka
    form.value = {
      productId: null,
      name: '',
      category: categories.value[0]?.name || 'Umum',
      qty: 0,
      unit: 'pcs',
      estimatedPrice: 0,
      notes: ''
    }
    showAddModal.value = true
  }

  const selectProductForAdd = (product) => {
    selectedProduct.value = product
    form.value.productId = product.id
    form.value.name = product.name
    form.value.category = product.category
    form.value.unit = product.unit
    form.value.qty = 0 // Default awal jumlah belanjaan ke 0
    form.value.estimatedPrice = 0 // Default awal estimasi modal ke 0
    productSearch.value = ''
  }

  const saveItem = async () => {
    if (!form.value.name.trim()) return

    await shoppingService.addShoppingItem(form.value)
    productSearch.value = '' // Reset searchbar setelah berhasil simpan
    showAddModal.value = false
    await loadData()
  }

  const deleteItem = async (id) => {
    await shoppingService.removeItem(id)
    await loadData()
  }

  const clearCompletedItems = async () => {
    await shoppingService.clearCompleted()
    await loadData()
  }

  const exportShoppingListText = () => {
    const pending = items.value.filter(i => !i.isBought)
    if (pending.length === 0) return ''

    let text = `*DAFTAR BELANJA KULAKAN SINAR PAGI*\n`
    text += `Tanggal: ${new Date().toLocaleDateString('id-ID')}\n`
    text += `===============================\n\n`

    pending.forEach((item, idx) => {
      text += `${idx + 1}. *${item.name}*\n`
      text += `   • Jumlah: ${item.qty} ${item.unit}\n`
      if (item.estimatedPrice > 0) {
        text += `   • Est. Modal: Rp ${item.estimatedPrice.toLocaleString('id-ID')}\n`
      }
      if (item.notes) {
        text += `   • Catatan: ${item.notes}\n`
      }
      text += `\n`
    })

    text += `===============================\n`
    text += `*Estimasi Total Modal:* Rp ${estimatedTotalCost.value.toLocaleString('id-ID')}\n`

    return text
  }

  return {
    items,
    products,
    categories,
    searchQuery,
    activeFilter,
    loading,
    showAddModal,
    showPayModal,
    targetItemForPay,
    payForm,
    isCustomItem,
    selectedProduct,
    productSearch,
    filteredMasterProducts,
    form,
    totalItems,
    boughtItemsCount,
    pendingItemsCount,
    estimatedTotalCost,
    boughtTotalCost,
    filteredItems,
    loadData,
    handleAutoRestock,
    handleToggleClick,
    submitToggleBought,
    openModal,
    selectProductForAdd,
    saveItem,
    deleteItem,
    clearCompletedItems,
    exportShoppingListText
  }
}
