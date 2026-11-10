# BỘ KỊCH BẢN KIỂM THỬ: XÁC THỰC & QUẢN LÝ TÀI KHOẢN (AUTH & ACCOUNT)

- **Dự án:** Quản lý Nhiệm vụ Cá nhân (Personal Task Manager / To-Do List)
- **Mã phân hệ:** MOD-AUTH
- **Người thực hiện:** Nguyễn Hoàng Minh Nhật (MSSV: 2374802010363)
- **Vai trò:** Kiểm thử & Báo cáo (Test & Documenter)
- **Môi trường kiểm thử:** 
  - Backend: Node.js v22 + Express 5 (`http://localhost:3000`)
  - Frontend: React 19 + Vite (`http://localhost:5173`)
  - Cơ sở dữ liệu: MySQL 8.0 (`127.0.0.1:3306/task_manager_db`)
  - Công cụ hỗ trợ: Postman, Chrome DevTools, REST Client

---

## 1. Ma trận chức năng kiểm thử (Test Matrix)

| STT | Mã Chức năng | Tên Chức năng | API Endpoint | Giao diện tương ứng |
| :---: | :---: | :--- | :--- | :--- |
| 1 | **FR-01** | Đăng ký tài khoản mới | `POST /api/auth/register` | `/register` |
| 2 | **FR-02** | Đăng nhập người dùng | `POST /api/auth/login` | `/login` |
| 3 | **FR-02B** | Đăng nhập Quản trị viên | `POST /api/auth/admin-login` | `/admin/login` |
| 4 | **FR-02C** | Làm mới Access Token | `POST /api/auth/refresh` | Cơ chế ngầm (Axios Interceptor) |
| 5 | **FR-02D** | Đăng xuất hệ thống | `POST /api/auth/logout` | Nút Đăng xuất trên Sidebar / Header |
| 6 | **FR-01B** | Quên mật khẩu & Gửi mã | `POST /api/auth/forgot-password` | `/forgot-password` |
| 7 | **FR-01C** | Đặt lại mật khẩu (Reset) | `POST /api/auth/reset-password` | `/reset-password` |
| 8 | **FR-PROF** | Xem & Cập nhật Profile | `GET/PUT /api/auth/me`, `PUT /profile` | Modal Cài đặt tài khoản |
| 9 | **FR-SEC** | Bảo mật Rate Limit (Chống Brute-Force) | Áp dụng trên toàn bộ `/api/auth/*` | Middleware Express Rate Limit |

---

## 2. Chi tiết các Test Cases

### 2.1. Đăng ký tài khoản (Register - FR-01)

| Test Case ID | Tên Kịch Bản | Tiền Điều Kiện | Các Bước Thực Hiện | Dữ Liệu Đầu Vào | Kết Quả Mong Đợi | HTTP Status | Đánh Giá |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **TC_REG_01** | Đăng ký thành công với thông tin hợp lệ | Email chưa tồn tại trong hệ thống | 1. Nhập họ tên, email hợp lệ, mật khẩu >= 6 ký tự<br>2. Bấm nút "Đăng ký" | `name`: "Nguyễn Văn A"<br>`email`: "vana@example.com"<br>`password`: "Password123@" | Tạo tài khoản thành công, trả về JWT Token và thông tin user, lưu vào DB | `201 / 200 OK` | **PASS** |
| **TC_REG_02** | Đăng ký thất bại do để trống Họ tên | - | 1. Để trống ô họ tên<br>2. Nhập email và mật khẩu hợp lệ<br>3. Bấm "Đăng ký" | `name`: ""<br>`email`: "vana@example.com"<br>`password`: "Password123@" | Báo lỗi: "Họ và tên không được để trống", không tạo tài khoản | `400 Bad Request` | **PASS** |
| **TC_REG_03** | Đăng ký thất bại do Email sai định dạng | - | 1. Nhập tên và mật khẩu hợp lệ<br>2. Nhập email không đúng định dạng<br>3. Bấm "Đăng ký" | `name`: "Nguyễn Văn A"<br>`email`: "vana_not_an_email"<br>`password`: "Password123@" | Báo lỗi: "Email không hợp lệ", không ghi nhận vào DB | `400 Bad Request` | **PASS** |
| **TC_REG_04** | Đăng ký thất bại do Mật khẩu quá ngắn (< 6 ký tự) | - | 1. Nhập tên, email hợp lệ<br>2. Nhập mật khẩu dưới 6 ký tự<br>3. Bấm "Đăng ký" | `name`: "Nguyễn Văn A"<br>`email`: "vana@example.com"<br>`password`: "12345" | Báo lỗi: "Mật khẩu tối thiểu 6 ký tự" | `400 Bad Request` | **PASS** |
| **TC_REG_05** | Đăng ký thất bại do Email đã tồn tại | Email `admin@taskmanager.com` đã có sẵn | 1. Nhập họ tên bất kỳ<br>2. Nhập email đã tồn tại trong DB<br>3. Bấm "Đăng ký" | `name`: "Trùng Email"<br>`email`: "admin@taskmanager.com"<br>`password`: "Admin@123" | Báo lỗi: "Email đã được sử dụng", không cho phép đăng ký trùng | `400 / 409 Conflict` | **PASS** |

---

### 2.2. Đăng nhập người dùng (Login - FR-02)

| Test Case ID | Tên Kịch Bản | Tiền Điều Kiện | Các Bước Thực Hiện | Dữ Liệu Đầu Vào | Kết Quả Mong Đợi | HTTP Status | Đánh Giá |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **TC_LOG_01** | Đăng nhập thành công với tài khoản hợp lệ | Tài khoản đã được kích hoạt trong DB | 1. Truy cập trang `/login`<br>2. Nhập đúng Email và Mật khẩu<br>3. Bấm "Đăng nhập" | `email`: "nhat.test@vanlanguni.vn"<br>`password`: "Password123@" | Đăng nhập thành công, nhận AccessToken, tự động điều hướng vào trang Dashboard chính | `200 OK` | **PASS** |
| **TC_LOG_02** | Đăng nhập thất bại do sai Mật khẩu | Tài khoản tồn tại trong DB | 1. Nhập đúng Email<br>2. Nhập sai Mật khẩu<br>3. Bấm "Đăng nhập" | `email`: "nhat.test@vanlanguni.vn"<br>`password`: "SaiMatKhau999" | Báo lỗi: "Email hoặc mật khẩu không chính xác", không cấp token | `401 Unauthorized` | **PASS** |
| **TC_LOG_03** | Đăng nhập thất bại do Email chưa đăng ký | Email không có trong DB | 1. Nhập một email chưa từng đăng ký<br>2. Bấm "Đăng nhập" | `email`: "khongtontai@unknown.vn"<br>`password`: "Password123@" | Báo lỗi: "Email hoặc mật khẩu không chính xác" (không để lộ việc email có tồn tại hay không) | `401 Unauthorized` | **PASS** |
| **TC_LOG_04** | Đăng nhập thất bại khi để trống thông tin | - | 1. Không nhập email/mật khẩu<br>2. Bấm "Đăng nhập" | `email`: ""<br>`password`: "" | Báo lỗi trường thông tin bắt buộc | `400 Bad Request` | **PASS** |

---

### 2.3. Đăng nhập Quản trị viên (Admin Login - FR-02B)

| Test Case ID | Tên Kịch Bản | Tiền Điều Kiện | Các Bước Thực Hiện | Dữ Liệu Đầu Vào | Kết Quả Mong Đợi | HTTP Status | Đánh Giá |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **TC_ADM_01** | Đăng nhập Admin thành công với quyền Quản trị | Tài khoản admin đã seed trong DB | 1. Truy cập `/admin/login`<br>2. Nhập tài khoản admin mặc định<br>3. Bấm "Đăng nhập Quản trị" | `email`: "admin@taskmanager.com"<br>`password`: "Admin@123" | Đăng nhập thành công, trả về role `admin`, điều hướng vào Admin Dashboard | `200 OK` | **PASS** |
| **TC_ADM_02** | Đăng nhập Admin thất bại khi dùng tài khoản User thường | User có role `user` | 1. Truy cập `/admin/login`<br>2. Nhập thông tin của tài khoản user thường<br>3. Bấm đăng nhập | `email`: "nhat.test@vanlanguni.vn"<br>`password`: "Password123@" | Từ chối truy cập: Báo lỗi "Bạn không có quyền truy cập trang quản trị" | `403 Forbidden` | **PASS** |

---

### 2.4. Xác thực Token & Quản lý Phiên (Session & Token Management)

| Test Case ID | Tên Kịch Bản | Tiền Điều Kiện | Các Bước Thực Hiện | Dữ Liệu Đầu Vào | Kết Quả Mong Đợi | HTTP Status | Đánh Giá |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **TC_TOK_01** | Gọi API yêu cầu bảo mật với Token hợp lệ | Đã đăng nhập, có Bearer token | Gửi request đến `GET /api/tasks` kèm Header `Authorization: Bearer <valid_token>` | Header: `Bearer <token>` | Trả về dữ liệu danh sách nhiệm vụ của chính user đó | `200 OK` | **PASS** |
| **TC_TOK_02** | Gọi API bảo mật nhưng không đính kèm Token | Không đăng nhập | Gửi request `GET /api/tasks` không có Header Authorization | Không có Header Auth | Báo lỗi từ chối: "Không tìm thấy mã xác thực hoặc token không hợp lệ" | `401 Unauthorized` | **PASS** |
| **TC_TOK_03** | Gọi API với Token giả mạo hoặc hết hạn | Token bị sửa đổi nội dung | Gửi request với token sai chuỗi hash HMAC | Header: `Bearer invalid_token_xyz` | Hệ thống từ chối xác thực, trả về lỗi xác thực | `401 Unauthorized` | **PASS** |
| **TC_TOK_04** | Đăng xuất xóa phiên làm việc | Đang đăng nhập | Gọi `POST /api/auth/logout` | Refresh token cookie | Xóa cookie refresh token, hủy phiên đăng nhập an toàn | `200 OK` | **PASS** |

---

### 2.5. Bảo mật nâng cao & Giới hạn tần suất (Rate Limiting)

| Test Case ID | Tên Kịch Bản | Tiền Điều Kiện | Các Bước Thực Hiện | Dữ Liệu Đầu Vào | Kết Quả Mong Đợi | HTTP Status | Đánh Giá |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **TC_SEC_01** | Ngăn chặn tấn công Brute-Force mật khẩu | Server đang chạy `authLimiter` | Gửi liên tục > 20 request đăng nhập sai mật khẩu trong vòng 15 phút từ cùng 1 IP | `email`: test@example.com, `password`: sai liên tục | Hệ thống kích hoạt rate limit, tạm khóa yêu cầu: "Bạn đã thực hiện quá nhiều thao tác xác thực. Vui lòng thử lại sau 15 phút." | `429 Too Many Requests` | **PASS** |
| **TC_SEC_02** | Mã hóa mật khẩu an toàn trong CSDL | - | Kiểm tra trực tiếp bảng `users` trong MySQL | Câu lệnh SQL: `SELECT password FROM users;` | Mật khẩu được băm bằng thuật toán `bcrypt` dạng `$2a$10$...`, hoàn toàn không lộ bản rõ | DB Integrity | **PASS** |
