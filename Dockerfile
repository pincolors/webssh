# ==============================
# 第一阶段：编译前端 (Vue)
# ==============================
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# 复制配置文件
COPY frontend/package.json frontend/package-lock.json ./

# 安装依赖
RUN npm install

# 复制源码并编译
COPY frontend/ .
RUN npm run build


# ==============================
# 第二阶段：编译后端 (Go)
# ==============================
# 🔥修改点：升级到 1.22，防止版本过低导致编译失败
FROM golang:1.22-alpine AS backend-builder

# 安装 git (下载依赖需要)
RUN apk add --no-cache git

WORKDIR /app

# 复制 go.mod 和 go.sum
COPY go.mod go.sum ./
ENV GOPROXY=https://goproxy.io,direct
RUN go mod download

# 复制剩余代码
COPY . .

# 🔥新增：自动整理一下依赖，防止 go.sum 不一致报错
RUN go mod tidy

# 复制前端编译好的文件到 public 目录
COPY --from=frontend-builder /app/frontend/dist ./public

# 编译 Go (CGO_ENABLED=0 确保静态链接)
RUN CGO_ENABLED=0 GOOS=linux go build -o webssh main.go


# ==============================
# 第三阶段：运行环境
# ==============================
FROM alpine:latest

WORKDIR /root/

COPY --from=backend-builder /app/webssh .

EXPOSE 8888

CMD ["./webssh"]
