import { shoppingRepository } from '../db/repositories/shoppingRepository.js'
import { productRepo } from '../db/repositories/productRepository.js'
import { syncRealtime } from './syncService.js'

export const shoppingService = {
  async getShoppingItems() {
    return await shoppingRepository.getAll()
  },

  async populateLowStockItems() {
    const allProducts = await productRepo.getAll()
    const currentShoppingList = await shoppingRepository.getAll()
    
    // Ambil produk yang stoknya <= minStock
    const lowStockProducts = allProducts.filter(p => (p.qty || 0) <= (p.minStock || 5))
    
    // Filter produk yang belum ada di daftar belanjaan (aktif / belum dibeli)
    const existingProductIds = new Set(
      currentShoppingList.filter(i => !i.isBought).map(i => i.productId).filter(Boolean)
    )

    const itemsToAdd = []
    for (const p of lowStockProducts) {
      if (!existingProductIds.has(p.id)) {
        // Estimasi jumlah yang perlu dibeli = packQty jika ada, atau selisih ke target
        const targetQty = (p.packQty && p.packQty > 0) ? p.packQty : Math.max(10, (p.minStock || 5) * 2 - (p.qty || 0))
        
        itemsToAdd.push({
          productId: p.id,
          name: p.name,
          category: p.category || 'Umum',
          qty: targetQty,
          unit: p.unit || 'pcs',
          estimatedPrice: p.packPrice || (p.price_modal * targetQty) || 0,
          isBought: false,
          notes: `Restock otomatis (Stok sisa: ${p.qty})`
        })
      }
    }

    if (itemsToAdd.length > 0) {
      await shoppingRepository.addBulk(itemsToAdd)
      syncRealtime.pushLocalToCloud()
    }

    return itemsToAdd.length
  },

  async toggleBoughtStatus(item) {
    const newStatus = !item.isBought
    await shoppingRepository.update(item.id, { isBought: newStatus })

    // Jika ditandai "Sudah Dibeli", update stok produk di master produk (jika terhubung ke productId)
    if (newStatus && item.productId) {
      const product = await productRepo.getById(item.productId)
      if (product) {
        // Hitung penambahan stok
        const qtyToAdd = Number(item.qty) || 0
        const updatedQty = (product.qty || 0) + qtyToAdd

        // Jika ada perubahan estimasi harga modal per pcs, perbarui juga jika diset
        const changes = { qty: updatedQty }
        if (item.estimatedPrice && item.qty > 0 && !product.packQty) {
          changes.price_modal = Math.round(item.estimatedPrice / item.qty)
        }

        await productRepo.update(item.productId, changes)
      }
    }

    syncRealtime.pushLocalToCloud()
    return newStatus
  },

  async addShoppingItem(data) {
    const newItem = await shoppingRepository.add({
      productId: data.productId || null,
      name: data.name,
      category: data.category || 'Umum',
      qty: Number(data.qty) || 1,
      unit: data.unit || 'pcs',
      estimatedPrice: Number(data.estimatedPrice) || 0,
      isBought: false,
      notes: data.notes || ''
    })

    syncRealtime.pushLocalToCloud()
    return newItem
  },

  async removeItem(id) {
    await shoppingRepository.delete(id)
    syncRealtime.pushLocalToCloud()
  },

  async clearCompleted() {
    const count = await shoppingRepository.clearBought()
    syncRealtime.pushLocalToCloud()
    return count
  }
}