# 📝 To-Do List Application — TaskFlow (Đồ án Thực tập)

Dự án ứng dụng quản lý nhiệm vụ (Task Manager / To-Do List) Full-Stack với bảng Kanban, Sprint Backlog, Biểu đồ Burndown, xác thực tài khoản Google/Firebase và phân quyền Admin.

---

## 👥 Phân công nhiệm vụ & Lộ trình của nhóm

| Vai trò | Thành viên | Phụ trách chính |
| :---: | :--- | :--- |
| **Backend & Database** | 🛠️ Thiện | Node.js, Express, kết nối Database, API endpoints |
| **Frontend & UI/UX** | 🎨 Hòa | React, Vite, CSS, Kanban Board, Sprints, Burndown Chart, Google/Firebase Auth |
| **Kiểm thử & Báo cáo** | 📋 Nhật | Sơ đồ ERD/BFD/DFD, tài liệu đặc tả, test cases, báo cáo đồ án |

---

## 🗂️ Cấu trúc thư mục dự án

```
├── backend/            # API Server (Node.js, Express, Sequelize, MySQL)
├── frontend-user/      # Ứng dụng người dùng (React, Vite, Kanban, Sprints, Firebase Auth)
├── frontend-admin/     # Bảng điều khiển quản trị viên (Admin Dashboard)
├── docs/               # Đề cương đồ án & Đặc tả yêu cầu thiết kế hệ thống
└── tests/              # Tài liệu kiểm thử & Test cases
```

---

## 📦 Hướng dẫn cài đặt & Khởi động dự án

### 1. Yêu cầu môi trường
- Node.js >= 18
- MySQL 8.x

### 2. Tạo Database MySQL
```sql
CREATE DATABASE task_manager_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Cấu hình môi trường
Mở file `backend/.env` và cập nhật thông tin:
- `DB_USER` / `DB_PASS` — tài khoản MySQL của bạn
- Cấu hình Firebase hoặc JWT nếu cần

### 4. Khởi động các dịch vụ (3 Terminal)

**Terminal 1 — Backend API:**
```bash
cd backend
npm install
npm run dev
```
- Server chạy tại: `http://localhost:3000` (hoặc `http://localhost:5000`)
- Tài liệu API: `http://localhost:3000/api/docs`

**Terminal 2 — User Frontend:**
```bash
cd frontend-user
npm install
npm run dev
```
- Truy cập tại: `http://localhost:5173`

**Terminal 3 — Admin Frontend:**
```bash
cd frontend-admin
npm install
npm run dev
```
- Truy cập tại: `http://localhost:5174`

---

## 🔐 Tài khoản mặc định

| Role | Email | Mật khẩu |
|---|---|---|
| Admin | admin@taskmanager.com | Admin@123 |

*(Tài khoản Admin sẽ được tự động tạo khi backend khởi động lần đầu)*
