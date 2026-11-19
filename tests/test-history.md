# 📜 NHẬT KÝ LỊCH SỬ KIỂM THỬ (TEST EXECUTION & CHANGELOG)

- **Dự án:** Quản lý Nhiệm vụ Cá nhân & Nhóm (TaskFlow / To-Do List)
- **Tester thực hiện:** Nguyễn Hoàng Minh Nhật (MSSV: 2374802010363)
- **Tài liệu này dùng để:** Ghi nhận lịch sử kiểm thử theo thời gian, theo dõi các chức năng đã test và dễ dàng **bổ sung thêm chức năng mới kèm ngày thêm (Date Added)** khi dự án phát triển tiếp.

---

## 1. Bảng theo dõi lịch sử cập nhật Test Case (Test Evolution Log)

| Ngày cập nhật (Date) | Phiên bản (Version) | Phân hệ / Chức năng thêm mới (Feature Tested) | Người test | Số ca test | Kết quả thực tế | Ghi chú / Link chi tiết |
| :---: | :---: | :--- | :---: | :---: | :---: | :--- |
| **10/11/2026** | **v1.0 (MVP)** | Khởi tạo khung kiểm thử cơ bản:<br>- Xác thực tài khoản (Register, Login, JWT)<br>- Nhiệm vụ cá nhân cơ bản (CRUD Task, Category) | Nguyễn Hoàng Minh Nhật | 20 | 20/20 PASS | Khung kiểm thử cơ bản ban đầu |
| **17/11/2026** | **v1.1 (Agile)** | Bổ sung kiểm thử mở rộng theo mã nguồn thực tế:<br>- Kiểm tra Audit History, Bình luận Task<br>- Phân hệ Dự án nhóm & Quản lý thành viên<br>- Quản lý Sprint & Biểu đồ Burndown Chart<br>- Phân hệ Quản trị viên (Admin Panel, User CRUD, Cleanup)<br>- Kiểm thử tải / Rate Limiting chống Brute-force | Nguyễn Hoàng Minh Nhật | 36 | 34 PASS<br>2 DEFECT | Đã lập Bug Report ghi nhận lỗi validate title rỗng ở BE |
| **19/11/2026** | **v1.2 (Hardening)** | Đồng bộ code mới từ `main` và kiểm thử bổ sung:<br>- Chính sách độ phức tạp mật khẩu mạnh (Chữ cái, Chữ số, Ký tự đặc biệt)<br>- Giới hạn kích thước file Avatar (5MB) và thông báo lỗi rõ ràng<br>- Thống kê chuỗi ngày Streak theo múi giờ địa phương (UTC+7)<br>- Bộ lọc nhiệm vụ linh hoạt (`filter_date`, `created_from`, `created_to`)<br>- Endpoint Admin: Kích hoạt quét nhắc việc khẩn cấp (`trigger-reminders`)<br>- Endpoint Admin: Kiểm tra cấu hình email SMTP (`test-email`) | Nguyễn Hoàng Minh Nhật | 7 | 7/7 PASS (100%) | Code merge từ `main` đã vượt qua 100% các ca test bảo mật |
| *[Sau này]* | *v1.3* | *Ví dụ: Đồng bộ Google Calendar, Kéo thả Task Kanban, Xuất báo cáo Excel...* | *Nhật* | *...* | *...* | *(Chỉ cần thêm dòng mới vào đây khi có chức năng mới)* |

---

## 2. Báo cáo khiếm khuyết phần mềm (Bug Report / Defect Log)

### 🐛 BUG-01: Backend cho phép tạo nhiệm vụ khi Tiêu đề (Title) rỗng
- **Mã lỗi:** `BUG-01`
- **Mức độ nghiêm trọng (Severity):** Medium | **Độ ưu tiên (Priority):** High
- **API Endpoint:** `POST /api/tasks`
- **Ngày phát hiện:** 17/11/2026 | **Người phát hiện:** Nguyễn Hoàng Minh Nhật
- **Mô tả:** Khi gửi body `{ "title": "", "priority": "medium" }`, Backend không kiểm tra chuỗi rỗng và vẫn lưu bản ghi vào CSDL, trả về `201 Created` thay vì `400 Bad Request` ("Tiêu đề nhiệm vụ không được để trống").
- **Đề xuất khắc phục cho Thiện (BE):** Bổ sung validation `if (!title || !title.trim()) return res.status(400).json({ success: false, message: 'Tiêu đề không được để trống' });` trong `taskController.createTask` hoặc thêm middleware `body('title').trim().notEmpty()` vào `taskRoutes.js`.
- **Trạng thái:** Đang chờ Dev sửa.

### ℹ️ NOTE-01: Mã trạng thái khi Email đã tồn tại
- **Mã ghi nhận:** `NOTE-01` | **Ngày kiểm tra:** 17/11/2026
- **Endpoint:** `POST /api/auth/register`
- **Thực tế:** Trả về HTTP `409 Conflict` (đúng chuẩn RESTful RFC 7231 thay vì 400).
- **Trạng thái:** Đã cập nhật tài liệu kiểm thử đồng bộ.

---

## 3. Quy tắc đặt mã Test Case khi thêm chức năng mới sau này

- **AUTH:** Xác thực & Người dùng (`TC_AUTH_01`, `TC_AUTH_PWD_01`,...)
- **TSK:** Nhiệm vụ cá nhân & Streak (`TC_TSK_01`, `TC_TSK_STRK_01`,...)
- **CAT:** Danh mục công việc (`TC_CAT_01`,...)
- **PRJ:** Dự án làm việc nhóm (`TC_PRJ_01`,...)
- **SPR:** Sprint & Scrum Burndown (`TC_SPR_01`,...)
- **ADM:** Quản trị viên & Email Reminders (`TC_ADM_01`, `TC_ADM_REM_01`,...)
- **NFR:** Yêu cầu phi chức năng - Hiệu năng, Bảo mật, Rate limit (`TC_NFR_01`,...)
