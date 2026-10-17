<!-- src/views/Settings.vue -->
<template>
<div class="flex-1 overflow-auto p-4 pb-28 space-y-4">
  <!-- Header Title -->
  <div>
    <h1 class="font-black text-xl text-zinc-900">Pengaturan Toko</h1>
    <p class="text-xs text-zinc-400">Kelola identitas nota, printer, dan cadangan data</p>
  </div>

  <!-- Section 1: Profil Toko & Struk -->
  <div class="bg-white p-5 rounded-3xl border border-zinc-100 shadow-sm space-y-4">
    <div class="flex items-center gap-2 border-b border-zinc-50 pb-3">
      <Store class="w-5 h-5 text-zinc-900" />
      <span class="font-black text-sm text-zinc-900">Identitas Toko & Struk Nota</span>
    </div>

    <form @submit.prevent="saveSettings" class="space-y-3">
      <div>
        <label class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Nama Toko / Warung *</label>
        <input 
          v-model="form.storeName" 
          required 
          placeholder="Contoh: SINAR PAGI" 
          class="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-zinc-900 uppercase"
        />
      </div>

      <div>
        <label class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Alamat Toko</label>
        <textarea 
          v-model="form.storeAddress" 
          rows="2" 
          placeholder="CIHELEUT JL. TALAS UJUNG NO. 38" 
          class="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-zinc-900"
        ></textarea>
      </div>

      <div>
        <label class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">No. Telepon / WhatsApp</label>
        <input 
          v-model="form.storePhone" 
          type="tel" 
          placeholder="089516477760" 
          class="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-zinc-900"
        />
      </div>

      <div>
        <label class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Pesan Footer Struk</label>
        <textarea 
          v-model="form.receiptFooter" 
          rows="2" 
          placeholder="HATUR NUHUN!" 
          class="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-zinc-900"
        ></textarea>
      </div>

      <button 
        type="submit" 
        :disabled="loading"
        class="w-full py-3.5 bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-400 text-white rounded-xl font-bold text-xs shadow-md transition active:scale-95"
      >
        Simpan Profil Toko
      </button>
    </form>
  </div>

  <!-- Section 2: Sinkronisasi Realtime -->
  <div class="bg-white p-5 rounded-3xl border border-zinc-100 shadow-sm space-y-4">
    <div class="flex items-center gap-2 border-b border-zinc-50 pb-3">
      <Cloud class="w-5 h-5 text-zinc-900" />
      <span class="font-black text-sm text-zinc-900">Sinkronisasi Cloud (Firebase)</span>
    </div>

    <div class="flex items-center justify-between">
      <div>
        <span class="font-bold text-xs text-zinc-900 block">Otomatis Sinkron Ke Cloud</span>
        <span class="text-[11px] text-zinc-400">Matikan jika ingin menjalankan aplikasi 100% offline</span>
      </div>

      <label class="relative inline-flex items-center cursor-pointer">
        <input 
          type="checkbox" 
          :checked="syncStatus.isAutoSyncEnabled" 
          @change="handleToggleSync" 
          class="sr-only peer"
        />
        <div class="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
      </label>
    </div>
  </div>

  <!-- Section 3: Opsi Cetak & Printer -->
  <div class="bg-white p-5 rounded-3xl border border-zinc-100 shadow-sm space-y-4">
    <div class="flex items-center gap-2 border-b border-zinc-50 pb-3">
      <Printer class="w-5 h-5 text-zinc-900" />
      <span class="font-black text-sm text-zinc-900">Pengaturan Printer Bluetooth</span>
    </div>

    <div class="space-y-3 text-xs">
      <div>
        <label class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Ukuran Kertas Thermal</label>
        <div class="grid grid-cols-2 gap-2">
          <button 
            type="button"
            @click="form.printerPaperSize = '58mm'" 
            :class="['py-2.5 rounded-xl font-bold border transition', form.printerPaperSize === '58mm' ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-zinc-50 border-zinc-200 text-zinc-600']"
          >
            58 mm (Kecil)
          </button>
          <button 
            type="button"
            @click="form.printerPaperSize = '80mm'" 
            :class="['py-2.5 rounded-xl font-bold border transition', form.printerPaperSize === '80mm' ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-zinc-50 border-zinc-200 text-zinc-600']"
          >
            80 mm (Besar)
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Section 4: Backup & Restore (Cloud & File Lokal) -->
  <div class="bg-white p-5 rounded-3xl border border-zinc-100 shadow-sm space-y-4">
    <div class="flex items-center gap-2 border-b border-zinc-50 pb-3">
      <Database class="w-5 h-5 text-zinc-900" />
      <span class="font-black text-sm text-zinc-900">Cadangan & Pemulihan Data</span>
    </div>

    <!-- Group 1: Cadangan Cloud Firebase -->
    <div class="space-y-2 bg-blue-50/50 p-3.5 rounded-2xl border border-blue-100">
      <div class="flex justify-between items-center mb-1">
        <div class="font-bold text-xs text-blue-900 flex items-center gap-1.5">
          <Cloud class="w-4 h-4 text-blue-600" />
          <span>Cadangan Cloud (Firebase)</span>
        </div>
        <span class="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-md">
          Otomatis / 30 mnt
        </span>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <button 
          type="button"
          @click="backupToCloud" 
          :disabled="loading || !isOnline"
          :class="[
            'py-3 font-bold text-xs rounded-xl shadow-sm transition active:scale-95 flex items-center justify-center gap-1.5',
            isOnline 
              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
              : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
          ]"
        >
          <UploadCloud class="w-4 h-4" />
          <span>Cadangkan Sekarang</span>
        </button>

        <button 
          type="button"
          @click="restoreFromCloud" 
          :disabled="loading || !isOnline"
          :class="[
            'py-3 font-bold text-xs rounded-xl border transition active:scale-95 flex items-center justify-center gap-1.5',
            isOnline 
              ? 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50' 
              : 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed'
          ]"
        >
          <DownloadCloud class="w-4 h-4" />
          <span>Restor dari Cloud</span>
        </button>
      </div>
    </div>

    <!-- Group 2: Cadangan File JSON Lokal -->
    <div class="space-y-2 bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200/80">
      <div class="font-bold text-xs text-zinc-800 flex items-center gap-1.5 mb-1">
        <HardDrive class="w-4 h-4 text-zinc-600" />
        <span>Cadangan File JSON (Lokal)</span>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <button 
          type="button"
          @click="exportBackup" 
          class="py-3 bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
        >
          <Download class="w-4 h-4" />
          <span>Unduh File JSON</span>
        </button>

        <label 
          :class="[
            'py-3 border rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm',
            isOnline 
              ? 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50 cursor-pointer' 
              : 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed opacity-60'
          ]"
          :title="!isOnline ? 'Fitur impor backup membutuhkan koneksi internet' : ''"
        >
          <Upload class="w-4 h-4" />
          <span>Impor File JSON</span>
          <input type="file" accept=".json" :disabled="!isOnline" @change="importBackup" class="hidden" />
        </label>
      </div>
    </div>

    <!-- Tombol Migrasi Kapital -->
    <button 
      type="button"
      @click="convertDataToUppercase" 
      :disabled="loading"
      class="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-300 text-zinc-950 font-bold text-xs rounded-xl shadow-md transition active:scale-95 flex items-center justify-center gap-2"
    >
      <Type class="w-4 h-4" />
      <span>Ubah Semua Data Master ke KAPITAL</span>
    </button>
  </div>

  <!-- Section 5: Reset Data Transaksi -->
  <div class="bg-red-50 p-5 rounded-3xl border border-red-200/80 shadow-sm space-y-3">
    <div class="flex items-center gap-2 border-b border-red-200/60 pb-3">
      <Trash2 class="w-5 h-5 text-red-600" />
      <span class="font-black text-sm text-red-900">Reset Riwayat Transaksi</span>
    </div>

    <p class="text-xs text-red-700/80 leading-relaxed">
      Khusus masa pengembangan/testing. Fitur ini akan mengosongkan riwayat penjualan, pengeluaran, mutasi kas, dan piutang member. <strong>Master data produk & stok barang tidak akan terhapus.</strong>
    </p>

    <button 
      type="button"
      @click="resetTransactionsData" 
      :disabled="loading || !isOnline"
      :class="[
        'w-full py-3 font-bold text-xs rounded-xl shadow-md transition active:scale-95 flex items-center justify-center gap-2',
        isOnline 
          ? 'bg-red-600 hover:bg-red-700 text-white' 
          : 'bg-zinc-300 text-zinc-500 cursor-not-allowed'
      ]"
    >
      <Trash2 class="w-4 h-4" />
      <span>{{ !isOnline ? 'Reset Membutuhkan Koneksi Internet' : 'Kosongkan Semua Riwayat Transaksi' }}</span>
    </button>
  </div>
</div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Store, Cloud, Printer, Database, Download, Upload, UploadCloud, DownloadCloud, HardDrive, Trash2, Type } from 'lucide-vue-next'
import { useSettings } from '../composables/useSettings.js'
import { syncStatus, syncRealtime } from '../services/syncService.js'

const { 
  form, 
  loading, 
  loadSettings, 
  saveSettings, 
  exportBackup, 
  importBackup, 
  backupToCloud,
  restoreFromCloud, 
  resetTransactionsData, 
  convertDataToUppercase 
} = useSettings()

const isOnline = ref(navigator.onLine)

const updateOnlineState = () => {
  isOnline.value = navigator.onLine
}

const handleToggleSync = (e) => {
  syncRealtime.toggleAutoSync(e.target.checked)
}

onMounted(() => {
  loadSettings()
  window.addEventListener('online', updateOnlineState)
  window.addEventListener('offline', updateOnlineState)
})

onUnmounted(() => {
  window.removeEventListener('online', updateOnlineState)
  window.removeEventListener('offline', updateOnlineState)
})
</script>
