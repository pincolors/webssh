import { createRouter, createWebHistory } from 'vue-router'
import Login from '@/views/Login.vue'
import TerminalPage from '@/views/TerminalPage.vue'

// 注意：在 Vue 3 中不需要 Vue.use(Router) 了，
// 这一步已经移动到了 main.js 的 app.use(router) 中

const router = createRouter({
  // 1. mode: 'history' 变成了 history: createWebHistory()
  history: createWebHistory(),
  
  // 2. routes 配置保持不变
  routes: [
    { 
      path: '/', 
      name: 'Login', // 建议加上 name，方便后续编程式跳转
      component: Login 
    },
    { 
      path: '/terminal', 
      name: 'Terminal', 
      component: TerminalPage 
    }
  ]
})

export default router
