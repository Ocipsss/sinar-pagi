// KHUSUS Laporan
export const hitungUntung = (jual, modal) => jual - modal
export const hitungMargin = (jual, modal) => {
  if (!modal) return 0
  return Math.round((jual - modal) / modal * 100)
}
export const hitungOmzet = (transactions) => transactions.reduce((sum, t) => sum + t.total, 0)
export const hitungLabaBersih = (omzet, modalTotal, expenses) => omzet - modalTotal - expenses