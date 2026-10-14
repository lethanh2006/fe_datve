# syntax=docker/dockerfile:1

# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# VITE_* được gắn vào bundle lúc build
ARG VITE_API_BASE_URL=
ARG VITE_TIME_ZONE=Asia/Ho_Chi_Minh
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL VITE_TIME_ZONE=$VITE_TIME_ZONE
RUN npm run build

# ---- chạy: nginx phục vụ file tĩnh và chuyển tiếp /api sang backend ----
FROM nginx:1.27-alpine
# Địa chỉ backend, thay được lúc chạy: docker run -e BACKEND_URL=http://api:8080
ENV BACKEND_URL=http://api:8080
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=3s --retries=3 CMD wget -q --spider http://127.0.0.1/ || exit 1
