// src/composables/useSettingsMenu.js
import { ref } from 'vue'
import { productRepo } from '../db/repositories/productRepository.js'
import { packageRepository } from '../db/repositories/packageRepository.js'
import { serviceRepository } from '../db/repositories/serviceRepository.js'
import { categoryRepo } from '../db/repositories/categoryRepository.js'

export function useSettingsMenu() {
  const rokokProducts = ref([]) // Menampung produk Rokok & Permen
  const packages = ref([])
  const services = ref([])
  const categoryOptions = ref([])
  const loading = ref(false)

  const loadData = async () => {
    loading.value = true
    try {
      const [allProducts, allPackages, allServices, allCategories] = await Promise.all([
        productRepo.getAll(),
        packageRepository.getAll(),
        serviceRepository.getAll(),
        categoryRepo.getAll()
      ])
      
      // Filter produk dengan kategori Rokok atau Permen
      const packageCategories = ['rokok', 'permen']
      rokokProducts.value = allProducts.filter(p => 
        packageCategories.includes((p.category || '').toLowerCase())
      )

      packages.value = allPackages
      services.value = allServices
      categoryOptions.value = allCategories
    } finally {
      loading.value = false
    }
  }

  const getPackagesForProduct = (productId) => {
    return packages.value.filter(pkg => pkg.productId === productId)
  }

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
    rokokProducts,
    packages,
    services,
    categoryOptions,
    loading,
    loadData,
    getPackagesForProduct,
    savePackage,
    deletePackage,
    saveService,
    deleteService
  }
}
