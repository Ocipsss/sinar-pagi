import { ref } from 'vue'
import { formatDisplay, parseNumber } from '../utils/currency.js'
import { calcModalDariPack } from '../utils/calculator/product.js'

export function useProductForm() {
  const product = ref({
    id: '', image: null, name: '', code: '', category: 'Umum',
    unit: 'pcs', price_modal: 0, price_sell: 0, qty: 0, pack_price: 0, pack_size: 1
  })
  const display = ref({ modal: "", sell: "", pack: "" })

  const updateNumber = (field, event) => {
    const num = parseNumber(event.target.value)
    product.value[field] = num

    if (field === 'price_modal') display.value.modal = formatDisplay(num)
    if (field === 'price_sell') display.value.sell = formatDisplay(num)
    if (field === 'pack_price') {
      display.value.pack = formatDisplay(num)
      if (product.value.pack_size > 0) {
        const m = calcModalDariPack(num, product.value.pack_size)
        product.value.price_modal = m
        display.value.modal = formatDisplay(m)
      }
    }
  }

  const updatePackSize = () => {
    if (product.value.pack_price && product.value.pack_size) {
      const m = calcModalDariPack(product.value.pack_price, product.value.pack_size)
      product.value.price_modal = m
      display.value.modal = formatDisplay(m)
    }
  }

  const resetForm = () => {
    product.value = { id: '', image: null, name: '', code: '', category: 'Umum', unit: 'pcs', price_modal: 0, price_sell: 0, qty: 0, pack_price: 0, pack_size: 1 }
    display.value = { modal: "", sell: "", pack: "" }
  }

  return { product, display, updateNumber, updatePackSize, resetForm }
}