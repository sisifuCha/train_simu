import { createApp } from 'vue'
import { createPinia } from 'pinia'
import naive from 'naive-ui'
import router from './router/index.js'
import App from './App.vue'
import './assets/styles/theme.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(naive)   // 注册 naive-ui，使 n-message-provider 等组件与 useMessage 生效
app.mount('#app')
