import { db } from '../index.js'
import dayjs from 'dayjs'

export const transactionRepo = {
  getAll: () => db.transactions.toArray(),
  getToday: () => db.transactions.where('date').aboveOrEqual(dayjs().startOf('day').toISOString()).toArray(),
  create: (data) => db.transactions.add(data),

  // Ambil transaksi lengkap dengan item dan nama member
  getWithDetails: async () => {
    const transactions = await db.transactions.orderBy('date').reverse().toArray()
    const members = await db.members.toArray()
    const products = await db.products.toArray()
    const allItems = await db.transaction_items.toArray()

    const memberMap = new Map(members.map(m => [m.id, m.name]))
    const productMap = new Map(products.map(p => [p.id, p.name]))

    return transactions.map(t => {
      const items = allItems
        .filter(item => item.transactionId === t.id)
        .map(item => ({
          ...item,
          productName: productMap.get(item.productId) || 'Produk Dihapus'
        }))

      return {
        ...t,
        memberName: t.memberId ? (memberMap.get(t.memberId) || 'Member Tidak Ditemukan') : 'Umum / Non-Member',
        items
      }
    })
  }
}
