# 🚀 TaskFlow - Ứng dụng Quản lý Nhiệm vụ Full-Stack

## 📦 Cài đặt & Khởi động

### 1. Yêu cầu
- Node.js >= 18
- MySQL 8.x (đang chạy)
- Tài khoản Google Cloud Console (cho OAuth)

### 2. Tạo Database MySQL

```sql
CREATE DATABASE task_manager_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Cấu hình môi trường

Mở file `backend/.env` và điền thông tin:
- `DB_USER` / `DB_PASS` — thông tin MySQL của bạn
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — lấy từ Google Cloud Console

### 4. Khởi động (3 terminal)

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 — User Frontend:**
```bash
cd frontend-user
npm run dev
```

**Terminal 3 — Admin Frontend:**
```bash
cd frontend-admin
npm run dev
```

## 🌐 Truy cập

| Ứng dụng | URL |
|---|---|
| 👤 User Portal | http://localhost:5173 |
| 🛡️ Admin Panel | http://localhost:5174 |
| ⚙️ API Server | http://localhost:3000 |
| 📖 API Docs | http://localhost:3000/api/docs |

## 🔐 Tài khoản mặc định

| Role | Email | Mật khẩu |
|---|---|---|
| Admin | admin@taskmanager.com | Admin@123 |

> Admin được tạo tự động khi server khởi động lần đầu.

## 🔑 Thiết lập Google OAuth (Tùy chọn)

1. Vào [Google Cloud Console](https://console.cloud.google.com)
2. Tạo project mới → **APIs & Services** → **Credentials**
3. Tạo **OAuth 2.0 Client ID** (loại Web application)
4. Thêm Authorized redirect URI: `http://localhost:3000/api/auth/google/callback`
5. Copy **Client ID** và **Client Secret** vào `backend/.env`

## 📡 API Endpoints

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | /api/auth/register | Đăng ký |
| POST | /api/auth/login | Đăng nhập user |
| POST | /api/auth/admin-login | Đăng nhập admin |
| GET | /api/auth/google | Google OAuth |
| GET | /api/tasks | Lấy danh sách task |
| POST | /api/tasks | Tạo task |
| PUT | /api/tasks/:id | Cập nhật task |
| DELETE | /api/tasks/:id | Xóa task |
| GET | /api/admin/stats | Thống kê admin |
| GET | /api/admin/users | Quản lý users |

Xem toàn bộ API tại: http://localhost:3000/api/docs
