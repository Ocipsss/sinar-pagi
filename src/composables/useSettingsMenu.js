// src/composables/useSettingsMenu.js - FIX JASA KHUSUS MULTI-PRODUK GA MUNCUL DI UMUM
import { ref } from 'vue'
import { productRepo } from '../db/repositories/productRepository.js'
import { packageRepository } from '../db/repositories/packageRepository.js'
import { serviceRepository } from '../db/repositories/serviceRepository.js'
import { categoryRepo } from '../db/repositories/categoryRepository.js'

export function useSettingsMenu() {
  const allProducts = ref([])
  const rokokProducts = ref([])
  const packages = ref([])
  const services = ref([])
  const categoryOptions = ref([])
  const loading = ref(false)

  // Helper: ambil semua productId dari service (support lama productId & baru productIds)
  const getServiceIds = (s) => {
    if (s.productIds && Array.isArray(s.productIds) && s.productIds.length) return s.productIds
    if (s.productId) return [s.productId]
    return []
  }

  const loadData = async () => {
    loading.value = true
    try {
      const [allProductsData, allPackages, allServices, allCategories] = await Promise.all([
        productRepo.getAll(),
        packageRepository.getAll(),
        serviceRepository.getAll(),
        categoryRepo.getAll()
      ])
      
      allProducts.value = [...allProductsData].sort((a,b) => (a.name||'').localeCompare(b.name||'', 'id'))

      const packageCategories = ['rokok', 'permen']
      rokokProducts.value = allProductsData
        .filter(p => {
          const cat = (p.category || '').toLowerCase()
          return packageCategories.some(k => cat.includes(k))
        })
        .sort((a, b) => {
          const catCompare = (a.category || '').localeCompare(b.category || '')
          if (catCompare !== 0) return catCompare
          return (a.name || '').localeCompare(b.name || '')
        })

      packages.value = allPackages
      services.value = allServices
      categoryOptions.value = [...allCategories].sort((a, b) => 
        (a.name || '').localeCompare(b.name || '', 'id')
      )
    } finally {
      loading.value = false
    }
  }

  const getPackagesForProduct = (productId) => {
    return packages.value.filter(pkg => pkg.productId === productId)
  }

  const getServicesForProduct = (product) => {
  if(!product) return []
  const pCat = (product.category || '').toUpperCase()

  const custom = services.value.filter(s => {
    const ids = getServiceIds(s)
    return ids.length > 0 && ids.includes(product.id)
  })
  if (custom.length > 0) return custom

  return services.value.filter(s => {
    const ids = getServiceIds(s)
    return ids.length === 0 && (s.category || '').toUpperCase() === pCat
  })
}

  const getProductById = (id) => allProducts.value.find(p => p.id === id)

  const savePackage = async (pkgData) => {
    await packageRepository.savePackage(pkgData)
    await loadData()
  }
  const deletePackage = async (id) => {
    await packageRepository.deletePackage(id)
    await loadData()
  }

  const saveService = async (serviceData) => {
    // PLAIN CLONE BIAR GA DataCloneError (Proxy Vue)
    const plainProductIds = serviceData.productIds 
      ? [...serviceData.productIds] 
      : (serviceData.productId ? [serviceData.productId] : [])

    const normalized = {
      ...JSON.parse(JSON.stringify(serviceData)),
      productId: null, // kita pake productIds aja sekarang
      productIds: plainProductIds
    }
    // buang productId lama biar ga double
    delete normalized.productId_old
    await serviceRepository.saveService(normalized)
    await loadData()
  }

  const deleteService = async (id) => {
    await serviceRepository.deleteService(id)
    await loadData()
  }

  return {
    allProducts,
    rokokProducts,
    packages,
    services,
    categoryOptions,
    loading,
    loadData,
    getPackagesForProduct,
    getServicesForProduct,
    getProductById,
    getServiceIds,
    savePackage,
    deletePackage,
    saveService,
    deleteService
  }
}