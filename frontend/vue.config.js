const { defineConfig } = require('@vue/cli-service')
const path = require('path');

// 你的后端地址
const proxyTarget = 'http://127.0.0.1:8888';
// 自动替换 http 为 ws 用于 websocket
const wsTarget = proxyTarget.replace('http', 'ws');

module.exports = defineConfig({
  // 1. 基本路径配置
  publicPath: '/',
  outputDir: '../public',
  assetsDir: 'static',
  lintOnSave: true,
  productionSourceMap: false,
  
  // 2. 并行构建配置
  parallel: require('os').cpus().length > 1,

  // 3. 开发服务器配置
  devServer: {
    host: '0.0.0.0',
    port: 8257,
    https: false,
    open: true,
    allowedHosts: 'all', 
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
        ws: true,
        pathRewrite: {
          '^/api': ''
        }
      },
      // 关键修复：这里使用 /term 而不是 /ws，避免和 Webpack 热更新冲突
      '/term': {
        target: wsTarget,
        changeOrigin: true,
        ws: true
        // 注意：连接后端时不需要 rewrite，因为后端就是监听 /term
      }
    }
  }, // <--- 报错就是因为这里之前少了这个逗号！

  // 4. Webpack 配置
  configureWebpack(config) {
    config.performance = {
      hints: false
    };

    if (process.env.NODE_ENV === 'production') {
      config.optimization = {
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 512000,
          maxAsyncRequests: 30,
          maxInitialRequests: 30,
          automaticNameDelimiter: '-',
          cacheGroups: {
            vendors: {
              name: 'chunk-vendors',
              test: /[\\/]node_modules[\\/]/,
              priority: -10,
              chunks: 'initial'
            },
            elementPlus: {
              name: 'chunk-elementPlus',
              priority: 20,
              test: /[\\/]node_modules[\\/]element-plus[\\/]/
            },
            common: {
              name: 'chunk-common',
              minChunks: 2,
              priority: -20,
              chunks: 'initial',
              reuseExistingChunk: true
            }
          }
        }
      };

      try {
        const CompressionPlugin = require('compression-webpack-plugin');
        config.plugins.push(
          new CompressionPlugin({
            algorithm: 'gzip',
            test: /\.(js|css|html|svg)$/,
            threshold: 10240,
            minRatio: 0.8
          })
        );
      } catch (e) {
        console.warn('compression-webpack-plugin 未安装，跳过 Gzip 压缩');
      }
    }
  }, // <--- 这里也需要逗号

  // 5. 链式 Webpack 配置
  chainWebpack(config) {
    config.plugins.delete('prefetch');

    // 修复 Webpack 5 下 copy-webpack-plugin 的语法
    config.plugin('copy').tap(() => {
      return [
        {
          patterns: [
            {
              from: path.resolve(__dirname, 'public/img'),
              to: path.resolve(__dirname, '../public/static/img'),
              noErrorOnMissing: true
            }
          ]
        }
      ];
    });

    if (process.env.NODE_ENV === 'production') {
      config.devtool(false);
    }
  }
})
