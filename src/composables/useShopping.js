import { ref, computed } from 'vue'
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

  // State Modal Tambah Belanjaan
  const showAddModal = ref(false)
  const isCustomItem = ref(false)
  const selectedProduct = ref(null)
  const form = ref({
    productId: null,
    name: '',
    category: 'Umum',
    qty: 1,
    unit: 'pcs',
    estimatedPrice: 0,
    notes: ''
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

  const toggleBought = async (item) => {
    await shoppingService.toggleBoughtStatus(item)
    await loadData()
  }

  const openModal = () => {
    isCustomItem.value = false
    selectedProduct.value = null
    form.value = {
      productId: null,
      name: '',
      category: categories.value[0]?.name || 'Umum',
      qty: 1,
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
    form.value.category = product.category || 'Umum'
    form.value.unit = product.unit || 'pcs'
    form.value.qty = product.packQty || 10
    form.value.estimatedPrice = product.packPrice || (product.price_modal * (product.packQty || 10)) || 0
  }

  const saveItem = async () => {
    if (!form.value.name.trim()) return

    await shoppingService.addShoppingItem(form.value)
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
    isCustomItem,
    selectedProduct,
    form,
    totalItems,
    boughtItemsCount,
    pendingItemsCount,
    estimatedTotalCost,
    boughtTotalCost,
    filteredItems,
    loadData,
    handleAutoRestock,
    toggleBought,
    openModal,
    selectProductForAdd,
    saveItem,
    deleteItem,
    clearCompletedItems,
    exportShoppingListText
  }
}