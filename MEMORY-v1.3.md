REKAP PEMBARUAN PROYEK (CHANGELOG & ARSITEKTUR)
1. Fitur Member & Sistem Poin Profit 1%
 * Penyimpanan Data Member: Menyimpan profil member (name, phone, address, total_spending, points, debt).
 * Akumulasi Poin Otomatis: Setiap kali transaksi kasir diselesaikan dengan member terpilih, sistem menghitung keuntungan bersih per item:
   
   
   Member mendapatkan poin sebesar 1% dari total profit transaksi (\lfloor \text{Total Profit} \times 0.01 \rfloor).
 * Pembayaran Utang / Cicilan TEMPO: Fitur pelunasan utang member yang langsung memotong saldo utang (debt) dan mencatat histori transaksi ke tabel debt_payments.
2. Manajemen Keranjang Belanja & Multi-Cart (Kasir)
 * Pinia Persistence Store (kasirStore.js): Mengubah penyimpanan keranjang kasir dari local state ke Pinia Store dengan plugin persistedstate. Keranjang tidak lagi hilang saat berpindah halaman/rute.
 * Fitur Tunda Transaksi (Pending Cart):
   * Kasir dapat menunda transaksi berjalan (misal: antrean member 1 tertunda karena memilih barang tambahan) tanpa kehilangan isi keranjang.
   * Mendukung penyimpanan banyak keranjang tertunda (multi-cart) lengkap dengan label/nama pelanggan.
   * Kasir dapat melanjutkan (resume) atau menghapus transaksi tertunda kapan saja.
3. Halaman Riwayat Penjualan (SalesHistory.vue)
 * Pencarian & Filter: Filter transaksi berdasarkan metode pembayaran (CASH, QRIS, TEMPO) dan pencarian berdasarkan ID nota/nama member.
 * Statistik Omzet & Piutang: Menampilkan kalkulasi total omzet terpilih serta nilai sisa piutang TEMPO secara real-time.
 * Modal Rincian Nota: Menampilkan detail daftar barang, harga eceran, kuantitas, serta subtotal tiap item dalam transaksi.
4. Arsitektur Kode & Standardisasi SoC (Separation of Concerns)
Seluruh modul baru telah distrukturkan menggunakan Clean Architecture / SoC:
 * Database / Repository Layer (src/db/repositories/): Khusus mengurus kueri Dexie DB (memberRepo, transactionRepo, categoryRepo).
 * Business & State Layer (src/composables/ & src/stores/):
   * useKasirStore.js: Manajemen state keranjang aktif & pending.
   * useSalesHistory.js: Logika filter, agregasi statistik omzet/piutang, dan formatting tanggal.
   * kasirService.js: Logika kalkulasi profit, kalkulasi poin, dan checkout.
 * UI / Presentation Layer (src/views/): Komponen Vue murni fokus pada penyajian tampilan (render UI) dan penanganan gestur interaksi pengguna.
Catatan Penanganan Modul Node.js
 * Impor dayjs Locale: Penggunaan locale Indonesia diset secara eksplisit melalui instance modul untuk menghindari syntax error/export mismatch pada bundler Vite:
   import dayjs from 'dayjs'
import localeId from 'dayjs/locale/id'

dayjs.locale(localeId)

