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
          const importedData = JSON.parse(e.target.result)
          for (const tableName of Object.keys(importedData)) {
            if (db[tableName]) {
              await db[tableName].clear()
              await db[tableName].bulkPut(importedData[tableName])
            }
          }
          resolve(true)
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = () => reject(new Error('Gagal membaca file backup'))
      reader.readAsText(file)
    })
  }
}
