import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '../layouts/MainLayout.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: MainLayout,
      children: [
        { 
          path: '', 
          name: 'dashboard', 
          component: () => import('../views/Dashboard.vue'), 
          meta: { title: 'Dashboard' } 
        },
        { 
          path: 'kasir', 
          name: 'kasir', 
          component: () => import('../views/Kasir.vue'), 
          meta: { title: 'Kasir' } 
        },
        { 
          path: 'products', 
          name: 'products', 
          component: () => import('../views/ProductsList.vue'), 
          meta: { title: 'Daftar Produk' } 
        },
        { 
          path: 'add-products', 
          name: 'add-products', 
          component: () => import('../views/ProductsAdd.vue'), 
          meta: { title: 'Tambah Produk' } 
        },
        { 
          path: 'products-digital', 
          name: 'products-digital', 
          component: () => import('../views/ProductsDigital.vue'), 
          meta: { title: 'Produk Digital' } 
        },
        { 
          path: 'shopping', 
          name: 'shopping', 
          component: () => import('../views/Shopping.vue'), 
          meta: { title: 'List Belanja' } 
        },
        { 
          path: 'members', 
          name: 'members', 
          component: () => import('../views/Members.vue'), 
          meta: { title: 'Member & Utang' } 
        },
        { 
          path: 'expenses', 
          name: 'expenses', 
          component: () => import('../views/Expenses.vue'), 
          meta: { title: 'Pengeluaran' } 
        },
        { 
          path: 'operators', 
          name: 'operators', 
          component: () => import('../views/Operators.vue'), 
          meta: { title: 'Operator & Kasir' } 
        },
        { 
          path: 'reports', 
          name: 'reports', 
          component: () => import('../views/Reports.vue'), 
          meta: { title: 'Laporan Penjualan' } 
        },
        { 
          path: 'settings', 
          name: 'settings', 
          component: () => import('../views/Settings.vue'), 
          meta: { title: 'Pengaturan' } 
        }
      ]
    }
  ]
})
