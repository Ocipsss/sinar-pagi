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
          class="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-zinc-900"
        />
      </div>

      <div>
        <label class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Alamat Toko</label>
        <textarea 
          v-model="form.storeAddress" 
          rows="2" 
          placeholder="Jl. Raya Bogor No. 12" 
          class="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-zinc-900"
        ></textarea>
      </div>

      <div>
        <label class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">No. Telepon / WhatsApp</label>
        <input 
          v-model="form.storePhone" 
          type="tel" 
          placeholder="081234567890" 
          class="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-zinc-900"
        />
      </div>

      <div>
        <label class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Pesan Footer Struk</label>
        <textarea 
          v-model="form.receiptFooter" 
          rows="2" 
          placeholder="Terima kasih telah berbelanja!" 
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

  <!-- Section 2: Opsi Cetak & Printer -->
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
            @click="form.printerPaperSize = '58mm'" 
            :class="['py-2.5 rounded-xl font-bold border transition', form.printerPaperSize === '58mm' ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-zinc-50 border-zinc-200 text-zinc-600']"
          >
            58 mm (Kecil)
          </button>
          <button 
            @click="form.printerPaperSize = '80mm'" 
            :class="['py-2.5 rounded-xl font-bold border transition', form.printerPaperSize === '80mm' ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-zinc-50 border-zinc-200 text-zinc-600']"
          >
            80 mm (Besar)
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Section 3: Backup & Restore Data Lokal -->
  <div class="bg-white p-5 rounded-3xl border border-zinc-100 shadow-sm space-y-4">
    <div class="flex items-center gap-2 border-b border-zinc-50 pb-3">
      <Database class="w-5 h-5 text-zinc-900" />
      <span class="font-black text-sm text-zinc-900">Cadangan & Pemulihan Data</span>
    </div>

    <p class="text-xs text-zinc-400">Unduh cadangan data lokal atau impor file JSON untuk mengembalikan data.</p>

    <div class="grid grid-cols-2 gap-2">
      <button 
        @click="exportBackup" 
        class="py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
      >
        <Download class="w-4 h-4" />
        <span>Ekspor Backup</span>
      </button>

      <label class="py-3 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95">
        <Upload class="w-4 h-4" />
        <span>Impor Backup</span>
        <input type="file" accept=".json" @change="importBackup" class="hidden" />
      </label>
    </div>
  </div>

  <!-- Section 4: Reset Data Transaksi (Pengembangan) -->
  <div class="bg-red-50 p-5 rounded-3xl border border-red-200/80 shadow-sm space-y-3">
    <div class="flex items-center gap-2 border-b border-red-200/60 pb-3">
      <Trash2 class="w-5 h-5 text-red-600" />
      <span class="font-black text-sm text-red-900">Reset Riwayat Transaksi</span>
    </div>

    <p class="text-xs text-red-700/80 leading-relaxed">
      Khusus masa pengembangan/testing. Fitur ini akan mengosongkan riwayat penjualan, pengeluaran, mutasi kas, dan piutang member. <strong>Master data produk & stok barang tidak akan terhapus.</strong>
    </p>

    <button 
      @click="resetTransactionsData" 
      :disabled="loading"
      class="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-zinc-300 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95 flex items-center justify-center gap-2"
    >
      <Trash2 class="w-4 h-4" />
      <span>Kosongkan Semua Riwayat Transaksi</span>
    </button>
  </div>
</div>
</template>

<script setup>
import { onMounted } from 'vue'
import { Store, Printer, Database, Download, Upload, Trash2 } from 'lucide-vue-next'
import { useSettings } from '../composables/useSettings.js'

const { form, loading, loadSettings, saveSettings, exportBackup, importBackup, resetTransactionsData } = useSettings()

onMounted(() => {
  loadSettings()
})
</script>
