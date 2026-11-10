# BỘ KỊCH BẢN KIỂM THỬ: DỰ ÁN NHÓM & SPRINTS (PROJECTS & SCRUM/KANBAN)

- **Dự án:** Quản lý Nhiệm vụ Cá nhân & Nhóm (Personal Task Manager / To-Do List)
- **Mã phân hệ:** MOD-PROJECT
- **Người thực hiện:** Nguyễn Hoàng Minh Nhật (MSSV: 2374802010363)
- **Vai trò:** Kiểm thử & Báo cáo (Test & Documenter)

---

## 1. Ma trận chức năng kiểm thử (Test Matrix)

| STT | Mã Chức Năng | Tên Chức Năng | API Endpoint | Giao diện tương ứng |
| :---: | :---: | :--- | :--- | :--- |
| 1 | **PRJ-01** | Tạo dự án làm việc nhóm | `POST /api/projects` | `/projects` - Modal Tạo dự án |
| 2 | **PRJ-02** | Xem danh sách dự án tham gia | `GET /api/projects` | `/projects` - Grid thẻ dự án |
| 3 | **PRJ-03** | Tra cứu & Mời thành viên vào dự án | `GET /lookup-user`, `POST /members` | `/projects/:id` - Tab Thành viên |
| 4 | **PRJ-04** | Phân quyền thành viên (Admin/Member/Viewer) | `PUT /members/:userId` | Dropdown đổi vai trò thành viên |
| 5 | **PRJ-05** | Xóa / Rời khỏi dự án | `DELETE /members/:userId`, `DELETE /projects/:id` | Nút Rời nhóm / Xóa dự án |
| 6 | **SPR-01** | Tạo Sprint quản lý tiến độ | `POST /api/projects/:id/sprints` | Modal Thêm Sprint mới |
| 7 | **SPR-02** | Theo dõi biểu đồ Burndown Chart | `GET /api/projects/:id/sprints` | BurndownChart component |
| 8 | **KAN-01** | Bảng công việc Kanban theo Sprint | `GET /api/projects/:id/tasks` | Cột trạng thái: To-Do, In Progress, Done |

---

## 2. Chi tiết các Test Cases

### 2.1. Quản lý Dự án (Project Management)

| Test Case ID | Tên Kịch Bản | Tiền Điều Kiện | Các Bước Thực Hiện | Dữ Liệu Đầu Vào | Kết Quả Mong Đợi | HTTP Status | Đánh Giá |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **TC_PRJ_01** | Tạo dự án mới thành công | Đã đăng nhập tài khoản | 1. Vào trang `/projects`<br>2. Bấm "Tạo dự án mới"<br>3. Điền tên dự án và mô tả<br>4. Bấm "Tạo" | `name`: "Dự án Phát triển Web To-Do"<br>`description`: "Đồ án chuyên ngành CNPM"<br>`color`: "#6366f1" | Tạo dự án thành công, người tạo tự động được gán vai trò `owner` (chủ sở hữu) | `201 Created` | **PASS** |
| **TC_PRJ_02** | Tạo dự án thất bại do thiếu tên dự án | Đã đăng nhập | 1. Để trống tên dự án<br>2. Bấm "Tạo" | `name`: ""<br>`description`: "Mô tả..." | Báo lỗi: "Tên dự án không được để trống", ngăn chặn gửi form | `400 Bad Request` | **PASS** |
| **TC_PRJ_03** | Xem chi tiết dự án | User là thành viên của dự án | 1. Bấm vào thẻ dự án từ danh sách | Click thẻ dự án | Hiển thị bảng Kanban, danh sách thành viên, các sprint và nhật ký hoạt động gần đây | `200 OK` | **PASS** |
| **TC_PRJ_04** | Truy cập dự án của người khác khi không được mời | User không phải là thành viên | User B nhập trực tiếp URL `/projects/1` của User A | Token User B truy cập ID dự án của User A | Hệ thống bảo mật chặn truy cập: Báo lỗi "Bạn không có quyền truy cập dự án này" | `403 Forbidden` | **PASS** |

---

### 2.2. Quản lý Thành viên & Phân quyền (Members & RBAC)

| Test Case ID | Tên Kịch Bản | Tiền Điều Kiện | Các Bước Thực Hiện | Dữ Liệu Đầu Vào | Kết Quả Mong Đợi | HTTP Status | Đánh Giá |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **TC_MEM_01** | Tra cứu người dùng theo email trước khi mời | Người dùng cần mời đã có tài khoản | 1. Vào tab "Thành viên"<br>2. Gõ email người dùng vào ô tìm kiếm | `email`: "vana@example.com" | Hiển thị thông tin người dùng tìm thấy (Avatar, Họ tên, Email) | `200 OK` | **PASS** |
| **TC_MEM_02** | Thêm thành viên vào dự án với quyền Member | User là `owner` hoặc `admin` của dự án | 1. Chọn người dùng từ kết quả tra cứu<br>2. Chọn vai trò "Thành viên (Member)"<br>3. Bấm "Thêm thành viên" | `email`: "vana@example.com"<br>`role`: "member" | Người dùng được thêm vào bảng thành viên, có quyền tạo và chỉnh sửa task trong dự án | `201 Created` | **PASS** |
| **TC_MEM_03** | Thêm thành viên thất bại do người này đã ở trong dự án | Người dùng đã là thành viên | 1. Nhập lại email của thành viên hiện tại<br>2. Bấm "Thêm" | Email thành viên đã có trong dự án | Báo lỗi: "Người dùng này đã là thành viên của dự án" | `400 Bad Request` | **PASS** |
| **TC_MEM_04** | Thay đổi vai trò thành viên (Role update) | User là `owner` dự án | 1. Bấm dropdown vai trò cạnh thành viên<br>2. Đổi từ `member` sang `admin` | `role`: "admin" | Cập nhật quyền thành công, ghi nhận hoạt động vào Activity Log | `200 OK` | **PASS** |
| **TC_MEM_05** | Thành viên có quyền `viewer` cố tình xóa task | User có role `viewer` (Chỉ xem) | Gửi request `DELETE /api/tasks/:id` | Token của viewer | Hệ thống từ chối thao tác: "Bạn chỉ có quyền xem, không được chỉnh sửa dữ liệu" | `403 Forbidden` | **PASS** |

---

### 2.3. Quản lý Sprint & Burndown Chart (Scrum)

| Test Case ID | Tên Kịch Bản | Tiền Điều Kiện | Các Bước Thực Hiện | Dữ Liệu Đầu Vào | Kết Quả Mong Đợi | HTTP Status | Đánh Giá |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **TC_SPR_01** | Tạo Sprint mới thành công | Đã mở trang chi tiết dự án | 1. Bấm nút "Tạo Sprint mới"<br>2. Nhập tên Sprint, mục tiêu, ngày bắt đầu, ngày kết thúc<br>3. Bấm "Tạo Sprint" | `name`: "Sprint 1 - Dựng khung MVP"<br>`start_date`: "2026-11-10"<br>`end_date`: "2026-11-17"<br>`goal`: "Hoàn thiện API CRUD" | Sprint được tạo thành công, xuất hiện trên thanh chọn Sprint và bảng Burndown Chart | `201 Created` | **PASS** |
| **TC_SPR_02** | Gán nhiệm vụ vào Sprint | Có task và sprint đã tạo | 1. Mở modal chỉnh sửa task<br>2. Chọn Sprint 1 từ dropdown<br>3. Bấm lưu | `sprint_id`: 1 | Nhiệm vụ được liên kết với Sprint 1, hiển thị trong danh sách công việc của Sprint | `200 OK` | **PASS** |
| **TC_SPR_03** | Kiểm tra đường tiến độ thực tế trên Burndown Chart | Sprint có 5 tasks, hoàn thành 2 tasks | 1. Chuyển 2 task sang trạng thái "Done"<br>2. Quan sát biểu đồ Burndown | 2 tasks `status = 'completed'` | Đường Ideal Line giảm đều theo thời gian, đường Actual Line hạ xuống tương ứng với số task đã xong | Visual & Data Check | **PASS** |
