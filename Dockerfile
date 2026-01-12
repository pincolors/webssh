# ==============================
# 第一阶段：编译前端 (Vue)
# ==============================
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# 复制前端配置文件
COPY frontend/package.json frontend/package-lock.json ./

# 安装依赖
RUN npm install

# 复制前端源码
COPY frontend/ .

# 编译生成 dist
RUN npm run build


# ==============================
# 第二阶段：编译后端 (Go)
# ==============================
FROM golang:1.20-alpine AS backend-builder

# 1. 🔥新增：安装 git (有些依赖需要 git 拉取)
RUN apk add --no-cache git

WORKDIR /app

# 2. 🔥优化：先复制 go.mod 下载依赖 (利用缓存)
COPY go.mod go.sum ./
# 设置 Proxy 防止超时
ENV GOPROXY=https://goproxy.io,direct
RUN go mod download

# 复制剩余代码
COPY . .

# 3. 复制前端编译好的文件到 public 目录
# 确保 main.go 中的 //go:embed public/* 能找到文件
COPY --from=frontend-builder /app/frontend/dist ./public

# 4. 🔥关键修正：禁用 CGO 进行静态编译🔥
# 这能解决 Alpine 缺少 gcc 导致的 "build failed" 错误
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o webssh main.go


# ==============================
# 第三阶段：最终运行环境
# ==============================
FROM alpine:latest

# 安装基础库 (可选，但在 Alpine 里有时需要 ca-certificates 来发 HTTPS 请求)
RUN apk add --no-cache ca-certificates

WORKDIR /root/

# 复制二进制文件
COPY --from=backend-builder /app/webssh .

EXPOSE 8888

CMD ["./webssh"]
