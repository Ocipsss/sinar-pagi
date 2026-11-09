// src/db/repositories/financeRepository.js
import { db } from '../index.js'
import dayjs from 'dayjs'

export const financeRepo = {
  async getAccounts() {
    const table = db.cash_accounts || db.table('cash_accounts')
    let accounts = await table.toArray()
    
    if (accounts.length === 0) {
      const defaultAccounts = [
        { id: 'acc_cash', name: 'Kas Laci (Tunai)', type: 'CASH', balance: 0, updatedAt: dayjs().toISOString(), synced: 0 },
        { id: 'acc_bank', name: 'Rekening / QRIS / Wallet', type: 'BANK', balance: 0, updatedAt: dayjs().toISOString(), synced: 0 }
      ]
      await table.bulkPut(defaultAccounts)
      accounts = defaultAccounts
    } else {
      const digitalAcc = accounts.find(a => a.id === 'acc_digital')
      if (digitalAcc) {
        await table.delete('acc_digital')
        accounts = accounts.filter(a => a.id !== 'acc_digital')
      }
    }
    return accounts
  },

  async getTotalPiutang() {
    const members = await db.members.toArray()
    return members.reduce((sum, m) => sum + (Number(m.debt) || 0), 0)
  },

  async updateBalance(accountId, deltaAmount) {
    const table = db.cash_accounts || db.table('cash_accounts')
    const targetId = accountId === 'acc_digital' ? 'acc_bank' : accountId
    const acc = await table.get(targetId)
    if (acc) {
      const newBalance = (acc.balance || 0) + deltaAmount
      await table.update(targetId, { balance: newBalance, updatedAt: dayjs().toISOString(), synced: 0 })
    }
  },

  async setInitialBalance(accountId, targetBalance, note = 'Set Saldo Awal') {
    const targetId = accountId === 'acc_digital' ? 'acc_bank' : accountId
    const table = db.cash_accounts || db.table('cash_accounts')
    const acc = await table.get(targetId)
    if (!acc) return

    const currentBalance = acc.balance || 0
    const diff = targetBalance - currentBalance

    if (diff !== 0) {
      await this.addMutation({
        accountId: targetId,
        type: diff > 0 ? 'IN' : 'OUT',
        amount: Math.abs(diff),
        category: 'Penyesuaian Saldo',
        note
      })
    }
  },

  async getMutations() {
    const table = db.cash_mutations || db.table('cash_mutations')
    return await table.orderBy('date').reverse().toArray()
  },

  async addMutation(data) {
    const id = crypto.randomUUID()
    const now = dayjs().toISOString()
    const targetAccId = data.accountId === 'acc_digital' ? 'acc_bank' : data.accountId

    const item = {
      id,
      date: now,
      accountId: targetAccId,
      type: data.type, // 'IN' atau 'OUT'
      amount: Number(data.amount) || 0,
      category: data.category || 'Lainnya',
      note: data.note || '',
      refId: data.refId || null,
      updatedAt: now,
      synced: 0
    }
    
    const table = db.cash_mutations || db.table('cash_mutations')
    await table.add(item)

    const delta = data.type === 'IN' ? item.amount : -item.amount
    await this.updateBalance(targetAccId, delta)

    return id
  },

  // HITUNG ULANG SALDO DARI SELURUH RIWAYAT
  async recalculateFromHistory() {
    const transactions = await db.transactions.toArray()
    const digitalTrx = await db.digital_transactions.toArray()
    const expenses = await db.expenses.toArray()
    const debtPayments = await db.debt_payments.toArray()
    const mutationsTable = db.cash_mutations || db.table('cash_mutations')
    const accountsTable = db.cash_accounts || db.table('cash_accounts')
    
    // 1. Bersihkan semua mutasi lama dan reset saldo ke 0
    await mutationsTable.clear()
    await this.getAccounts()
    await accountsTable.update('acc_cash', { balance: 0 })
    await accountsTable.update('acc_bank', { balance: 0 })

    // 2. Olah transaksi Kasir (Barang) - ABAIKAN VOID
    for (const t of transactions) {
      if (t.status === 'void' || t.status === 'CANCELLED') continue

      if (t.paymentMethod === 'CASH' && (t.amountPaid > 0 || t.paidAmount > 0 || t.total > 0)) {
        // Uang masuk ke laci = uang yang dibayarkan - kembalian
        const bayar = Number(t.amountPaid || t.paidAmount || t.total || 0)
        const kembali = Number(t.change || 0)
        const cashIn = Math.max(0, bayar - kembali)

        if (cashIn > 0) {
          await this.addMutation({
            accountId: 'acc_cash',
            type: 'IN',
            amount: cashIn,
            category: 'Penjualan Toko',
            note: `Transaksi Kasir #${t.id.slice(0, 8)}`,
            refId: t.id
          })
        }
      } else if (t.paymentMethod === 'QRIS' && t.total > 0) {
        await this.addMutation({
          accountId: 'acc_bank',
          type: 'IN',
          amount: t.total,
          category: 'Penjualan Toko',
          note: `Transaksi QRIS #${t.id.slice(0, 8)}`,
          refId: t.id
        })
      }
    }

    // 3. Olah transaksi Produk Digital
    for (const d of digitalTrx) {
      if (d.status === 'CANCELLED') continue
      
      const isTopup = d.type === 'topup'
      const isCashAdmin = d.adminPaymentMethod === 'cash'

      if (isTopup) {
        const cashIn = d.nominal + (isCashAdmin ? d.adminFee : 0)
        if (cashIn > 0) {
          await this.addMutation({
            accountId: 'acc_cash', type: 'IN', amount: cashIn,
            category: 'Transaksi Digital', note: `Top Up ${d.provider}`, refId: d.id
          })
        }
        const bankOut = isCashAdmin ? d.nominal : Math.max(0, d.nominal - d.adminFee)
        await this.addMutation({
          accountId: 'acc_bank', type: 'OUT', amount: bankOut,
          category: 'Transaksi Digital', note: `Modal Top Up ${d.provider}`, refId: d.id
        })
      } else {
        const cashOut = d.nominal - (isCashAdmin ? d.adminFee : 0)
        if (cashOut > 0) {
          await this.addMutation({
            accountId: 'acc_cash', type: 'OUT', amount: cashOut,
            category: 'Transaksi Digital', note: `Tarik Tunai ${d.provider}`, refId: d.id
          })
        }
        const bankIn = isCashAdmin ? d.nominal : d.nominal + d.adminFee
        await this.addMutation({
          accountId: 'acc_bank', type: 'IN', amount: bankIn,
          category: 'Transaksi Digital', note: `Masuk Saldo Tarik Tunai ${d.provider}`, refId: d.id
        })
      }
    }

    // 4. Olah Pengeluaran Operasional (Expenses)
    for (const e of expenses) {
      const targetAcc = e.paymentMethod === 'QRIS' ? 'acc_bank' : 'acc_cash'
      if (e.amount > 0) {
        await this.addMutation({
          accountId: targetAcc, type: 'OUT', amount: e.amount,
          category: `Operasional: ${e.category}`, note: e.note || e.category, refId: e.id
        })
      }
    }

    // 5. Olah Pelunasan Utang Member (Debt Payments)
    for (const dp of debtPayments) {
      const targetAcc = (dp.paymentMethod === 'QRIS' || dp.paymentMethod === 'BANK') ? 'acc_bank' : 'acc_cash'
      if (dp.amount > 0) {
        await this.addMutation({
          accountId: targetAcc, type: 'IN', amount: dp.amount,
          category: 'Pembayaran Utang Member', note: `Pelunasan utang #${dp.id.slice(0, 8)}`, refId: dp.id
        })
      }
    }
  }
}