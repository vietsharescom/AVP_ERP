# SESSION REPORT — AVP_ERP

## SES-20260917-001 → SES-20260920-010 (4 ngày làm việc liên tục, viết lại đầy đủ 2026-09-20)

*Viết cho: Andy (Owner) và các phiên Claude sau (Desktop/Laptop). Chi tiết từng quyết định nằm ở Mục 10 "THỰC HIỆN" của từng file FID — báo cáo này tổng hợp trạng thái, kết quả, việc mở và kế hoạch.*

---

### 1. THÔNG TIN PHIÊN

| Trường | Giá trị |
|---|---|
| Session | SES-20260917-001 → SES-20260920-010 |
| Chủ dự án | Andy Phan (Viet), Maple Leaf Group |
| Git | Remote `https://github.com/vietsharescom/AVP_ERP.git`, branch `main`. Đã push đến `06630c7` (dump demo) ngày 20/09; báo cáo này + PDF hạ tầng commit ngay sau (Andy: "commit push"). File khoá Excel `~$*.xlsx` không bao giờ add. |
| Trạng thái | **13/15 FID DONE** (001–009, 011, 012, 014, 015). FID-013 DRAFT (đã chạy thử toàn bộ dữ liệu, chờ 6 câu Mục 0). FID-010 CHƯA VIẾT (chờ loại máy in). **229/229 test PASS, lint/`tsc --noEmit`/build sạch.** `webapp/` (Next.js 16 + Prisma 7 + PostgreSQL 18) chạy thật, 3 trạm đăng nhập riêng, bộ dữ liệu đầy đủ đã nạp trong DB dev. |

---

### 2. TÓM TẮT ĐIỀU HÀNH

- **Đã có một hệ thống chạy được từ đầu đến cuối**: Office quét PO/Kho (Gemini OCR, người xác nhận) → Xưởng nhập máy lựa (scan Traveler + Part#) → Wrapping (Good/Hold, PACK, Reject) → Office cập nhật Lot, lập Packing Slip (ghi SHIP 1 transaction) → báo cáo PO/sản xuất, tìm kiếm bấm được, trang chi tiết Traveler/PS/Part#.
- **Đã có bộ dữ liệu đầy đủ để test và demo** (6.550 Traveler, 16.362 dòng sổ cái, 203 Packing Slip; kịch bản ở `docs/cl08_operation/DEMO_GUIDE.md`, snapshot khôi phục ở `Data/backup/`).
- **Kiểm chứng nhiều tầng**: 229 test tự động · E2E qua HTTP 3 trạm 33/33 · UI Chrome thật bấm Lưu 20/20 + chỉ đọc 23/23 · OCR Gemini thật 18/18 chứng từ (Part#/PO khớp 100%).
- **Chưa xong / cần Andy quyết** (theo mức ảnh hưởng): (1) migrate CHÍNH THỨC từ Google Sheets thật (6 câu Mục 0 + export 5 tab + chọn ngày), (2) Serial từng thùng (2 câu về tem/máy scan), (3) máy in sticker (FID-010), (4) mật khẩu/hạ tầng/backup trước go-live, (5) Andy tự thử giao diện mới trên tờ giấy thật.

---

### 3. TIẾN ĐỘ FEATURE (chi tiết đầy đủ nằm trong từng file FID, Mục 10 "THỰC HIỆN")

| FID | Tên | Trạng thái | Điểm đáng nhớ |
|---|---|---|---|
| [FID-ERP-001](../features/FID-ERP-001_20260917.md) | Schema Postgres nền tảng | ✅ DONE (v1.13) | 12 bảng + VIEW + trigger append-only. v1.0→v1.4: 3 vòng phản biện GPT+Grok. v1.5 +`REWORK`/`note`; v1.6 +`quality_checks`; v1.7 +`lot_updates`; v1.9 +`po_tracking`; v1.10 +`boxCount`/`skidNo`; v1.12 +`migration_quarantine`; **v1.13 (20/09) +`OTHERS` trong `defect_types`** (tờ giấy có 11 dòng defect, seed gốc 10). Mỗi lần đổi schema phải `npx prisma generate` lại. |
| [FID-ERP-002](../features/FID-ERP-002_20260918.md) | CaptureGate (PO + Kho nguyên liệu) | ✅ DONE | Gemini OCR, draft trước/ghi sau (CCP-1). `GEMINI_API_KEY` **đã có key thật** (2026-09-19, copy từ AVP_AI), OCR PO thật chạy được; test tự động vẫn mock. v1.1 cắt hậu tố Part#; v1.2 đích `po_receive` (bypass, riêng AVP). Excel chưa hỗ trợ, chỉ ảnh/PDF. |
| [FID-ERP-003](../features/FID-ERP-003_20260918.md) | Trạm nhập liệu Xưởng — máy lựa | ✅ DONE (v1.5) | Ghi SELECT+SCRAP+REWORK 1 transaction. **v1.4 (20/09)**: scan Traveler# tự điền Part/Lot/Pot/Pcs-per-Carton từ DB, Total = số thùng × Pcs/Carton, bố cục giống tờ giấy (xám = tự có, vàng = copy từ giấy), bảng defect liệt kê sẵn theo thứ tự tờ, nút "Lần trước" (máy/người), Ca 2 nút. **v1.5**: scan Part# BẮT BUỘC + lệch → khoá Lưu. Chọn hướng KHÔNG OCR (giữ "Xưởng không AI"). Bài học cũ: Rework ≠ Return/FID-007. |
| [FID-ERP-004](../features/FID-ERP-004_20260918.md) | GlobalSearchBar (ILIKE Postgres) | ✅ DONE | 1 ô search gắn `layout.tsx`, hiện mọi trang, đối xứng cả 3 điểm truy cập. |
| [FID-ERP-005](../features/FID-ERP-005_20260918.md) | Good/Hold (Wrapping) + Reject + PACK/Skid# | ✅ DONE (v1.5) | `Reject` là số lượng (ghi SCRAP), không phải trạng thái thứ 4; PACK cùng dòng với Good/Hold (ảnh WRAPPING SUMMARY thật). v1.2 bắt buộc đã SELECT; v1.3 cảnh báo boxCount/ca; v1.4 cảnh báo trùng + bước "Tra". **v1.5 (20/09)**: nhập nhanh như Xưởng + scan 2 lần (Traveler#/Part#) bắt buộc, PACK mặc định bật khi còn hàng chưa đóng, nút "Đóng hết", bảng Reject liệt kê sẵn; route `GET /api/quality/lookup`. Kiểm chứng trên 2.143 dòng CHECKING SUMMARY: 100% có đóng thùng, 94% TTL = thùng × qty/thùng, 39% có Reject. |
| [FID-ERP-006](../features/FID-ERP-006_20260918.md) | Lot placeholder + parse email (regex, không AI) | ✅ DONE | Andy chọn "không sửa đè, ghi audit trail đầy đủ" khi đổi Lot → bảng `lot_updates` riêng thay vì ghi đè như AVP_AI. |
| [FID-ERP-007](../features/FID-ERP-007_20260918.md) | Rework/Return linkage (Pot#=GAYLORD) | ✅ DONE | GAYLORD lúc đăng ký chỉ gắn cờ (không ghi stock_moves — CHECK `qty>0` chặn qty=0 lúc chưa biết số thật). `RETURN` dời sang ghi đúng lúc lựa lại xong (FID-ERP-003), cùng transaction SELECT/SCRAP/REWORK — KHÔNG hiệu chỉnh dòng `SHIP` gốc (đúng Odoo Return). |
| [FID-ERP-008](../features/FID-ERP-008_20260918.md) | Báo cáo đối chiếu PO | ✅ DONE | SQL `GROUP BY` thật. Thêm bảng mới `po_tracking` — nhân viên TỰ SET ngày bắt đầu/hạn PO (Infasco không ghi hạn tường minh, chỉ "ngầm hiểu trong TUẦN"), server không tự đoán. |
| [FID-ERP-009](../features/FID-ERP-009_20260919.md) | Packing Slip — duyệt PS, ghi SHIP thật | ✅ DONE | Ghi PS+lines+SHIP **1 transaction duy nhất** (interactive `$transaction`) — sửa lỗi "22 traveler quên đánh shipped" ở AVP_AI. PACK và Good/Hold là **2 cổng độc lập** — đóng gói xong không có nghĩa đủ điều kiện xuất (nếu Hold sau khi đã PACK vẫn bị chặn). `isReturnForRework=true` chỉ cảnh báo, không chặn cứng. |
| [FID-ERP-011](../features/FID-ERP-011_20260919.md) | Phân quyền theo trạm (session/login đầu tiên) | ✅ DONE | Đăng nhập THEO TRẠM (không phải người dùng cá nhân) — mật khẩu chung/trạm, `checkedBy`/`operatorCode`/`confirmedBy` vẫn TEXT tự do (2 lớp độc lập). Admin = ĐÚNG BẰNG quyền Office, KHÔNG làm Xưởng. Next.js 16 đổi "Middleware"→**"Proxy"** (`webapp/proxy.ts`) — phát hiện qua cảnh báo build, không đoán trước. |
| FID-ERP-010 | (xem `FID_LIST.md`) | CHƯA VIẾT | Sticker — đang chờ Andy cần biết loại máy in trước, "note để sau" 2026-09-19 (xem Mục 4 #17). |
| [FID-ERP-012](../features/FID-ERP-012_20260917.md) | Báo cáo sản xuất Xưởng | ✅ DONE (2026-09-19) | Sản lượng tính theo TỪNG MÁY rồi cộng dồn. Công thức rework (chốt hướng ở FID-ERP-007 §8, viết chính thức vào FID-012 v1.3): so khớp TUYỆT ĐỐI `traveler_no`+`created_at` với dòng `RETURN` để nhận diện SELECT/SCRAP của lần rework — SELECT loại hẳn (không cộng), SCRAP trừ khỏi sản lượng. Viết Mục 5 SAI 1 lần lúc đầu (chỉ nói "trừ SCRAP", quên "loại SELECT") — Andy hỏi lại số cụ thể mới lộ ra, đã sửa TRƯỚC khi code. `finished_goods_awaiting_shipment` cố ý không scope theo kỳ → phát hiện đây là truy vấn global DUY NHẤT trong test suite, phải thêm `fileParallelism:false` vào `vitest.config.mts` để tránh race giữa các file test. |
| [FID-ERP-013](../features/FID-ERP-013_20260919.md) | Migration từ AVP_AI | DRAFT — cơ chế v0.2 + ĐÃ CHẠY THỬ toàn bộ dữ liệu (20/09) | Đọc code AVP_AI thật để lấy đúng tên cột 5 tab. 19/09: cơ chế + test dữ liệu mẫu. **20/09**: chạy thử bằng TOÀN BỘ dữ liệu Excel của AVP_AI + AVP_ERP (Mục 11 của FID) — cơ chế nâng v0.2 (chuẩn hoá Part#/máy/ca/Lot/Skid, tách Reject thành nhiều SCRAP, PACK từ dòng Wrapping, ngày xuất thật). Status VẪN DRAFT: 6 câu Mục 0 chưa được Andy trả lời; migrate chính thức cần export 5 tab Google Sheets thật. |
| [FID-ERP-014](../features/FID-ERP-014_20260919.md) | Thiết kế UI — menu + trang chủ + đồng bộ + responsive | ✅ DONE (v1.1) | NavBar nhóm Nhập liệu/Báo cáo lọc theo `isStationAllowed`; trang chủ Search làm trọng tâm + "Việc cần làm" (PO / Traveler tồn đọng); `tokens.ts` + `PageContainer` đồng bộ khung/màu; responsive di động. Kiểm chứng Puppeteer thật phát hiện lỗi 2 ô search chồng nhau mà đọc code không thấy. |
| [FID-ERP-015](../features/FID-ERP-015_20260920.md) | Kết quả tìm kiếm bấm được + trang chi tiết Traveler/PS/Part# | ✅ DONE (20/09) | Andy: "khi search ra thì có thể click vào link" → chọn A+B: bấm Traveler ở trang có ô Traveler# (Xưởng/Wrapping/Packing/Lot) tự điền + Tra (sự kiện `avp:pick-traveler`), trang khác mở `/view/traveler/<no>` (lịch sử RECEIVE→SHIP, Good/Hold, đổi Lot, PS); PS → `/view/ps`, Part# → `/view/part`. Chỉ đọc, mọi trạm. Chrome thật 23/23. |

**Tài liệu theo dõi tiến độ**: artifact `https://claude.ai/artifact/F6or9LJ6Ef3h17TdX1BAwq` (cập nhật toàn dự án 20/09, 15 FID + sơ đồ + hành trình) + `docs/records/AVP_ERP Infrastructure.pdf` (bản 5 trang tạo từ chính nội dung artifact, 20/09).

---

### 4. NHẬT KÝ CÁC PHIÊN

**SES-20260917-001 → 008 (17–19/09)**: dọn ~50 file kế thừa khung ISO_CA; chốt kiến trúc 3 máy + 1 laptop admin, 2 cổng AI (Office + Admin), Xưởng không AI; phản biện schema 3 vòng (2× GPT + Grok); viết `ODOO_COMPARISON.md`; FID-001 → 009, 011, 012, 013 (cơ chế), 014. Chi tiết trong từng FID.

**SES-20260919-009 (19/09 chiều-tối) — "thử thật" cùng Andy**: Andy dán key Gemini thật, tự thử từng trạm bằng chứng từ thật; MỌI lỗ hổng tìm ra đều do Andy thử thật, test mock không thấy: Part# có hậu tố (FID-002 v1.1 + `lib/part.ts`), tìm Part# có hậu tố không ra (FID-004 v1.1), lưu Wrapping cho Traveler chưa SELECT (FID-005 v1.2), boxCount/ca phi lý (v1.3 + `lib/shift.ts`), lưu trùng (v1.4 + bước "Tra"). Thêm đích `po_receive` (lối tắt riêng AVP, nguyên tắc multi-tenant), `PART_CONTROL_MASTER_2026-09-19.xlsx` (1.235 mã gốc), tile "PO / Traveler tồn đọng". Commit `0a197ce`.

**SES-20260920-010 (đêm 19 → 20/09 và sáng 20/09)** — gồm 6 mảng:

**A. Xưởng nhập nhanh (FID-003 v1.4/1.5)**. Andy: nhập số liệu từ tờ Traveler vào máy quá lâu, dễ sai. Đọc tờ thật 718960/718039: scanner AVP cũ chỉ điền Traveler#/Part#, mọi ô khác trống; Pcs/Carton có trong `part_control` (đã kiểm: 2.700 và 4.500 khớp tờ/tem). Cân nhắc 3 hướng (A scanner + DB + tự tính, B toàn OCR, C kết hợp), Andy chọn A. Kết quả: scan Traveler# + Enter → tự điền; Total tự tính; bố cục giống tờ giấy; bảng defect liệt kê sẵn theo tờ (thêm `OTHERS`); scan Part# bắt buộc.

**B. Wrapping nhập nhanh (FID-005 v1.5)**. Kiểm chứng trên 2.143 dòng thật `CHECKING SUMMARY`: 100% có đóng thùng nên PACK mặc định bật; 94% TTL = thùng × qty/thùng nên tự tính đúng; 39% có Reject nên bảng Reject liệt kê sẵn. Route `GET /api/quality/lookup`. Andy nhắc: "user dùng scanner scan cả 2 barcode, mục đích double check" → scan 2 lần bắt buộc ở cả 2 trang.

**C. Bộ dữ liệu đầy đủ (FID-013 v0.2, chạy thử)**. Andy: "lấy data toàn bộ từ AVP_AI và AVP_ERP … chuẩn bị bộ data đầy đủ cho tôi test và demo cho khách", "cần thì delete và format", rồi đi ngủ. Làm:
- `pg_dump` DB dev cũ → format (`prisma migrate reset`) → nạp; script dựng CSV từ Excel: `webapp/scripts/migrate/xlsx_to_csv.py` (mọi giả định ở `Data/migration/BUILD_REPORT.md`).
- Cơ chế nâng v0.2, mỗi thay đổi có test: Part# theo quy ước ERP (v0.1 làm oan 2.047 Traveler); máy/ca/người TRIM+UPPER; Reject + Special Notes là DANH SÁCH ghép cặp (99% dòng khớp) → nhiều dòng SCRAP, tên lạ → `OTHERS` + ghi chú (v0.1 quarantine cả dòng sẽ mất ~25% sản lượng vì `STUCK TGT`); Lot IN HOA + `finalLot`; Skid chuẩn `SKID# n`; dòng Wrapping ghi thêm PACK (nếu không "thành phẩm chờ xuất" luôn 0); SHIP và Packing Slip dùng ngày xuất thật (không phải `now()`); Traveler không có RECEIVE muộn hơn SELECT/SHIP.
- Kết quả: 1.077 Part#, 6.550 Traveler, RECEIVE 2.911 · SELECT 3.791 · PACK 3.790 · SCRAP 1.086 · SHIP 4.784, 203 PS, quarantine 246. `reconcile`: mọi chênh lệch CSV↔DB bằng ĐÚNG tổng dòng quarantine (đã kiểm bằng SQL) — không dòng nào mất im lặng.
- Giả định đã dùng (chỉ vì nguồn là Excel cũ, không phải Google Sheets sống): RECEIVE suy từ `PIECES`; ~3.100 ngày xuất ước tính theo số PS (không sớm hơn ngày đóng thùng, 18:00); 3.231 dòng xuất suy từ cờ `Shipped` + PS# (qty = tổng SELECT hoặc PIECES); 1.687 dòng WorkStationArchive không có Ca → `shift=UNKNOWN`; Serial/Partial Boxes không nạp; `quality_checks` = 0.

**D. Kiểm chứng**. `npm test` 229/229 (16 test migrate-v02, 9 detail, 3 pick-traveler, 7 lookup/suggestPackAll, …). E2E qua HTTP 3 trạm 33/33 (vòng đời đủ, Hold chặn PS / Concession gỡ, Rework, phân quyền 403, trigger sổ cái). UI Chrome thật bấm Lưu 20/20 (phát hiện + sửa lỗi focus `setTimeout` chạy trước khi ô Part# render). OCR Gemini thật 18/18 chứng từ (12 PO + 6 Traveler): Part#/PO khớp 100% với dữ liệu đã nạp; Pot chỉ lệch số 0 đầu do Excel cũ. Restore snapshot đã thử thật (số dòng khớp, trigger còn nguyên).

**E. Tìm kiếm bấm được + trang chi tiết (FID-015)**. Andy nhìn ô tìm kiếm ở `/wrapping/check` và hỏi bấm được không → chọn A+B. Chrome thật 23/23. Khi xem trang chi tiết bằng dữ liệu thật phát hiện 2 lỗi dữ liệu nạp thử (ngày lập PS = lúc chạy migrate; 20 Traveler RECEIVE muộn hơn SELECT) → sửa trong adapter/migrate, nạp lại, snapshot mới.

**F. Tài liệu + git + giải thích**. Cập nhật artifact + PDF hạ tầng (toàn dự án); `DEMO_GUIDE.md`; commit `f0a02be`, `6ad1016`, `1ee1d29`, `06630c7` (dump). Andy hỏi và đã được giải thích: Serial từng thùng là gì, 6 câu Mục 0 là gì, tab/sheet Google Sheets, migrate chạy lúc nào và dùng để làm gì (bắt buộc cho Traveler đang làm dở), dump khác data gốc/JSON thế nào. Search `716044` không ra vì Traveler thuộc PO `194141` chưa nạp (cố ý, để demo quét PO mới).

**Bài học**: (1) mỗi lần chạy trên dữ liệu thật lộ thêm lỗi mà test mẫu không thấy — tiếp tục ưu tiên thử thật; (2) Prisma CLI chặn `migrate reset` từ AI trừ khi đặt `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` bằng nguyên văn lời user; script `tsx` cần `import "dotenv/config"`; (3) `docs/records/*.md` bị gitignore (trừ LATEST_SESSION) — tài liệu dùng chung đặt ở `docs/cl08_operation/`.

---

### 5. QUYẾT ĐỊNH ĐÃ CHỐT (KHÔNG BÀN LẠI)

| Quyết định | Lý do |
|---|---|
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
| Rework/Return (GAYLORD): KHÔNG hiệu chỉnh dòng `SHIP` gốc dù rework phát hiện hàng hư — `RETURN` ghi đúng lúc lựa lại xong (không lúc đăng ký), cùng transaction SELECT/SCRAP/REWORK | Đúng nguyên tắc append-only + pattern Odoo `stock.picking` Return (dòng mới tham chiếu ngược, không sửa phiếu gốc) — Andy xác nhận 2026-09-18, xem FID-ERP-007 §2b |
| Sản lượng (pcs) của lần lựa rework KHÔNG cộng thêm (đã tính ở lần đầu); nếu rework phát hiện SCRAP thì TRỪ lại khỏi tổng đã tính — riêng công lao động (máy/người/ca) VẪN tính đủ mọi lần | Andy xác nhận 2026-09-18 — công thức cụ thể để viết vào FID-ERP-012 khi tới lượt, xem FID-ERP-007 §8 |
| Ngày bắt đầu/hạn PO (`po_tracking`) do NHÂN VIÊN tự set, KHÔNG OCR/không tự suy đoán (kể cả mặc định +7 ngày) | PO Infasco không ghi hạn tường minh, chỉ "ngầm hiểu trong TUẦN" — Andy xác nhận 2026-09-18, xem FID-ERP-008 §5 |
| PACK (đóng thùng + Skid#) ghi ngay tại khâu Wrapping (FID-ERP-005), KHÔNG phải Office tự nhập ở Packing Slip (FID-ERP-009) | Andy gửi ảnh chụp thật "WRAPPING SUMMARY" — `No. of boxes`/`TTL QNT`/`SKID#` cùng 1 dòng với Good/Hold, 2026-09-19, xem FID-ERP-005 Mục 11 |
| PACK và Good/Hold là 2 CỔNG ĐỘC LẬP — đã đóng thùng KHÔNG có nghĩa đủ điều kiện xuất; hệ thống luôn đọc lần kiểm tra Wrapping GẦN NHẤT | Xem FID-ERP-009 §5 — Traveler PACK lúc Good nhưng sau đó bị Hold vẫn bị chặn khỏi Packing Slip |
| Đăng nhập THEO TRẠM (mật khẩu chung mỗi trạm), KHÔNG phải tài khoản cá nhân — ít nhất ở giai đoạn này | Quy mô nhỏ, `checkedBy`/`operatorCode`/`confirmedBy` đã có sẵn làm lớp audit người — 2 lớp độc lập, nâng cấp lên tài khoản cá nhân sau không cần viết lại kiến trúc. Andy xác nhận 2026-09-19, xem FID-ERP-011 §2 |
| Admin (Máy 4, Giám đốc/Quản lý) = ĐÚNG BẰNG bộ quyền Office — KHÔNG tự nhập liệu Xưởng (SELECT/Wrapping), chỉ xem/báo cáo | Andy xác nhận trực tiếp 2026-09-19 — KHÔNG phải "superset tuyệt đối" như mô tả gốc SOFTWARE_ARCHITECTURE.md §2.1 ngụ ý, xem FID-ERP-011 §8 |
| Test suite (`vitest`) chạy TUẦN TỰ (`fileParallelism: false`), không chạy song song nhiều file | Phát sinh khi viết FID-ERP-012 — `finished_goods_awaiting_shipment` là truy vấn KHÔNG scope theo ngày/traveler (đúng thiết kế, đọc toàn bộ `stock_moves`), chạy song song với file test khác gây race/nhiễu số liệu. Suite còn nhỏ (135 test, ~5s tuần tự) nên đánh đổi được, xem FID-ERP-012 Mục 10 |
| FID-ERP-013 (migration): dựng CƠ CHẾ + test bằng dữ liệu MẪU TRƯỚC, migrate dữ liệu lịch sử THẬT để SAU (2 giai đoạn tách biệt) | Andy xác nhận 2026-09-19 ("khg cần trước mắt lày data mới làm thử") — Status FID-013 vẫn DRAFT, không tự APPROVED chỉ vì cơ chế đã chạy được với data giả lập; migrate thật vẫn cần Andy trả lời Mục 0 (6 câu hỏi) trước |
| Giao diện ĐỒNG BỘ STYLE cho mọi trạm (menu/màu/khung), nhưng phân quyền ROUTE vẫn theo trạm (FID-ERP-011 không đổi) | Andy hỏi "sao không làm chung cho AVP_ERP đồng bộ" nhưng làm rõ ngay đây là đồng bộ GIAO DIỆN, không phải bỏ phân quyền — 2026-09-19, xem FID-ERP-014 Mục 0 |
| Trang chủ đưa SEARCH làm trọng tâm số 1 (to nhất, đầu tiên), không phải dashboard/link list | Andy: "nhu cầu của user luôn tìm kiếm thông tin... màn hình ngay từ đầu phải là search all" — 2026-09-19, xem FID-ERP-014 Mục 0/4c |
| Ý tưởng "scan tự nhận diện loại chứng từ" + "inbox lưu email PO trước khi duyệt" — GHI NHẬN để dành, KHÔNG sửa FID-ERP-002 (giữ nguyên thiết kế đã DONE) | Andy nêu ý tưởng rồi tự chốt "vậy theo thiết kế đã done" — 2026-09-19, xem FID-ERP-014 Mục 0 |
| AVP_ERP cần responsive di động (đảo ngược quyết định ban đầu "3 máy cố định không cần") | Andy: quản lý muốn xem báo cáo từ điện thoại được — 2026-09-19, xem FID-ERP-014 Mục 0 #5 |
| Xưởng nhập nhanh bằng **scanner barcode + tra DB + tự tính, KHÔNG OCR** (hướng A) — 3 hướng đã cân nhắc (A scanner+DB, B toàn OCR bỏ barcode, C kết hợp) | Scanner AVP cũ chỉ điền Traveler#/Part#, mọi ô khác trống — tiết kiệm thật đến từ DB + tự tính; OCR chỉ bỏ thêm 3 ô gõ ngắn (số thùng/máy/người) mà phải soát chữ tay dễ sai (`BF100`/`BF108`) và phải sửa AI_POLICY. Andy chọn A 20/09, xem FID-ERP-003 §13 |
| **Scan 2 lần bắt buộc** Traveler# + Part# (double check) ở `/factory/select` và `/wrapping/check`; Part# lệch → khoá nút Lưu | Andy: trên biểu mẫu Part# và Traveler# dùng chéo nhau để tránh lộn, user thường scan cả 2 barcode — 20/09, xem FID-ERP-005 §15.2 |
| Máy/người vận hành/kiểm tra **không điền sẵn** — chỉ có nút "Lần trước: …" (`localStorage`) bấm mới điền; Ca là 2 nút `MRNNG`/`AFTRN` | Tránh quên đổi khi sang máy khác → ghi sai vào sổ cái bất biến; Andy chọn phương án này khi được hỏi, FID-ERP-003 §13.8 câu 2 |
| Form Xưởng/Wrapping **bố cục giống tờ giấy**: ô XÁM = tự có từ DB, ô VÀNG = copy từ giấy; bảng defect/reject liệt kê sẵn theo đúng thứ tự tờ (có `Others`) | Andy: form phải giống tờ giấy để dễ nhận dạng và copy đúng ô còn thiếu — 20/09 |
| Tên lỗi ngoài danh sách (`DAMAGED`, `MISSING TAB`, `DAMAGED FLANGE`…) → ghi vào `OTHERS` + giữ tên gốc ở `note`/Special Notes, KHÔNG bỏ dòng, KHÔNG thêm loại mới lúc này | Mặc định Andy chấp nhận ("ok mặc định", 20/09); áp dụng cả Wrapping lẫn migration (FID-ERP-005 §15.8, FID-ERP-013 Mục 11) |
| Serial từng thùng thuộc công đoạn **Wrapping**, tách FID riêng (`carton_serials`), CHƯA thiết kế | Andy sửa lại 20/09: Serial trong `WorkStationArchive` là công đoạn Wrapping, không phải lúc lựa. Chờ 2 câu: tem 1 hay 3 barcode, máy scan loại nào |
| Kết quả tìm kiếm bấm được: Traveler → điền form đang mở nếu có ô Traveler#, không thì mở trang chi tiết; link "Chi tiết" luôn có (A+B) | Andy chọn 20/09, FID-ERP-015 |
| Cho phép Claude **format DB dev `avp_erp`** để nạp bộ dữ liệu đầy đủ ("cần thì delete và format"); DB test `avp_erp_test` KHÔNG động vào | Andy cho phép trực tiếp 20/09; đã `pg_dump` bản cũ trước; Prisma CLI chặn `migrate reset` từ AI trừ khi đặt `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` bằng nguyên văn lời user |
| Bộ dữ liệu demo: 2 file `.dump` đưa vào git để đồng bộ Desktop ↔ Laptop; docs/records/*.md bị `.gitignore` (trừ LATEST_SESSION) nên tài liệu dùng chung đặt ở `docs/cl08_operation/` | Andy đồng ý commit dump 20/09 |

---

### 6. VIỆC ĐANG MỞ — hỏi Owner trước khi tự suy diễn

1. **Cách xử lý tiếp REWORK sau khi ghi** — đưa lại vào máy lựa lần 2 ghi 1 `SELECT` mới, hay cần route "đóng" 1 dòng REWORK riêng? CHƯA thiết kế (xem FID-ERP-003 §8), để dành khi có nhu cầu thật rõ hơn.
2. ~~**`GEMINI_API_KEY` thật**~~ **XONG 19/09** — key thật đã có trong `webapp/.env`; OCR Gemini thật đã chạy trên 18 chứng từ (20/09). Model vẫn là `gemini-3.5-flash-lite` (mặc định như AVP_AI), Andy chưa chốt model cuối.
3. **Excel input cho FID-ERP-002** — quyết định tạm hoãn (Gemini vision không đọc trực tiếp .xlsx/.xlsm), chỉ làm ảnh/PDF trước. Andy xác nhận có cần làm tiếp không, hay để dành khi có nhu cầu thật.
4. **Checklist hạ tầng** (`FACILITIES_SETUP.md` §5) — khoảng cách Office↔Xưởng (quyết định Cat6/WiFi), ai quản trị máy chủ.
5. **Backup**: ngân sách/thiết bị cụ thể + RPO/RTO chính thức — Andy chọn "để sau", có kế hoạch mặc định trong `RISK_REGISTER.md` R-D01.
6. **Mở rộng `defect_types`** — một phần XONG: thêm `OTHERS` (FID-001 v1.13). Các tên lỗi thật ngoài danh sách (Wrapping ~3% dòng: `DAMAGED` 30, `MISSING TAB` 9, `DAMAGED FLANGE` 8, `CRACKED` 7, `MISSING COLOR` 7, `DAMAGED LOCKING` 5) đang ghi vào `OTHERS` + ghi chú. Andy quyết sau có cần loại lỗi riêng cho các tên hay gặp không.
7. **Báo cáo Partial** (Lot nào tồn đọng chưa đủ xuất, group `stock_moves` theo `lot_no` so ngưỡng min xuất hàng) — CHƯA VIẾT FID, để dành (xem FID-ERP-003 §8).
8. **Budget, timeline, team cụ thể** (bao nhiêu người Office/Xưởng, tên người giữ vai Giám đốc/Quản lý Máy 4) — `[TO BE CONFIRMED]`.
9. **File `D:\AVP_ERP\.env`** (root, ngoài `webapp/`) còn password superuser `postgres` Andy dán tạm 2026-09-17 — đã dùng xong, có thể xoá (Andy tự quyết, không tự xoá).
10. **`LOCATION = 'F'`** trong dữ liệu thật viết tắt của gì — không ảnh hưởng thiết kế, chỉ để biết.
11. **Traveler trả lại rework NHIỀU LẦN trong đời** (2 đợt rework tách biệt) — `hasReturnMove()` (FID-ERP-007) hiện chỉ biết "đã từng có RETURN chưa", không phân biệt đợt nào — ca hiếm/chưa quan sát thấy thật, để dành xử lý khi có ca thật (xem FID-ERP-007 §8).
12. **`poNo` gốc bị ghi đè mất khi Traveler quay lại rework** — `packing_slip_lines` chỉ snapshot `partNoSnap`/`lotNoSnap`/`potNoSnap`, KHÔNG có `poNoSnap`. Cần Andy xác nhận có nên thêm `poNoSnap` (sửa schema đã APPROVED/code xong lần nữa) hay chấp nhận giới hạn này (xem FID-ERP-007 §8).
13. **Ngưỡng cảnh báo "PO tồn đọng bao nhiêu ngày thì báo động"** — FID-ERP-008 mới trả `isOverdue`/`daysOpen` thô, chưa có ngưỡng tô màu/cảnh báo cụ thể — Andy xác nhận khi thiết kế UI (xem FID-ERP-008 §8).
14. **In Packing Slip ra PDF/giấy thật** — chưa có FID nào phủ việc này (FID-ERP-010 chỉ nói về sticker, khác tài liệu PS) — Andy xác nhận có làm riêng hay gộp vào FID-ERP-009 khi có nhu cầu in thật (xem FID-ERP-009 §8).
15. **Sửa/huỷ 1 Packing Slip đã duyệt** (vd đếm nhầm Total Pallets, xuất nhầm dòng) — chưa thiết kế quy trình bút toán điều chỉnh (xem FID-ERP-009 §8).
16. **Chặn cứng `isReturnForRework=true` ở Packing Slip** — hiện chỉ cảnh báo (`warnings`), Andy xác nhận sau nếu cần chặn cứng không cho xuất hàng rework (xem FID-ERP-007 §8 + FID-ERP-009 §8).
17. **FID-ERP-010 (In sticker) — chưa viết DRAFT được, cần biết loại máy in trước** (`FACILITIES_SETUP.md` §5) — máy in nhãn chuyên dụng (label printer, vd Zebra, gửi lệnh ZPL/EPL) khác hẳn máy in giấy thường (PDF), ảnh hưởng trực tiếp thiết kế route. Andy: "note để sau" (2026-09-19) — để dành đến khi có thông tin.
18. **Chi tiết vận hành đăng nhập trạm** (FID-ERP-011 §8) — thời lượng session (tạm 12 giờ), đổi mật khẩu trạm qua UI (hiện chỉ sửa `.env`), khoá sau N lần sai — chưa chặn gì, để dành khi Andy có ý kiến cụ thể.
19. **190 Part# trong `part_control` còn thiếu/xung đột** (xem `Data/PART_CONTROL_MASTER_2026-09-19.xlsx` sheet `CAN_XEM_LAI`, 2026-09-19) — 160 thiếu Quantity/box, 20 thiếu Client, 11 có số liệu khác nhau giữa các nguồn (vd Part# `11546366`: 1 nguồn ghi 1000, nguồn khác ghi 1200 — đang tạm dùng giá trị đa số, Andy xác nhận lại nếu sai). Andy tự bổ sung cột ghi chú trong file rồi báo lại để nạp tiếp vào DB.
20. **Danh sách mã máy (`machineCode`)/mã nhân viên (`operatorCode`) chính thức** — `BANG_MA_THAM_CHIEU_AVP_2026-09-17.xlsx` sheet `3_Ma_May` (~25 mã BF/MC/TABLE/PCKY) và `4_Ma_Nhan_Vien` (9 mã quan sát được) đều tự ghi "chưa xác nhận"/"chưa có danh sách chính thức" — CHƯA dùng làm rule cảnh báo (khác `shift`, đã chốt `MRNNG`/`AFTRN` qua chứng từ thật `WRAPPING SUMMARY`, xem FID-ERP-003 v1.2/FID-ERP-005 v1.3, 2026-09-19). Cần Owner cung cấp danh sách hợp lệ (kèm tên thật cho mã nhân viên) trước khi làm dropdown/cảnh báo tương tự.
21. **Serial từng thùng** (bảng `carton_serials`, scan tem ở Wrapping, migrate cột `Serial#` của WorkStationArchive — hiện KHÔNG nạp, sẽ mất nếu migrate mà chưa có chỗ chứa) — CHỜ Andy: tem có 1 barcode gộp (Traveler+Part+Serial) hay 3 barcode riêng? Máy scan loại nào (USB gõ như bàn phím, tự Enter?). Dữ liệu cũ: 3.092/3.099 dòng có số Serial = số thùng; 99,3% Serial liên tục. Cần FID mới (chưa có mã).
22. **6 câu Mục 0 FID-ERP-013** — có đề xuất mặc định sẵn: (1) Andy export 5 tab Google Sheets ra CSV vào `Data/migration/`; (2) nạp TOÀN BỘ lịch sử; (3) Reject lạ → `OTHERS`+note (đã làm); (4) `totalPallets/Empty` = 0; (5) Lot ưu tiên FinishGood (đã làm); (6) chạy một lần, cuối tuần (dữ liệu cho thấy Thứ Bảy/Chủ Nhật gần như không sản xuất), sau khi Andy thử xong luồng thật. Chờ Andy nói "ok mặc định" + ngày chạy + export 5 tab. Bản chạy thử hiện suy ra: RECEIVE (từ PIECES), ~3.100 ngày xuất (ước tính theo số PS), 3.231 dòng xuất suy từ cờ `Shipped`+PS#.
23. **246 dòng quarantine** trong DB dev (`migration_quarantine`): 88 Traveler có Part# chưa có qty/thùng trong `part_control`, 9 thiếu ngày, 11 dòng xuất số lượng lỗi (`#N/A`, 0), 138 dòng phụ thuộc các Traveler bị giữ. Andy bổ sung qty/thùng (`CAN_XEM_LAI` + mục 19) rồi nạp lại để giảm.
24. **1.687 dòng WorkStationArchive không có Ca** → đang ghi `shift=UNKNOWN` trong bộ dữ liệu thử (không suy ca theo giờ vì dữ liệu thật cho thấy giờ ghi không quyết định ca: 635 dòng "Mrnng" ghi buổi chiều). Migrate chính thức cần Andy chỉ cách xử lý (bỏ, để UNKNOWN, hay bổ sung ca).
25. **Không có Good/Hold lịch sử** (`quality_checks` = 0 trong dữ liệu nạp) — file nguồn không có trạng thái này. Traveler đã PACK phải qua `/wrapping/check` (Good) trước khi lập Packing Slip mới. Andy xác nhận cách coi Traveler cũ: đã Good, hay bắt kiểm lại.
26. **Ảnh giấy "WRAPPING SUMMARY"** (`D:\AVP_AI\Data\4.WRAPPING\`) — Andy chưa cho phép đọc lần này; bố cục form Wrapping hiện theo thứ tự cột CHECKING SUMMARY trong `.xlsm`. Andy xem giao diện thật rồi nhận xét nhãn/thứ tự có khớp giấy không.
27. **Báo cáo sản xuất nhóm theo ngày UTC** (FID-ERP-012) — giờ ghi tối muộn theo giờ địa phương có thể rơi sang ngày UTC kế tiếp. Cần quyết dùng múi giờ máy chủ/địa phương.
28. **`/reports/po-progress` hiển thị cả 170 PO trên 1 trang** (không phân trang/lọc) — chạy được, dài; làm nhẹ khi Andy muốn.
29. **Pot# mất số 0 đầu** trong Excel cũ (`099` → `99`), OCR PO đọc đúng `099` — không khôi phục được ở dữ liệu cũ; không ảnh hưởng nghiệp vụ nhưng so khớp Pot giữa PO và DB có thể lệch dạng.
30. **Mật khẩu 3 trạm hiện là mật khẩu tạm** trong `webapp/.env` (`STATION_*_PASSWORD`) — phải đổi trước go-live; file `D:\AVP_ERP\.env` (root) còn password superuser postgres (mục 9).
31. **PO `194141.pdf` (28 Traveler) cố ý CHƯA nạp** để làm demo "Quét PO mới" (Traveler `716044` … thuộc PO này). Andy quyết giữ nguyên hay nạp sẵn.

---

### 7. GIT

Remote `https://github.com/vietsharescom/AVP_ERP.git`, branch `main`. Quy tắc "không commit/push khi chưa xác nhận" áp dụng — mỗi lần đều hỏi Andy.

Lịch sử commit (mới nhất trước):
```
06630c7 chore: 2 ban sao database (snapshot demo + DB dev cu) vao git
1ee1d29 docs: DEMO_GUIDE dua vao docs/cl08_operation
6ad1016 feat: Chay thu migration bang toan bo du lieu that + bo demo [FID-ERP-013 v0.2]
f0a02be feat: Xuong/Wrapping nhap nhanh + tim kiem bam duoc [FID-003 v1.4/1.5][FID-005 v1.5][FID-001 v1.13][FID-015]
b95c5b0 docs: chot bao cao ket thuc phien SES-20260919-009
0a197ce feat: Test thuc CaptureGate/Wrapping ...
5eb6f5f feat: Thiet ke UI thong nhat [FID-014]
58ec75c feat: Co che migration tu AVP_AI + migration_quarantine [FID-013]
fcfe437 feat: Bao cao san xuat Xuong [FID-012]
0d504bd feat: Phan quyen theo tram [FID-011]
d27ec8a feat: Packing Slip + PACK/Skid# [FID-009][FID-005 v1.1]
24b7ce6 feat: Rework/Return + Bao cao doi chieu PO [FID-007][FID-008]
255877c feat: Lot placeholder + parse email [FID-006]
305f921 feat: Status Good/Hold + Reject [FID-005]
48394d1 feat: GlobalSearchBar [FID-004]
a5299f5 feat: Tram nhap lieu Xuong [FID-003]
9649712 feat: CaptureGate [FID-002]
2954654 Initial commit
```
Trong repo có `Data/backup/*.dump` (2 file, ~450 KB, nhị phân — dựng lại snapshot mới thì commit đè, chấp nhận thêm ~400 KB vào lịch sử) và `Data/migration/*.csv` (dữ liệu chạy thử, dựng lại được bằng `xlsx_to_csv.py`).

---

### 8. KẾ HOẠCH TIẾP THEO

Nguyên tắc: việc nào Andy quyết được ngay thì làm trước; việc cần thông tin bên ngoài (máy in, máy scan, Google Sheets thật) để song song. Ai làm: **[Andy]** hoặc **[Claude]**.

**Bước 1 — Andy tự thử và nhận xét (1–2 ngày, không cần code)**
1. [Andy] `npm run build` + `npx next start -p 3001` (hoặc `next dev` như hiện nay), chạy kịch bản `DEMO_GUIDE.md` (Traveler `718085` → Xưởng → Wrapping → Packing Slip; PO `194141.pdf` cho Quét PO; bấm kết quả tìm kiếm).
2. [Andy] Thử `/factory/select` và `/wrapping/check` bằng chính tờ Traveler/Wrapping thật (718960, 718039, WRAPPING SUMMARY): scan 2 lần, Total tự tính, nút "Lần trước", "Đóng hết". Báo: chỗ nào chậm, nhãn nào chưa khớp giấy, ô nào thiếu.
3. [Claude] Sửa mọi thứ Andy báo (mỗi lần sửa nâng version FID liên quan, test lại, kiểm bằng Chrome thật).

**Bước 2 — Migrate chính thức (cần Andy, khoảng 1 buổi + 1 cuối tuần)**
1. [Andy] Trả lời "ok mặc định" cho câu 2–5 Mục 0, chốt ngày chạy (đề xuất Chủ Nhật sau Bước 1), export 5 tab Google Sheets (RawMaterial, Warehouse, FinishGood, PartControl, PackingList) ra CSV vào `Data/migration/` (bỏ CSV chạy thử).
2. [Claude] Chạy `audit.ts` → báo Andy danh sách dòng có vấn đề; Andy bổ sung qty/thùng, quyết Ca `UNKNOWN`, Good/Hold lịch sử (mục 6 #23–25).
3. [Claude] Dựng bảng `carton_serials` nếu Serial đã chốt, để không mất Serial; viết lại mapping nếu Sheets thật khác Excel (RECEIVE lấy thẳng từ Warehouse, ngày xuất thật).
4. Ngày chạy: [Andy] ngừng nhập AVP_AI → export → [Claude] `run.ts` → `reconcile.ts` → [Andy] ký xác nhận → mọi nhập liệu chuyển sang ERP, AVP_AI chỉ xem.

**Bước 3 — Serial + sticker (cần thông tin thiết bị)**
1. [Andy] Trả lời tem 1 hay 3 barcode + loại máy scan (hoặc gửi ảnh 1 tem) → [Claude] viết FID Serial (nháp → Andy duyệt → code: `carton_serials`, scan từng tem ở `/wrapping/check`, kiểm số Serial = số thùng, chặn trùng).
2. [Andy] Cho biết loại máy in sticker (khổ tem, USB/mạng, có Zebra/ZPL không) + mẫu tem AVP đang dán ở góc tờ Traveler → [Claude] viết FID-ERP-010 (in tự động từ dữ liệu vừa lưu, không gõ lại).

**Bước 4 — Hoàn thiện kỹ thuật (Claude tự làm được, ưu tiên thấp → trung bình)**
- Phân trang/lọc `/reports/po-progress`; múi giờ báo cáo sản xuất (mục 6 #27); hiển thị/lọc ca `UNKNOWN`; ngưỡng cảnh báo PO trễ; sửa/huỷ Packing Slip bằng bút toán điều chỉnh; in Packing Slip PDF; báo cáo Partial; dropdown mã máy/nhân viên khi Andy có danh sách chính thức; `poNoSnap` trên dòng PS (mục 6 #12).

**Bước 5 — Sẵn sàng vận hành (Andy chủ trì)**
1. Hạ tầng: chốt máy chủ (Máy 1) + người quản trị, cáp LAN/WiFi Office ↔ Xưởng, mua scanner + máy in; checklist `FACILITIES_SETUP.md` §5.
2. Bảo mật: đổi mật khẩu 3 trạm (`.env`), xoá password postgres ở `D:\AVP_ERP\.env`, khoá truy cập ngoài LAN.
3. Backup: chốt tần suất/thiết bị/RPO-RTO (`RISK_REGISTER.md` R-D01); thử khôi phục thật (recipe ở `DEMO_GUIDE.md`).
4. **Chạy song song 1–2 tuần** (đề xuất): nhân viên nhập vào cả AVP_AI và AVP_ERP, đối chiếu số hằng ngày bằng báo cáo sản xuất; sai lệch → sửa FID. Sau đó cutover Chủ Nhật (Bước 2.4).

**Rủi ro cần theo dõi**: Server là điểm đơn (chưa có backup chính thức); dữ liệu lịch sử Excel có suy đoán (chỉ hết khi export Google Sheets thật); Serial chưa có chỗ chứa; scanner/máy in chưa xác định; mật khẩu trạm còn là mật khẩu tạm; giao diện mới chưa qua tay nhân viên thật.

**Khi bắt đầu phiên sau**: đọc file này (tự động) → đọc Mục 6 xem Andy đã trả lời gì qua chat/note → cập nhật rồi mới code. Kịch bản chạy nhanh: `cd webapp; npm test; npm run build; npx next start -p 3001` (DB dev = bộ dữ liệu đầy đủ; khôi phục sạch bằng `Data/backup/avp_erp_full_loaded_20260920.dump`).

---

*Session Report — viết lại đầy đủ 2026-09-20 (kết thúc SES-20260920-010): 13/15 FID DONE, 229/229 test PASS, bộ dữ liệu đầy đủ trong DB dev, đã commit + push đến `06630c7` (báo cáo này commit kèm sau).*
