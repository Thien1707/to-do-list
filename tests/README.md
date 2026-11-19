# 📋 HỆ THỐNG TÀI LIỆU KIỂM THỬ (TEST SPECIFICATIONS & CHANGELOG)

- **Đề tài:** Ứng dụng Quản lý Nhiệm vụ Cá nhân & Nhóm (TaskFlow / To-Do List Full-Stack)
- **Mã đề tài:** CNPM07 – Học kỳ HK261 – Trường Đại học Văn Lang
- **Giảng viên hướng dẫn:** ThS. Trần Công Thanh
- **Sinh viên thực hiện kiểm thử:** **Nguyễn Hoàng Minh Nhật** (MSSV: 2374802010363)
- **Nhánh phụ trách:** `test/api-cases`
- **Lần cập nhật gần nhất:** **19/11/2026** (Đồng bộ code mới nhất từ nhánh `main`)

---

## 🗂️ Cấu trúc thư mục kiểm thử

```text
tests/
├── README.md                           # Tổng quan hệ thống kiểm thử & quy tắc vận hành
├── test-history.md                     # 📜 Nhật ký lịch sử kiểm thử theo ngày thêm (Date Added Changelog)
├── testcase-auth.md                    # Bộ kịch bản kiểm thử Xác thực (Cập nhật Password Policy & Avatar 5MB)
├── testcase-tasks.md                   # Bộ kịch bản kiểm thử Nhiệm vụ & Danh mục (Cập nhật Streak UTC+7 & filter_date)
├── testcase-projects.md                # Bộ kịch bản kiểm thử Dự án & Sprints Scrum/Kanban
├── testcase-admin.md                   # Bộ kịch bản kiểm thử Quản trị (Cập nhật Trigger Reminders & Test Email)
├── todo-api.postman_collection.json    # File export Postman Collection v2.1
├── BaoCao_TestCase_TaskFlow.xlsx       # 📊 Báo cáo bảng tính Excel 6 Sheets chuẩn màu chuyên nghiệp
└── BaoCao_KiemThu_TaskFlow.docx        # 📝 Báo cáo kiểm thử phần mềm Word (A4, Times New Roman) nộp đồ án
```

---

## 📅 Cơ chế ghi nhận Lịch sử Kiểm thử (Date Added Workflow)

Mỗi khi nhóm phát triển có code mới merge vào `main`, Tester (Nhật) thực hiện:
1. Ghi nhận đợt cập nhật vào [tests/test-history.md](./test-history.md).
2. Thêm các ca test mới vào bảng tương ứng trong các file `testcase-*.md`, điền cột **Ngày thêm** tương ứng (ví dụ: `19/11/2026`).
3. Chạy lại script xuất file để tự động đồng bộ sang Excel và Word.

---

## 📊 Ma trận độ bao phủ kiểm thử (Test Traceability Matrix - RTM)

| Phân hệ / Module | Yêu cầu đặc tả | File Testcase chi tiết | Số ca test | Trạng thái thực tế (Đợt 19/11/2026) |
| :--- | :--- | :--- | :---: | :---: |
| **Xác thực & Bảo mật** | FR-01, FR-02, Password Policy, NFR-Security | [`testcase-auth.md`](./testcase-auth.md) | 19 Test cases | ✅ 19/19 PASS (100%) |
| **Nhiệm vụ & Danh mục** | FR-03 đến FR-11, Streak UTC+7, filter_date | [`testcase-tasks.md`](./testcase-tasks.md) | 16 Test cases | ⚠️ 15 PASS, 1 FAIL ([BUG-01](./test-history.md)) |
| **Dự án nhóm & Sprints** | Module Projects, Members, Scrum & Burndown | [`testcase-projects.md`](./testcase-projects.md) | 8 Test cases | ✅ 8/8 PASS (100%) |
| **Bảng điều khiển Admin** | Module Admin, System Info, Trigger Reminders | [`testcase-admin.md`](./testcase-admin.md) | 8 Test cases | ✅ 8/8 PASS (100%) |
| **TỔNG CỘNG** | **Toàn bộ hệ thống** | **4 File kịch bản** | **51 Test cases** | **Đạt tỷ lệ 98.0% (50/51 PASS)** |

---

## 🚀 Hướng dẫn thực thi kiểm thử tự động với Postman

1. Mở phần mềm **Postman**.
2. Bấm nút **Import**, chọn file: [`tests/todo-api.postman_collection.json`](./todo-api.postman_collection.json).
3. Đảm bảo Backend đang chạy tại `http://localhost:3000`.
4. Bấm chuột phải vào collection **TaskFlow - To-Do List API Collection**, chọn **Run Collection**.
