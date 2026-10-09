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
          component: ProductsList 
        },
        { 
          path: 'add-products', 
          name: 'ProductsAdd',
          component: ProductsAdd 
        },
        // placeholder buat sesi v.2 nanti
        { path: 'kasir', name: 'Kasir', component: () => import('../views/Kasir.vue') },
        { path: 'shopping', name: 'Shopping', component: () => import('../views/Shopping.vue') }
      ]
    }
  ]
})