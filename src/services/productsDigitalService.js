// src/services/productsDigitalService.js
import { db } from '../db/index.js'
import { financeRepo } from '../db/repositories/financeRepository.js'

export const productsDigitalService = {
  async create(data) {
    const now = new Date().toISOString()
    const id = crypto.randomUUID()
    const nominal = Number(data.nominal) || 0
    const adminFee = Number(data.adminFee) || 0
    const isTopup = data.type === 'topup'
    const isCashAdmin = data.adminPaymentMethod === 'cash'

    const doc = {
      id,
      date: now,
      updatedAt: now,
      type: data.type,
      provider: data.provider?.toUpperCase().trim(),
      nominal,
      adminFee,
      adminPaymentMethod: data.adminPaymentMethod,
      totalReceived: isTopup && isCashAdmin ? nominal + adminFee : nominal,
      profit: adminFee,
      synced: 0
    }

    const result = await db.digital_transactions.add(doc)

    if (isTopup) {
      // TOP UP:
      // 1. Uang Tunai Masuk Laci (Selalu sebesar Nominal Tunai yang diterima dari pelanggan)
      const cashIn = nominal + (isCashAdmin ? adminFee : 0)
      if (cashIn > 0) {
        await financeRepo.addMutation({
          accountId: 'acc_cash',
          type: 'IN',
          amount: cashIn,
          category: 'Transaksi Digital',
          note: `Top Up ${doc.provider} (Uang Diterima)`,
          refId: id
        })
      }

      // 2. Saldo Rekening/Bank Terpotong
      // Jika Admin Potong Saldo: Bank terpotong = Nominal - Admin (misal 20rb - 2rb = 18rb)
      // Jika Admin Tunai: Bank terpotong = Nominal Utuh (20rb)
      const bankOut = isCashAdmin ? nominal : Math.max(0, nominal - adminFee)
      await financeRepo.addMutation({
        accountId: 'acc_bank',
        type: 'OUT',
        amount: bankOut,
        category: 'Transaksi Digital',
        note: `Modal Top Up ${doc.provider}`,
        refId: id
      })
    } else {
      // TARIK TUNAI:
      // 1. Uang Tunai Keluar dari Laci
      const cashOut = nominal - (isCashAdmin ? adminFee : 0)
      if (cashOut > 0) {
        await financeRepo.addMutation({
          accountId: 'acc_cash',
          type: 'OUT',
          amount: cashOut,
          category: 'Transaksi Digital',
          note: `Tarik Tunai ${doc.provider} (Uang Diserahkan)`,
          refId: id
        })
      }

      // 2. Saldo Rekening/Bank Bertambah
      const bankIn = isCashAdmin ? nominal : nominal + adminFee
      await financeRepo.addMutation({
        accountId: 'acc_bank',
        type: 'IN',
        amount: bankIn,
        category: 'Transaksi Digital',
        note: `Masuk Saldo Tarik Tunai ${doc.provider}`,
        refId: id
      })
    }

    return result
  },

  async getUnsynced() {
    return await db.digital_transactions.where('synced').equals(0).toArray()
  },

  async markSynced(ids) {
    return await db.digital_transactions.bulkUpdate(
      ids.map(id => ({ key: id, changes: { synced: 1 } }))
    )
  },

  async getAll() {
    return await db.digital_transactions.orderBy('date').reverse().toArray()
  }
}
