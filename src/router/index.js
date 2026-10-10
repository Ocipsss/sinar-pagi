import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '../layouts/MainLayout.vue'
import ProductsList from '../views/ProductsList.vue'
import ProductsAdd from '../views/ProductsAdd.vue'

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
          path: 'add-products', 
          name: 'ProductsAdd',
          component: ProductsAdd,
          meta: { title: 'Tambah Barang' }
        },
        { 
          path: 'edit-product/:id', 
          name: 'ProductsEdit',
          component: ProductsAdd, // pakai form yang sama buat edit
          meta: { title: 'Tambah Barang' }
        },
        { 
          path: 'dashboard', 
          name: 'Dashboard', 
          component: () => import('../views/Dashboard.vue'),
          meta: { title: 'Dashboard' }
        },
        { 
          path: 'kasir', 
          name: 'Kasir', 
          component: () => import('../views/Kasir.vue'),
          meta: { title: 'Kasir' }
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