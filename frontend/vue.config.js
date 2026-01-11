const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  transpileDependencies: true,
  // 生产环境是否生成 sourceMap 文件 (false 可以减少打包体积，也就看不到源码了)
  productionSourceMap: false,
  // 解决打包后白屏问题，使用相对路径
  publicPath: '/',
  // 🔥🔥🔥 新增这一行：彻底关闭 ESLint 检查 🔥🔥🔥
  lintOnSave: false, 

  
  // ⚠️ 这里就是你要找回的配置 (本地开发服务器设置)
  devServer: {
    host: '0.0.0.0', // 允许局域网访问
    port: 8259,      // 前端开发端口
    open: true,      // 启动后自动打开浏览器
    proxy: {
      // 捕获所有以 /api 开头的请求
      '/api': {
        target: 'http://127.0.0.1:8888', // 转发给本地的 Go 后端
        changeOrigin: true,
        ws: true,    // 🔥 关键：开启 WebSocket 代理 (解决 ws 连接问题)
        pathRewrite: {
          '^/api': '' // 发送给后端时去掉 /api 前缀
        }
      }
    },
    // 解决 Invalid Host header 问题
    allowedHosts: 'all'
  }
})
