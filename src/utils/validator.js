export const isWajib = (val) => val !== null && val !== '' && val !== undefined
export const isHargaValid = (modal, jual) => {
  if (jual < modal) return { valid: false, msg: 'Harga jual lebih kecil dari modal!' }
  return { valid: true }
}
export const isStokValid = (qty) => qty >= 0