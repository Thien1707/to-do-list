# BỘ KỊCH BẢN KIỂM THỬ: QUẢN TRỊ HỆ THỐNG (ADMIN PANEL)

- **Dự án:** Quản lý Nhiệm vụ Cá nhân & Nhóm (TaskFlow / To-Do List)
- **Mã phân hệ:** MOD-ADMIN
- **Tester thực hiện:** Nguyễn Hoàng Minh Nhật (MSSV: 2374802010363)
- **Môi trường:** Node.js v22 + Express 5 & React 19

---

## 📅 Lịch sử bổ sung chức năng kiểm thử (Changelog)

| Phiên bản | Ngày thêm (Date Added) | Chức năng kiểm thử | Số ca test | Đánh giá |
| :---: | :---: | :--- | :---: | :---: |
| **v1.0** | 10/11/2026 | Khung kiểm thử chức năng Admin | 4 ca | Bản thảo ban đầu |
| **v1.1** | 17/11/2026 | Kiểm thử thực tế API & UI: Xem thống kê toàn hệ thống, Giám sát tài nguyên máy chủ, Xem toàn bộ Users, Giám sát Tasks, Dọn dẹp task rác (Cleanup) | 6 ca | 100% PASS |
| *[Sau này]* | *[Ngày add]* | *Ví dụ: Khóa tài khoản người dùng, Đặt lại mật khẩu thành viên qua Admin...* | *...* | *...* |

---

## 📋 Chi tiết các Test Cases

*(Ghi chú: Khi bổ sung chức năng mới sau này, Tester chỉ cần chèn thêm dòng mới vào bảng và điền cột **Ngày thêm** tương ứng).*

| Test Case ID | Ngày thêm | Tên Kịch Bản | Dữ Liệu Đầu Vào | Kết Quả Mong Đợi | Kết Quả Thực Tế (Actual) | Trạng Thái | Ngày Test |
| :--- | :---: | :--- | :--- | :--- | :--- | :---: | :---: |
| **TC_ADM_03** | 17/11/2026 | Xem số liệu thống kê Dashboard Admin | Token Admin hợp lệ | `200 OK`, trả về tổng users, tasks, projects | `200 OK`, số liệu thống kê chính xác | **PASS** | 17/11/2026 |
| **TC_ADM_04** | 17/11/2026 | Giám sát tài nguyên máy chủ (System Info) | Token Admin | `200 OK`, hiển thị RAM, Heap Used, Node version | `200 OK`, thông số tài nguyên thời gian thực | **PASS** | 17/11/2026 |
| **TC_ADM_05** | 17/11/2026 | Xem danh sách tất cả người dùng | Token Admin | `200 OK`, trả về danh sách toàn bộ users | `200 OK`, phân trang danh sách user chuẩn | **PASS** | 17/11/2026 |
| **TC_ADM_06** | 17/11/2026 | Giám sát toàn bộ nhiệm vụ hệ thống | Token Admin | `200 OK`, xem được task của mọi người dùng | `200 OK`, hiển thị đầy đủ kèm thông tin chủ sở hữu | **PASS** | 17/11/2026 |
| **TC_ADM_07** | 17/11/2026 | Dọn dẹp các nhiệm vụ đã hủy/quá hạn | `days_old`: 90, `status`: "cancelled" | `200 OK`, xóa các task rác thỏa điều kiện | `200 OK`, báo cáo số lượng task đã dọn dẹp | **PASS** | 17/11/2026 |
| **TC_ADM_08** | 17/11/2026 | Chặn User thường gọi API Quản trị | Token của tài khoản role `user` | Từ chối truy cập: `403 Forbidden` | `403 Forbidden`, bảo mật nghiêm ngặt phân quyền | **PASS** | 17/11/2026 |
