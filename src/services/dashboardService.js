import { productRepo } from '../db/repositories/productRepository.js'
import { transactionRepo } from '../db/repositories/transactionRepository.js'
import { memberRepo } from '../db/repositories/memberRepository.js'
import { getBarangTipis } from '../utils/calculator/product.js'
import dayjs from 'dayjs'

export const dashboardService = {
  async getDashboardData() {
    const [products, transactions, members] = await Promise.all([
      productRepo.getAll(),
      transactionRepo.getAll(),
      memberRepo.getAll()
    ])

    const tipis = getBarangTipis(products)
    const startToday = dayjs().startOf('day').toISOString()
    const trxToday = transactions.filter(t => t.date >= startToday)

    const days = Array.from({length:7}, (_,i) => dayjs().subtract(6-i,'day'))
    const chartRaw = days.map(d => {
      const start = d.startOf('day').toISOString()
      const end = d.endOf('day').toISOString()
      const total = transactions.filter(t=> t.date>=start && t.date<=end).reduce((s,t)=>s+(t.total||0),0)
      return { label: d.format('DD MMM'), value: total, date: d }
    })

    return {
      products,
      tipis,
      trxToday,
      transactions,
      members,
      stats: {
        totalProducts: products.length,
        lowStock: tipis.length,
        trxHariIni: trxToday.length,
        omzetHariIni: trxToday.reduce((s,t)=>s+(t.total||0),0),
        totalPiutang: transactions.filter(t=>(t.remaining||0)>0).reduce((s,t)=>s+t.remaining,0),
        memberBerutang: members.filter(m=>(m.debt||0)>0).length
      },
      chartRaw
    }
  }
}