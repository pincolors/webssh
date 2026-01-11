# ==============================
# 第一阶段：编译前端 (Vue)
# ==============================
FROM node:18-alpine AS frontend-builder

# 1. 设置工作目录为容器内的 /app/frontend
WORKDIR /app/frontend

# 2. 🔥关键修正：从宿主机的 frontend 目录复制配置文件的容器里🔥
# 因为你的 Docker 构建上下文是根目录，所以要写 "frontend/xxx"
COPY frontend/package.json frontend/package-lock.json ./

# 安装依赖
RUN npm install

# 3. 🔥关键修正：复制 frontend 文件夹下的所有源码🔥
COPY frontend/ .

# 编译生成 dist
RUN npm run build


# ==============================
# 第二阶段：编译后端 (Go)
# ==============================
FROM golang:1.20-alpine AS backend-builder

WORKDIR /app

# 复制根目录下所有文件 (包含 Go 代码和原本的 public 目录)
COPY . .

# 4. 🔥关键修正：把编译好的前端(dist) 覆盖到 Go 的静态资源目录(public)🔥
# 前端编译结果在：/app/frontend/dist
# Go 期望的位置在：./public (根据你的 main.go 代码逻辑)
# 这步操作会用最新的 Vue 3 界面替换掉你 public 目录里的旧文件
COPY --from=frontend-builder /app/frontend/dist ./public

# 编译 Go 程序
RUN go build -o webssh main.go


# ==============================
# 第三阶段：最终运行环境
# ==============================
FROM alpine:latest

WORKDIR /root/

# 复制最终的二进制文件
COPY --from=backend-builder /app/webssh .

EXPOSE 8888

CMD ["./webssh"]
