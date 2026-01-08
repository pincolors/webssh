// src/main.js
window.process = window.process || { env: { NODE_ENV: 'development' } }

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
// 1. 新增：引入 i18n 配置
import i18n from './i18n'

import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

const app = createApp(App)

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(store)
   .use(router)
   .use(ElementPlus)
   .use(i18n) // 2. 新增：这一行非常重要！必须挂载 i18n
   .mount('#app')
