# ==============================
# 第一阶段：编译前端 (Vue)
# ==============================
FROM node:18-alpine AS frontend-builder

# 设置工作目录
WORKDIR /app/frontend

# 1. 这一步很关键：把你的前端代码复制进去
# 注意：假设你的前端代码在项目根目录，如果是在 'web' 或 'src' 文件夹，请改成 COPY ./web .
COPY . .

# 2. 安装依赖
# 如果你的网络环境在国外(GitHub Actions)，不需要设置淘宝源
RUN npm install

# 3. 🔥这里就是你漏掉的命令！🔥
# 它会生成一个 dist 文件夹，里面是最新的界面
RUN npm run build


# ==============================
# 第二阶段：编译后端 (Go)
# ==============================
FROM golang:1.20-alpine AS backend-builder

WORKDIR /app

# 复制所有 Go 代码
COPY . .

# 4. 🔥关键步骤：把第一阶段编译好的 dist 拿过来🔥
# 假设你的 Go 代码期望静态文件在 'public' 或 'static' 目录下
# 这里的 /app/frontend/dist 是第一阶段生成的
# 这里的 ./public 是 Go 程序读取静态文件的位置 (根据你的 main.go 调整)
COPY --from=frontend-builder /app/frontend/dist ./public/dist
# 或者如果你的 main.go 是 embed 了整个 public 文件夹：
# COPY --from=frontend-builder /app/frontend/dist ./public

# 编译 Go 程序
RUN go build -o webssh main.go


# ==============================
# 第三阶段：最终运行环境 (最小化镜像)
# ==============================
FROM alpine:latest

WORKDIR /root/

# 从第二阶段复制编译好的二进制文件
COPY --from=backend-builder /app/webssh .

# 如果需要，也可以单独复制 dist (取决于你的 Go 怎么写的)
# COPY --from=frontend-builder /app/frontend/dist ./public/dist

EXPOSE 8888

CMD ["./webssh"]
