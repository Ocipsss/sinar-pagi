import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import './style.css'
import App from './App.vue'
import { router } from './router/index.js'
import { syncRealtime as syncService } from './services/syncService.js'

const app = createApp(App)
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
app.use(pinia)
app.use(router)
app.mount('#app')

try { syncService.init() } catch (e) {
  console.error('Sync gagal init, jalan offline dulu:', e)
}