# 📋 HỆ THỐNG TÀI LIỆU KIỂM THỬ (TEST SPECIFICATIONS & CHANGELOG)

- **Đề tài:** Ứng dụng Quản lý Nhiệm vụ Cá nhân & Nhóm (TaskFlow / To-Do List Full-Stack)
- **Mã đề tài:** CNPM07 – Học kỳ HK261 – Trường Đại học Văn Lang
- **Giảng viên hướng dẫn:** ThS. Trần Công Thanh
- **Sinh viên thực hiện kiểm thử:** **Nguyễn Hoàng Minh Nhật** (MSSV: 2374802010363)
- **Nhánh phụ trách:** `test/api-cases`

---

## 🗂️ Cấu trúc thư mục kiểm thử

```text
tests/
├── README.md                           # Tổng quan hệ thống kiểm thử & quy tắc vận hành
├── test-history.md                     # 📜 Nhật ký lịch sử kiểm thử & Báo cáo lỗi (Defect Log / Bug Reports)
├── testcase-auth.md                    # Bộ kịch bản kiểm thử Xác thực & Tài khoản (Kèm ngày thêm & kết quả)
├── testcase-tasks.md                   # Bộ kịch bản kiểm thử Nhiệm vụ & Danh mục (Kèm ngày thêm & phát hiện BUG-01)
├── testcase-projects.md                # Bộ kịch bản kiểm thử Dự án & Sprints Scrum/Kanban
├── testcase-admin.md                   # Bộ kịch bản kiểm thử Quản trị hệ thống & Giám sát tài nguyên
└── todo-api.postman_collection.json    # File export Postman Collection v2.1 (Tích hợp assertion test scripts tự động)
```

---

## 📅 Hướng dẫn quy trình bổ sung Test Case theo thời gian (Date Added Workflow)

Mỗi khi nhóm phát triển thêm một tính năng mới (ví dụ: Thiện viết thêm API mới hoặc Hòa code thêm màn hình UI mới), Tester (Nhật) thực hiện 2 bước đơn giản:

1. **Ghi nhận vào file [tests/test-history.md](./test-history.md):**
   - Thêm 1 dòng mới vào bảng **Lịch sử cập nhật Test Case (Test Evolution Log)** với:
     - Ngày thêm (ví dụ: `25/11/2026`).
     - Tên chức năng mới được đưa vào kiểm thử.
     - Số lượng test case và kết quả đạt được.
2. **Thêm các ca test vào bảng chi tiết tương ứng:**
   - Trong các file `testcase-*.md`, chỉ cần chèn thêm dòng mới vào bảng:
     - Điền cột **Ngày thêm** = Ngày chức năng đó được thêm vào bộ test.
     - Điền kết quả thực tế và **Ngày test**.

---

## 📊 Ma trận độ bao phủ kiểm thử (Test Traceability Matrix - RTM)

| Phân hệ / Module | Yêu cầu đặc tả | File Testcase chi tiết | Số ca test | Trạng thái thực tế |
| :--- | :--- | :--- | :---: | :---: |
| **Xác thực & Bảo mật** | FR-01, FR-02, NFR-Security | [`testcase-auth.md`](./testcase-auth.md) | 15 Test cases | ✅ 15/15 PASS (100%) |
| **Nhiệm vụ & Danh mục** | FR-03 đến FR-11 | [`testcase-tasks.md`](./testcase-tasks.md) | 14 Test cases | ⚠️ 13 PASS, 1 FAIL ([BUG-01](./test-history.md)) |
| **Dự án nhóm & Sprints** | Module Projects & Scrum | [`testcase-projects.md`](./testcase-projects.md) | 8 Test cases | ✅ 8/8 PASS (100%) |
| **Bảng điều khiển Admin** | Module Admin & System | [`testcase-admin.md`](./testcase-admin.md) | 6 Test cases | ✅ 6/6 PASS (100%) |
| **TỔNG CỘNG** | **Toàn bộ hệ thống** | **4 File kịch bản** | **43 Test cases** | **Đã nghiệm thu đợt 1 (17/11/2026)** |

---

## 🚀 Hướng dẫn thực thi kiểm thử tự động với Postman

1. Mở phần mềm **Postman**.
2. Bấm nút **Import**, chọn file: [`tests/todo-api.postman_collection.json`](./todo-api.postman_collection.json).
3. Đảm bảo Backend đang chạy tại `http://localhost:3000`.
4. Bấm chuột phải vào collection **TaskFlow - To-Do List API Collection**, chọn **Run Collection**.
5. Nhận kết quả kiểm thử tự động trả về ngay trên giao diện Postman.
