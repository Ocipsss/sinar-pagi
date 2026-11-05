// src/services/backupService.js - VERSI SUPABASE FINAL + forceResync
import { db } from '../db/index.js'
import dayjs from 'dayjs'
import { supabase } from './supabase.js'

const BUCKET_NAME = 'sinarPagiBucket'

export const backupService = {
  async exportBackup() {
    try {
      const backupData = {}
      for (const table of db.tables) {
        backupData[table.name] = await table.toArray()
      }
      const jsonString = JSON.stringify(backupData, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
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

  async uploadBackupToCloud() {
    if (!navigator.onLine) return
    try {
      const allTables = db.tables.map(t => t.name)
      const backupData = {}
      for (const t of allTables) {
        if (db[t]) backupData[t] = await db[t].toArray()
      }
      const jsonString = JSON.stringify(backupData)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const fileName = `master-${dayjs().format('YYYY-MM-DD-HHmm')}.json`
      
      const { error } = await supabase.storage.from(BUCKET_NAME).upload(fileName, blob, {
        upsert: true,
        contentType: 'application/json'
      })
      if (error) throw error
      console.log('[Backup] Success to Supabase:', fileName)
      return true
    } catch (error) {
      console.error('[AutoBackup] Supabase upload failed:', error.message)
      throw error
    }
  },

  async restoreFromCloud() {
    try {
      const { data: files, error: listError } = await supabase.storage.from(BUCKET_NAME).list('', {
        limit: 1,
        sortBy: { column: 'created_at', order: 'desc' }
      })
      if (listError) throw listError
      if (!files || files.length === 0) throw new Error('Tidak ada backup di cloud')
      
      const latestFile = files[0].name
      const { data, error: dlError } = await supabase.storage.from(BUCKET_NAME).download(latestFile)
      if (dlError) throw dlError
      
      const text = await data.text()
      const rawParsed = JSON.parse(text)
      const importedData = rawParsed.database || rawParsed
      await this.processImportData(importedData)
      console.log('[Restore] Success from', latestFile)
      return true
    } catch (error) {
      console.error('[Restore] Gagal:', error.message)
      throw error
    }
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

  // FIX PENTING: import sekarang paksa synced=0 biar ke-push ke Supabase
  async processImportData(importedData) {
    const tableNames = db.tables.map(t => t.name)
    const now = new Date().toISOString()
    await db.transaction('rw', tableNames, async () => {
      for (const table of db.tables) {
        if (Object.keys(importedData).includes(table.name)) {
          await table.clear()
        }
      }
      for (const tableName of Object.keys(importedData)) {
        if (db[tableName]) {
          const rows = importedData[tableName]
          if (Array.isArray(rows) && rows.length > 0) {
            const preparedRows = rows.map(item => ({
              ...item,
              synced: 0,
              updated_at: now,
              updatedAt: now
            }))
            await db[tableName].bulkPut(preparedRows)
          }
        }
      }
    })
  },

  // TOMBOL BARU BUAT HP: paksa semua jadi belum sync tanpa console
  async markAllAsUnsynced() {
    const now = new Date().toISOString()
    let total = 0
    for (const table of db.tables) {
      try {
        const count = await table.toCollection().modify({ synced: 0, updated_at: now, updatedAt: now })
        if (count) total += count
      } catch (e) {
        console.warn('mark unsynced fail', table.name, e.message)
      }
    }
    console.log('[Force] marked', total, 'rows as unsynced')
    return total
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
        await db.members.update(m.id, { debt: 0, total_spending: 0, points: 0, synced: 0 })
      }
      const accounts = await db.cash_accounts.toArray()
      for (const a of accounts) {
        await db.cash_accounts.update(a.id, { balance: 0, synced: 0 })
      }
    })
  },

  async convertAllToUppercase() {
    const tableNames = ['products', 'categories', 'units', 'product_packages', 'members']
    const now = dayjs().toISOString()
    await db.transaction('rw', tableNames, async () => {
      const products = await db.products.toArray()
      for (const p of products) {
        await db.products.update(p.id, { name: (p.name || '').toUpperCase().trim(), code: (p.code || '').toUpperCase().trim(), category: (p.category || 'UMUM').toUpperCase().trim(), unit: (p.unit || '').toUpperCase().trim(), purchasePackName: (p.purchasePackName || '').toUpperCase().trim(), updatedAt: now, updated_at: now, synced: 0 })
      }
      const categories = await db.categories.toArray()
      for (const c of categories) { await db.categories.update(c.id, { name: (c.name || '').toUpperCase().trim(), updatedAt: now, updated_at: now, synced: 0 }) }
      const units = await db.units.toArray()
      for (const u of units) { await db.units.update(u.id, { name: (u.name || '').toUpperCase().trim(), updatedAt: now, updated_at: now, synced: 0 }) }
      const packages = await db.product_packages.toArray()
      for (const pkg of packages) { await db.product_packages.update(pkg.id, { name: (pkg.name || '').toUpperCase().trim(), updatedAt: now, updated_at: now, synced: 0 }) }
      const members = await db.members.toArray()
      for (const m of members) { await db.members.update(m.id, { name: (m.name || '').toUpperCase().trim(), address: (m.address || '').toUpperCase().trim(), updatedAt: now, updated_at: now, synced: 0 }) }
    })
  }
}
