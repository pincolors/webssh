# ==========================================
# 第一阶段：编译前端 (Vue 3)
# ==========================================
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
# 忽略脚本错误，防止因环境差异导致的报错
RUN npm config set unsafe-perm true

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ .
# 这里的 .dockerignore 会起作用，防止本地 node_modules 干扰
RUN npm run build

# ==========================================
# 第二阶段：编译后端 (Go)
# ==========================================
FROM golang:alpine AS backend-builder

# 安装 git (go mod download 需要)
RUN apk add --no-cache git

# 设置代理，防止下载依赖超时
ENV GOPROXY=https://proxy.golang.org,direct

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o webssh-server main.go

# ==========================================
# 第三阶段：生成最终镜像 (Alpine)
# ==========================================
FROM alpine:3.20

# 1. 安装基础库 + sed (用于修复换行符)
RUN apk add --no-cache ca-certificates tzdata bash sed

WORKDIR /app

# 2. 复制编译好的文件
COPY --from=backend-builder /app/webssh-server .
# ⚠️ 注意：这里假设 Vue 打包输出在 public，如果是 dist 请自行修改
COPY --from=frontend-builder /app/frontend/public ./public

COPY start.sh .

# 🔥🔥🔥 核心修复：移除 Windows 换行符 (\r) 🔥🔥🔥
# 这一步能救命，无论你在 Windows 上怎么保存文件，这里都会强制修正
RUN sed -i 's/\r$//' start.sh && \
    chmod +x start.sh webssh-server

EXPOSE 8888

# 3. 启动命令
CMD ["./start.sh"]
