# ==============================
# 第一阶段：编译前端 (Vue)
# ==============================
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# 复制配置文件 (frontend 目录下)
COPY frontend/package.json frontend/package-lock.json ./

# 安装依赖
RUN npm install

# 复制源码并编译
COPY frontend/ .
RUN npm run build


# ==============================
# 第二阶段：编译后端 (Go)
# ==============================
# 🔥修改点：将版本从 1.22 升级到 1.24，以匹配你的 go.mod
FROM golang:1.24-alpine AS backend-builder

# 安装 git
RUN apk add --no-cache git

WORKDIR /app

# 复制依赖文件
COPY go.mod go.sum ./
ENV GOPROXY=https://goproxy.io,direct
RUN go mod download

# 复制剩余代码
COPY . .

# 整理依赖
RUN go mod tidy

# 复制前端编译好的文件到 public 目录
COPY --from=frontend-builder /app/frontend/dist ./public

# 编译 Go
RUN CGO_ENABLED=0 GOOS=linux go build -o webssh main.go


# ==============================
# 第三阶段：运行环境
# ==============================
FROM alpine:latest

WORKDIR /root/

COPY --from=backend-builder /app/webssh .

EXPOSE 8888

CMD ["./webssh"]
