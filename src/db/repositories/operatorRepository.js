// src/db/repositories/operatorRepository.js
import { db } from '../index.js'
import dayjs from 'dayjs'
// ✅ FIX (3.9): pakai hashPin dari satu sumber
import { hashPin } from '../../utils/crypto.js'

// Helper: cek apakah row operator sudah di-soft-delete
// Toleran terhadap boolean / number / string (warisan migrasi)
function isDeleted(item) {
  if (!item) return true
  const d = item.deleted
  return d === true || d === 1 || d === 'true'
}

export const operatorRepo = {
  getAll: async () => {
    const table = db.operators || db.table('operators')
    const list = await table.toArray()
    return list.filter(item => !isDeleted(item))
  },

  getById: async (id) => {
    const table = db.operators || db.table('operators')
    const item = await table.get(id)
    return !isDeleted(item) ? item : null
  },

  create: async (data) => {
    // Gunakan data.id jika ada (seperti op-admin), jika tidak ada baru buat randomUUID
    const id = data.id || crypto.randomUUID()
    const now = dayjs().toISOString()

    // ✅ Trim PIN supaya tidak ada spasi tak sengaja ikut ter-hash
    const rawPin = (data.pin == null) ? '' : String(data.pin).trim()
    const hashedPin = rawPin ? await hashPin(rawPin) : ''

    const item = { 
      id, 
      name: (data.name || '').trim(),
      role: data.role || 'Kasir',
      pin: hashedPin,
      deleted: false,
      updatedAt: now, 
      synced: 0 
    }
    const table = db.operators || db.table('operators')
    await table.put(item)
    return id
  },

  /**
   * Update operator.
   *
   * @param {string} id
   * @param {object} data - { name, role, pin }
   * @param {object} [options]
   * @param {boolean} [options.pinChanged] - true = user memang mengubah PIN
   *   - pinChanged: true  + pin terisi → hash & simpan PIN baru
   *   - pinChanged: true  + pin === ''  → hapus PIN (operator tanpa PIN)
   *   - pinChanged: false / tidak dikirim → JANGAN sentuh PIN lama
   *
   * ✅ FIX P1 #5: PIN di form selalu plaintext (kosong = tidak ganti).
   * Kalau flag tidak dikirim (pemanggil lama), fallback ke perilaku lama
   * (`if (payload.pin) hashPin(...)`) supaya tidak breaking change.
   */
  update: async (id, data, options = {}) => {
    const now = dayjs().toISOString()
    const table = db.operators || db.table('operators')

    // Salin hanya field yang relevan, jangan spread semua
    const payload = {
      name: (data.name || '').trim(),
      role: data.role || 'Kasir'
    }

    // ✅ Deteksi apakah pemanggil mengirim flag secara eksplisit
    const hasExplicitFlag = Object.prototype.hasOwnProperty.call(options, 'pinChanged')
    const pinChanged = hasExplicitFlag ? Boolean(options.pinChanged) : null

    if (hasExplicitFlag) {
      // ===== Jalur baru (dipakai useOperators.saveOperator) =====
      if (pinChanged) {
        const rawPin = (data.pin == null) ? '' : String(data.pin).trim()
        if (rawPin) {
          // Ganti PIN ke nilai baru
          payload.pin = await hashPin(rawPin)
        } else {
          // Hapus PIN (operator jadi tanpa PIN)
          payload.pin = ''
        }
      }
      // pinChanged === false → payload.pin TIDAK diisi → PIN lama utuh
    } else {
      // ===== Fallback backward-compatible untuk pemanggil lama =====
      // Tidak ideal (tidak bisa bedakan "PIN baru" vs "hash lama"), tapi
      // aman karena hashPin punya guard 64-hex.
      if (data.pin) {
        payload.pin = await hashPin(data.pin)
      }
    }

    await table.update(id, { ...payload, updatedAt: now, synced: 0 })
  },

  delete: async (id) => {
    const now = dayjs().toISOString()
    const table = db.operators || db.table('operators')
    // Gunakan Soft Delete agar sinkronisasi offline-first berjalan konsisten
    await table.update(id, { deleted: true, updatedAt: now, synced: 0 })
  }
}