# BỘ KỊCH BẢN KIỂM THỬ: XÁC THỰC & QUẢN LÝ TÀI KHOẢN (AUTH & ACCOUNT)

- **Dự án:** Quản lý Nhiệm vụ Cá nhân (Personal Task Manager / To-Do List)
- **Mã phân hệ:** MOD-AUTH
- **Tester thực hiện:** Nguyễn Hoàng Minh Nhật (MSSV: 2374802010363)
- **Môi trường:** Node.js v22 + Express 5 (`http://localhost:3000`) & React 19 (`http://localhost:5173`)

---

## 📅 Lịch sử bổ sung chức năng kiểm thử (Changelog)

| Phiên bản | Ngày thêm (Date Added) | Chức năng kiểm thử | Số ca test | Đánh giá |
| :---: | :---: | :--- | :---: | :---: |
| **v1.0** | 10/11/2026 | Đăng ký (FR-01), Đăng nhập (FR-02), Quản lý Token | 9 ca | 100% PASS |
| **v1.1** | 17/11/2026 | Đăng nhập Admin, Chặn quyền User thường, Chống Brute-Force Rate Limit, Cập nhật Profile | 6 ca | 100% PASS |
| *[Sau này]* | *[Ngày add]* | *Ví dụ: Đăng nhập bằng Google Firebase, Xác thực 2 lớp (2FA)...* | *...* | *...* |

---

## 📋 Chi tiết các Test Cases

*(Ghi chú: Khi bổ sung chức năng mới sau này, Tester chỉ cần chèn thêm dòng mới vào bảng và điền cột **Ngày thêm** tương ứng).*

| Test Case ID | Ngày thêm | Tên Kịch Bản | Dữ Liệu Đầu Vào | Kết Quả Mong Đợi | Kết Quả Thực Tế (Actual) | Trạng Thái | Ngày Test |
| :--- | :---: | :--- | :--- | :--- | :--- | :---: | :---: |
| **TC_REG_01** | 10/11/2026 | Đăng ký thành công | `name`: "Nguyễn Văn A"<br>`email`: "vana@example.com"<br>`password`: "Password123@" | Trả về `201 Created`, cấp token, lưu vào DB | Trả về `201 Created`, nhận đúng `accessToken` | **PASS** | 17/11/2026 |
| **TC_REG_02** | 10/11/2026 | Đăng ký để trống Họ tên | `name`: ""<br>`email`: "vana@example.com" | Báo lỗi `400`: "Họ và tên không được để trống" | Trả về `400 Bad Request`, thông báo đúng | **PASS** | 17/11/2026 |
| **TC_REG_03** | 10/11/2026 | Đăng ký Email sai định dạng | `email`: "invalid_email_format" | Báo lỗi `400`: "Email không hợp lệ" | Trả về `400 Bad Request` | **PASS** | 17/11/2026 |
| **TC_REG_04** | 10/11/2026 | Đăng ký Mật khẩu < 6 ký tự | `password`: "123" | Báo lỗi `400`: "Mật khẩu tối thiểu 6 ký tự" | Trả về `400 Bad Request` | **PASS** | 17/11/2026 |
| **TC_REG_05** | 10/11/2026 | Đăng ký Email đã tồn tại | `email`: "admin@taskmanager.com" | Từ chối đăng ký trùng lặp | Trả về `409 Conflict`, báo "Email đã tồn tại" | **PASS** | 17/11/2026 |
| **TC_LOG_01** | 10/11/2026 | Đăng nhập tài khoản hợp lệ | `email`: "nhat.test@vanlanguni.vn"<br>`password`: "Password123@" | `200 OK`, cấp AccessToken, vào Dashboard | `200 OK`, nhận token, điều hướng chuẩn | **PASS** | 17/11/2026 |
| **TC_LOG_02** | 10/11/2026 | Đăng nhập sai Mật khẩu | `password`: "WrongPassword999" | Báo lỗi `401 Unauthorized` | Trả về `401`, báo sai email hoặc mật khẩu | **PASS** | 17/11/2026 |
| **TC_LOG_03** | 10/11/2026 | Đăng nhập Email không tồn tại | `email`: "unknown@test.com" | Báo lỗi `401 Unauthorized` | Trả về `401 Unauthorized` | **PASS** | 17/11/2026 |
| **TC_ADM_01** | 17/11/2026 | Đăng nhập Quản trị viên (Admin) | `email`: "admin@taskmanager.com"<br>`password`: "Admin@123" | `200 OK`, trả về role `admin` | `200 OK`, cấp token admin thành công | **PASS** | 17/11/2026 |
| **TC_ADM_02** | 17/11/2026 | Đăng nhập Admin bằng User thường | Tài khoản role `user` | Từ chối truy cập trang quản trị | Trả về `401/403`, chặn quyền quản trị | **PASS** | 17/11/2026 |
| **TC_TOK_01** | 10/11/2026 | Gọi API bảo mật không có Token | Request không kèm Header Auth | Chặn truy cập: `401 Unauthorized` | Trả về `401`, chặn request | **PASS** | 17/11/2026 |
| **TC_TOK_02** | 10/11/2026 | Gọi API với Token giả mạo | Header: `Bearer fake_token_xyz` | Chặn truy cập: `401 Unauthorized` | Trả về `401`, token không hợp lệ | **PASS** | 17/11/2026 |
| **TC_PROF_01**| 17/11/2026 | Lấy thông tin cá nhân (/me) | Header chứa Bearer token hợp lệ | Trả về thông tin profile người dùng | `200 OK`, trả về đúng thông tin user | **PASS** | 17/11/2026 |
| **TC_PROF_02**| 17/11/2026 | Cập nhật Profile (Họ tên, Bio) | `name`: "Nhật Updated", `bio`: "QA" | `200 OK`, lưu thông tin mới vào DB | `200 OK`, DB cập nhật tên mới | **PASS** | 17/11/2026 |
| **TC_SEC_01** | 17/11/2026 | Chống Brute-force (>20 lần sai/15p)| Gửi liên tục request sai mật khẩu | Báo lỗi `429 Too Many Requests` | Rate limit kích hoạt sau ngưỡng tối đa | **PASS** | 17/11/2026 |
