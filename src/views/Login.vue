<template>
<div class="min-h-screen bg-zinc-900 text-white flex items-center justify-center p-4">
  <div class="w-full max-w-sm bg-zinc-800 border border-zinc-700/60 p-6 rounded-[2.5rem] shadow-2xl flex flex-col gap-5">
    
    <!-- Header -->
    <div class="text-center space-y-1">
      <div class="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-2 font-black text-xl">
        SP
      </div>
      <h1 class="font-black text-xl tracking-tight">Sinar Pagi POS</h1>
      <p class="text-xs text-zinc-400">Pilih akun operator untuk memulai shift</p>
    </div>

    <!-- Pilihan Operator -->
    <div class="space-y-3">
      <div>
        <label class="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 block">Pilih Operator</label>
        <select 
          v-model="selectedOperatorId" 
          @change="pin = ''"
          class="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-2xl text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="" disabled>-- Pilih Operator --</option>
          <option v-for="op in operators" :key="op.id" :value="op.id">
            {{ op.name }} ({{ op.role }})
          </option>
        </select>
      </div>

      <!-- Input PIN (jika operator punya PIN) -->
      <div v-if="activeSelectedOperator?.pin">
        <label class="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 block">PIN Otorisasi</label>
        <input 
          v-model="pin" 
          type="password" 
          maxlength="6" 
          placeholder="••••" 
          @keyup.enter="handleLogin"
          class="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-2xl text-center text-lg font-black tracking-widest text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>
    </div>

    <!-- Button Submit -->
    <button 
      @click="handleLogin" 
      :disabled="!selectedOperatorId || loading"
      class="w-full py-4 bg-white hover:bg-zinc-100 disabled:bg-zinc-700 disabled:text-zinc-500 text-zinc-900 font-black text-xs rounded-2xl transition active:scale-95 shadow-lg mt-2"
    >
      {{ loading ? 'VERIFIKASI...' : 'MASUK SHIFT' }}
    </button>
  </div>
</div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { operatorRepo } from '../db/repositories/operatorRepository.js'
import { useOperatorStore } from '../stores/operatorStore.js'
import { toast } from 'vue-sonner'

const router = useRouter()
const operatorStore = useOperatorStore()

const operators = ref([])
const selectedOperatorId = ref('')
const pin = ref('')
const loading = ref(false)

const activeSelectedOperator = computed(() => {
  return operators.value.find(o => o.id === selectedOperatorId.value)
})

const loadOperators = async () => {
  let list = await operatorRepo.getAll()
  
  operators.value = list
  if (list.length > 0) {
    selectedOperatorId.value = list[0].id
  }
}

const handleLogin = async () => {
  if (!selectedOperatorId.value) return

  loading.value = true
  try {
    await operatorStore.login(selectedOperatorId.value, pin.value)
    toast.success(`Selamat bertugas, ${operatorStore.operatorName}!`)
    router.push('/kasir')
  } catch (err) {
    toast.error(err.message)
  } finally {
    loading.value = false
  }
}

onMounted(loadOperators)
</script>
