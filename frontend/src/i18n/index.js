import { createI18n } from 'vue-i18n'

// 定义语言包
const messages = {
  en: {
    message: {
      hello: 'hello world',
      // 这里可以把原来 en.js 的内容复制过来
    }
  },
  zh: {
    message: {
      hello: '你好，世界',
      // 这里可以把原来 zh.js 的内容复制过来
    }
  }
}

// 创建 i18n 实例
const i18n = createI18n({
  // 使用 Composition API 模式，必须设置为 false
  legacy: false, 
  // 全局注入 $t 函数（如果你想在模板里直接用 $t）
  globalInjection: true,
  // 默认语言
  locale: 'zh', // 或者 localStorage.getItem('lang') || 'zh'
  // 备用语言
  fallbackLocale: 'en',
  messages
})

export default i18n
