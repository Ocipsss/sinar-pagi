<template>
  <div class="flex-1 overflow-auto p-4 pb-24">
    <!-- Header -->
    <div class="flex justify-between items-center mb-4">
      <div>
        <h1 class="font-black text-xl text-zinc-900">Data Operator & Kasir</h1>
        <p class="text-xs text-zinc-400">Total {{ operators.length }} operator terdaftar</p>
      </div>
      <button 
        @click="openModal()" 
        class="bg-zinc-900 text-white px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 active:scale-95 transition shadow-sm"
      >
        <UserPlus class="w-4 h-4" /> Tambah
      </button>
    </div>

    <!-- Search Bar -->
    <div class="relative mb-4">
      <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
      <input 
        v-model="searchQuery" 
        placeholder="Cari nama operator atau peran..." 
        class="w-full pl-11 pr-4 py-3 bg-white border border-zinc-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-zinc-900 shadow-sm"
      />
    </div>

    <!-- Empty State -->
    <div v-if="filteredOperators.length === 0" class="py-12 text-center text-zinc-400 text-xs bg-white rounded-2xl border border-zinc-100">
      Belum ada operator terdaftar
    </div>

    <!-- Daftar Operator Card -->
    <div v-else class="space-y-3">
      <div 
        v-for="op in filteredOperators" 
        :key="op.id" 
        class="p-4 bg-white rounded-2xl border border-zinc-100 shadow-sm flex items-center justify-between"
      >
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-zinc-900 text-white rounded-xl flex items-center justify-center font-black text-sm shrink-0">
            {{ (op.name || '?').charAt(0).toUpperCase() }}
          </div>
          <div>
            <div class="font-bold text-sm text-zinc-900 flex items-center gap-2">
              <span>{{ op.name || '(Tanpa Nama)' }}</span>
              <span class="px-2 py-0.5 bg-zinc-100 text-zinc-700 rounded-md text-[9px] font-black uppercase">
                {{ op.role || 'Kasir' }}
              </span>
            </div>
            <!-- ✅ FIX P1 #5 (UX): status PIN lebih jelas -->
            <div class="text-[11px] mt-0.5">
              <span v-if="op.pin" class="inline-flex items-center gap-1 text-emerald-600 font-bold">
                <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> PIN aktif
              </span>
              <span v-else class="inline-flex items-center gap-1 text-zinc-400 font-bold">
                <span class="w-1.5 h-1.5 bg-zinc-300 rounded-full"></span> Tanpa PIN
              </span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-1">
          <button @click="openModal(op)" class="p-2 text-zinc-600 hover:bg-zinc-100 rounded-xl transition">
            <Pencil class="w-4 h-4" />
          </button>
          <button @click="deleteOperator(op)" class="p-2 text-red-500 hover:bg-red-50 rounded-xl transition">
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Form (Tambah / Edit Operator) -->
    <div 
      v-if="showModal" 
      class="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      @keydown.esc="showModal = false"
    >
      <div class="w-full max-w-md bg-white rounded-t-[2rem] sm:rounded-[2rem] p-6 shadow-xl animate-in slide-in-from-bottom duration-200">
        <div class="flex justify-between items-center mb-4">
          <h2 class="font-black text-base">{{ editingId ? 'Edit Operator' : 'Tambah Operator Baru' }}</h2>
          <button @click="showModal = false" class="p-2 bg-zinc-100 rounded-xl"><X class="w-4 h-4" /></button>
        </div>

        <form @submit.prevent="saveOperator" class="space-y-3">
          <div>
            <label class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Nama Operator / Kasir *</label>
            <input v-model="form.name" required placeholder="Contoh: Kasir A, Budi" class="w-full px-4 py-3 bg-zinc-50 border rounded-xl text-sm font-bold" />
          </div>

          <div>
            <label class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Peran / Jabatan</label>
            <select v-model="form.role" class="w-full px-4 py-3 bg-zinc-50 border rounded-xl text-sm font-bold">
              <option value="Kasir">Kasir</option>
              <option value="Admin">Admin / Owner</option>
              <option value="Shift Pagi">Shift Pagi</option>
              <option value="Shift Malam">Shift Malam</option>
            </select>
          </div>

          <div>
            <!-- ✅ FIX P1 #5 (UX): label dinamis -->
            <label class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">
              {{ editingId ? 'PIN Otorisasi (Kosongkan jika tidak ganti)' : 'PIN Otorisasi (Opsional, 4–6 digit)' }}
            </label>
            <input 
              v-model="form.pin" 
              type="password" 
              inputmode="numeric" 
              pattern="[0-9]*" 
              maxlength="6" 
              autocomplete="new-password"
              :placeholder="editingId ? 'Kosongkan jika tidak ingin ganti PIN' : 'Misal: 1234 (4–6 digit)'" 
              @input="form.pin = String(form.pin || '').replace(/\D/g, '').slice(0, 6)"
              class="w-full px-4 py-3 bg-zinc-50 border rounded-xl text-sm font-bold tracking-widest" 
            />
            <!-- ✅ FIX P1 #5 (UX): hint mode edit -->
            <p v-if="editingId" class="text-[10px] text-zinc-400 mt-1 leading-relaxed">
              Isi hanya kalau ingin <b>mengganti</b> PIN. Kosongkan = PIN lama tetap dipakai.
            </p>
            <p v-else class="text-[10px] text-zinc-400 mt-1 leading-relaxed">
              Kosongkan kalau operator ini boleh masuk tanpa PIN.
            </p>
          </div>

          <div class="flex gap-2 pt-2">
            <button type="button" @click="showModal = false" class="flex-1 py-3 bg-zinc-100 font-bold text-xs rounded-xl">Batal</button>
            <button type="submit" class="flex-1 py-3 bg-zinc-900 text-white font-bold text-xs rounded-xl shadow-md">{{ editingId ? 'Simpan' : 'Tambah' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { UserPlus, Search, Pencil, Trash2, X } from 'lucide-vue-next'
import { useOperators } from '../composables/useOperators.js'

const {
  operators,
  searchQuery,
  filteredOperators,
  showModal,
  editingId,
  form,
  loadOperators,
  openModal,
  saveOperator,
  deleteOperator
} = useOperators()

onMounted(() => {
  loadOperators()
})
</script>