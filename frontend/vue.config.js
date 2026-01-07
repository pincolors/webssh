const { defineConfig } = require('@vue/cli-service')
const path = require('path');
const proxyTarget = 'http://127.0.0.1:8888';
const wsTarget = proxyTarget.replace('http', 'ws');

module.exports = defineConfig({
  // 1. 基本路径配置
  publicPath: '/',
  outputDir: '../public',
  assetsDir: 'static',
  lintOnSave: true,
  productionSourceMap: false,
  
  // 2. 只有在非 Windows 平台或者多核 CPU 下开启并行构建，避免 Windows 下某些奇怪的报错
  parallel: require('os').cpus().length > 1,

  // 3. 开发服务器配置
  devServer: {
    host: '0.0.0.0',
    port: 8257,
    https: false,
    open: true,
    allowedHosts: 'all', // 替代旧版 disableHostCheck
       proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
        ws: true,
        pathRewrite: {
          '^/api': ''
        }
      },
      // 修改点：直接代理 /term，这是 Go 后端定义的真实 WebSocket 路径
      '/term': {
        target: wsTarget, // 这里会自动使用 ws://127.0.0.1:8888
        changeOrigin: true,
        ws: true,
        // 注意：不要写 pathRewrite，除非你需要改路径
      }
    }

    }
  }, // <--- 注意这里有逗号

  // 4. Webpack 配置 (对象简写语法，最稳妥)
  configureWebpack(config) {
    config.performance = {
      hints: false
    };

    // 生产环境优化配置
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

      // Gzip 压缩 (如果有安装插件才运行，防止报错)
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
  }, // <--- 注意这里有逗号

  // 5. 链式 Webpack 配置
  chainWebpack(config) {
    config.plugins.delete('prefetch');

    // 拷贝 public/img 到 ../public/static/img
    // 修复了 Webpack 5 下 copy-webpack-plugin 的语法问题
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

    // 生产环境不生成 source map
    if (process.env.NODE_ENV === 'production') {
      config.devtool(false);
    }
  }
})
