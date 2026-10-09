export const formatTanggal = (date = new Date()) => {
  return new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}
export const formatJam = (date = new Date()) => {
  return new Date(date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}
export const formatTanggalJam = (date = new Date()) => {
  return `${formatTanggal(date)} ${formatJam(date)}`
}
export const getTodayRange = () => {
  const start = new Date(); start.setHours(0,0,0,0)
  const end = new Date(); end.setHours(23,59,59,999)
  return { start, end }
}
export const toISO = (date = new Date()) => new Date(date).toISOString()