# SESSION REPORT — AVP_ERP

## SES-20260917-001 → SES-20260918-002 (2 ngày làm việc liên tục)

---

### 1. THÔNG TIN PHIÊN

| Trường | Giá trị |
|---|---|
| Session | SES-20260917-001 đến SES-20260918-002 |
| Chủ dự án | Andy Phan (Viet), Maple Leaf Group |
| Git | Vẫn CHƯA init (Andy chọn "không cần" khi được hỏi 2026-09-17) |
| Trạng thái | **FID-ERP-001 (v1.7) + 002→006 DONE — code thật, 69/69 test PASS.** 6 FID còn lại CHƯA VIẾT. `webapp/` (Next.js+Prisma+PostgreSQL) đã tồn tại và chạy được. |

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

**F. FID-ERP-002 — CaptureGate tương đương — DUYỆT + CODE THẬT** (2026-09-18):
đọc THAM KHẢO `D:\AVP_AI\webapp\src\components\CaptureGate.tsx`+
`TravelerSection.tsx`+`src\lib\extract.ts` (cùng SDK `@google/genai`) để
hiểu đúng trước khi viết. Andy duyệt ("f2 ok") → code:
- `webapp/lib/ocr/gemini.ts` — OCR Gemini, CHỈ đọc, không ghi DB
- `webapp/app/api/capture/extract/route.ts` — trả draft, không ghi DB
- `webapp/app/api/capture/confirm/route.ts` — ghi Postgres sau xác nhận,
  2 nhánh theo destination (`po` chỉ upsert `travelers`; `warehouse` upsert
  `travelers` + ghi 1 dòng `stock_moves` RECEIVE trong 1 transaction)
- `webapp/app/capture/page.tsx` — UI chọn đích đến + xem/sửa draft trước lưu
- 13 test mới (`webapp/tests/integration/capture.test.ts`) + 15 test
  FID-ERP-001 không hồi quy = **28/28 PASS**, lint sạch, build thành công
- Cài `@google/genai` (đúng bản AVP_AI dùng). `GEMINI_API_KEY` **CHƯA có
  key thật** — để `[TO BE CONFIRMED]` trong `webapp/.env`, test dùng mock.
- **Excel (.xlsx/.xlsm) CHƯA làm** — chỉ ảnh/PDF (Gemini vision không đọc
  Excel trực tiếp) — quyết định phạm vi tự đưa ra lúc code, chưa hỏi Andy
  riêng, để dành FID sau nếu cần.

**F2. FID-ERP-003 — Trạm nhập liệu Xưởng — DUYỆT + CODE THẬT (v1.1)**
(2026-09-18): viết `docs/features/FID-ERP-003_20260918.md`. Đọc THAM
KHẢO `D:\AVP_AI\docs\features\FID-001_ingest-workstation-archive.md` +
`Data/BANG_MA_THAM_CHIEU_AVP_2026-09-17.xlsx` (sheet mã máy/mã nhân viên
— tự ghi rõ "CHƯA validate/CHƯA có danh sách chính thức", không dùng làm
enum cứng).

v1.0 (bản đầu) đẩy "rework" sang FID-ERP-007 — Andy sửa lại ngay: rework
(hàng lỗi TRONG lúc lựa nhưng CÒN DÙNG ĐƯỢC, tạm giữ chờ xử lý lại) là
khái niệm KHÁC CẤP ĐỘ với FID-ERP-007 (Traveler ĐÃ XUẤT bị trả lại toàn
bộ) — đúng như AVP_AI đã phân biệt rõ. Sửa v1.1: **sửa cả FID-ERP-001
lên v1.5** (đã DONE/APPROVED, đã code+test trước đó) — thêm `REWORK` vào
enum `MoveType` + cột `note` (TEXT) trên `stock_moves`, hỏi Andy xác
nhận qua `AskUserQuestion` trước khi sửa (đồng ý), chạy migration
`20260918015252_add_rework_movetype_and_note` trên cả 2 DB (dev + test
— phải baseline test DB bằng `migrate resolve --applied` vì chưa có
lịch sử migration).

Andy xác nhận lại hướng phân tích Partial (không ghi gì mới, suy ra từ
sổ cái theo lot) → coi là APPROVED → code:
- `webapp/app/api/factory/select/confirm/route.ts` — ghi 1 `SELECT` + N
  `SCRAP` (mỗi loại defect 1 dòng) + 0..1 `REWORK` trong 1 transaction,
  `sourceStation` cố định `"FACTORY"` ở server (không nhận từ client)
- `webapp/app/api/factory/defect-types/route.ts` — GET 10 defect_types cho dropdown
- `webapp/app/factory/select/page.tsx` — UI nhập tay, không qua AI/OCR
- Traveler phải đã tồn tại (từ RECEIVE FID-ERP-002) — route không tự tạo
  Traveler mới. `machineCode`/`operatorCode`/`shift` chuẩn hoá
  TRIM+UPPER áp dụng cả 3 loại move. `totalDefectQty` tự tính trong response.
- 9 test mới (`webapp/tests/integration/factory-select.test.ts`) + 28
  test cũ không hồi quy = **37/37 PASS**, lint sạch, build thành công.
- Lệch nhỏ so với draft: đường dẫn route Mục 3/9 ghi sai (`select/route.ts`
  thay vì `select/confirm/route.ts`, khớp đúng CONTRACT) — đã sửa trong
  file FID (Mục 10 THỰC HIỆN). Phải chạy `npx prisma generate` sau
  migration v1.5, nếu không Prisma Client cũ không nhận `REWORK`.

**F3. FID-ERP-004 — GlobalSearchBar tương đương — DUYỆT + CODE THẬT**
(2026-09-18): viết `docs/features/FID-ERP-004_20260918.md`, đọc THAM
KHẢO `D:\AVP_AI\webapp\src\components\GlobalSearchBar.tsx`. Andy duyệt
("ok code f4") → code:
- `webapp/app/api/search/route.ts` — GET, `ILIKE` trên `travelers`
  (travelerNo/partNo/poNo/potNo/lotNo)/`packing_slips`(psNo)/
  `part_control`(partNo), mỗi nhóm tối đa 8, query rỗng → trả rỗng ngay
  không chạm DB
- `webapp/components/GlobalSearchBar.tsx` — client component, debounce
  300ms, gắn vào `webapp/app/layout.tsx` (hiện MỌI trang, đối xứng cả 3
  điểm truy cập, không phân quyền)
- `shipped`/`lastMoveType`/`lastMoveAt` suy từ `stock_moves` (N+1 chặn
  trên tối đa 8 kết quả đã lọc, không phải toàn bảng)
- 7 test mới (`webapp/tests/integration/search.test.ts`) + 37 test cũ
  không hồi quy = **44/44 PASS**, lint sạch, build thành công
- Lệch nhỏ: `req.nextUrl` không dùng được khi test gọi route trực tiếp
  bằng `Request` chuẩn → đổi sang `new URL(req.url)` (hoạt động cả 2).
  ESLint rule mới `react-hooks/set-state-in-effect` chặn `setLoading(true)`
  gọi ngay đầu effect → dời vào trong callback `setTimeout` (không đổi
  UX debounce).

**F4. FID-ERP-005 — Status Good/Hold (Wrapping) + Reject — DUYỆT + CODE
THẬT** (2026-09-18): Andy hỏi về cột `Reject` thật trong
`Data/4.WRAPPING/Wrapping_final.xlsm` — kiểm chứng bằng `openpyxl`
(2143 dòng): `Reject` là SỐ LƯỢNG (khớp theo thứ tự với tên lỗi trong
`Special Notes`), KHÔNG phải trạng thái thứ 4 bên cạnh Good/Hold/
Concession. Đối chiếu Odoo: `stock.scrap` (số lượng+lý do) và
`quality.check` (Pass/Fail) TÁCH RIÊNG, không gộp. Andy xác nhận hướng
("ok") → **sửa FID-ERP-001 lên v1.6**: thêm bảng MỚI `quality_checks`
(append-only, trigger riêng `prevent_quality_checks_mutation`, enum
`QualityStatus` GOOD/HOLD, Concession là LỚP ĐÈ lên Hold qua 3 cột, VIEW
`traveler_last_quality_check`) — migration
`20260918023102_add_quality_checks` áp dụng cả 2 DB. Viết DRAFT
`docs/features/FID-ERP-005_20260918.md`, Andy duyệt ("ok approve") →
code:
- `webapp/app/api/quality/check/route.ts` — ghi 0..n `SCRAP` (reject) +
  1 `quality_checks` trong 1 transaction; `concession` chỉ hợp lệ khi
  `status="HOLD"`
- `webapp/app/wrapping/check/page.tsx` — UI kiểm tra Wrapping
- 11 test mới (`webapp/tests/integration/quality-check.test.ts`) + 44
  test cũ không hồi quy = **55/55 PASS**, lint sạch, build thành công
- Chưa mở rộng `defect_types` dù vài tên lỗi thật ở Wrapping
  (`DAMAGED FLANGE`, `DAMAGED LOCKING`) không khớp 10 giá trị hiện có —
  để dành, cần Andy xác nhận riêng.

**F5. FID-ERP-006 — Lot placeholder + parse email Lot thật — DUYỆT +
CODE THẬT** (2026-09-18): Andy hỏi cách xử lý khi Lot thật về (ghi đè
hay giữ lịch sử) → xác nhận muốn "không sửa đè, ghi audit trail đầy
đủ" → **sửa FID-ERP-001 lên v1.7**: thêm bảng `lot_updates` (append-only,
trigger riêng) + 3 cột `lotConcessionBy/Reason/At` MUTABLE trên
`travelers` (giống `poNo`/`potNo`) — migration
`20260918025603_add_lot_updates_and_concession` áp dụng cả 2 DB. Viết
DRAFT `docs/features/FID-ERP-006_20260918.md`, Andy duyệt ("ok") → code:
- `webapp/lib/lot.ts` — `isLotPlaceholder`/`generateLotPlaceholder`/
  `parseLotEmail` (regex bắt CẶP Lot#+Traveler#, KHÔNG AI — đúng nguyên
  tắc "1 điểm AI duy nhất" cả dự án, tham khảo AVP_AI §5.4 đã chạy thật)
- `webapp/app/api/lot/{parse-email,update,concession}/route.ts` +
  `webapp/app/lot/update/page.tsx`
- **Sửa FID-ERP-003 confirm route** (đã DONE trước đó) — thêm bước tự
  sinh Lot placeholder (`LOT-{travelerNo}-{YYMMDD}`) lần lựa ĐẦU TIÊN
  của 1 Traveler, transaction riêng ngay sau SELECT/SCRAP/REWORK
- 14 test mới (`webapp/tests/integration/lot.test.ts`) + 55 test cũ
  không hồi quy = **69/69 PASS**, lint sạch, build thành công
- Lệch nhỏ: gộp Lot-placeholder ops chung 1 `$transaction` với SELECT/
  SCRAP/REWORK làm TypeScript suy ra type UNION (mất `.id`) — tách 2
  `$transaction` kế tiếp nhau, không ảnh hưởng đúng đắn nghiệp vụ.
  `isLotPlaceholder` dùng `.+` thay `\d+` cho travelerNo (String tự do,
  không ép numeric).

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

1. **Cách xử lý tiếp REWORK sau khi ghi** — đưa lại vào máy lựa lần 2 ghi
   1 `SELECT` mới, hay cần route "đóng" 1 dòng REWORK riêng? CHƯA thiết
   kế (xem FID-ERP-003 §8), để dành khi có nhu cầu thật rõ hơn.
2. **`GEMINI_API_KEY` thật** — `webapp/.env` đang để trống, `/capture` không
   gọi OCR thật được cho tới khi Andy dán key vào (model cụ thể cũng
   `[TO BE CONFIRMED]`, tạm dùng `gemini-3.5-flash-lite` như AVP_AI).
3. **Excel input cho FID-ERP-002** — quyết định tạm hoãn (Gemini vision
   không đọc trực tiếp .xlsx/.xlsm), chỉ làm ảnh/PDF trước. Andy xác nhận
   có cần làm tiếp không, hay để dành khi có nhu cầu thật.
4. **Checklist hạ tầng** (`FACILITIES_SETUP.md` §5) — khoảng cách Office↔Xưởng (quyết định Cat6/WiFi), ai quản trị máy chủ.
5. **Backup**: ngân sách/thiết bị cụ thể + RPO/RTO chính thức — Andy chọn "để sau", có kế hoạch mặc định trong `RISK_REGISTER.md` R-D01.
6. **Mở rộng `defect_types`** — vài tên lỗi thật ở Wrapping (`DAMAGED FLANGE`, `DAMAGED LOCKING`, đọc từ `Wrapping_final.xlsm` cột Special Notes) không khớp đúng 10 giá trị cố định hiện có (gần nhất "Damaged Pilot" — khác). FID-ERP-005 tạm chặn (400) nếu không khớp mã nào — Andy xác nhận có cần thêm giá trị mới không.
7. **Budget, timeline, team cụ thể** (bao nhiêu người Office/Xưởng, tên người giữ vai Giám đốc/Quản lý Máy 4) — `[TO BE CONFIRMED]`.
8. **File `D:\AVP_ERP\.env`** (root, ngoài `webapp/`) còn password superuser `postgres` Andy dán tạm 2026-09-17 — đã dùng xong, có thể xoá (Andy tự quyết, không tự xoá).
9. **`LOCATION = 'F'`** trong dữ liệu thật viết tắt của gì — không ảnh hưởng thiết kế, chỉ để biết.
10. **Báo cáo Partial** (Lot nào tồn đọng chưa đủ xuất, group `stock_moves` theo `lot_no` so ngưỡng min xuất hàng) — CHƯA VIẾT FID, để dành (xem FID-ERP-003 §8).

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
2. FID-ERP-002 đã DONE — nếu Andy có `GEMINI_API_KEY` thật, dán vào
   `webapp/.env` rồi thử `/capture` thật với file mẫu (`Data/2. Traveler/
   TRAVELER SHEETS SEP 9.pdf`) trước khi coi là chạy được thật (test hiện
   tại chỉ mock Gemini).
3. FID-ERP-003 đã DONE — nếu cần thử thật, dùng UI `/factory/select`
   (cần 1 Traveler đã RECEIVE từ `/capture` trước, vì route không tự tạo
   Traveler mới).
4. FID-ERP-004 đã DONE — ô search hiện ở đầu MỌI trang (gắn trong
   `layout.tsx`), gõ Traveler#/Part#/PO#/Pot#/Lot#/PS# để thử.
5. FID-ERP-005 đã DONE — dùng UI `/wrapping/check` để thử Good/Hold +
   reject (cần 1 Traveler đã tồn tại trước, vì route không tự tạo mới).
6. FID-ERP-006 đã DONE — dùng UI `/lot/update` để thử dán email + tách
   cặp Traveler#+Lot#; placeholder tự sinh khi qua `/factory/select`.
7. FID-ERP-007 (Rework/Return linkage, Pot#=GAYLORD) là bước tiếp theo
   hợp lý theo `FID_LIST.md` — cần viết FID trước (Status APPROVED) rồi
   mới code, đúng quy trình.
8. Việc khác theo Mục 4 trên, ưu tiên theo thứ tự Andy chọn.

---

*Session Report — cập nhật lần cuối 2026-09-18 (viết lại gọn, thay bản
cũ dài — toàn bộ chi tiết lịch sử vẫn còn trong các file đã dẫn link ở
Mục 2, không mất thông tin).*
