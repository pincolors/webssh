module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es6: true
  },
  parserOptions: {
    // 如果你的依赖里已经升级到了 @babel/eslint-parser，这里就改用它
    // 如果没有，暂时保持 babel-eslint 防止报错
    parser: 'babel-eslint', 
    sourceType: 'module'
  },
  extends: [
    // ⚠️ 核心修改：改为 Vue 3 的校验规则
    'plugin:vue/vue3-essential',
    'eslint:recommended'
  ],
  rules: {
    'no-console': 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    // Vue 3 允许组件名由多个单词组成，防止报错可以关掉这个规则
    'vue/multi-word-component-names': 'off'
  }
}
