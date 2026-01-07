// src/main.js 的第一行
window.process = window.process || { env: { NODE_ENV: 'development' } }
import { createApp } from 'vue'
// ... 后面的代码保持不变
import { createApp } from 'vue' // 1. 核心改变：引入 createApp
import App from '@/App.vue'     // 建议加上 .vue 后缀，虽然不是必须的但更规范

// 2. Element Plus 替换 Element UI
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css' // 样式路径变了
import * as ElementPlusIconsVue from '@element-plus/icons-vue' // 引入图标

// 全局样式
import '@/styles/index.scss'

// 3. 引入路由和状态管理
import store from '@/store/index'
import router from './router'

// xterm 样式保持不变
import 'xterm/css/xterm.css'

// 4. i18n (注意：你的 ./lang/index 文件内部也需要升级为 createI18n 写法)
import i18n from './lang/index'

// 5. 创建 App 实例
const app = createApp(App)

// 6. 注册插件 (原本的 Vue.use 现在改为 app.use)
app.use(store)
app.use(router)
app.use(i18n)
app.use(ElementPlus) // 这里直接使用完整引入，替代了你原来的 '@/utils/element'

// 7. 注册所有图标组件 (这是 Vue 3 新增步骤)
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 8. 挂载
app.mount('#app')

// --- 主题切换逻辑 (保持原有逻辑，增加 Element Plus 兼容) ---

function setTheme(theme) {
  // 保持你原有的逻辑
  if (theme === 'dark') {
    document.body.classList.add('dark-theme');
    // 新增：Element Plus 的暗黑模式依赖 HTML 标签上的 'dark' 类
    document.documentElement.classList.add('dark');
  } else {
    document.body.classList.remove('dark-theme');
    document.documentElement.classList.remove('dark');
  }
  localStorage.setItem('theme', theme);
}

// 初始化
setTheme(localStorage.getItem('theme') || 'light');
window.setTheme = setTheme;
