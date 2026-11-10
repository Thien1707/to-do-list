# 📋 HỆ THỐNG TÀI LIỆU KIỂM THỬ (TEST SPECIFICATIONS & CASES)

- **Đề tài:** Ứng dụng Quản lý Nhiệm vụ Cá nhân (Personal Task Manager / To-Do List Full-Stack)
- **Mã đề tài:** CNPM07 – Học kỳ HK261 – Trường Đại học Văn Lang
- **Giảng viên hướng dẫn:** ThS. Trần Công Thanh
- **Sinh viên thực hiện kiểm thử:** **Nguyễn Hoàng Minh Nhật** (MSSV: 2374802010363)
- **Nhánh phụ trách:** `test/api-cases`

---

## 🗂️ Cấu trúc thư mục kiểm thử

```text
tests/
├── README.md                           # Tổng quan kế hoạch kiểm thử & hướng dẫn chạy test
├── testcase-auth.md                    # Bộ kịch bản kiểm thử Xác thực & Tài khoản (Register, Login, Token, Security)
├── testcase-tasks.md                   # Bộ kịch bản kiểm thử Nhiệm vụ & Danh mục (CRUD, Filter, Search, History)
├── testcase-projects.md                # Bộ kịch bản kiểm thử Dự án & Sprints (Scrum, Kanban, Members, Burndown)
├── testcase-admin.md                   # Bộ kịch bản kiểm thử Quản trị hệ thống (Users, Global Tasks, System)
└── todo-api.postman_collection.json    # File export Postman Collection v2.1 (Tích hợp assertion test script tự động)
```

---

## 📊 Ma trận độ bao phủ kiểm thử (Test Traceability Matrix - RTM)

| Phân hệ / Module | Yêu cầu đặc tả | File Testcase chi tiết | Số lượng Test Cases | Trạng thái |
| :--- | :--- | :--- | :---: | :---: |
| **Xác thực & Bảo mật** | FR-01, FR-02, NFR-Security | [`testcase-auth.md`](./testcase-auth.md) | 15 Test cases | ✅ 100% PASS |
| **Nhiệm vụ & Danh mục** | FR-03 đến FR-11 | [`testcase-tasks.md`](./testcase-tasks.md) | 16 Test cases | ✅ 100% PASS |
| **Dự án nhóm & Sprints** | Module Projects & Scrum | [`testcase-projects.md`](./testcase-projects.md) | 12 Test cases | ✅ 100% PASS |
| **Bảng điều khiển Admin** | Module Admin & System | [`testcase-admin.md`](./testcase-admin.md) | 8 Test cases | ✅ 100% PASS |

---

## 🚀 Hướng dẫn thực thi kiểm thử tự động với Postman

1. **Mở phần mềm Postman** trên máy tính.
2. Bấm nút **Import** ở góc trên bên trái, chọn file:
   `tests/todo-api.postman_collection.json`
3. Đảm bảo Backend server đang chạy tại `http://localhost:3000`.
4. Bấm vào thư mục gốc **TaskFlow - To-Do List API Collection**, chọn **Run Collection**.
5. Bấm nút **Run TaskFlow...**:
   - Postman sẽ tự động chạy toàn bộ các request từ Health check, Đăng ký, Đăng nhập, trích xuất Token, tạo Category, tạo Task, đổi trạng thái và kiểm tra quyền Admin.
   - Các bài test tự động (`pm.test`) sẽ trả về kết quả **PASS 100%**.

---

## 🌐 Môi trường thực thi kiểm thử

- **Backend:** Node.js v22.22.2 + Express 5 (`http://localhost:3000`)
- **Frontend:** React 19 + Vite 8 (`http://localhost:5173`)
- **Cơ sở dữ liệu:** MySQL Server 8.0.46 (`127.0.0.1:3306`)
- **Tài khoản Admin mặc định:** `admin@taskmanager.com` / `Admin@123`
- **Tài khoản User kiểm thử:** `nhat.test@vanlanguni.vn` / `Password123@`
