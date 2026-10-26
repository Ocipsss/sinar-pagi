// src/composables/useSettingsMenu.js
import { ref, computed } from 'vue'
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

  // INI KUNCI BUAT KASIR NANTI
  const getServicesForProduct = (product) => {
    if(!product) return []
    // 1. ada jasa khusus produk ini?
    const custom = services.value.filter(s => s.productId === product.id)
    if (custom.length > 0) return custom
    // 2. kalo ga ada, pake jasa umum kategori
    return services.value.filter(s => 
      !s.productId && (s.category || '').toUpperCase() === (product.category || '').toUpperCase()
    )
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
    await serviceRepository.saveService(serviceData)
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
    savePackage,
    deletePackage,
    saveService,
    deleteService
  }
}