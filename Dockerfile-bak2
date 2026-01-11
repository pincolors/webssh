# ==========================================
# 第一阶段：编译前端 (Vue 3)
# ==========================================
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ .
RUN npm run build

# ==========================================
# 第二阶段：编译后端 (Go) - ⚠️ 核心修改处
# ==========================================
# 1. 改用 latest 或更高版本，确保兼容你的 go.mod
FROM golang:alpine AS backend-builder

# 2. 安装 git (go mod download 某些依赖需要它)
RUN apk add --no-cache git

# 3. 设置 Go 代理 (防止 GitHub Action 里的网络超时)
ENV GOPROXY=https://proxy.golang.org,direct

WORKDIR /app

# 4. 先复制依赖文件
COPY go.mod go.sum ./

# 5. 下载依赖
RUN go mod download

# 6. 复制其余源码并编译
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o webssh-server main.go

# ==========================================
# 第三阶段：生成最终镜像 (Alpine)
# ==========================================
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata bash

WORKDIR /app

COPY --from=backend-builder /app/webssh-server .
# ⚠️ 再次确认你的前端打包路径是 public 还是 dist，这里假设是 public
COPY --from=frontend-builder /app/frontend/public ./public

COPY start.sh .
RUN chmod +x start.sh webssh-server

EXPOSE 8888

CMD ["./webssh-server"]
