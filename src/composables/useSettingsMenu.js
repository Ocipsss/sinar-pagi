// src/composables/useSettingsMenu.js - FULL FINAL DRAG & DROP SUPPORT
import { ref, computed } from 'vue'
import { productRepo } from '../db/repositories/productRepository.js'
import { packageRepository } from '../db/repositories/packageRepository.js'
import { serviceRepository } from '../db/repositories/serviceRepository.js'
import { categoryRepo } from '../db/repositories/categoryRepository.js'

export function useSettingsMenu() {
  const allProducts = ref([])
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
      packages.value = [...allPackages].sort((a,b) => (a.order ?? 999) - (b.order ?? 999))
      services.value = allServices
      categoryOptions.value = [...allCategories].sort((a, b) => 
        (a.name || '').localeCompare(b.name || '', 'id')
      )
    } finally {
      loading.value = false
    }
  }

  // ✅ FIX: Produk yang punya minimal 1 varian paket (untuk daftar di tab Harga Paket)
  const packageProducts = computed(() => {
    const productIdsWithPkg = new Set(
      packages.value
        .filter(pkg => !pkg.deleted)
        .map(pkg => pkg.productId)
    )
    return allProducts.value
      .filter(p => productIdsWithPkg.has(p.id))
      .sort((a, b) => {
        const catCompare = (a.category || 'UMUM').localeCompare(b.category || 'UMUM', 'id')
        if (catCompare !== 0) return catCompare
        return (a.name || '').localeCompare(b.name || '', 'id')
      })
  })

  // ✅ FIX: Produk yang BELUM punya paket (untuk picker di form "+ Paket Baru")
  const productsWithoutPackage = computed(() => {
    const productIdsWithPkg = new Set(
      packages.value
        .filter(pkg => !pkg.deleted)
        .map(pkg => pkg.productId)
    )
    return allProducts.value
      .filter(p => !productIdsWithPkg.has(p.id))
      .sort((a, b) => {
        const catCompare = (a.category || 'UMUM').localeCompare(b.category || 'UMUM', 'id')
        if (catCompare !== 0) return catCompare
        return (a.name || '').localeCompare(b.name || '', 'id')
      })
  })

  // ✅ FIX: Kategori yang punya produk berpaket (untuk filter di atas daftar)
  const categoriesWithPackages = computed(() => {
    const cats = new Set()
    packageProducts.value.forEach(p => {
      cats.add((p.category || 'UMUM').toUpperCase())
    })
    return Array.from(cats).sort((a, b) => a.localeCompare(b, 'id'))
  })

  // ✅ FIX: Kategori yang punya produk belum berpaket (untuk picker di form)
  const categoriesWithoutPackage = computed(() => {
    const cats = new Set()
    productsWithoutPackage.value.forEach(p => {
      cats.add((p.category || 'UMUM').toUpperCase())
    })
    return Array.from(cats).sort((a, b) => a.localeCompare(b, 'id'))
  })

  // Produk per kategori (untuk picker setelah kategori dipilih)
  const getProductsByCategoryWithoutPackage = (categoryName) => {
    const cat = (categoryName || '').toUpperCase()
    return productsWithoutPackage.value.filter(
      p => (p.category || 'UMUM').toUpperCase() === cat
    )
  }

  const getPackagesForProduct = (productId) => {
    return packages.value
      .filter(pkg => pkg.productId === productId)
      .sort((a,b) => (a.order ?? 999) - (b.order ?? 999))
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

  const reorderPackages = async (productId, orderedIds) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await packageRepository.updateOrder(orderedIds[i], i)
    }
    await loadData()
  }

  const movePackage = async (pkg, direction) => {
    const list = getPackagesForProduct(pkg.productId)
    const idx = list.findIndex(p => p.id === pkg.id)
    const newIdx = direction === 'up' ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= list.length) return
    const current = list[idx]
    const target = list[newIdx]
    const currentOrder = current.order ?? idx
    const targetOrder = target.order ?? newIdx
    await packageRepository.updateOrder(current.id, targetOrder)
    await packageRepository.updateOrder(target.id, currentOrder)
    await loadData()
  }

  const saveService = async (serviceData) => {
    const plainProductIds = serviceData.productIds 
      ? [...serviceData.productIds] 
      : (serviceData.productId ? [serviceData.productId] : [])

    const normalized = {
      ...JSON.parse(JSON.stringify(serviceData)),
      productId: null,
      productIds: plainProductIds
    }
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
    packageProducts,
    productsWithoutPackage,
    packages,
    services,
    categoryOptions,
    categoriesWithPackages,
    categoriesWithoutPackage,
    loading,
    loadData,
    getPackagesForProduct,
    getProductsByCategoryWithoutPackage,
    getServicesForProduct,
    getProductById,
    getServiceIds,
    savePackage,
    deletePackage,
    movePackage,
    reorderPackages,
    saveService,
    deleteService
  }
}