// src/services/expenseService.js
import { db } from '../db/index.js'
import { expenseRepository } from '../db/repositories/expenseRepository.js'
import { financeRepo } from '../db/repositories/financeRepository.js'
import dayjs from 'dayjs'

export const expenseService = {
  async getAllExpenses() {
    return await expenseRepository.getAll()
  },

  async addExpense(data) {
    // 1. Simpan data pengeluaran
    const newItem = await expenseRepository.create(data)

    // 2. Potong kas / bank di sistem Keuangan (OUT)
    const accountId = data.paymentMethod === 'QRIS' ? 'acc_bank' : 'acc_cash'
    const accLabel = accountId === 'acc_bank' ? 'Bank / QRIS' : 'Kas Laci'

    await financeRepo.addMutation({
      accountId,
      type: 'OUT',
      amount: newItem.amount,
      category: `Operasional: ${newItem.category}`,
      note: `${newItem.note || newItem.category} (via ${accLabel})`,
      refId: newItem.id
    })

    return newItem
  },

  async deleteExpense(expense) {
    // 1. Hapus data pengeluaran
    await expenseRepository.delete(expense.id)

    // 2. ✅ FIX: Hapus mutasi kas asli (OUT) berdasarkan refId.
    // Ini lebih bersih daripada membuat mutasi IN baru (yang bikin riwayat kotor 
    // dan bikin selisih saat "Hitung Ulang").
    const mutationsTable = db.cash_mutations || db.table('cash_mutations')
    const accountsTable = db.cash_accounts || db.table('cash_accounts')
    const now = dayjs().toISOString()

    // Cari semua mutasi yang terkait dengan ID pengeluaran ini
    const relatedMutations = await mutationsTable.where('refId').equals(expense.id).toArray()
    
    for (const mut of relatedMutations) {
      // Kembalikan saldo akun ke posisi semula (reverse mutasi)
      const acc = await accountsTable.get(mut.accountId)
      if (acc) {
        // Jika mutasi aslinya OUT, maka reverse-nya IN (tambah saldo)
        // Jika mutasi aslinya IN, maka reverse-nya OUT (kurangi saldo)
        const reverseDelta = mut.type === 'OUT' ? mut.amount : -mut.amount
        await accountsTable.update(mut.accountId, {
          balance: (acc.balance || 0) + reverseDelta,
          updatedAt: now,
          synced: 0
        })
      }
      // Hapus baris mutasi dari database
      await mutationsTable.delete(mut.id)
    }
  }
}