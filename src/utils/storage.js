export const saveLocal = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value))
}
export const getLocal = (key) => {
  try { return JSON.parse(localStorage.getItem(key)) } catch { return null }
}
export const removeLocal = (key) => localStorage.removeItem(key)