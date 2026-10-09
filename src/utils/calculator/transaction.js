// KHUSUS Kasir
export const hitungSubtotal = (qty, price) => qty * price
export const hitungTotalBelanja = (items) => items.reduce((sum, i) => sum + (i.qty * i.price), 0)
export const hitungDiskon = (total, persen) => Math.round(total * persen / 100)
export const hitungKembalian = (bayar, total) => bayar - total