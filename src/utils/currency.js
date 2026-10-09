export const formatDisplay = (val) => {
  if (!val && val!== 0) return ""
  return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}
export const parseNumber = (str) => parseInt(str.replace(/\D/g, "")) || 0