export const calcModalDariPack = (packPrice, packSize) => {
  if(!packPrice ||!packSize) return 0
  return Math.round(packPrice / packSize)
}

export const getBarangTipis = (products) => products.filter(p => (p.qty || 0) <= (p.min_stock || 5))

export const hitungEstimasiBelanja = (products, target = 30) => {
  const tipis = getBarangTipis(products)
  let grandTotal = 0
  const list = tipis.map(p => {
    const butuh = Math.max(0, target - p.qty)
    const butuhPack = p.pack_size > 1? Math.ceil(butuh / p.pack_size) : butuh
    const totalModal = butuhPack * (p.pack_price || p.price_modal * (p.pack_size||1))
    grandTotal += totalModal
    return {...p, butuh, butuhPack, totalModal, checked: true }
  })
  return { list, grandTotal }
}