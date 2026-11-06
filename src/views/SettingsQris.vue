<template>
  <div class="flex-1 overflow-auto p-4 pb-24 space-y-4">
    <h1 class="font-black text-xl text-zinc-900">QRIS Toko</h1>
    <p class="text-xs text-zinc-400">Upload QRIS untuk pembayaran di web katalog</p>

    <!-- Display QRIS Aktif -->
    <div 
      v-if="currentQris?.qrisUrl" 
      class="bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm flex flex-col items-center gap-3"
    >
      <p class="text-[11px] font-black uppercase tracking-wider text-zinc-500">QRIS Aktif Saat Ini</p>
      <img 
        :src="currentQris.qrisUrl" 
        alt="QRIS Toko"
        class="w-64 h-64 object-contain border border-zinc-100 rounded-2xl bg-zinc-50" 
      />
      <div class="text-center">
        <p class="text-xs font-bold text-zinc-900">{{ currentQris.merchantName }}</p>
        <p v-if="currentQris.nmid" class="text-[11px] text-zinc-400">{{ currentQris.nmid }}</p>
      </div>
    </div>

    <!-- Form Upload / Edit -->
    <div class="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm space-y-3">
      <div>
        <label class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Nama Merchant</label>
        <input 
          v-model="form.merchantName" 
          placeholder="WARUNG SINAR PAGI" 
          class="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold uppercase focus:outline-none focus:ring-2 focus:ring-zinc-900" 
        />
      </div>
      <div>
        <label class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">NMID</label>
        <input 
          v-model="form.nmid" 
          placeholder="ID1027..." 
          class="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-zinc-900" 
        />
      </div>
      
      <div>
        <label class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Gambar QRIS *</label>
        <label class="block w-full p-4 border-2 border-dashed border-zinc-200 rounded-xl text-center cursor-pointer hover:bg-zinc-50 transition">
          <span class="text-xs font-bold text-zinc-700">{{ file ? file.name : 'Pilih Gambar QRIS (PNG/JPG)' }}</span>
          <input type="file" accept="image/*" @change="onFile" class="hidden" />
        </label>
        <img 
          v-if="previewUrl" 
          :src="previewUrl" 
          alt="Preview QRIS"
          class="mt-2 w-40 h-40 object-contain border rounded-xl bg-zinc-50" 
        />
      </div>

      <button 
        @click="upload" 
        :disabled="loading || !file" 
        class="w-full py-3.5 bg-zinc-900 text-white rounded-xl font-black text-xs shadow-md disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition"
      >
        {{ loading ? 'Mengupload...' : 'Simpan QRIS ke Cloud' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../services/supabase.js'

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'vezqidog'
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_PRESET || 'sinarpagi-products'

const currentQris = ref(null)
const file = ref(null)
const previewUrl = ref('')
const loading = ref(false)
const targetId = ref('qris') // Menyiapkan ID target agar aman saat upsert
const form = ref({ merchantName: 'WARUNG SINAR PAGI', nmid: '' })

onMounted(async () => {
  try {
    // 1. Coba cari setting khusus dengan ID 'qris'
    let { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 'qris')
      .maybeSingle()

    // 2. Jika tidak ada, ambil baris pertama di tabel settings (fallback misal id = 'default_settings')
    if (!data) {
      const fallbackRes = await supabase
        .from('settings')
        .select('*')
        .limit(1)
        .maybeSingle()
      
      data = fallbackRes.data
    }

    if (data) {
      targetId.value = data.id || 'qris'
      const activeUrl = data.qris_url || data.qrisUrl || data.image_url
      const merchant = data.merchant_name || data.merchantName || data.store_name || 'WARUNG SINAR PAGI'
      
      if (activeUrl) {
        currentQris.value = {
          qrisUrl: activeUrl,
          merchantName: merchant,
          nmid: data.nmid || ''
        }
      }
      form.value.merchantName = merchant
      form.value.nmid = data.nmid || ''
    }
  } catch (e) {
    console.error('Gagal load QRIS:', e.message || e)
  }
})

const onFile = (e) => {
  const f = e.target.files[0]
  if (!f) return
  
  if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl.value)
  }
  
  file.value = f
  previewUrl.value = URL.createObjectURL(f)
}

const upload = async () => {
  if (!file.value) return alert('Pilih gambar QRIS dulu met')
  loading.value = true
  try {
    // 1. Upload ke Cloudinary
    const formData = new FormData()
    formData.append('file', file.value)
    formData.append('upload_preset', UPLOAD_PRESET)
    formData.append('public_id', `sinar-pagi/qris/qris-toko`)

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData
    })
    if (!res.ok) throw new Error(await res.text())
    const data = await res.json()
    
    const updatedMerchantName = form.value.merchantName.toUpperCase()
    
    // 2. Upsert ke Supabase menggunakan ID target yang terdeteksi
    const { error } = await supabase.from('settings').upsert({
      id: targetId.value,
      qris_url: data.secure_url,
      merchant_name: updatedMerchantName,
      nmid: form.value.nmid,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' })
    
    if (error) throw error
    
    alert('QRIS berhasil diupdate met!')
    
    // 3. Update state tampilan UI
    currentQris.value = {
      qrisUrl: data.secure_url,
      merchantName: updatedMerchantName,
      nmid: form.value.nmid
    }
    
    // 4. Cleanup
    file.value = null
    if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl.value)
    }
    previewUrl.value = ''
  } catch (e) {
    console.error(e)
    alert('Gagal: ' + (e.message || e))
  } finally {
    loading.value = false
  }
}
</script>
