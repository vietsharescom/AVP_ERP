# SESSION REPORT — AVP_ERP

## SES-20260917-001 → SES-20260918-003 (2 ngày làm việc liên tục)

---

### 1. THÔNG TIN PHIÊN

| Trường | Giá trị |
|---|---|
| Session | SES-20260917-001 đến SES-20260918-003 |
| Chủ dự án | Andy Phan (Viet), Maple Leaf Group |
| Git | Đã init + push (Mục 5) — commit mới nhất `255877c` |
| Trạng thái | **FID-ERP-001 (v1.7) + FID-ERP-002→006 DONE — 69/69 test PASS, lint sạch, build thành công.** 6 FID còn lại CHƯA VIẾT. `webapp/` (Next.js 16 + Prisma 7 + PostgreSQL 18) chạy được thật. |

---

### 2. TIẾN ĐỘ FEATURE (chi tiết đầy đủ nằm trong từng file FID, Mục 10 "THỰC HIỆN")

| FID | Tên | Trạng thái | Điểm đáng nhớ |
|---|---|---|---|
| [FID-ERP-001](../features/FID-ERP-001_20260917.md) | Schema Postgres nền tảng | ✅ DONE (v1.7) | v1.0→v1.4: 3 vòng phản biện GPT+Grok (17/9). v1.5: +`REWORK`+`note` (cho FID-003). v1.6: +bảng `quality_checks` (cho FID-005). v1.7: +bảng `lot_updates`+cờ `lotConcession*` (cho FID-006). Mỗi lần thêm bảng/enum đều phải chạy `npx prisma generate` lại, không chỉ migrate. |
| [FID-ERP-002](../features/FID-ERP-002_20260918.md) | CaptureGate (PO + Kho nguyên liệu) | ✅ DONE | Gemini OCR, draft trước/ghi sau (CCP-1). `GEMINI_API_KEY` **chưa có key thật** — test mock. Excel chưa hỗ trợ, chỉ ảnh/PDF. |
| [FID-ERP-003](../features/FID-ERP-003_20260918.md) | Trạm nhập liệu Xưởng (v1.1) | ✅ DONE | Ghi SELECT+SCRAP+REWORK 1 transaction. Bài học: Rework ≠ Return/FID-007 (khác cấp độ) — Andy sửa lại bản v1.0 sai. |
| [FID-ERP-004](../features/FID-ERP-004_20260918.md) | GlobalSearchBar (ILIKE Postgres) | ✅ DONE | 1 ô search gắn `layout.tsx`, hiện mọi trang, đối xứng cả 3 điểm truy cập. |
| [FID-ERP-005](../features/FID-ERP-005_20260918.md) | Status Good/Hold (Wrapping) + Reject | ✅ DONE | Kiểm chứng dữ liệu thật (`openpyxl` đọc `Wrapping_final.xlsm`) trước khi thiết kế — `Reject` là số lượng (ghi SCRAP), không phải trạng thái thứ 4. Đối chiếu Odoo (`stock.scrap` vs `quality.check` tách riêng) để quyết định. |
| [FID-ERP-006](../features/FID-ERP-006_20260918.md) | Lot placeholder + parse email (regex, không AI) | ✅ DONE | Andy chọn "không sửa đè, ghi audit trail đầy đủ" khi đổi Lot → bảng `lot_updates` riêng thay vì ghi đè như AVP_AI. |
| FID-ERP-007→011, 013 | (xem `FID_LIST.md`) | CHƯA VIẾT | — |
| [FID-ERP-012](../features/FID-ERP-012_20260917.md) | Báo cáo sản xuất Xưởng | DRAFT | Sản lượng tính theo TỪNG MÁY rồi cộng dồn. |

**Việc khác đã làm 2026-09-17**: dọn ~50 file kế thừa khung ISO_CA (xoá 6 file thừa, viết lại ~30 file docs/cl0X); chốt kiến trúc 3 máy cố định + 1 laptop admin, 2 cổng AI (Office+Admin), Xưởng không AI; viết `ODOO_COMPARISON.md` (9 khía cạnh khác Odoo chuẩn).

**Tài liệu theo dõi tiến độ**: artifact `https://claude.ai/artifact/F6or9LJ6Ef3h17TdX1BAwq` (đã cập nhật liên tục theo tiến độ) + `docs/records/AVP_ERP Infrastructure.pdf` (Andy tự export bản tĩnh khi cần).

---

### 3. QUYẾT ĐỊNH ĐÃ CHỐT (KHÔNG BÀN LẠI)

| Quyết định | Lý do |
|---|---|
| Stack: Next.js + TypeScript + PostgreSQL + **Prisma** (7.10.0, không dùng RC) | Kế thừa AVP_AI + migration tự sinh |
| 3 máy cố định + 1 laptop admin, 2 cổng AI (Office+Admin), Xưởng không AI | Andy xác nhận qua nhiều vòng, kiểm soát audit |
| Mọi bảng sự kiện/audit (`stock_moves`, `quality_checks`, `lot_updates`) là sổ cái BẤT BIẾN, chặn UPDATE/DELETE ở tầng DATABASE (trigger riêng từng bảng) | Đúng gốc rễ lỗi AVP_AI cũ — chặn ở code không đủ. Trigger dùng thông báo lỗi đúng tên bảng, KHÔNG dùng chung 1 hàm cho nhiều bảng |
| Các cột định danh trên `travelers` (poNo/potNo/lotNo/lotConcession*) VẪN mutable — không phải mọi thứ đều cần append-only | Chỉ áp append-only cho SỰ KIỆN/SỐ LƯỢNG nghiệp vụ ảnh hưởng tính toán, không áp cho thông tin định danh đơn giản |
| 1 Traveler = 1 Lot (không phải nhiều-nhiều) | Kiểm chứng dữ liệu thật, AVP không trộn/biến đổi nguyên liệu |
| KHÔNG cần bảng `locations` riêng | Dữ liệu thật: `LOCATION`='F' 100%, chỉ 1 địa điểm vật lý |
| `qty` trên `stock_moves` LUÔN DƯƠNG, dấu +/- suy từ `move_type` | Tránh mơ hồ, đã ghi rõ công thức trong FID-ERP-001 |
| `defect_types`/`machine_code`/`operator_code`/`shift` — lookup cố định vs TEXT tự do | Xem chi tiết FID-ERP-001 §5 |
| Chỉ 1 điểm AI duy nhất (Gemini OCR ảnh/PDF, FID-ERP-002) — parse text (email Lot, FID-ERP-006) dùng REGEX, không mở điểm AI thứ 2 | Bài toán hẹp (1 nguồn Infasco, 2 loại PO/Lot cố định), quy mô không cần AI — đã kiểm chứng ở AVP_AI |
| Database `avp_erp` (dev) tách biệt `avp_erp_test` (test) | Trigger append-only chặn cả việc dọn dữ liệu test |

---

### 4. VIỆC ĐANG MỞ — hỏi Owner trước khi tự suy diễn

1. **Cách xử lý tiếp REWORK sau khi ghi** — đưa lại vào máy lựa lần 2 ghi 1 `SELECT` mới, hay cần route "đóng" 1 dòng REWORK riêng? CHƯA thiết kế (xem FID-ERP-003 §8), để dành khi có nhu cầu thật rõ hơn.
2. **`GEMINI_API_KEY` thật** — `webapp/.env` đang để trống, `/capture` không gọi OCR thật được cho tới khi Andy dán key vào (model cụ thể cũng `[TO BE CONFIRMED]`, tạm dùng `gemini-3.5-flash-lite` như AVP_AI).
3. **Excel input cho FID-ERP-002** — quyết định tạm hoãn (Gemini vision không đọc trực tiếp .xlsx/.xlsm), chỉ làm ảnh/PDF trước. Andy xác nhận có cần làm tiếp không, hay để dành khi có nhu cầu thật.
4. **Checklist hạ tầng** (`FACILITIES_SETUP.md` §5) — khoảng cách Office↔Xưởng (quyết định Cat6/WiFi), ai quản trị máy chủ.
5. **Backup**: ngân sách/thiết bị cụ thể + RPO/RTO chính thức — Andy chọn "để sau", có kế hoạch mặc định trong `RISK_REGISTER.md` R-D01.
6. **Mở rộng `defect_types`** — vài tên lỗi thật ở Wrapping (`DAMAGED FLANGE`, `DAMAGED LOCKING`, đọc từ `Wrapping_final.xlsm` cột Special Notes) không khớp đúng 10 giá trị cố định hiện có (gần nhất "Damaged Pilot" — khác). FID-ERP-005 tạm chặn (400) nếu không khớp mã nào — Andy xác nhận có cần thêm giá trị mới không.
7. **Báo cáo Partial** (Lot nào tồn đọng chưa đủ xuất, group `stock_moves` theo `lot_no` so ngưỡng min xuất hàng) — CHƯA VIẾT FID, để dành (xem FID-ERP-003 §8).
8. **Budget, timeline, team cụ thể** (bao nhiêu người Office/Xưởng, tên người giữ vai Giám đốc/Quản lý Máy 4) — `[TO BE CONFIRMED]`.
9. **File `D:\AVP_ERP\.env`** (root, ngoài `webapp/`) còn password superuser `postgres` Andy dán tạm 2026-09-17 — đã dùng xong, có thể xoá (Andy tự quyết, không tự xoá).
10. **`LOCATION = 'F'`** trong dữ liệu thật viết tắt của gì — không ảnh hưởng thiết kế, chỉ để biết.

---

### 5. GIT

Đã `init` + push từ 2026-09-18 (Andy tự làm qua PowerShell). Remote: **`https://github.com/vietsharescom/AVP_ERP.git`**, branch `main`. Quy tắc "không commit/push khi chưa xác nhận" (CLAUDE.md, global) áp dụng — mỗi lần commit trong phiên này đều đã hỏi Andy trước.

Lịch sử commit chính phiên này (mới nhất trước):
```
255877c feat: Lot placeholder + parse email Lot thật (regex, không AI) [FID-ERP-006]
305f921 feat: Status Good/Hold + Reject (Wrapping) [FID-ERP-005]
48394d1 feat: GlobalSearchBar tương đương — tra Postgres đối xứng [FID-ERP-004]
a5299f5 feat: Trạm nhập liệu Xưởng — máy lựa + defect + rework [FID-ERP-003]
ca892fd docs: draft FID-ERP-003 v1.1 + schema v1.5 (thêm REWORK)
9649712 feat: CaptureGate tương đương [FID-ERP-002]
8472f99 docs: cập nhật GitHub URL + ghi nhận git init/push
2954654 Initial commit
```

---

### 6. KẾ HOẠCH PHIÊN SAU

**Ưu tiên 1 — tiếp tục lộ trình FID** (đúng thứ tự phụ thuộc ở `FID_LIST.md`):
1. **FID-ERP-007** (Rework/Return linkage, Pot#=GAYLORD) — Traveler ĐÃ XUẤT bị Infasco trả lại toàn bộ (khác REWORK ở FID-ERP-003). Viết DRAFT trước, cần APPROVED rồi mới code.
2. Sau đó theo thứ tự: FID-ERP-008 (báo cáo đối chiếu PO) → FID-ERP-009 (Packing Slip — **quan trọng**, sẽ tiêu thụ cả 3 cổng chặn đã xây: `isLotPlaceholder`/`lotConcessionBy` từ FID-006, `traveler_last_quality_check` từ FID-005, và điều kiện SELECT/SCRAP từ FID-003) → FID-ERP-010 (sticker) → FID-ERP-011 (phân quyền).

**Ưu tiên 2 — thử nghiệm thật (nếu Andy có thời gian)**:
- Dán `GEMINI_API_KEY` thật vào `webapp/.env`, thử `/capture` với file mẫu thật (`Data/2. Traveler/TRAVELER SHEETS SEP 9.pdf`) — hiện tại toàn bộ 69 test đều mock Gemini, chưa ai xác nhận OCR thật hoạt động đúng.
- Chạy thử luồng đầy đủ 1 Traveler qua tay: `/capture` (RECEIVE) → `/factory/select` (SELECT, tự sinh Lot placeholder) → `/wrapping/check` (Good/Hold) → `/lot/update` (Lot thật) → search bằng ô tìm ở đầu trang — xác nhận dữ liệu liên kết đúng qua các bước.

**Ưu tiên 3 — việc mở ở Mục 4** — không chặn code, xử lý khi Andy có thời gian/quyết định (đặc biệt mục 1, 6, 7 ảnh hưởng thiết kế các FID sau).

**Khi bắt đầu phiên sau**: đọc file này (tự động) → nếu Mục 4 có gì Andy đã trả lời qua kênh khác (chat/note), cập nhật lại trước khi tiếp tục code.

---

*Session Report — viết lại đầy đủ 2026-09-18 (gộp lịch sử chi tiết theo FID vào bảng Mục 2 — chi tiết đầy đủ từng quyết định/lệch kế hoạch nằm trong Mục 10 "THỰC HIỆN" của từng file FID tương ứng, không lặp lại ở đây để tránh trôi dạt giữa 2 nơi mô tả cùng 1 việc).*
