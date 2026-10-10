import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '../layouts/MainLayout.vue'
import ProductsList from '../views/ProductsList.vue'
import ProductsAdd from '../views/ProductsAdd.vue'
import CategoriesView from '../views/Categories.vue'
import MembersView from '../views/Members.vue'
import SalesHistoryView from '../views/SalesHistory.vue'
import SettingsMenu from '../views/SettingsMenu.vue'
import Operators from '../views/Operators.vue'
import ProductsDigital from '../views/ProductsDigital.vue'
import Finance from '../views/Finance.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: MainLayout,
      children: [
        { path: '', redirect: '/products' },
        { 
          path: 'products', 
          name: 'ProductsList',
          component: ProductsList,
          meta: { title: 'Barang' }
        },
        { 
  path: 'operators', 
  name: 'Operators',
  component: () => import('../views/Operators.vue'),
  meta: { title: 'Operator / Kasir' }
},
        { 
          path: 'categories', 
          name: 'Categories',
          component: CategoriesView,
          meta: { title: 'Kategori Barang' }
        },
        { 
          path: 'add-products', 
          name: 'ProductsAdd',
          component: ProductsAdd,
          meta: { title: 'Tambah Barang' }
        },
        { 
          path: 'dashboard', 
          name: 'Dashboard', 
          component: () => import('../views/Dashboard.vue'),
          meta: { title: 'Dashboard' }
        },
        { 
          path: 'members', 
          name: 'Members',
          component: MembersView,
          meta: { title: 'Daftar Member' }
        },
        { 
          path: 'kasir', 
          name: 'Kasir', 
          component: () => import('../views/Kasir.vue'),
          meta: { title: 'Kasir' }
        },
        { 
  path: 'digital', 
  name: 'ProductsDigital',
  component: () => import('../views/ProductsDigital.vue'),
  meta: { title: 'Transaksi Digital' }
},
        { 
          path: 'sales-history', 
          name: 'SalesHistory',
          component: SalesHistoryView,
          meta: { title: 'Riwayat Penjualan' }
        },
        { 
  path: 'finance', 
  name: 'Finance', 
  component: () => import('../views/Finance.vue'),
  meta: { title: 'Kas & Keuangan' }
},
        {
  path: 'settings-menu', 
  name: 'SettingsMenu', 
  component: () => import('../views/SettingsMenu.vue'),
  meta: { title: 'Atur Rokok & Seduh' }
        },
        { 
          path: 'shopping', 
          name: 'Shopping', 
          component: () => import('../views/Shopping.vue'),
          meta: { title: 'Belanja' }
        },
      ]
    }
  ]
})
