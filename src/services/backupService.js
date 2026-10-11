// src/services/backupService.js
import { db } from '../db/index.js'
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
    if (!file) return false

    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const rawParsed = JSON.parse(e.target.result)
          // Menangani jika data dibungkus dalam object { database: ... } atau langsung root JSON
          const importedData = rawParsed.database || rawParsed

          // Menggunakan Dexie Transaction untuk keamanan data (Atomicity)
          await db.transaction('rw', db.tables, async () => {
            // 1. Kosongkan semua tabel lama sebelum me-restore
            for (const table of db.tables) {
              await table.clear()
            }

            // 2. Restore tabel biasa yang kompatibel 1-to-1
            for (const tableName of Object.keys(importedData)) {
              if (tableName !== 'transactions' && db[tableName]) {
                const rows = importedData[tableName]
                if (Array.isArray(rows) && rows.length > 0) {
                  // Pastikan fieldSynced bernilai 0 jika belum ada agar ikut masuk antrean cloud sync
                  const preparedRows = rows.map(item => ({
                    ...item,
                    synced: item.synced ?? 0
                  }))
                  await db[tableName].bulkPut(preparedRows)
                }
              }
            }

            // 3. Restrukturisasi Khusus untuk Transaksi (Ekstrak items ke transaction_items)
            if (importedData.transactions && Array.isArray(importedData.transactions)) {
              const transactionsToPut = []
              const itemsToPut = []

              importedData.transactions.forEach(trx => {
                // Pisahkan array items dari objek transaksi utama
                const { items, ...trxData } = trx

                transactionsToPut.push({
                  ...trxData,
                  synced: trxData.synced ?? 0
                })

                // Ekstrak items ke tabel transaction_items
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
  }
}
