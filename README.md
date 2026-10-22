# 📝 To-Do List Application

Dự án ứng dụng quản lý nhiệm vụ cá nhân (To-Do List) được xây dựng theo mô hình Full-Stack (Client - Server).

---

## 👥 Phân công nhiệm vụ & Lộ trình 3 tuần của nhóm

| Tuần | 🛠️ Thiện (Backend + Database) | 🎨 Hòa (Frontend) | 📋 Nhật (Kiểm thử + Tài liệu) |
| :---: | :--- | :--- | :--- |
| **Tuần 1** | - Tạo repo, dựng khung Express ban đầu.<br>- Vẽ lược đồ ERD, tạo bảng `Users`, `Tasks`, `Categories`.<br>- Viết API CRUD nhiệm vụ cơ bản.<br>*(Nhánh: `feature/api-tasks`)* | - Dựng khung React (Vite).<br>- Làm trang danh sách nhiệm vụ và form thêm/sửa (dùng dữ liệu giả).<br>*(Nhánh: `feature/ui-tasks`)* | - Viết tài liệu đặc tả yêu cầu hệ thống.<br>- Vẽ sơ đồ phân rã chức năng (BFD) & luồng dữ liệu (DFD).<br>- Soạn bộ test case cho chức năng CRUD.<br>*(Nhánh: `docs/report`, `test/api-cases`)* |
| **Tuần 2** | - Viết API đăng ký / đăng nhập (xác thực JWT).<br>- Nối API với cơ sở dữ liệu thật.<br>- Bổ sung tính năng lọc, tìm kiếm, sắp xếp nhiệm vụ.<br>*(Nhánh: `feature/auth`)* | - Làm trang đăng nhập / đăng ký.<br>- Nối giao diện với API thật của Thiện.<br>- Làm bộ lọc (lọc theo trạng thái, danh mục) và ô tìm kiếm.<br>*(Nhánh: `feature/ui-login`)* | - Kiểm thử API backend bằng Postman, ghi log báo cáo lỗi (Bug report).<br>- Soạn thảo nội dung Chương 3 và các mục 4.1 – 4.4 của báo cáo đồ án.<br>*(Nhánh: `docs/report`, `test/api-cases`)* |
| **Tuần 3** | - Rà soát sửa lỗi API, kiểm tra và validate dữ liệu đầu vào.<br>- Triển khai (Deploy) Backend + Database lên server cloud. | - Hoàn thiện giao diện UI/UX, sửa lỗi hiển thị.<br>- Triển khai (Deploy) Frontend. | - Kiểm thử toàn diện hệ thống (End-to-End).<br>- Viết tài liệu hướng dẫn sử dụng.<br>- Hoàn thiện mục 4.5 – 4.7 và Chương 5 của báo cáo. |

---

## 🗂️ Phân chia thư mục phụ trách

- **`server/`** ➡️ Do **Thiện** phụ trách chính (Node.js, Express, kết nối Database, API endpoints).
- **`client/`** ➡️ Do **Hòa** phụ trách chính (React, Vite, CSS, các component giao diện).
- **`docs/`** & **`tests/`** ➡️ Do **Nhật** phụ trách chính (Sơ đồ ERD/BFD/DFD, tài liệu đặc tả, test cases, file Postman collection, báo cáo).

---

## 🌿 Quy tắc làm việc với Git

### Quy tắc chia nhánh:
- `main`: Bản ổn định chung của cả nhóm, **không ai commit trực tiếp vào đây**.
- Mọi thành viên tạo nhánh riêng từ `main` theo quy ước:
  - **Thiện**: `feature/api-tasks`, `feature/auth`
  - **Hòa**: `feature/ui-tasks`, `feature/ui-login`
  - **Nhật**: `docs/report`, `test/api-cases`

### Quy trình làm việc hằng ngày:
```bash
# 1. Chuyển về nhánh main và lấy code mới nhất
git checkout main
git pull origin main

# 2. Tạo nhánh mới để làm phần việc của mình
git checkout -b <tên-nhánh-của-bạn>

# 3. Thực hiện công việc và commit
git add .
git commit -m "feat/docs/test: mô tả ngắn gọn công việc"

# 4. Đẩy nhánh lên GitHub
git push origin <tên-nhánh-của-bạn>
```

Sau khi push, vào GitHub bấm **Compare & pull request**, nhờ thành viên khác trong nhóm xem lại rồi mới Merge vào `main`. Sau khi merge, mọi người chạy `git pull origin main`.

---

## 🚀 Hướng dẫn khởi chạy dự án

### Backend (Server)
```bash
cd server
npm install
npm run dev
```
- Server chạy tại: `http://localhost:5000`

### Frontend (Client)
```bash
cd client
npm install
npm run dev
```
- Client chạy tại: `http://localhost:5173`