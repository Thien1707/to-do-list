# BỘ KỊCH BẢN KIỂM THỬ: QUẢN TRỊ HỆ THỐNG (ADMIN PANEL)

- **Dự án:** Quản lý Nhiệm vụ Cá nhân (Personal Task Manager / To-Do List)
- **Mã phân hệ:** MOD-ADMIN
- **Người thực hiện:** Nguyễn Hoàng Minh Nhật (MSSV: 2374802010363)
- **Vai trò:** Kiểm thử & Báo cáo (Test & Documenter)

---

## 1. Ma trận chức năng kiểm thử (Test Matrix)

| STT | Mã Chức Năng | Tên Chức Năng | API Endpoint | Giao diện tương ứng |
| :---: | :---: | :--- | :--- | :--- |
| 1 | **ADM-01** | Bảng điều khiển Thống kê toàn hệ thống | `GET /api/admin/stats` | `/admin` - Dashboard tổng quan |
| 2 | **ADM-02** | Giám sát tài nguyên hệ thống (System Info) | `GET /api/admin/system` | `/admin/system` |
| 3 | **ADM-03** | Quản lý danh sách người dùng (Users Management) | `GET /api/admin/users` | `/admin/users` |
| 4 | **ADM-04** | Đặt lại mật khẩu / Đổi vai trò người dùng | `PUT /api/admin/users/:id/reset-password`, `role` | Modal Quản lý User |
| 5 | **ADM-05** | Khóa / Xóa tài khoản người dùng | `PUT /api/admin/users/:id`, `DELETE /:id` | Nút Khóa / Xóa trên bảng User |
| 6 | **ADM-06** | Giám sát & Quản lý tất cả nhiệm vụ trên hệ thống | `GET, PUT, DELETE /api/admin/tasks` | `/admin/tasks` |
| 7 | **ADM-07** | Dọn dẹp dữ liệu rác / Task quá hạn (Cleanup) | `POST /api/admin/cleanup` | Tab Bảo trì hệ thống |

---

## 2. Chi tiết các Test Cases

### 2.1. Thống kê & Giám sát hệ thống (Dashboard & System Monitor)

| Test Case ID | Tên Kịch Bản | Tiền Điều Kiện | Các Bước Thực Hiện | Dữ Liệu Đầu Vào | Kết Quả Mong Đợi | HTTP Status | Đánh Giá |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **TC_ADM_STAT_01** | Xem số liệu tổng quan toàn hệ thống | Đăng nhập tài khoản admin | 1. Truy cập `/admin`<br>2. Quan sát các thẻ thống kê | Token Admin | Hiển thị chính xác tổng số Users, tổng số Tasks, tổng số Projects và tỷ lệ hoàn thành trung bình | `200 OK` | **PASS** |
| **TC_ADM_SYS_01** | Xem thông số tài nguyên máy chủ (RAM, Uptime, Node) | Đăng nhập tài khoản admin | 1. Truy cập `/admin/system`<br>2. Kiểm tra thông tin server | Token Admin | Hiển thị chi tiết phiên bản Node.js, bộ nhớ RAM sử dụng (Heap Used/Total), Uptime và trạng thái kết nối CSDL | `200 OK` | **PASS** |
| **TC_ADM_CLEAN_01** | Dọn dẹp các nhiệm vụ đã hủy hoặc hoàn thành quá hạn | Có task `cancelled` hoặc `completed` cũ | 1. Bấm nút "Dọn dẹp nhiệm vụ"<br>2. Chọn điều kiện: quá hạn > 30 ngày<br>3. Bấm "Thực hiện" | `days_old`: 30<br>`status`: "cancelled" | Hệ thống xóa các bản ghi thỏa điều kiện, thông báo số lượng bản ghi đã được dọn sạch | `200 OK` | **PASS** |

---

### 2.2. Quản lý Người dùng (Users Management)

| Test Case ID | Tên Kịch Bản | Tiền Điều Kiện | Các Bước Thực Hiện | Dữ Liệu Đầu Vào | Kết Quả Mong Đợi | HTTP Status | Đánh Giá |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **TC_ADM_USR_01** | Tìm kiếm người dùng theo tên hoặc email | Có nhiều tài khoản trong hệ thống | 1. Vào trang `/admin/users`<br>2. Nhập từ khóa tìm kiếm: "nhat" | Query: `?search=nhat` | Bảng người dùng lọc đúng các tài khoản có email hoặc tên khớp từ khóa | `200 OK` | **PASS** |
| **TC_ADM_USR_02** | Đặt lại mật khẩu cho người dùng | User quên mật khẩu cần hỗ trợ | 1. Bấm nút "Đặt lại mật khẩu"<br>2. Nhập mật khẩu tạm thời mới<br>3. Bấm xác nhận | `new_password`: "TempPass123@" | Mật khẩu user được băm lại và cập nhật vào DB, user có thể đăng nhập bằng mật khẩu mới | `200 OK` | **PASS** |
| **TC_ADM_USR_03** | Khóa tài khoản vi phạm (Toggle is_active) | User đang hoạt động (`is_active: true`) | 1. Bấm chuyển trạng thái khóa tài khoản | `is_active`: false | Cập nhật thành công, tài khoản này sẽ bị chặn ngay lập tức khi cố gắng đăng nhập lại | `200 OK` | **PASS** |
| **TC_ADM_USR_04** | Ngăn chặn Admin tự xóa tài khoản của chính mình | Admin đang đăng nhập với ID 1 | Admin cố tình bấm xóa tài khoản ID 1 | `DELETE /api/admin/users/1` | Hệ thống bảo vệ chặn thao tác: "Không thể tự xóa tài khoản quản trị đang đăng nhập" | `400 Bad Request` | **PASS** |

---

### 2.3. Quản lý Nhiệm vụ toàn hệ thống (Tasks Supervision)

| Test Case ID | Tên Kịch Bản | Tiền Điều Kiện | Các Bước Thực Hiện | Dữ Liệu Đầu Vào | Kết Quả Mong Đợi | HTTP Status | Đánh Giá |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **TC_ADM_TSK_01** | Xem danh sách tất cả các nhiệm vụ của mọi người dùng | Có nhiệm vụ của nhiều người dùng khác nhau | 1. Vào trang `/admin/tasks`<br>2. Quan sát bảng dữ liệu | Token Admin | Hiển thị toàn bộ nhiệm vụ trong hệ thống kèm thông tin người tạo (Creator Name/Email) | `200 OK` | **PASS** |
| **TC_ADM_TSK_02** | Admin xóa nhiệm vụ chứa nội dung vi phạm chính sách | Task chứa nội dung spam | 1. Bấm nút xóa task<br>2. Xác nhận xóa với tư cách Quản trị viên | `DELETE /api/admin/tasks/:id` | Nhiệm vụ bị xóa vĩnh viễn khỏi hệ thống | `200 OK` | **PASS** |
