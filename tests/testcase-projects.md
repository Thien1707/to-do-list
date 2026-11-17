# BỘ KỊCH BẢN KIỂM THỬ: DỰ ÁN NHÓM & SPRINTS (PROJECTS & SCRUM/KANBAN)

- **Dự án:** Quản lý Nhiệm vụ Cá nhân & Nhóm (TaskFlow / To-Do List)
- **Mã phân hệ:** MOD-PROJECT
- **Tester thực hiện:** Nguyễn Hoàng Minh Nhật (MSSV: 2374802010363)
- **Môi trường:** Node.js v22 + Express 5 & React 19

---

## 📅 Lịch sử bổ sung chức năng kiểm thử (Changelog)

| Phiên bản | Ngày thêm (Date Added) | Chức năng kiểm thử | Số ca test | Đánh giá |
| :---: | :---: | :--- | :---: | :---: |
| **v1.0** | 10/11/2026 | Khung ý tưởng kiểm thử dự án | 5 ca | Bản thảo ban đầu |
| **v1.1** | 17/11/2026 | Kiểm thử thực tế API & UI: Tạo dự án, Chi tiết dự án, Quản lý thành viên, Tạo Sprint Scrum, Chặn quyền Viewer | 8 ca | 100% PASS |
| *[Sau này]* | *[Ngày add]* | *Ví dụ: Rời khỏi dự án, Chuyển quyền Chủ sở hữu (Owner transfer)...* | *...* | *...* |

---

## 📋 Chi tiết các Test Cases

*(Ghi chú: Khi bổ sung chức năng mới sau này, Tester chỉ cần chèn thêm dòng mới vào bảng và điền cột **Ngày thêm** tương ứng).*

| Test Case ID | Ngày thêm | Tên Kịch Bản | Dữ Liệu Đầu Vào | Kết Quả Mong Đợi | Kết Quả Thực Tế (Actual) | Trạng Thái | Ngày Test |
| :--- | :---: | :--- | :--- | :--- | :--- | :---: | :---: |
| **TC_PRJ_01** | 17/11/2026 | Tạo dự án nhóm thành công | `name`: "Dự án HK261", `color`: "#6366f1" | `201 Created`, tự động gán role `owner` | `201 Created`, dự án xuất hiện trong danh sách | **PASS** | 17/11/2026 |
| **TC_PRJ_02** | 17/11/2026 | Tạo dự án để trống tên | `name`: "", `description`: "Mô tả" | Báo lỗi `400 Bad Request`: "Tên project là bắt buộc" | Trả về `400 Bad Request`, không tạo dự án | **PASS** | 17/11/2026 |
| **TC_PRJ_03** | 17/11/2026 | Xem chi tiết thông tin dự án | ID dự án hợp lệ của user | `200 OK`, trả về thông tin project & members | `200 OK`, hiển thị Kanban và danh sách thành viên | **PASS** | 17/11/2026 |
| **TC_PRJ_04** | 17/11/2026 | Chặn người lạ truy cập dự án | User không phải thành viên truy cập | Từ chối truy cập: `403 Forbidden` | `403 Forbidden`, bảo mật dữ liệu nhóm | **PASS** | 17/11/2026 |
| **TC_MEM_01** | 17/11/2026 | Tra cứu user trước khi mời | `email`: "test@vanlanguni.vn" | `200 OK`, trả về avatar, họ tên user | `200 OK`, tìm thấy đúng user | **PASS** | 17/11/2026 |
| **TC_MEM_02** | 17/11/2026 | Thêm thành viên vào dự án | `email`: "member@test.com", `role`: "member" | `201 Created`, người dùng trở thành member | `201 Created`, thành viên mới có quyền tạo task | **PASS** | 17/11/2026 |
| **TC_SPR_01** | 17/11/2026 | Tạo Sprint mới trong dự án | `name`: "Sprint 1", `start_date`, `end_date` | `201 Created`, sprint xuất hiện trên timeline | `201 Created`, sprint sẵn sàng cho Burndown | **PASS** | 17/11/2026 |
| **TC_SPR_02** | 17/11/2026 | Lấy danh sách Sprints của dự án | `GET /api/projects/:id/sprints` | `200 OK`, trả về mảng các sprints | `200 OK`, hiển thị đầy đủ các sprint | **PASS** | 17/11/2026 |
