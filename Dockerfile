# ==========================================
# 第一阶段：编译前端 (Vue 3)
# ==========================================
FROM node:18-alpine AS frontend-builder

# 设置工作目录
WORKDIR /app/frontend

# 1. 单独复制 package.json 安装依赖 (利用 Docker 缓存加速)
COPY frontend/package*.json ./
RUN npm install

# 2. 复制前端所有源码并打包
COPY frontend/ .
RUN npm run build

# ==========================================
# 第二阶段：编译后端 (Go)
# ==========================================
FROM golang:1.21-alpine AS backend-builder

# 设置 Go 代理 (可选，GitHub Actions 环境通常不需要，但在国内需要)
# ENV GOPROXY=https://goproxy.cn,direct

WORKDIR /app

# 复制后端源码 (假设 main.go 在根目录)
COPY . .

# 编译 Go 程序
# CGO_ENABLED=0: 禁用 CGO 以便在 Alpine 上运行
# GOOS=linux: 目标系统 Linux
RUN CGO_ENABLED=0 GOOS=linux go build -o webssh-server main.go

# ==========================================
# 第三阶段：生成最终镜像 (Alpine)
# ==========================================
FROM alpine:3.20

# 安装基础运行环境 (时区、ca证书等)
RUN apk add --no-cache ca-certificates tzdata bash

WORKDIR /app

# 1. 从后端构建阶段复制二进制文件
COPY --from=backend-builder /app/webssh-server .

# 2. 从前端构建阶段复制打包好的静态文件
# 注意：根据你之前的日志，打包输出在 public 目录，如果是在 dist 请自行修改为 /app/frontend/dist
COPY --from=frontend-builder /app/frontend/public ./public
# 如果你的 index.html 在 dist 里，请把上面一行换成：
# COPY --from=frontend-builder /app/frontend/dist ./public

# 3. 复制启动脚本 (如果有)
COPY start.sh .
RUN chmod +x start.sh webssh-server

# 暴露端口
EXPOSE 8888

# 启动命令
CMD ["./webssh-server"]
