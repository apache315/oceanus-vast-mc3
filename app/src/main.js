import { createApp } from 'vue'
import './style.css'
import './lib/locale.js'
import App from './App.vue'
import router from './router.js'

createApp(App).use(router).mount('#app')
