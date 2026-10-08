import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { router } from './router/index.js'
import { syncRealtime as syncService } from './services/syncService.js'

const app = createApp(App)
app.use(router)
app.mount('#app')

// bungkus try-catch biar kalau firebase error gak bikin blank
try {
  syncService.init()
} catch (e) {
  console.error('Sync gagal init, jalan offline dulu:', e)
}