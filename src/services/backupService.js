// src/services/backupService.js
import { db } from '../db/index.js'
import { firestore } from './firebase.js'
import { collection, getDocs, writeBatch } from 'firebase/firestore'
import dayjs from 'dayjs'

export const backupService = {
  async exportBackup() {
    const backupData = {}
    for (const table of db.tables) {
      backupData[table.name] = await table.toArray()
    }

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Backup_SinarPagi_${dayjs().format('YYYYMMDD_HHmmss')}.json`
    a.click()
    URL.revokeObjectURL(url)
  },

  async importBackup(file) {
    // GUARD 1: Cek Koneksi Internet
    if (!navigator.onLine) {
      throw new Error('Impor backup membutuhkan koneksi internet aktif agar sinkronisasi cloud tetap konsisten.')
    }

    if (!file) return false

    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const rawParsed = JSON.parse(e.target.result)
          const importedData = rawParsed.database || rawParsed

          const tableNames = db.tables.map(t => t.name)
          await db.transaction('rw', tableNames, async () => {
            for (const table of db.tables) {
              await table.clear()
            }

            for (const tableName of Object.keys(importedData)) {
              if (tableName !== 'transactions' && db[tableName]) {
                const rows = importedData[tableName]
                if (Array.isArray(rows) && rows.length > 0) {
                  const preparedRows = rows.map(item => ({
                    ...item,
                    synced: item.synced ?? 0
                  }))
                  await db[tableName].bulkPut(preparedRows)
                }
              }
            }

            if (importedData.transactions && Array.isArray(importedData.transactions)) {
              const transactionsToPut = []
              const itemsToPut = []

              importedData.transactions.forEach(trx => {
                const { items, ...trxData } = trx

                transactionsToPut.push({
                  ...trxData,
                  synced: trxData.synced ?? 0
                })

                if (items && Array.isArray(items)) {
                  items.forEach((item, index) => {
                    itemsToPut.push({
                      id: item.id || `${trx.id}_item_${index}`,
                      transactionId: trx.id,
                      productId: item.productId || item.cartId || item.id || null,
                      serviceId: item.serviceId || (item.extraCharge ? item.id : null),
                      name: item.name || item.productName || 'Barang',
                      qty: Number(item.qty || item.cartQty || 1),
                      price: Number(item.price || item.price_sell || 0),
                      subtotal: Number(item.subtotal || (item.price_sell * (item.cartQty || item.qty))) || 0,
                      updatedAt: item.updatedAt || trx.date || new Date().toISOString(),
                      synced: 0
                    })
                  })
                }
              })

              if (transactionsToPut.length > 0) {
                await db.transactions.bulkPut(transactionsToPut)
              }
              if (itemsToPut.length > 0) {
                await db.transaction_items.bulkPut(itemsToPut)
              }
            }
          })

          resolve(true)
        } catch (err) {
          console.error('Error saat impor backup:', err)
          reject(err)
        }
      }

      reader.onerror = () => reject(new Error('Gagal membaca file backup'))
      reader.readAsText(file)
    })
  },

  async resetTransactions() {
    // GUARD 2: Cek Koneksi Internet
    if (!navigator.onLine) {
      throw new Error('Reset transaksi membutuhkan koneksi internet aktif agar data cloud terhapus bersih.')
    }

    if (firestore) {
      const cloudTablesToClear = [
        'transactions',
        'transaction_items',
        'expenses',
        'digital_transactions',
        'debt_payments',
        'cash_mutations',
        'shopping_list'
      ]

      for (const tableName of cloudTablesToClear) {
        try {
          const querySnapshot = await getDocs(collection(firestore, tableName))
          const batches = []
          let currentBatch = writeBatch(firestore)
          let count = 0

          querySnapshot.forEach((document) => {
            currentBatch.delete(document.ref)
            count++
            if (count >= 400) {
              batches.push(currentBatch.commit())
              currentBatch = writeBatch(firestore)
              count = 0
            }
          })
          if (count > 0) {
            batches.push(currentBatch.commit())
          }
          await Promise.all(batches)
        } catch (err) {
          console.warn(`Gagal menghapus koleksi cloud ${tableName}:`, err)
        }
      }
    }

    const tableNames = db.tables.map(t => t.name)

    await db.transaction('rw', tableNames, async () => {
      await db.transactions.clear()
      await db.transaction_items.clear()
      await db.expenses.clear()
      await db.digital_transactions.clear()
      await db.debt_payments.clear()
      await db.cash_mutations.clear()
      await db.shopping_list.clear()

      const members = await db.members.toArray()
      for (const m of members) {
        await db.members.update(m.id, {
          debt: 0,
          total_spending: 0,
          points: 0,
          synced: 0
        })
      }

      const accounts = await db.cash_accounts.toArray()
      for (const a of accounts) {
        await db.cash_accounts.update(a.id, {
          balance: 0,
          synced: 0
        })
      }
    })
  },

  async convertAllToUppercase() {
    const tableNames = ['products', 'categories', 'units', 'product_packages']
    const now = dayjs().toISOString()

    await db.transaction('rw', tableNames, async () => {
      const products = await db.products.toArray()
      for (const p of products) {
        await db.products.update(p.id, {
          name: (p.name || '').toUpperCase().trim(),
          code: (p.code || '').toUpperCase().trim(),
          category: (p.category || 'UMUM').toUpperCase().trim(),
          unit: (p.unit || '').toUpperCase().trim(),
          purchasePackName: (p.purchasePackName || '').toUpperCase().trim(),
          updatedAt: now,
          synced: 0
        })
      }

      const categories = await db.categories.toArray()
      for (const c of categories) {
        await db.categories.update(c.id, {
          name: (c.name || '').toUpperCase().trim(),
          updatedAt: now,
          synced: 0
        })
      }

      const units = await db.units.toArray()
      for (const u of units) {
        await db.units.update(u.id, {
          name: (u.name || '').toUpperCase().trim(),
          updatedAt: now,
          synced: 0
        })
      }

      const packages = await db.product_packages.toArray()
      for (const pkg of packages) {
        await db.product_packages.update(pkg.id, {
          name: (pkg.name || '').toUpperCase().trim(),
          updatedAt: now,
          synced: 0
        })
      }
    })
  }
}
