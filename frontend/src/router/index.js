import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue' // 确保路径对
// 如果你有 Console 或 Terminal 组件，按需引入
// import TerminalPage from '../views/TerminalPage.vue' 

const routes = [
  {
    path: '/',
    name: 'Login',
    component: Login
  },
  {
    path: '/terminal', // 你的终端页面路由
    name: 'Terminal',
    // 路由懒加载写法（推荐）
    component: () => import('../views/TerminalPage.vue') 
  },
  // 404 路由
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    redirect: '/'
  }
]

const router = createRouter({
  // Vue 3 使用 createWebHistory
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router
