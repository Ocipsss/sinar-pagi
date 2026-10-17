// src/services/backupService.js
import { db } from '../db/index.js'
import dayjs from 'dayjs'
import { firestore } from './firebase.js'
import { doc, setDoc, getDoc } from 'firebase/firestore'

export const backupService = {
  // 1. Export Manual ke File JSON Lokal
  async exportBackup() {
    try {
      const backupData = {}
      for (const table of db.tables) {
        backupData[table.name] = await table.toArray()
      }

      const jsonString = JSON.stringify(backupData, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })

      // Format nama file: DDMMYYYY-HH.mm.ss.json
      const fileName = `${dayjs().format('DDMMYYYY-HH.mm.ss')}.json`

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      return true
    } catch (error) {
      console.error('Gagal export backup:', error)
      throw error
    }
  },

  // 2. Auto Backup Silent ke Firestore (Paket Gratisan)
  async uploadBackupToCloud() {
    if (!navigator.onLine) return

    try {
      const backupData = {}
      for (const table of db.tables) {
        backupData[table.name] = await table.toArray()
      }

      const jsonString = JSON.stringify(backupData)
      const payload = {
        updatedAt: dayjs().toISOString(),
        data: jsonString
      }

      // Simpan ke dokumen 'latest' di koleksi 'app_backups'
      await setDoc(doc(firestore, 'app_backups', 'latest'), payload)
      console.log('[AutoBackup] Success upload to Firestore')
      return true
    } catch (error) {
      console.error('[AutoBackup] Firestore upload failed:', error)
      throw error
    }
  },

  // 3. Restor Data dari Firestore
  async restoreFromCloud() {
    if (!navigator.onLine) {
      throw new Error('Membutuhkan koneksi internet untuk restor dari cloud.')
    }

    try {
      const docRef = doc(firestore, 'app_backups', 'latest')
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        throw new Error('Belum ada data cadangan di Firestore.')
      }

      const jsonText = docSnap.data().data
      const rawParsed = JSON.parse(jsonText)
      const importedData = rawParsed.database || rawParsed

      await this.processImportData(importedData)
      return true
    } catch (error) {
      console.error('Gagal restor dari Cloud:', error)
      throw new Error(error.message || 'Gagal mengambil cadangan dari Firestore')
    }
  },

  // Helper Transaksi Impor Data ke Dexie DB
  async processImportData(importedData) {
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
  },

  async importBackup(file) {
    if (!file) return false

    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const rawParsed = JSON.parse(e.target.result)
          const importedData = rawParsed.database || rawParsed
          await this.processImportData(importedData)
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
    const tableNames = ['products', 'categories', 'units', 'product_packages', 'members']
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

      const members = await db.members.toArray()
      for (const m of members) {
        await db.members.update(m.id, {
          name: (m.name || '').toUpperCase().trim(),
          address: (m.address || '').toUpperCase().trim(),
          updatedAt: now,
          synced: 0
        })
      }
    })
  }
}
