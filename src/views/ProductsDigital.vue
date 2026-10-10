<template>
<div class="flex-1 overflow-auto p-4 pb-24">
  <div class="w-full flex flex-col gap-4">
    <div class="w-full bg-white p-6 rounded-[2.5rem] shadow-sm border border-zinc-100">

      <!-- Toggle Top Up / Tarik Tunai -->
      <div class="flex bg-zinc-100 p-1.5 rounded-2xl mb-8 gap-2">
        <button 
          @click="form.type = 'topup'" 
          :class="form.type === 'topup'? 'bg-zinc-900 text-white shadow-md' : 'text-zinc-400'" 
          class="flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition"
        >
          TOP UP
        </button>
        <button 
          @click="form.type = 'tariktunai'" 
          :class="form.type === 'tariktunai'? 'bg-zinc-900 text-white shadow-md' : 'text-zinc-400'" 
          class="flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition"
        >
          TARIK TUNAI
        </button>
      </div>

      <div class="flex flex-col gap-5">
        <!-- Input Provider -->
        <div>
          <label class="text-[8px] font-black text-zinc-400 ml-1 uppercase tracking-[0.2em]">Layanan / Provider</label>
          <input 
            v-model="form.provider" 
            type="text" 
            placeholder="DANA, OVO, BRI, DLL" 
            class="w-full p-4 mt-1 bg-zinc-50 border rounded-2xl text-[12px] font-black uppercase outline-none focus:ring-2 focus:ring-zinc-900"
          >
        </div>

        <!-- Input Nominal & Admin -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-[8px] font-black text-zinc-400 ml-1 uppercase tracking-[0.2em]">Nominal (Rp)</label>
            <input 
              :value="formatRp(form.nominal)" 
              @input="e => form.nominal = toNumber(e.target.value)" 
              type="text" 
              inputmode="numeric" 
              placeholder="Rp 0" 
              class="w-full p-4 mt-1 bg-zinc-50 border rounded-2xl text-[14px] font-black text-blue-600 outline-none focus:ring-2 focus:ring-zinc-900"
            >
          </div>
          <div>
            <label class="text-[8px] font-black text-zinc-400 ml-1 uppercase tracking-[0.2em]">Biaya Admin (Rp)</label>
            <input 
              :value="formatRp(form.adminFee)" 
              @input="e => form.adminFee = toNumber(e.target.value)" 
              type="text" 
              inputmode="numeric" 
              placeholder="Rp 0" 
              class="w-full p-4 mt-1 bg-zinc-50 border rounded-2xl text-[14px] font-black outline-none focus:ring-2 focus:ring-zinc-900"
            >
          </div>
        </div>

        <!-- Metode Pembayaran Admin -->
        <div>
          <label class="text-[8px] font-black text-zinc-400 ml-1 uppercase tracking-[0.2em]">Metode Bayar Admin:</label>
          <div class="grid grid-cols-2 gap-2 mt-1.5">
            <button 
              @click="form.adminPaymentMethod = 'cash'" 
              :class="form.adminPaymentMethod === 'cash'? 'bg-blue-600 text-white shadow-sm' : 'bg-zinc-100 text-zinc-400'" 
              class="py-3 rounded-xl text-[9px] font-black uppercase transition"
            >
              UANG TUNAI
            </button>
            <button 
              @click="form.adminPaymentMethod = 'digital'" 
              :class="form.adminPaymentMethod === 'digital'? 'bg-blue-600 text-white shadow-sm' : 'bg-zinc-100 text-zinc-400'" 
              class="py-3 rounded-xl text-[9px] font-black uppercase transition"
            >
              POTONG SALDO
            </button>
          </div>
        </div>

        <!-- Kartu Estimasi Kas Fisik -->
        <div :class="form.type === 'topup'? 'bg-blue-600 border-blue-500' : 'bg-orange-500 border-orange-400'" class="p-5 rounded-[1.8rem] shadow-xl border mt-2 transition-colors">
          <div class="flex justify-between items-center mb-1">
            <span class="text-[8px] font-black text-white/70 uppercase">Estimasi Kas Fisik</span>
            <div class="px-2 py-0.5 bg-white/20 rounded text-[7px] font-black text-white uppercase">
              {{ form.type === 'topup'? 'UANG MASUK (+)' : 'UANG KELUAR (-)' }}
            </div>
          </div>
          <div class="text-2xl font-black text-white tracking-tighter">
            {{ form.type === 'topup'? '+' : '-' }} Rp {{ formatRibuan(Math.abs(estimasiKas)) }}
          </div>
          <p class="text-[8px] text-white/60 uppercase mt-2 italic">*Otomatis menyesuaikan perubahan uang tunai di laci kasir</p>
        </div>

        <!-- Tombol Simpan -->
        <button 
          @click="saveTransaction" 
          :disabled="loading" 
          class="w-full py-4.5 bg-zinc-900 disabled:bg-zinc-400 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all"
        >
          {{ loading? 'MENYIMPAN...' : 'SIMPAN TRANSAKSI' }}
        </button>
      </div>
    </div>
  </div>
</div>
</template>

<script setup>
import { useProductsDigital } from '../composables/useProductsDigital.js'
import { formatRp, formatRibuan, toNumber } from '../utils/formatters/currency.js'

const { form, estimasiKas, loading, saveTransaction } = useProductsDigital()
</script>
