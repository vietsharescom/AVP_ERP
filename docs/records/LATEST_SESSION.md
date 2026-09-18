# SESSION REPORT — AVP_ERP

## SES-20260917-001 → SES-20260918-002 (2 ngày làm việc liên tục)

---

### 1. THÔNG TIN PHIÊN

| Trường | Giá trị |
|---|---|
| Session | SES-20260917-001 đến SES-20260918-002 |
| Chủ dự án | Andy Phan (Viet), Maple Leaf Group |
| Git | Vẫn CHƯA init (Andy chọn "không cần" khi được hỏi 2026-09-17) |
| Trạng thái | **FID-ERP-001 DONE — code thật, 15/15 test PASS.** FID-ERP-002 DRAFT (chờ duyệt). 11 FID còn lại CHƯA VIẾT. `webapp/` (Next.js+Prisma+PostgreSQL) đã tồn tại và chạy được. |

---

### 2. ĐÃ HOÀN THÀNH (tổng hợp toàn bộ 2 ngày)

**A. Dọn dẹp tài liệu ISO** (2026-09-17, sau khi audit toàn bộ ~50 file kế
thừa từ khung ISO_CA lúc tạo project):
- Xoá 6 file thừa (`AGENTS.md`, `QUICK_REFERENCE.md`, `START_ENGINE.md`,
  `SRS.md`, `RTM.md`, `SOFTWARE_DESIGN.md` — mô tả pipeline Python
  L0-L10, không áp dụng AVP_ERP)
- Viết lại ~30 file docs/cl0X (fill placeholder, gỡ tham chiếu Python) —
  ưu tiên số 1: **layer kiểm soát AI** (`AI_POLICY.md`, `CONSTITUTION.md`,
  `ROLES_RESPONSIBILITIES.md`) giữ nguyên P1-P7 + human-gate + PIPEDA
- `.gitignore`/`.vscode/` đổi từ Python sang Node/Next.js

**B. Kiến trúc + phân quyền** (2026-09-17):
- 3 máy vật lý cố định (Server/Office/Xưởng) + **1 laptop admin di động
  (Máy 4 — Giám đốc/Quản lý)**
- **2 cổng AI có kiểm soát**: Office + Máy admin đều add file/OCR được;
  Xưởng là trạm DUY NHẤT không có quyền này (search vẫn đối xứng cả 3)
- Ban đầu định "1 cổng duy nhất", Andy đổi ý ngay trong phiên → Máy admin
  full quyền như Office (không chỉ view-only)

**C. FID-ERP-012 — Báo cáo sản xuất Xưởng** (2026-09-17): viết DRAFT đầy
đủ 9 mục. Sản lượng tính **theo TỪNG MÁY rồi cộng dồn** (không phải 1 số
gộp) — xác nhận bằng dữ liệu thật (`Data/6.Reports/Daily Sale by
Station.xlsx` đã có report tương tự từ AVP_AI).

**D. FID-ERP-001 — Schema Postgres nền tảng — vòng đời đầy đủ v1.0→v1.4**
(2026-09-17):
- Viết consultation request đầy đủ, gửi phản biện độc lập **2× GPT + 1×
  Grok** (`docs/records/Consultations/260917_Architechture/`)
- v1.1: thêm `lots` + `defect_types`
- v1.2: theo phản biện GPT+Grok — bỏ `qcStatus` cache, `qty` luôn dương,
  CHECK bắt chuỗi rỗng, `PackingSlipLine` snapshot, `sourceStation`+
  `deviceId`, index, `Lot.parentLotNo`, tạm đổi Traveler↔Lot nhiều-nhiều
- v1.3: **kiểm chứng lại bằng dữ liệu thật** (đọc trực tiếp sheet
  `WorkOrder`/`WORK ORDER`) — Traveler↔Lot **QUAY LẠI 1:1** (AVP không có
  bước biến đổi/trộn nguyên liệu); xác nhận 1 PO → nhiều Traveler
- v1.4: GPT tự quay lại phản biện vòng 2 (không ai yêu cầu) — sửa tên
  VIEW (`traveler_last_select_status`, thu hẹp đúng phạm vi), chốt
  **bất biến ở TẦNG DATABASE** (trigger, không chỉ tầng ứng dụng), làm rõ
  `stock_moves` vừa là inventory ledger vừa audit ledger

**E. FID-ERP-001 APPROVED + CODE THẬT ĐẦU TIÊN** (2026-09-17→18):
- Dựng PostgreSQL 18 local (qua pgAdmin, Andy tự tìm lại password) — role
  riêng `avp_erp_app` + database `avp_erp` (dev) + `avp_erp_test` (test)
- Scaffold `webapp/` — Next.js 16 + TypeScript + Prisma 7.10.0 (bản ổn
  định, đã tránh RC 8.0)
- Schema + migration + 4 CHECK constraint + VIEW + trigger append-only +
  seed 10 `defect_types` — đúng y nguyên FID-ERP-001
- `webapp/lib/prisma.ts` — client singleton (Prisma 7 bắt buộc driver
  adapter `@prisma/adapter-pg`, phát sinh ngoài kế hoạch ban đầu)
- `webapp/tests/db/fid-erp-001.test.ts` — **15/15 PASS**, `npm run lint`
  sạch, `npm run build` thành công

**F. FID-ERP-002 — CaptureGate tương đương** (2026-09-18): đọc THAM KHẢO
`D:\AVP_AI\webapp\src\components\CaptureGate.tsx`+`TravelerSection.tsx`
để hiểu đúng trước khi viết (không đoán). 2 đích đến: "PO tham khảo"
(chỉ đăng ký Traveler, KHÔNG ghi `stock_moves`) và "Kho nguyên liệu" (ghi
`RECEIVE` thật). Viết DRAFT đầy đủ 9 mục, **chưa duyệt**.

**G. ODOO_COMPARISON.md** (2026-09-18): tài liệu đối chiếu kiến trúc
chính thức — 9 khía cạnh AVP_ERP khác Odoo chuẩn, mỗi điểm kèm bằng chứng
dữ liệu thật hoặc quyết định đã có. Phát hiện: ý tưởng "1 sổ cái" này đã
được Andy bàn trước ở AVP_AI (`THIET_KE_HE_THONG_MOI.md` Phần 15.2,
2026-09-16), ghi rõ để dành cho "1 dự án MỚI" — chính là AVP_ERP.

**H. Tài liệu theo dõi tiến độ**: artifact
`https://claude.ai/artifact/F6or9LJ6Ef3h17TdX1BAwq` (đã cập nhật 4 lần)
+ `docs/records/AVP_ERP Infrastructure.pdf` (Andy tự export, Andy dùng
để bám theo dõi tiến độ code).

---

### 3. QUYẾT ĐỊNH ĐÃ CHỐT (KHÔNG BÀN LẠI)

| Quyết định | Lý do |
|---|---|
| Stack: Next.js + TypeScript + PostgreSQL + **Prisma** (7.10.0, không dùng RC) | Kế thừa AVP_AI + migration tự sinh |
| 3 máy cố định + 1 laptop admin, 2 cổng AI (Office+Admin), Xưởng không AI | Andy xác nhận qua nhiều vòng, kiểm soát audit |
| `stock_moves` là sổ cái BẤT BIẾN, chặn UPDATE/DELETE ở tầng DATABASE (trigger) | Đúng gốc rễ lỗi AVP_AI cũ — chặn code không đủ |
| 1 Traveler = 1 Lot (không phải nhiều-nhiều) | Kiểm chứng dữ liệu thật, AVP không trộn/biến đổi nguyên liệu |
| KHÔNG cần bảng `locations` riêng | Dữ liệu thật: `LOCATION`='F' 100%, chỉ 1 địa điểm vật lý |
| `qty` trên `stock_moves` LUÔN DƯƠNG, dấu +/- suy từ `move_type` | Tránh mơ hồ, đã ghi rõ công thức trong FID-ERP-001 |
| `defect_types`/`machine_code`/`operator_code`/`shift` — lookup cố định vs TEXT tự do | Xem chi tiết FID-ERP-001 §5 |
| Database `avp_erp` (dev) tách biệt `avp_erp_test` (test) | Trigger append-only chặn cả việc dọn dữ liệu test |
| Không git init (Andy từ chối 2026-09-17) | — |

---

### 4. VIỆC ĐANG MỞ — hỏi Owner trước khi tự suy diễn

1. **FID-ERP-002 chưa duyệt** — Andy đọc `docs/features/FID-ERP-002_20260918.md`, gõ APPROVED nếu OK để code tiếp.
2. **Checklist hạ tầng** (`FACILITIES_SETUP.md` §5) — khoảng cách Office↔Xưởng (quyết định Cat6/WiFi), ai quản trị máy chủ.
3. **Danh sách đầy đủ mã máy lựa + tên các ca** (ngoài "Mrnng" đã thấy) — không chặn code (TEXT tự do) nhưng cần trước UI FID-ERP-003.
4. **Backup**: ngân sách/thiết bị cụ thể + RPO/RTO chính thức — Andy chọn "để sau", có kế hoạch mặc định trong `RISK_REGISTER.md` R-D01.
5. **FID-ERP-005** (Status Good/Hold): cần `move_type` riêng cho đổi trạng thái SAU khi đã qua SELECT, hay dùng lại SELECT? — quyết khi viết FID đó.
6. **Budget, timeline, team cụ thể** (bao nhiêu người Office/Xưởng, tên người giữ vai Giám đốc/Quản lý Máy 4) — `[TO BE CONFIRMED]`. ~~GitHub URL~~ ĐÃ XONG — xem Mục 6.
7. **File `D:\AVP_ERP\.env`** (root, ngoài `webapp/`) còn password superuser `postgres` Andy dán tạm 2026-09-17 — đã dùng xong, có thể xoá (Andy tự quyết, không tự xoá).
8. **`LOCATION = 'F'`** trong dữ liệu thật viết tắt của gì — không ảnh hưởng thiết kế, chỉ để biết.

---

### 5. GIT — ĐÃ INIT + PUSH (2026-09-18, Andy tự làm qua PowerShell)

Andy tự `git init` + commit + `git remote add origin` +
`git push -u origin main` trong lúc Claude đang kiểm tra (không cần
Claude làm hộ). Đã xác minh sau đó:

- Remote: **`https://github.com/vietsharescom/AVP_ERP.git`**, branch `main`
- 99 file, `git status` sạch, đồng bộ đủ với origin/main
- **Không có `.env`/`.env.test` bị lọt** (đã kiểm tra `git ls-files`)
- **Không có `node_modules`** bị commit
- Đã cập nhật `CLAUDE.md` + `PROJECT_INFO_FORM.md` — GitHub URL không còn
  `[TO BE CONFIRMED]`.

**Lưu ý cho phiên sau**: project giờ ĐÃ có git — các quy tắc "không
commit/push khi chưa xác nhận" (CLAUDE.md, global) áp dụng bình thường
từ đây, khác với phần lớn phiên trước (lúc chưa có git nên không áp
dụng).

---

### 6. BẮT ĐẦU PHIÊN SAU TỪ ĐÂY

1. Đọc file này (tự động, CLAUDE.md quy định).
2. Nếu Andy đã duyệt FID-ERP-002 → scaffold `webapp/app/capture/...` +
   `webapp/app/api/capture/...` theo đúng Mục 4/5 của FID, viết test,
   chạy PASS 100%, cập nhật CHANGELOG.md.
3. Nếu chưa duyệt → hỏi lại trước khi code (đúng nguyên tắc #1).
4. Việc khác theo Mục 4 trên, ưu tiên theo thứ tự Andy chọn.
5. Sau FID-ERP-002 → FID-ERP-003 (Xưởng, nhập tay, ghi rõ `machine_code`/
   `operator_code`/`shift`) là bước tiếp theo hợp lý (đúng lộ trình
   `FID_LIST.md`).

---

*Session Report — cập nhật lần cuối 2026-09-18 (viết lại gọn, thay bản
cũ dài — toàn bộ chi tiết lịch sử vẫn còn trong các file đã dẫn link ở
Mục 2, không mất thông tin).*
