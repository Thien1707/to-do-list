# 📜 NHẬT KÝ LỊCH SỬ KIỂM THỬ (TEST EXECUTION & CHANGELOG)

- **Dự án:** Quản lý Nhiệm vụ Cá nhân & Nhóm (TaskFlow / To-Do List)
- **Tester thực hiện:** Nguyễn Hoàng Minh Nhật (MSSV: 2374802010363)
- **Tài liệu này dùng để:** Ghi nhận lịch sử kiểm thử theo thời gian, theo dõi các chức năng đã test và dễ dàng **bổ sung thêm chức năng mới kèm ngày thêm (Date Added)** khi dự án phát triển tiếp.

---

## 1. Bảng theo dõi lịch sử cập nhật Test Case (Test Evolution Log)

Khi có chức năng mới được code xong, Tester chỉ cần **thêm 1 dòng mới vào bảng này** và bổ sung các test cases tương ứng vào file chi tiết:

| Ngày cập nhật (Date) | Phiên bản (Version) | Phân hệ / Chức năng thêm mới (Feature Tested) | Người test | Số ca test | Kết quả thực tế | Ghi chú / Link chi tiết |
| :---: | :---: | :--- | :---: | :---: | :---: | :--- |
| **10/11/2026** | **v1.0 (MVP)** | Khởi tạo khung kiểm thử cơ bản:<br>- Xác thực tài khoản (Register, Login, JWT)<br>- Nhiệm vụ cá nhân cơ bản (CRUD Task, Category) | Nguyễn Hoàng Minh Nhật | 20 | 20/20 PASS | Bộ testcase ban đầu của Tuần 1-2 |
| **17/11/2026** | **v1.1 (Agile)** | Bổ sung kiểm thử mở rộng theo mã nguồn thực tế:<br>- Kiểm tra Audit History, Bình luận Task<br>- Phân hệ Dự án nhóm & Quản lý thành viên<br>- Quản lý Sprint & Biểu đồ Burndown Chart<br>- Phân hệ Quản trị viên (Admin Panel, User CRUD, Cleanup)<br>- Kiểm thử tải / Rate Limiting chống Brute-force | Nguyễn Hoàng Minh Nhật | 36 | 34 PASS<br>2 DEFECT | Đã lập Bug Report ghi nhận lỗi validate title rỗng ở BE |
| *[Sau này]* | *v1.2* | *Ví dụ: Thông báo đẩy, Kéo thả Kanban, Xuất báo cáo Excel...* | *Nhật* | *...* | *...* | *(Chỉ cần thêm dòng mới vào đây khi có chức năng mới)* |

---

## 2. Báo cáo khiếm khuyết phát hiện được (Bug Report / Defect Log)

Dành cho vai trò Tester báo cáo lại cho Dev (Thiện BE & Hòa FE) sửa lỗi:

### 🐛 BUG-01: Backend cho phép tạo nhiệm vụ khi Tiêu đề (Title) rỗng
- **Mã lỗi:** `BUG-01`
- **Mức độ nghiêm trọng (Severity):** Medium
- **Độ ưu tiên sửa (Priority):** High
- **API Endpoint:** `POST /api/tasks`
- **Ngày phát hiện:** 17/11/2026
- **Người phát hiện:** Nguyễn Hoàng Minh Nhật
- **Mô tả:** Khi gửi body `{ "title": "", "priority": "medium" }`, Backend không kiểm tra chuỗi rỗng và vẫn lưu bản ghi vào CSDL, trả về `201 Created` thay vì `400 Bad Request` ("Tiêu đề nhiệm vụ không được để trống").
- **Đề xuất khắc phục cho Thiện (BE):** Bổ sung validation `if (!title || !title.trim()) return res.status(400).json({ success: false, message: 'Tiêu đề không được để trống' });` trong `taskController.createTask` hoặc thêm middleware `body('title').trim().notEmpty()` vào `taskRoutes.js`.

### ℹ️ NOTE-01: Mã trạng thái khi Email đã tồn tại
- **Mã ghi nhận:** `NOTE-01`
- **Endpoint:** `POST /api/auth/register`
- **Ngày kiểm tra:** 17/11/2026
- **Thực tế:** Trả về HTTP `409 Conflict` (rất đúng chuẩn RESTful RFC 7231, tài liệu testcase đã được đồng bộ từ 400 sang 409).

---

## 3. Quy tắc đặt mã Test Case khi thêm chức năng mới sau này

Để dễ quản lý, Tester tuân thủ quy tắc tiền tố mã hóa như sau:

- **AUTH:** Xác thực & Người dùng (`TC_AUTH_01`, `TC_AUTH_02`,...)
- **TSK:** Nhiệm vụ cá nhân (`TC_TSK_01`, `TC_TSK_02`,...)
- **CAT:** Danh mục công việc (`TC_CAT_01`,...)
- **PRJ:** Dự án làm việc nhóm (`TC_PRJ_01`,...)
- **SPR:** Sprint & Scrum Burndown (`TC_SPR_01`,...)
- **ADM:** Quản trị viên (`TC_ADM_01`,...)
- **NFR:** Yêu cầu phi chức năng - Hiệu năng, Bảo mật, Rate limit (`TC_NFR_01`,...)

Mỗi dòng testcase mới sẽ ghi rõ cột **Ngày thêm (Date Added)** và **Ngày chạy (Execution Date)**.

