<template>
  <div class="flex-1 overflow-auto p-4 pb-24 space-y-6">
    <!-- Header -->
    <div>
      <h1 class="font-black text-xl text-zinc-900">Pengaturan Menu & Jasa</h1>
      <p class="text-xs text-zinc-400">Kelola tarif jasa dan harga paket per produk</p>
    </div>

    <!-- Tab Navigasi -->
    <div class="flex bg-zinc-100 p-1 rounded-2xl gap-1">
      <button 
        @click="activeTab = 'seduh'" 
        :class="['flex-1 py-2.5 rounded-xl text-xs font-bold transition', activeTab === 'seduh' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500']"
      >
        Tarif Jasa per Kategori
      </button>
      <button 
        @click="activeTab = 'paket'" 
        :class="['flex-1 py-2.5 rounded-xl text-xs font-bold transition', activeTab === 'paket' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500']"
      >
        Harga Paket
      </button>
    </div>

    <!-- ============================================================= -->
    <!-- TAB 1: TARIF JASA                                            -->
    <!-- ============================================================= -->
    <div v-if="activeTab === 'seduh'" class="space-y-4">
      <div class="flex justify-between items-center">
        <h2 class="font-black text-sm text-zinc-800">Daftar Tarif Jasa</h2>
        <button 
          @click="openServiceModal()" 
          class="bg-zinc-900 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition"
        >
          <Plus class="w-4 h-4"/> Tambah Jasa
        </button>
      </div>

      <div v-if="sortedServices.length === 0" class="py-12 text-center text-zinc-400 text-xs bg-white rounded-2xl border border-zinc-100">
        Belum ada tarif jasa
      </div>

      <div v-else class="space-y-2">
        <div 
          v-for="s in sortedServices" 
          :key="s.id" 
          class="p-4 bg-white rounded-2xl border border-zinc-100 shadow-sm flex items-center justify-between"
        >
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-bold text-sm text-zinc-900">{{ s.name }}</span>
              <span v-if="getServiceIds(s).length" class="px-2 py-0.5 bg-zinc-900 text-white rounded-md text-[10px] font-black uppercase">
                KHUSUS: {{ getServiceIds(s).length > 1 ? `${getServiceIds(s).length} PRODUK` : getProductName(getServiceIds(s)[0]) }}
              </span>
              <span v-else class="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md text-[10px] font-black uppercase">
                {{ s.category || 'Umum' }}
              </span>
            </div>
            <div class="text-xs text-amber-600 font-black mt-0.5">Rp {{ formatRibuan(s.price) }}</div>
            <div v-if="getServiceIds(s).length > 1" class="text-[10px] text-zinc-400 mt-1 truncate max-w-[220px]">
              {{ getServiceIds(s).map(id => getProductName(id)).join(', ') }}
            </div>
          </div>
          <div class="flex gap-1">
            <button @click="openServiceModal(s)" class="p-2 text-zinc-600 hover:bg-zinc-100 rounded-xl">
              <Pencil class="w-4 h-4"/>
            </button>
            <button @click="handleDeleteService(s)" class="p-2 text-red-500 hover:bg-red-50 rounded-xl">
              <Trash2 class="w-4 h-4"/>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================================= -->
    <!-- TAB 2: HARGA PAKET                                           -->
    <!-- ============================================================= -->
    <div v-if="activeTab === 'paket'" class="space-y-4">
      <!-- Tombol + Paket Baru -->
      <div class="flex justify-between items-center">
        <h2 class="font-black text-sm text-zinc-800">Daftar Harga Paket</h2>
        <button 
          @click="openNewPackageModal"
          class="bg-zinc-900 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition"
        >
          <Plus class="w-4 h-4"/> Paket Baru
        </button>
      </div>

      <!-- Filter kategori -->
      <div class="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button 
          @click="selectedPackageCat = 'ALL'"
          :class="[
            'px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition',
            selectedPackageCat === 'ALL' ? 'bg-zinc-900 text-white shadow-sm' : 'bg-white text-zinc-600 border border-zinc-200'
          ]"
        >
          Semua ({{ packageProducts.length }})
        </button>
        <button 
          v-for="cat in categoriesWithPackages" 
          :key="cat"
          @click="selectedPackageCat = cat"
          :class="[
            'px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition uppercase',
            selectedPackageCat === cat ? 'bg-zinc-900 text-white shadow-sm' : 'bg-white text-zinc-600 border border-zinc-200'
          ]"
        >
          {{ cat }} ({{ countProductsByCategory(cat) }})
        </button>
      </div>

      <!-- Empty State -->
      <div v-if="filteredPackageProducts.length === 0" class="py-12 text-center text-zinc-400 text-xs bg-white rounded-2xl border border-zinc-100">
        <div v-if="packageProducts.length === 0">
          Belum ada produk yang punya paket. Klik "+ Paket Baru" untuk menambahkan.
        </div>
        <div v-else>
          Belum ada produk di kategori ini
        </div>
      </div>

      <!-- Daftar Produk Berpaket -->
      <div v-else class="space-y-3">
        <div 
          v-for="p in filteredPackageProducts" 
          :key="p.id" 
          class="p-4 bg-white rounded-2xl border border-zinc-100 shadow-sm space-y-3"
        >
          <div class="flex justify-between items-center border-b border-zinc-50 pb-2">
            <div>
              <div class="font-bold text-sm text-zinc-900 flex items-center gap-2">
                <span>{{ p.name }}</span>
                <span class="px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded-md text-[10px] font-black uppercase">
                  {{ p.category || 'UMUM' }}
                </span>
              </div>
              <div class="text-[11px] text-zinc-400">Harga Utuh: Rp {{ formatRibuan(p.price_sell) }}</div>
            </div>
            <button 
              @click="openVariantModal(p)" 
              class="px-3 py-1.5 bg-zinc-100 text-zinc-800 rounded-xl text-xs font-bold hover:bg-zinc-200 active:scale-95 transition"
            >
              + Varian
            </button>
          </div>

          <!-- LIST PAKET DRAG & DROP -->
          <div class="space-y-1.5">
            <div class="text-[10px] font-black text-zinc-400 uppercase tracking-wider flex items-center gap-1">
              <GripVertical class="w-3 h-3"/> Tekan & geser untuk atur posisi
            </div>
            <div 
              v-for="(pkg, idx) in getPackagesForProduct(p.id)" 
              :key="pkg.id"
              :data-pkg-id="pkg.id"
              draggable="true"
              @dragstart="onDragStart(pkg)"
              @dragover.prevent="onDragOver(pkg)"
              @dragleave="dragOverId = null"
              @drop="onDrop(p.id, pkg)"
              @dragend="onDragEnd"
              :class="[
                'flex justify-between items-center p-2.5 rounded-xl text-xs border-2 transition-all cursor-grab active:cursor-grabbing select-none',
                draggedPkg?.id === pkg.id ? 'opacity-30 bg-zinc-200 border-dashed border-zinc-400' : 'bg-zinc-50 border-transparent',
                dragOverId === pkg.id ? 'border-amber-400 bg-amber-50 scale-[1.02] shadow-md' : ''
              ]"
            >
              <div class="flex items-center gap-2">
                <div class="w-7 h-7 bg-white border border-zinc-200 rounded-lg flex items-center justify-center cursor-grab">
                  <GripVertical class="w-4 h-4 text-zinc-400"/>
                </div>
                <span class="w-5 h-5 bg-zinc-900 text-white rounded-full flex items-center justify-center text-[10px] font-black">{{ idx + 1 }}</span>
                <div>
                  <span class="font-bold text-zinc-800">{{ pkg.name }}</span>
                  <span class="text-zinc-400 ml-1.5">({{ pkg.qty_pcs }})</span>
                </div>
              </div>
              <div class="flex items-center gap-1">
                <span class="font-black text-zinc-900 mr-1">Rp {{ formatRibuan(pkg.price_sell) }}</span>
                <button @click="openEditVariantModal(p, pkg)" class="p-1.5 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-100">
                  <Pencil class="w-3.5 h-3.5"/>
                </button>
                <button @click="handleDeletePackage(pkg)" class="p-1.5 bg-white border border-zinc-200 rounded-lg text-red-500 hover:bg-red-50">
                  <Trash2 class="w-3.5 h-3.5"/>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================================= -->
    <!-- MODAL FORM JASA (tetap)                                      -->
    <!-- ============================================================= -->
    <div v-if="showServiceModal" class="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div class="w-full max-w-md bg-white rounded-t-[2rem] sm:rounded-[2rem] p-6 shadow-xl space-y-4 max-h-[90vh] overflow-auto">
        <div class="flex justify-between items-center">
          <h2 class="font-black text-base">{{ editingServiceId ? 'Edit Tarif Jasa' : 'Tambah Tarif Jasa' }}</h2>
          <button @click="showServiceModal = false" class="p-2 bg-zinc-100 rounded-xl"><X class="w-4 h-4"/></button>
        </div>

        <form @submit.prevent="handleSaveService" class="space-y-3">
          <div class="flex items-center gap-2 p-3 bg-zinc-50 rounded-xl border border-zinc-100">
            <button type="button" @click="isCustomService = !isCustomService" :class="['w-10 h-6 rounded-full p-0.5 transition shrink-0', isCustomService ? 'bg-zinc-900' : 'bg-zinc-200']">
              <div :class="['w-4 h-4 bg-white rounded-full shadow transition-transform', isCustomService ? 'translate-x-4' : 'translate-x-0']"></div>
            </button>
            <div>
              <div class="text-xs font-black text-zinc-800">Jasa khusus untuk produk pilihan</div>
              <div class="text-[10px] text-zinc-500">Bisa pilih 1 atau beberapa produk sekaligus</div>
            </div>
          </div>

          <div v-if="isCustomService">
            <label class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Pilih Produk * ({{ serviceForm.productIds.length }} dipilih)</label>
            <button 
              type="button" 
              @click="showProductPickerModal = true"
              class="w-full px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm font-bold text-left flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-zinc-900"
            >
              <span class="truncate">{{ serviceForm.productIds.length ? `${serviceForm.productIds.length} PRODUK DIPILIH` : 'PILIH PRODUK' }}</span>
              <ChevronDown class="w-4 h-4 text-zinc-400 shrink-0" />
            </button>
            <div v-if="serviceForm.productIds.length" class="flex flex-wrap gap-1 mt-2">
              <span v-for="pid in serviceForm.productIds" :key="pid" class="px-2 py-1 bg-zinc-900 text-white rounded-full text-[10px] font-bold flex items-center gap-1">
                {{ getProductName(pid) }}
                <button type="button" @click="toggleProduct(pid)" class="ml-1 bg-white/20 rounded-full w-3.5 h-3.5 flex items-center justify-center">✕</button>
              </span>
            </div>
          </div>

          <div>
            <label class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Untuk Kategori Produk *</label>
            <button 
              type="button" 
              @click="showServiceCategoryPicker = true"
              class="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold uppercase text-left flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-zinc-900"
            >
              <span class="truncate">{{ serviceForm.category || 'PILIH KATEGORI' }}</span>
              <ChevronDown class="w-4 h-4 text-zinc-400 shrink-0" />
            </button>
            <p v-if="isCustomService" class="text-[10px] text-zinc-400 mt-1">Otomatis ikut kategori produk pertama, tapi bisa diubah</p>
          </div>

          <div>
            <label class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Nama Layanan *</label>
            <input 
              v-model="serviceForm.name" 
              required 
              placeholder="CONTOH: SEDUH, ES BATU, DLL" 
              class="w-full px-4 py-3 bg-zinc-50 border rounded-xl text-sm font-bold uppercase"
            />
          </div>
          <div>
            <label class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Biaya Jasa (Rp) *</label>
            <input 
              :value="formatRp(serviceForm.price)" 
              @input="e => serviceForm.price = toNumber(e.target.value)" 
              type="text" 
              inputmode="numeric" 
              required 
              placeholder="Rp 0" 
              class="w-full px-4 py-3 bg-zinc-50 border rounded-xl text-lg font-black text-zinc-900"
            />
          </div>
          <div class="flex gap-2 pt-2">
            <button type="button" @click="showServiceModal = false" class="flex-1 py-3 bg-zinc-100 font-bold text-xs rounded-xl">Batal</button>
            <button type="submit" class="flex-1 py-3 bg-zinc-900 text-white font-bold text-xs rounded-xl shadow-md">Simpan</button>
          </div>
        </form>
      </div>
    </div>

    <!-- ============================================================= -->
    <!-- MODAL FORM PAKET (Tambah Baru / Edit / Varian)               -->
    <!-- ============================================================= -->
    <div v-if="showPackageModal" class="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div class="w-full max-w-md bg-white rounded-t-[2rem] sm:rounded-[2rem] p-6 shadow-xl space-y-4 max-h-[90vh] overflow-auto">
        <div class="flex justify-between items-center">
          <div>
            <h2 class="font-black text-base">{{ packageModalTitle }}</h2>
            <p class="text-xs text-zinc-400">{{ packageModalSubtitle }}</p>
          </div>
          <button @click="closePackageModal" class="p-2 bg-zinc-100 rounded-xl"><X class="w-4 h-4"/></button>
        </div>

        <form @submit.prevent="handleSavePackage" class="space-y-3">
          <!-- Kategori (readonly kalau mode varian/edit) -->
          <div>
            <label class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Kategori Produk *</label>
            <button 
              v-if="packageMode === 'new'"
              type="button" 
              @click="showPkgCategoryPicker = true"
              class="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold uppercase text-left flex justify-between items-center"
            >
              <span class="truncate">{{ packageForm.category || 'PILIH KATEGORI' }}</span>
              <ChevronDown class="w-4 h-4 text-zinc-400 shrink-0" />
            </button>
            <div 
              v-else
              class="w-full px-4 py-3 bg-zinc-100 border border-zinc-200 rounded-xl text-sm font-bold uppercase text-zinc-600"
            >
              {{ packageForm.category }}
            </div>
          </div>

          <!-- Produk (readonly kalau mode varian/edit) -->
          <div>
            <label class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Produk *</label>
            <button 
              v-if="packageMode === 'new'"
              type="button" 
              :disabled="!packageForm.category"
              @click="openPkgProductPicker"
              :class="[
                'w-full px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm font-bold uppercase text-left flex justify-between items-center disabled:opacity-50 disabled:cursor-not-allowed',
              ]"
            >
              <span class="truncate">{{ packageForm.productName || (packageForm.category ? 'PILIH PRODUK' : 'PILIH KATEGORI DULU') }}</span>
              <ChevronDown class="w-4 h-4 text-zinc-400 shrink-0" />
            </button>
            <div 
              v-else
              class="w-full px-4 py-3 bg-zinc-100 border border-zinc-200 rounded-xl text-sm font-bold uppercase text-zinc-600"
            >
              {{ packageForm.productName }}
            </div>
          </div>

          <!-- Nama Varian -->
          <div>
            <label class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Nama Varian *</label>
            <input 
              v-model="packageForm.name" 
              required 
              placeholder="CONTOH: 1 BATANG, 3 BIJI, 1 RENTENG" 
              class="w-full px-4 py-3 bg-zinc-50 border rounded-xl text-sm font-bold uppercase"
            />
          </div>

          <!-- Jumlah Pcs -->
          <div>
            <label class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Jumlah Pcs/Batang Dipotong *</label>
            <input v-model.number="packageForm.qty_pcs" type="number" required min="1" placeholder="1" class="w-full px-4 py-3 bg-zinc-50 border rounded-xl text-sm font-bold"/>
          </div>

          <!-- Harga Jual -->
          <div>
            <label class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Harga Jual Varian (Rp) *</label>
            <input 
              :value="formatRp(packageForm.price_sell)" 
              @input="e => packageForm.price_sell = toNumber(e.target.value)" 
              type="text" 
              inputmode="numeric" 
              required 
              placeholder="Rp 0" 
              class="w-full px-4 py-3 bg-zinc-50 border rounded-xl text-lg font-black text-zinc-900"
            />
          </div>

          <div class="flex gap-2 pt-2">
            <button type="button" @click="closePackageModal" class="flex-1 py-3 bg-zinc-100 font-bold text-xs rounded-xl">Batal</button>
            <button type="submit" :disabled="!canSubmitPackage" class="flex-1 py-3 bg-zinc-900 text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
              {{ packageMode === 'edit' ? 'Simpan Perubahan' : 'Simpan Paket' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ============================================================= -->
    <!-- MODAL PICKER: Kategori Jasa                                  -->
    <!-- ============================================================= -->
    <div v-if="showServiceCategoryPicker" class="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="w-full max-w-sm bg-white rounded-[2rem] p-5 shadow-xl animate-in zoom-in-95 duration-200 max-h-[80vh] flex flex-col">
        <div class="flex justify-between items-center mb-3">
          <h3 class="font-black text-base text-zinc-900">Pilih Kategori Produk</h3>
          <button type="button" @click="showServiceCategoryPicker = false" class="p-2 bg-zinc-100 rounded-xl"><X class="w-4 h-4"/></button>
        </div>
        <div class="space-y-1.5 overflow-auto flex-1 pr-1">
          <div v-if="categoryOptions.length === 0" class="py-6 text-center text-xs text-zinc-400">Belum ada kategori</div>
          <button 
            v-for="cat in categoryOptions" 
            :key="cat.id" 
            type="button"
            @click="serviceForm.category = cat.name; showServiceCategoryPicker = false"
            :class="['w-full p-3 rounded-xl font-bold text-xs text-left uppercase transition', serviceForm.category === cat.name ? 'bg-zinc-900 text-white shadow-md' : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-800']"
          >
            {{ cat.name }}
          </button>
        </div>
      </div>
    </div>

    <!-- ============================================================= -->
    <!-- MODAL PICKER: Produk Jasa MULTI                              -->
    <!-- ============================================================= -->
    <div v-if="showProductPickerModal" class="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="w-full max-w-sm bg-white rounded-[2rem] p-5 shadow-xl max-h-[80vh] flex flex-col">
        <div class="flex justify-between items-center mb-3">
          <h3 class="font-black text-base text-zinc-900">Pilih Produk ({{ serviceForm.productIds.length }})</h3>
          <button type="button" @click="showProductPickerModal = false" class="p-2 bg-zinc-100 rounded-xl"><X class="w-4 h-4"/></button>
        </div>
        <div class="relative mb-3">
          <input v-model="productSearch" placeholder="Cari produk..." class="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold"/>
        </div>
        <div class="space-y-1.5 overflow-auto flex-1 pr-1">
          <button 
            v-for="prod in serviceProductOptions" 
            :key="prod.id" 
            type="button"
            @click="toggleProduct(prod.id)"
            :class="['w-full p-3 rounded-xl font-bold text-xs text-left transition flex justify-between items-center', serviceForm.productIds.includes(prod.id) ? 'bg-zinc-900 text-white shadow-md' : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-800']"
          >
            <div class="min-w-0 flex-1">
              <div class="truncate">{{ prod.name }}</div>
              <div class="text-[10px] opacity-60 uppercase">{{ prod.category }}</div>
            </div>
            <div v-if="serviceForm.productIds.includes(prod.id)" class="ml-2 w-5 h-5 bg-white text-zinc-900 rounded-full flex items-center justify-center text-[10px] font-black shrink-0">✓</div>
          </button>
        </div>
        <div class="flex gap-2 pt-3 border-t border-zinc-100 mt-3">
          <button type="button" @click="serviceForm.productIds = []" class="flex-1 py-2.5 bg-zinc-100 rounded-xl text-xs font-bold">Clear</button>
          <button type="button" @click="showProductPickerModal = false" class="flex-1 py-2.5 bg-zinc-900 text-white rounded-xl text-xs font-bold">Selesai ({{ serviceForm.productIds.length }})</button>
        </div>
      </div>
    </div>

    <!-- ============================================================= -->
    <!-- MODAL PICKER: Kategori Paket                                 -->
    <!-- ============================================================= -->
    <div v-if="showPkgCategoryPicker" class="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="w-full max-w-sm bg-white rounded-[2rem] p-5 shadow-xl max-h-[80vh] flex flex-col">
        <div class="flex justify-between items-center mb-3">
          <h3 class="font-black text-base text-zinc-900">Pilih Kategori Produk</h3>
          <button type="button" @click="showPkgCategoryPicker = false" class="p-2 bg-zinc-100 rounded-xl"><X class="w-4 h-4"/></button>
        </div>
        <div class="space-y-1.5 overflow-auto flex-1 pr-1">
          <div v-if="categoriesWithoutPackage.length === 0" class="py-6 text-center text-xs text-zinc-400">
            Semua produk di semua kategori sudah punya paket.
          </div>
          <button 
            v-for="cat in categoriesWithoutPackage" 
            :key="cat" 
            type="button"
            @click="selectPkgCategory(cat)"
            :class="['w-full p-3 rounded-xl font-bold text-xs text-left uppercase transition', packageForm.category === cat ? 'bg-zinc-900 text-white shadow-md' : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-800']"
          >
            {{ cat }}
          </button>
        </div>
      </div>
    </div>

    <!-- ============================================================= -->
    <!-- MODAL PICKER: Produk Paket                                   -->
    <!-- ============================================================= -->
    <div v-if="showPkgProductPicker" class="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="w-full max-w-sm bg-white rounded-[2rem] p-5 shadow-xl max-h-[80vh] flex flex-col">
        <div class="flex justify-between items-center mb-3">
          <h3 class="font-black text-base text-zinc-900">Pilih Produk</h3>
          <button type="button" @click="showPkgProductPicker = false" class="p-2 bg-zinc-100 rounded-xl"><X class="w-4 h-4"/></button>
        </div>
        <div class="relative mb-3">
          <input v-model="pkgProductSearch" placeholder="Cari produk..." class="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold"/>
        </div>
        <div class="space-y-1.5 overflow-auto flex-1 pr-1">
          <div v-if="pkgProductOptions.length === 0" class="py-6 text-center text-xs text-zinc-400">
            Tidak ada produk di kategori ini
          </div>
          <button 
            v-for="prod in pkgProductOptions" 
            :key="prod.id" 
            type="button"
            @click="selectPkgProduct(prod)"
            :class="['w-full p-3 rounded-xl font-bold text-xs text-left transition flex justify-between items-center', packageForm.productId === prod.id ? 'bg-zinc-900 text-white shadow-md' : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-800']"
          >
            <div class="min-w-0 flex-1">
              <div class="truncate">{{ prod.name }}</div>
              <div class="text-[10px] opacity-60 uppercase">{{ prod.category }}</div>
            </div>
            <div v-if="packageForm.productId === prod.id" class="ml-2 w-5 h-5 bg-white text-zinc-900 rounded-full flex items-center justify-center text-[10px] font-black shrink-0">✓</div>
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onActivated } from 'vue'
import { Plus, Pencil, Trash2, X, ChevronDown, GripVertical } from 'lucide-vue-next'
import { useSettingsMenu } from '../composables/useSettingsMenu.js'
import { formatRibuan, formatRp, toNumber } from '../utils/formatters/currency.js'
import { toast } from 'vue-sonner'

const activeTab = ref('seduh')
const selectedPackageCat = ref('ALL')

const {
  allProducts,
  packageProducts,
  categoriesWithPackages,
  categoriesWithoutPackage,
  services,
  categoryOptions,
  loadData,
  getPackagesForProduct,
  getProductsByCategoryWithoutPackage,
  getProductById,
  getServiceIds,
  savePackage,
  deletePackage,
  reorderPackages,
  saveService,
  deleteService
} = useSettingsMenu()

// ============================================================
// TAB JASA
// ============================================================
const sortedServices = computed(() => {
  return [...services.value].sort((a, b) => 
    (a.name || '').localeCompare(b.name || '', 'id', { sensitivity: 'base' })
  )
})

const filteredPackageProducts = computed(() => {
  if (selectedPackageCat.value === 'ALL') return packageProducts.value
  return packageProducts.value.filter(
    p => (p.category || 'UMUM').toUpperCase() === selectedPackageCat.value
  )
})

const countProductsByCategory = (cat) => {
  return packageProducts.value.filter(p => (p.category || 'UMUM').toUpperCase() === cat).length
}

// ============================================================
// MODAL JASA
// ============================================================
const showServiceModal = ref(false)
const showServiceCategoryPicker = ref(false)
const showProductPickerModal = ref(false)
const editingServiceId = ref(null)
const isCustomService = ref(false)
const productSearch = ref('')
const serviceForm = ref({ name: '', price: 0, category: 'Mie', productId: null, productIds: [] })

const serviceProductOptions = computed(() => {
  const q = productSearch.value.toLowerCase()
  let list = allProducts.value
  if(q) list = list.filter(p => (p.name||'').toLowerCase().includes(q))
  return list.slice(0, 80)
})

const getProductName = (id) => {
  if(!id) return ''
  return getProductById(id)?.name || 'Produk tidak ditemukan'
}

const toggleProduct = (id) => {
  const list = [...(serviceForm.value.productIds || [])]
  const idx = list.indexOf(id)
  if(idx > -1) list.splice(idx, 1)
  else list.push(id)
  serviceForm.value.productIds = list
  if(list.length === 1){
    const p = getProductById(list[0])
    if(p && p.category) serviceForm.value.category = p.category
  }
}

const openServiceModal = async (s = null, productOverride = null) => {
  await loadData()
  productSearch.value = ''
  if (s) {
    editingServiceId.value = s.id
    const ids = getServiceIds(s)
    isCustomService.value = ids.length > 0
    serviceForm.value = { 
      name: (s.name || '').toUpperCase(), 
      price: s.price, 
      category: s.category || 'Mie',
      productId: null,
      productIds: ids
    }
  } else if (productOverride) {
    editingServiceId.value = null
    isCustomService.value = true
    serviceForm.value = { 
      name: 'SEDUH', 
      price: 3000, 
      category: productOverride.category || categoryOptions.value[0]?.name || 'Mie',
      productId: null,
      productIds: [productOverride.id]
    }
  } else {
    editingServiceId.value = null
    isCustomService.value = false
    serviceForm.value = { 
      name: 'SEDUH', 
      price: 2000, 
      category: categoryOptions.value[0]?.name || 'Mie',
      productId: null,
      productIds: []
    }
  }
  showServiceModal.value = true
}

const handleSaveService = async () => {
  if(isCustomService.value && (!serviceForm.value.productIds || serviceForm.value.productIds.length === 0)){
    toast.error('Pilih produk dulu, bisa lebih dari 1')
    return
  }
  try {
    await saveService({
      id: editingServiceId.value,
      name: (serviceForm.value.name || '').toUpperCase().trim(),
      price: Number(serviceForm.value.price) || 0,
      category: serviceForm.value.category,
      productId: null,
      productIds: isCustomService.value ? serviceForm.value.productIds : []
    })
    showServiceModal.value = false
  } catch (e) {
    console.error('GAGAL SAVE JASA:', e)
    toast.error('Gagal simpan: ' + (e.message || e))
  }
}

const handleDeleteService = async (s) => {
  if (confirm(`Hapus tarif "${s.name}"?`)) {
    await deleteService(s.id)
  }
}

// ============================================================
// MODAL PAKET (BARU / EDIT / VARIAN)
// ============================================================
const showPackageModal = ref(false)
const showPkgCategoryPicker = ref(false)
const showPkgProductPicker = ref(false)
const pkgProductSearch = ref('')

// mode: 'new' | 'edit' | 'variant'
// - new    : pilih kategori & produk dari nol (tombol "+ Paket Baru")
// - variant: produk sudah dipilih, user tinggal isi varian (tombol "+ Varian" per produk)
// - edit   : edit varian yang sudah ada
const packageMode = ref('new')
const editingPackageId = ref(null)
const packageForm = ref({
  category: '',
  productId: null,
  productName: '',
  name: '',
  qty_pcs: 1,
  price_sell: 0
})

const packageModalTitle = computed(() => {
  if (packageMode.value === 'edit') return 'Edit Varian Paket'
  if (packageMode.value === 'variant') return 'Tambah Varian Paket'
  return 'Tambah Paket Baru'
})

const packageModalSubtitle = computed(() => {
  if (packageMode.value === 'new') return 'Pilih kategori & produk, lalu isi varian paket'
  if (packageMode.value === 'variant') return packageForm.value.productName
  return packageForm.value.productName
})

const canSubmitPackage = computed(() => {
  if (packageMode.value === 'new' && !packageForm.value.productId) return false
  return !!packageForm.value.name?.trim()
})

const pkgProductOptions = computed(() => {
  if (!packageForm.value.category) return []
  let list = getProductsByCategoryWithoutPackage(packageForm.value.category)
  const q = pkgProductSearch.value.toLowerCase().trim()
  if (q) list = list.filter(p => (p.name || '').toLowerCase().includes(q))
  return list
})

const selectPkgCategory = (cat) => {
  packageForm.value.category = cat
  packageForm.value.productId = null
  packageForm.value.productName = ''
  showPkgCategoryPicker.value = false
}

const openPkgProductPicker = () => {
  if (!packageForm.value.category) return
  pkgProductSearch.value = ''
  showPkgProductPicker.value = true
}

const selectPkgProduct = (prod) => {
  packageForm.value.productId = prod.id
  packageForm.value.productName = prod.name
  packageForm.value.category = (prod.category || 'UMUM').toUpperCase()
  showPkgProductPicker.value = false
}

const resetPackageForm = () => {
  packageForm.value = {
    category: '',
    productId: null,
    productName: '',
    name: '',
    qty_pcs: 1,
    price_sell: 0
  }
  editingPackageId.value = null
}

const openNewPackageModal = () => {
  // Kalau semua produk sudah punya paket, tidak bisa tambah baru
  if (packageProducts.value.length === allProducts.value.length || categoriesWithoutPackage.value.length === 0) {
    toast.info('Semua produk sudah punya paket. Tambah varian lewat tombol "+ Varian" di produk masing-masing.')
    return
  }
  packageMode.value = 'new'
  resetPackageForm()
  showPackageModal.value = true
}

const openVariantModal = (product) => {
  packageMode.value = 'variant'
  editingPackageId.value = null
  packageForm.value = {
    category: (product.category || 'UMUM').toUpperCase(),
    productId: product.id,
    productName: product.name,
    name: '',
    qty_pcs: 1,
    price_sell: 0
  }
  showPackageModal.value = true
}

const openEditVariantModal = (product, pkg) => {
  packageMode.value = 'edit'
  editingPackageId.value = pkg.id
  packageForm.value = {
    category: (product.category || 'UMUM').toUpperCase(),
    productId: product.id,
    productName: product.name,
    name: pkg.name,
    qty_pcs: pkg.qty_pcs,
    price_sell: pkg.price_sell
  }
  showPackageModal.value = true
}

const closePackageModal = () => {
  showPackageModal.value = false
  resetPackageForm()
}

const handleSavePackage = async () => {
  if (!packageForm.value.productId) {
    toast.error('Pilih produk dulu')
    return
  }
  if (!packageForm.value.name?.trim()) {
    toast.error('Nama varian wajib diisi')
    return
  }
  if (!packageForm.value.qty_pcs || packageForm.value.qty_pcs < 1) {
    toast.error('Jumlah pcs minimal 1')
    return
  }
  await savePackage({
    id: editingPackageId.value || undefined,
    productId: packageForm.value.productId,
    name: (packageForm.value.name || '').toUpperCase().trim(),
    qty_pcs: Number(packageForm.value.qty_pcs) || 1,
    price_sell: Number(packageForm.value.price_sell) || 0
  })
  closePackageModal()
}

const handleDeletePackage = async (pkg) => {
  if (confirm(`Hapus varian paket "${pkg.name}"?`)) {
    await deletePackage(pkg.id)
  }
}

// ============================================================
// DRAG & DROP
// ============================================================
const draggedPkg = ref(null)
const dragOverId = ref(null)

const onDragStart = (pkg) => { draggedPkg.value = pkg }
const onDragOver = (pkg) => { dragOverId.value = pkg.id }
const onDragEnd = () => { draggedPkg.value = null; dragOverId.value = null }

const onDrop = async (productId, targetPkg) => {
  if (!draggedPkg.value || draggedPkg.value.id === targetPkg.id) {
    onDragEnd()
    return
  }
  const list = getPackagesForProduct(productId)
  const fromIdx = list.findIndex(p => p.id === draggedPkg.value.id)
  const toIdx = list.findIndex(p => p.id === targetPkg.id)
  const newList = [...list]
  const [moved] = newList.splice(fromIdx, 1)
  newList.splice(toIdx, 0, moved)
  await reorderPackages(productId, newList.map(p => p.id))
  onDragEnd()
}

// ============================================================
// LIFECYCLE
// ============================================================
onMounted(() => {
  loadData()
})
onActivated(() => {
  loadData()
})
</script>