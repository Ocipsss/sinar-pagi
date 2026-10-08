import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '../layouts/MainLayout.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: MainLayout, // <-- pakai MainLayout disini
      children: [
        { path: '', name: 'dashboard', component: () => import('../views/Dashboard.vue'), meta: { title: 'Dashboard' } },
        { path: 'kasir', name: 'kasir', component: () => import('../views/Kasir.vue'), meta: { title: 'Kasir' } },
        { path: 'products', name: 'products', component: () => import('../views/ProductsList.vue'), meta: { title: 'Produk' } },
        { path: 'products/add', name: 'products-add', component: () => import('../views/ProductsAdd.vue'), meta: { title: 'Tambah Produk' } },
        { path: 'shopping', name: 'shopping', component: () => import('../views/Shopping.vue'), meta: { title: 'Belanja' } },
        { path: 'members', name: 'members', component: () => import('../views/Members.vue'), meta: { title: 'Member & Utang' } },
        { path: 'expenses', name: 'expenses', component: () => import('../views/Expenses.vue'), meta: { title: 'Pengeluaran' } },
        { path: 'reports', name: 'reports', component: () => import('../views/Reports.vue'), meta: { title: 'Laporan' } },
        { path: 'settings', name: 'settings', component: () => import('../views/Settings.vue'), meta: { title: 'Pengaturan' } },
      ]
    }
  ]
})