import { defineConfig } from 'vite';
import { createVuePlugin } from 'vite-plugin-vue2';  // 过渡插件
import path from 'path';
import { CompressionPlugin } from 'compression-webpack-plugin';  // Vite 需要 vite-plugin-compression 替代

export default defineConfig({
  plugins: [
    createVuePlugin(),
    // Gzip 压缩（安装 vite-plugin-compression）
    // compression({ algorithm: 'gzip', test: /\.(js|css|html|svg)$/, threshold: 10240, minRatio: 0.8 })
  ],
  base: '/',  // 等同 publicPath
  build: {
    outDir: '../public',  // 等同 outputDir
    assetsDir: 'static',  // 等同 assetsDir
    sourcemap: process.env.NODE_ENV !== 'production',  // 等同 productionSourceMap: false
    chunkSizeWarningLimit: 512,  // 类似 maxSize
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('element-ui')) return 'chunk-elementUI';
            return 'chunk-vendors';
          }
        }
      }
    }
  },
  server: {
    open: true,  // 等同 devServer.open
    host: '0.0.0.0',
    port: 8257,
    https: false,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8888',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/ws': {
        target: 'ws://127.0.0.1:8888',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/ws/, '')
      }
    }
  },
  optimizeDeps: {
    // 等同 parallel，但 Vite 默认并行
  },
  // 拷贝 public/img 到输出目录（使用 vite-plugin-copy）
  // 安装 vite-plugin-copy，然后添加插件
  // copy([{ from: 'public/img', to: '../public/static/img' }])
  // 删除 prefetch：Vite 默认不 prefetch
});
