# BỘ KỊCH BẢN KIỂM THỬ: QUẢN LÝ NHIỆM VỤ & DANH MỤC (TASKS & CATEGORIES)

- **Dự án:** Quản lý Nhiệm vụ Cá nhân (Personal Task Manager / To-Do List)
- **Mã phân hệ:** MOD-TASK
- **Người thực hiện:** Nguyễn Hoàng Minh Nhật (MSSV: 2374802010363)
- **Vai trò:** Kiểm thử & Báo cáo (Test & Documenter)
- **Tài liệu tham chiếu:** Đặc tả FR-03 đến FR-11 tại `docs/dac-ta-yeu-cau-va-thiet-ke.md`

---

## 1. Ma trận chức năng kiểm thử (Test Matrix)

| STT | Mã Yêu Cầu | Tên Chức Năng | API Endpoint | Thao tác Giao diện (UI) |
| :---: | :---: | :--- | :--- | :--- |
| 1 | **FR-03** | Xem danh sách nhiệm vụ | `GET /api/tasks` | Danh sách Task trên Dashboard |
| 2 | **FR-04** | Thêm mới nhiệm vụ | `POST /api/tasks` | Nút "Thêm nhiệm vụ" & TaskModal |
| 3 | **FR-05** | Chỉnh sửa thông tin nhiệm vụ | `PUT /api/tasks/:id` | Bấm vào thẻ task hoặc nút Sửa |
| 4 | **FR-06** | Đổi trạng thái nhiệm vụ (Toggle) | `PATCH /api/tasks/:id/status` | Checkbox / Nút chuyển trạng thái |
| 5 | **FR-07** | Xóa nhiệm vụ | `DELETE /api/tasks/:id` | Nút Xóa + Modal xác nhận ConfirmModal |
| 6 | **FR-08** | Quản lý danh mục (Categories) | `GET, POST, DELETE /api/tasks/categories` | Sidebar danh mục & Chọn màu |
| 7 | **FR-09** | Lọc danh sách nhiệm vụ | `GET /api/tasks?status=...&category_id=...` | Bộ lọc trạng thái & danh mục trên thanh điều khiển |
| 8 | **FR-10** | Tìm kiếm nhiệm vụ theo từ khóa | `GET /api/tasks?search=...` | Ô tìm kiếm thời gian thực |
| 9 | **FR-11** | Thống kê số liệu tiến độ | `GET /api/tasks/stats`, `/dashboard` | Khối thống kê tổng quan (Cards & Charts) |
| 10 | **FR-HIST** | Lịch sử thay đổi nhiệm vụ | `GET /api/tasks/:id/history` | Nút xem lịch sử (TaskHistoryModal) |
| 11 | **FR-COMM** | Bình luận & Thảo luận nhiệm vụ | `GET, POST /api/tasks/:id/comments` | Mục trao đổi dưới chi tiết nhiệm vụ |

---

## 2. Chi tiết các Test Cases

### 2.1. Thêm mới nhiệm vụ (Create Task - FR-04)

| Test Case ID | Tên Kịch Bản | Tiền Điều Kiện | Các Bước Thực Hiện | Dữ Liệu Đầu Vào | Kết Quả Mong Đợi | HTTP Status | Đánh Giá |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **TC_TSK_01** | Thêm mới nhiệm vụ thành công với đầy đủ thông tin | Đã đăng nhập tài khoản hợp lệ | 1. Bấm nút "Thêm nhiệm vụ"<br>2. Nhập tiêu đề, mô tả, chọn danh mục, hạn chót, độ ưu tiên<br>3. Bấm "Lưu" | `title`: "Hoàn thiện báo cáo đồ án"<br>`description`: "Viết chương 4 và kiểm thử"<br>`priority`: "high"<br>`due_date`: "2026-11-20" | Nhiệm vụ được tạo thành công, xuất hiện ngay trên danh sách với đầy đủ badge thông tin | `201 Created` | **PASS** |
| **TC_TSK_02** | Thêm mới nhiệm vụ chỉ có Tiêu đề (các trường khác rỗng) | Đã đăng nhập | 1. Nhập duy nhất trường Tiêu đề<br>2. Bấm "Lưu" | `title`: "Gặp giảng viên hướng dẫn"<br>`description`: null<br>`due_date`: null | Tạo thành công với các giá trị mặc định (`priority`: 'medium', `status`: 'pending') | `201 Created` | **PASS** |
| **TC_TSK_03** | Thêm mới thất bại khi để trống Tiêu đề | Đã đăng nhập | 1. Để trống ô tiêu đề<br>2. Bấm "Lưu" | `title`: ""<br>`description`: "Nội dung" | Báo lỗi bắt buộc: "Tiêu đề nhiệm vụ không được để trống", không gửi request lưu | `400 Bad Request` | **PASS** |
| **TC_TSK_04** | Thêm mới nhiệm vụ với tiêu đề chứa ký tự XSS | Đã đăng nhập | 1. Nhập script độc hại vào tiêu đề<br>2. Bấm "Lưu" | `title`: `<script>alert('xss')</script>` | Hệ thống lưu trữ an toàn hoặc mã hóa entity HTML, React render an toàn không thực thi mã độc | `201 Created` | **PASS** |

---

### 2.2. Xem, Tìm kiếm & Lọc nhiệm vụ (Read, Filter, Search - FR-03, FR-09, FR-10)

| Test Case ID | Tên Kịch Bản | Tiền Điều Kiện | Các Bước Thực Hiện | Dữ Liệu Đầu Vào | Kết Quả Mong Đợi | HTTP Status | Đánh Giá |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **TC_TSK_05** | Xem danh sách chỉ gồm nhiệm vụ của chính mình | Tài khoản A có 3 tasks, Tài khoản B có 2 tasks | 1. Đăng nhập tài khoản A<br>2. Quan sát bảng danh sách task | Bearer Token của User A | Chỉ hiển thị đúng 3 tasks của User A, tuyệt đối không thấy tasks của User B | `200 OK` | **PASS** |
| **TC_TSK_06** | Tìm kiếm nhiệm vụ theo từ khóa chính xác | Có task mang tiêu đề "Báo cáo thực tập" | 1. Gõ "thực tập" vào ô tìm kiếm<br>2. Quan sát kết quả | Query: `?search=thực tập` | Danh sách lập tức lọc chỉ còn các nhiệm vụ có tiêu đề hoặc mô tả chứa từ "thực tập" | `200 OK` | **PASS** |
| **TC_TSK_07** | Tìm kiếm không có kết quả | - | 1. Nhập từ khóa không tồn tại: "xyz123abc"<br>2. Quan sát kết quả | Query: `?search=xyz123abc` | Hiển thị thông báo trạng thái rỗng: "Không tìm thấy nhiệm vụ nào phù hợp" | `200 OK` | **PASS** |
| **TC_TSK_08** | Lọc theo trạng thái hoàn thành | Danh sách gồm cả task đã xong và chưa xong | 1. Chọn tab/bộ lọc "Đã hoàn thành"<br>2. Quan sát danh sách | Query: `?status=completed` | Chỉ trả về các nhiệm vụ có `completed = true` (hoặc `status = 'completed'`) | `200 OK` | **PASS** |
| **TC_TSK_09** | Lọc theo Danh mục (Category) | Có danh mục "Công việc" và "Học tập" | 1. Chọn danh mục "Học tập" trên Sidebar<br>2. Quan sát bảng task | Query: `?category_id=2` | Toàn bộ nhiệm vụ hiển thị đều thuộc danh mục "Học tập" | `200 OK` | **PASS** |

---

### 2.3. Cập nhật & Chuyển đổi trạng thái (Update & Status Toggle - FR-05, FR-06)

| Test Case ID | Tên Kịch Bản | Tiền Điều Kiện | Các Bước Thực Hiện | Dữ Liệu Đầu Vào | Kết Quả Mong Đợi | HTTP Status | Đánh Giá |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **TC_TSK_10** | Cập nhật thông tin chi tiết nhiệm vụ | Task ID 1 thuộc quyền sở hữu của user | 1. Bấm sửa task ID 1<br>2. Đổi tiêu đề và hạn chót mới<br>3. Bấm "Cập nhật" | `title`: "Tiêu đề đã sửa"<br>`due_date`: "2026-11-25" | Cập nhật thành công vào DB, ghi nhận 1 bản ghi vào bảng `task_histories` | `200 OK` | **PASS** |
| **TC_TSK_11** | Bấm checkbox đổi trạng thái Hoàn thành (Toggle) | Task đang ở trạng thái `pending` | 1. Bấm vào ô checkbox hoàn thành cạnh task | `PATCH /api/tasks/1/status`<br>`status`: "completed" | Task chuyển sang trạng thái gạch ngang, hiển thị hiệu ứng hoàn thành (Confetti), cập nhật DB | `200 OK` | **PASS** |
| **TC_TSK_12** | Chuyển ngược từ Đã hoàn thành về Chưa hoàn thành | Task đang ở trạng thái `completed` | 1. Bỏ tick checkbox hoàn thành | `PATCH /api/tasks/1/status`<br>`status`: "pending" | Task quay trở lại danh sách việc cần làm, bỏ gạch ngang | `200 OK` | **PASS** |
| **TC_TSK_13** | Sửa task của người khác trái phép (Bảo mật IDOR) | Task ID 99 thuộc sở hữu của User B | User A dùng Postman gửi request sửa Task 99 | `PUT /api/tasks/99` kèm token User A | Hệ thống từ chối: Báo lỗi "Không tìm thấy nhiệm vụ hoặc bạn không có quyền chỉnh sửa" | `404 / 403 Forbidden` | **PASS** |

---

### 2.4. Xóa nhiệm vụ (Delete Task - FR-07)

| Test Case ID | Tên Kịch Bản | Tiền Điều Kiện | Các Bước Thực Hiện | Dữ Liệu Đầu Vào | Kết Quả Mong Đợi | HTTP Status | Đánh Giá |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **TC_TSK_14** | Xóa nhiệm vụ thành công sau khi xác nhận | Task tồn tại và thuộc sở hữu của user | 1. Bấm nút Thùng rác (Xóa)<br>2. Popup xác nhận xuất hiện: "Bạn có chắc muốn xóa?"<br>3. Bấm "Xác nhận xóa" | `DELETE /api/tasks/1` | Nhiệm vụ bị xóa khỏi DB, biến mất khỏi giao diện, hiển thị thông báo toast thành công | `200 OK` | **PASS** |
| **TC_TSK_15** | Hủy thao tác xóa nhiệm vụ | Task tồn tại | 1. Bấm nút Xóa<br>2. Khi popup hiện ra, bấm "Hủy bỏ" | Click button "Hủy" | Modal đóng lại, nhiệm vụ vẫn giữ nguyên vẹn trong danh sách | UI Verification | **PASS** |
| **TC_TSK_16** | Xóa task không tồn tại | ID task = 99999 | Gửi request `DELETE /api/tasks/99999` qua API | `id`: 99999 | Trả về thông báo lỗi "Không tìm thấy nhiệm vụ" | `404 Not Found` | **PASS** |

---

### 2.5. Quản lý Danh mục (Categories - FR-08)

| Test Case ID | Tên Kịch Bản | Tiền Điều Kiện | Các Bước Thực Hiện | Dữ Liệu Đầu Vào | Kết Quả Mong Đợi | HTTP Status | Đánh Giá |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **TC_CAT_01** | Tạo danh mục mới thành công | Đã đăng nhập | 1. Bấm "Thêm danh mục"<br>2. Nhập tên và chọn bảng màu<br>3. Bấm "Lưu" | `name`: "Đồ án tốt nghiệp"<br>`color`: "#ef4444" | Danh mục mới xuất hiện trên sidebar, gán đúng mã màu, hiển thị trong dropdown chọn khi tạo task | `201 Created` | **PASS** |
| **TC_CAT_02** | Tạo danh mục thất bại do trùng tên | Đã có danh mục "Công việc" | 1. Nhập lại tên "Công việc"<br>2. Bấm "Lưu" | `name`: "Công việc" | Báo lỗi danh mục đã tồn tại | `400 Bad Request` | **PASS** |
| **TC_CAT_03** | Xóa danh mục | Danh mục đang được sử dụng | 1. Bấm nút xóa danh mục<br>2. Xác nhận xóa | `DELETE /api/tasks/categories/1` | Danh mục bị xóa, các nhiệm vụ thuộc danh mục này tự động chuyển `category_id` về `NULL` (không làm mất task) | `200 OK` | **PASS** |
