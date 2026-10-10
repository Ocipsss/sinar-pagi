import { ref, computed } from 'vue'
import { productRepo } from '../db/repositories/productRepository.js'
import { packageRepository } from '../db/repositories/packageRepository.js'
import { serviceRepository } from '../db/repositories/serviceRepository.js'
import { syncRealtime } from '../services/syncService.js'

export function useSettingsMenu() {
  const rokokProducts = ref([])
  const packages = ref([])
  const services = ref([])
  const loading = ref(false)

  const loadData = async () => {
    loading.value = true
    try {
      const [allProducts, allPackages, allServices] = await Promise.all([
        productRepo.getAll(),
        packageRepository.getAll(),
        serviceRepository.getAll()
      ])
      
      // Filter khusus produk kategori Rokok
      rokokProducts.value = allProducts.filter(p => (p.category || '').toLowerCase() === 'rokok')
      packages.value = allPackages
      services.value = allServices
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
    syncRealtime.pushLocalToCloud()
  }

  const deletePackage = async (id) => {
    await packageRepository.deletePackage(id)
    await loadData()
    syncRealtime.pushLocalToCloud()
  }

  const saveService = async (serviceData) => {
    await serviceRepository.saveService(serviceData)
    await loadData()
    syncRealtime.pushLocalToCloud()
  }

  const deleteService = async (id) => {
    await serviceRepository.deleteService(id)
    await loadData()
    syncRealtime.pushLocalToCloud()
  }

  return {
    rokokProducts,
    packages,
    services,
    loading,
    loadData,
    getPackagesForProduct,
    savePackage,
    deletePackage,
    saveService,
    deleteService
  }
}
