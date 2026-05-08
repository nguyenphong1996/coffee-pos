# ================================================
# COFFEE POS - Quick Start Guide
# ================================================

# 1. Clone/Download project vào server
cd coffee-pos

# 2. Copy và chỉnh sửa environment
cp .env.example .env
# Chỉnh JWT_SECRET và MONGO_PASSWORD trong .env

# 3. Build & Run toàn bộ stack (MongoDB + Backend + Frontend)
docker compose up -d --build

# Hoặc chạy từng phần:
#   MongoDB độc lập: docker compose -f mongo-standalone.yml up -d
#   Backend: docker compose up -d backend
#   Frontend: docker compose up -d frontend

# 4. Truy cập
#   Frontend:   http://<server-ip>:3000
#   Backend API: http://<server-ip>:5000
#   Mongo Express (tùy chọn): http://<server-ip>:8081
#     username: admin / password: coffee123

# 5. Đăng nhập lần đầu
#   Email: admin@coffee.com
#   Password: admin123
#   (Nên đổi password ngay sau khi đăng nhập)

# 6. Xem logs
docker compose logs -f

# 7. Stop
docker compose down

# ================================================
# LAN Deployment
# ================================================
# Thay FRONTEND_URL trong .env thành IP của server:
#   FRONTEND_URL=http://192.168.1.100:3000
# Sau đó client trong LAN truy cập: http://192.168.1.100:3000

# ================================================
# VPS Deployment
# ================================================
# 1. Cài Docker trên VPS
# 2. Clone project
# 3. Chạy: docker compose up -d --build
# 4. Cấu hình Nginx với SSL (Let's Encrypt)
# 5. Domain trỏ về VPS IP
# coffee-pos
