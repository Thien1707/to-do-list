# BỘ KỊCH BẢN KIỂM THỬ: QUẢN LÝ NHIỆM VỤ & DANH MỤC (TASKS & CATEGORIES)

- **Dự án:** Quản lý Nhiệm vụ Cá nhân (Personal Task Manager / To-Do List)
- **Mã phân hệ:** MOD-TASK
- **Tester thực hiện:** Nguyễn Hoàng Minh Nhật (MSSV: 2374802010363)
- **Môi trường:** Node.js v22 + Express 5 & React 19

---

## 📅 Lịch sử bổ sung chức năng kiểm thử (Changelog)

| Phiên bản | Ngày thêm (Date Added) | Chức năng kiểm thử | Số ca test | Đánh giá |
| :---: | :---: | :--- | :---: | :---: |
| **v1.0** | 10/11/2026 | Thêm/Sửa/Xóa Task, Đổi trạng thái Toggle, Danh mục, Lọc, Tìm kiếm | 11 ca | 100% PASS |
| **v1.1** | 17/11/2026 | Kiểm thử Lịch sử sửa đổi Task (`TaskHistory`), Bình luận Task, Kiểm thử chặn tiêu đề rỗng (Validation) | 4 ca | 3 PASS, 1 FAIL (Phát hiện BUG-01) |
| **v1.2** | 19/11/2026 | Kiểm thử thuật toán tính chuỗi ngày Streak theo múi giờ (UTC+7) & Bộ lọc ngày mở rộng (`filter_date`) | 2 ca | 100% PASS |
| *[Sau này]* | *[Ngày add]* | *Ví dụ: Kéo thả Task giữa các cột Kanban, Đính kèm tệp tin file (Attachment)...* | *...* | *...* |

---

## 📋 Chi tiết các Test Cases

*(Ghi chú: Khi bổ sung chức năng mới sau này, Tester chỉ cần chèn thêm dòng mới vào bảng và điền cột **Ngày thêm** tương ứng).*

| Test Case ID | Ngày thêm | Tên Kịch Bản | Dữ Liệu Đầu Vào | Kết Quả Mong Đợi | Kết Quả Thực Tế (Actual) | Trạng Thái | Ngày Test |
| :--- | :---: | :--- | :--- | :--- | :--- | :---: | :---: |
| **TC_TSK_01** | 10/11/2026 | Thêm nhiệm vụ đầy đủ thông tin | `title`: "Làm báo cáo kiểm thử"<br>`priority`: "high", `due_date`: "2026-11-30" | `201 Created`, tạo thành công task | `201 Created`, task xuất hiện trong CSDL | **PASS** | 17/11/2026 |
| **TC_TSK_02** | 17/11/2026 | Thêm nhiệm vụ để trống Tiêu đề | `title`: ""<br>`priority`: "medium" | Phải báo lỗi `400 Bad Request`: "Tiêu đề không được để trống" | **Backend trả về `201 Created`** và lưu task tiêu đề rỗng vào DB | ❌ **FAIL (BUG-01)** | 17/11/2026 |
| **TC_TSK_03** | 10/11/2026 | Xem danh sách nhiệm vụ cá nhân | Token hợp lệ của user | Trả về đúng danh sách tasks của chính mình | `200 OK`, danh sách phân trang chuẩn | **PASS** | 17/11/2026 |
| **TC_TSK_04** | 10/11/2026 | Tìm kiếm nhiệm vụ theo từ khóa | Query: `?search=kiểm thử` | Lọc đúng các task chứa từ khóa | `200 OK`, kết quả lọc chính xác | **PASS** | 17/11/2026 |
| **TC_TSK_05** | 10/11/2026 | Lọc nhiệm vụ theo Danh mục | Query: `?category_id=1` | Chỉ hiển thị các task thuộc danh mục 1 | `200 OK`, lọc chuẩn theo category | **PASS** | 17/11/2026 |
| **TC_TSK_06** | 10/11/2026 | Chỉnh sửa thông tin nhiệm vụ | `title`: "Tiêu đề đã sửa", `priority`: "urgent" | `200 OK`, cập nhật thành công vào DB | `200 OK`, tiêu đề và độ ưu tiên được cập nhật | **PASS** | 17/11/2026 |
| **TC_TSK_07** | 10/11/2026 | Đổi trạng thái sang Hoàn thành | `PATCH /api/tasks/:id/status`<br>`status`: "done" | `200 OK`, `status = 'done'`, gạch ngang task | `200 OK`, trạng thái chuyển sang 'done' | **PASS** | 17/11/2026 |
| **TC_TSK_08** | 17/11/2026 | Xem lịch sử thay đổi Task (History) | `GET /api/tasks/:id/history` | Trả về danh sách các lần chỉnh sửa task | `200 OK`, trả về mảng lịch sử chi tiết | **PASS** | 17/11/2026 |
| **TC_TSK_09** | 17/11/2026 | Thêm bình luận vào nhiệm vụ | `content`: "Đã hoàn thành test phần này" | `201 Created`, bình luận hiển thị dưới task | `201 Created`, bình luận được lưu kèm user | **PASS** | 17/11/2026 |
| **TC_TSK_10** | 10/11/2026 | Lấy số liệu thống kê Dashboard | `GET /api/tasks/dashboard` | Trả về tổng số việc, số việc hoàn thành, overdue | `200 OK`, thống kê tiến độ chính xác | **PASS** | 17/11/2026 |
| **TC_TSK_11** | 10/11/2026 | Xóa nhiệm vụ | `DELETE /api/tasks/:id` | `200 OK`, task bị xóa khỏi DB | `200 OK`, task biến mất khỏi danh sách | **PASS** | 17/11/2026 |
| **TC_CAT_01** | 10/11/2026 | Tạo danh mục mới | `name`: "Học tập", `color`: "#3b82f6" | `201 Created`, danh mục xuất hiện ở Sidebar | `201 Created`, danh mục xuất hiện ở Sidebar | **PASS** | 17/11/2026 |
| **TC_CAT_02** | 10/11/2026 | Lấy danh sách danh mục | `GET /api/tasks/categories` | `200 OK`, trả về mảng danh mục | `200 OK`, danh sách đầy đủ | **PASS** | 17/11/2026 |
| **TC_CAT_03** | 10/11/2026 | Xóa danh mục | `DELETE /api/tasks/categories/:id` | `200 OK`, xóa danh mục, set task category về null | `200 OK`, các task không bị mất | **PASS** | 17/11/2026 |
| **TC_TSK_STRK_01** | **19/11/2026** | Thống kê chuỗi ngày Streak theo múi giờ | `GET /api/tasks/stats?tz_offset=-420` | `200 OK`, trả về `streak`, `best_streak`, `today_completed` chuẩn múi giờ UTC+7 | `200 OK`, trả về đầy đủ các chỉ số Streak | **PASS** | 19/11/2026 |
| **TC_TSK_FLT_01** | **19/11/2026** | Lọc theo ngày tạo hoặc hạn chót | Query: `?filter_date=2026-11-19` | `200 OK`, lọc các task có hạn chót HOẶC tạo trong ngày | `200 OK`, lọc chính xác theo điều kiện OR | **PASS** | 19/11/2026 |
