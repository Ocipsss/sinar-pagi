import { useForm, useField } from 'vee-validate'
import { productSchema } from '../schemas/product.schema.js'

function toTypedSchema(zodSchema) {
  return {
    parse(values) {
      const r = zodSchema.safeParse(values)
      if (r.success) return {}
      const errs = {}
      r.error.issues.forEach(i => { errs[i.path.join('.')] = i.message })
      return errs
    }
  }
}

export function useProductForm() {
  const { handleSubmit, errors, isSubmitting } = useForm({
    validationSchema: toTypedSchema(productSchema),
    initialValues: {
      name: '',
      code: '',
      category: 'Umum',
      purchasePackName: '',
      packPrice: '',
      packQty: '',
      price_modal: '',
      price_sell: '',
      qty: '',
      minStock: 5
    }
  })

  const { value: name } = useField('name')
  const { value: code } = useField('code')
  const { value: category } = useField('category') // Tambahkan ini
  const { value: purchasePackName } = useField('purchasePackName')
  const { value: packPrice } = useField('packPrice')
  const { value: packQty } = useField('packQty')
  const { value: price_modal } = useField('price_modal')
  const { value: price_sell } = useField('price_sell')
  const { value: qty } = useField('qty')
  const { value: minStock } = useField('minStock')

  return { name, code, category, purchasePackName, packPrice, packQty, price_modal, price_sell, qty, minStock, handleSubmit, errors, isSubmitting }
}
