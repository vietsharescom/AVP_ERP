# SESSION REPORT — AVP_ERP

## SES-20260917-001 → SES-20260919-009 (3 ngày làm việc liên tục)

---

### 1. THÔNG TIN PHIÊN

| Trường | Giá trị |
|---|---|
| Session | SES-20260917-001 đến SES-20260919-009 |
| Chủ dự án | Andy Phan (Viet), Maple Leaf Group |
| Git | **CHƯA commit** thay đổi từ 2026-09-19 tối → 2026-09-20 (commit mới nhất đã push vẫn là `b95c5b0`): FID-003 v1.4/1.5, FID-005 v1.5, FID-001 v1.13, FID-013 v0.2 + code `webapp/` + `Data/migration/*` + `Data/backup/*.dump` + ảnh WhatsApp Traveler. Chờ Andy xác nhận commit/push (và quyết định file CSV/dump có đưa vào git không). |
| Trạng thái | **FID-ERP-001 (v1.12) + FID-ERP-002→009+011+012+014 DONE — 178/178 test PASS, lint/tsc/build sạch; đã thử thật qua trình duyệt: `/capture` (Gemini OCR thật), `/lot/update`, `/factory/select`, `/wrapping/check`.** FID-ERP-013 DRAFT (cơ chế đã code+test bằng data mẫu, MIGRATE THẬT chờ Andy trả lời Mục 0). FID-ERP-010 CHƯA VIẾT (chờ máy in). `webapp/` (Next.js 16 + Prisma 7 + PostgreSQL 18) chạy được thật trên `localhost:3001`, có đăng nhập theo trạm + menu điều hướng. |

---

### 2. TIẾN ĐỘ FEATURE (chi tiết đầy đủ nằm trong từng file FID, Mục 10 "THỰC HIỆN")

| FID | Tên | Trạng thái | Điểm đáng nhớ |
|---|---|---|---|
| [FID-ERP-001](../features/FID-ERP-001_20260917.md) | Schema Postgres nền tảng | ✅ DONE (v1.7) | v1.0→v1.4: 3 vòng phản biện GPT+Grok (17/9). v1.5: +`REWORK`+`note` (cho FID-003). v1.6: +bảng `quality_checks` (cho FID-005). v1.7: +bảng `lot_updates`+cờ `lotConcession*` (cho FID-006). Mỗi lần thêm bảng/enum đều phải chạy `npx prisma generate` lại, không chỉ migrate. |
| [FID-ERP-002](../features/FID-ERP-002_20260918.md) | CaptureGate (PO + Kho nguyên liệu) | ✅ DONE | Gemini OCR, draft trước/ghi sau (CCP-1). `GEMINI_API_KEY` **đã có key thật** (2026-09-19, copy từ AVP_AI), OCR PO thật chạy được; test tự động vẫn mock. v1.1 cắt hậu tố Part#; v1.2 đích `po_receive` (bypass, riêng AVP). Excel chưa hỗ trợ, chỉ ảnh/PDF. |
| [FID-ERP-003](../features/FID-ERP-003_20260918.md) | Trạm nhập liệu Xưởng (v1.1) | ✅ DONE | Ghi SELECT+SCRAP+REWORK 1 transaction. Bài học: Rework ≠ Return/FID-007 (khác cấp độ) — Andy sửa lại bản v1.0 sai. |
| [FID-ERP-004](../features/FID-ERP-004_20260918.md) | GlobalSearchBar (ILIKE Postgres) | ✅ DONE | 1 ô search gắn `layout.tsx`, hiện mọi trang, đối xứng cả 3 điểm truy cập. |
| [FID-ERP-005](../features/FID-ERP-005_20260918.md) | Status Good/Hold (Wrapping) + Reject + PACK/Skid# (v1.1) | ✅ DONE | Kiểm chứng dữ liệu thật (`openpyxl` đọc `Wrapping_final.xlsm`) trước khi thiết kế — `Reject` là số lượng (ghi SCRAP), không phải trạng thái thứ 4. **v1.1 (2026-09-19)**: Andy gửi ảnh chụp thật "WRAPPING SUMMARY" xác nhận đóng thùng (PACK, số thùng+qty) + Skid# ghi CÙNG lúc với Good/Hold — sửa lại FID đã DONE để thêm `pack` optional vào request. |
| [FID-ERP-006](../features/FID-ERP-006_20260918.md) | Lot placeholder + parse email (regex, không AI) | ✅ DONE | Andy chọn "không sửa đè, ghi audit trail đầy đủ" khi đổi Lot → bảng `lot_updates` riêng thay vì ghi đè như AVP_AI. |
| [FID-ERP-007](../features/FID-ERP-007_20260918.md) | Rework/Return linkage (Pot#=GAYLORD) | ✅ DONE | GAYLORD lúc đăng ký chỉ gắn cờ (không ghi stock_moves — CHECK `qty>0` chặn qty=0 lúc chưa biết số thật). `RETURN` dời sang ghi đúng lúc lựa lại xong (FID-ERP-003), cùng transaction SELECT/SCRAP/REWORK — KHÔNG hiệu chỉnh dòng `SHIP` gốc (đúng Odoo Return). |
| [FID-ERP-008](../features/FID-ERP-008_20260918.md) | Báo cáo đối chiếu PO | ✅ DONE | SQL `GROUP BY` thật. Thêm bảng mới `po_tracking` — nhân viên TỰ SET ngày bắt đầu/hạn PO (Infasco không ghi hạn tường minh, chỉ "ngầm hiểu trong TUẦN"), server không tự đoán. |
| [FID-ERP-009](../features/FID-ERP-009_20260919.md) | Packing Slip — duyệt PS, ghi SHIP thật | ✅ DONE | Ghi PS+lines+SHIP **1 transaction duy nhất** (interactive `$transaction`) — sửa lỗi "22 traveler quên đánh shipped" ở AVP_AI. PACK và Good/Hold là **2 cổng độc lập** — đóng gói xong không có nghĩa đủ điều kiện xuất (nếu Hold sau khi đã PACK vẫn bị chặn). `isReturnForRework=true` chỉ cảnh báo, không chặn cứng. |
| [FID-ERP-011](../features/FID-ERP-011_20260919.md) | Phân quyền theo trạm (session/login đầu tiên) | ✅ DONE | Đăng nhập THEO TRẠM (không phải người dùng cá nhân) — mật khẩu chung/trạm, `checkedBy`/`operatorCode`/`confirmedBy` vẫn TEXT tự do (2 lớp độc lập). Admin = ĐÚNG BẰNG quyền Office, KHÔNG làm Xưởng. Next.js 16 đổi "Middleware"→**"Proxy"** (`webapp/proxy.ts`) — phát hiện qua cảnh báo build, không đoán trước. |
| FID-ERP-010 | (xem `FID_LIST.md`) | CHƯA VIẾT | Sticker — đang chờ Andy cần biết loại máy in trước, "note để sau" 2026-09-19 (xem Mục 4 #17). |
| [FID-ERP-012](../features/FID-ERP-012_20260917.md) | Báo cáo sản xuất Xưởng | ✅ DONE (2026-09-19) | Sản lượng tính theo TỪNG MÁY rồi cộng dồn. Công thức rework (chốt hướng ở FID-ERP-007 §8, viết chính thức vào FID-012 v1.3): so khớp TUYỆT ĐỐI `traveler_no`+`created_at` với dòng `RETURN` để nhận diện SELECT/SCRAP của lần rework — SELECT loại hẳn (không cộng), SCRAP trừ khỏi sản lượng. Viết Mục 5 SAI 1 lần lúc đầu (chỉ nói "trừ SCRAP", quên "loại SELECT") — Andy hỏi lại số cụ thể mới lộ ra, đã sửa TRƯỚC khi code. `finished_goods_awaiting_shipment` cố ý không scope theo kỳ → phát hiện đây là truy vấn global DUY NHẤT trong test suite, phải thêm `fileParallelism:false` vào `vitest.config.mts` để tránh race giữa các file test. |
| [FID-ERP-013](../features/FID-ERP-013_20260919.md) | Migration từ AVP_AI | DRAFT (cơ chế đã code+test 2026-09-19) | Đọc trực tiếp code AVP_AI thật (`route.ts` từng khâu + `BRS_TRS.md`) để lấy đúng tên cột 5 tab — không đoán. Viết xong 6 câu hỏi mở (Mục 0) cho Andy trước khi APPROVED migrate LỊCH SỬ THẬT. Andy trả lời "code" rồi làm rõ "khg cần trước mắt lày data mới làm thử" → hiểu là dựng CƠ CHẾ (5 hàm migrate + quarantine + idempotent) và test bằng dữ liệu MẪU giả lập trước, CHƯA cần quyết 6 câu hỏi/CSV thật ngay. 19 test mới PASS, Status file VẪN GIỮ DRAFT (không tự APPROVED khi chưa trả lời đủ Mục 0). |
| [FID-ERP-014](../features/FID-ERP-014_20260919.md) | Thiết kế UI — menu + trang chủ + đồng bộ 8 trang + responsive | ✅ DONE (2026-09-19) | Andy tự demo local, thấy trang chủ vẫn template Next.js mặc định + không có menu → yêu cầu tham khảo Odoo/Zoho, viết FID, trả lời hết Mục 0 qua chat (bao gồm đổi ý giữa chừng: "đồng bộ luôn 8 trang" thay vì tách 2 giai đoạn, "có cần responsive" đổi từ không→có vì quản lý xem báo cáo qua điện thoại). NavBar nhóm Nhập liệu/Báo cáo lọc theo `isStationAllowed` (không đổi phân quyền FID-011). Trang chủ: Search trọng tâm + "Việc cần làm" (gọi thẳng lib report, không API mới) + danh sách link. `tokens.ts`+`PageContainer` đồng bộ khung/màu 8 trang cũ — CHỈ đổi trình bày, không đổi logic (154 test cũ PASS y hệt). **Kiểm chứng bằng Puppeteer thật (cài tạm `--no-save`, gỡ ngay sau)** — phát hiện 1 lỗi thật qua ảnh chụp (2 ô search chồng nhau ở trang chủ) mà đọc code không thấy, sửa bằng `SearchBarSlot.tsx`. |

**Việc khác đã làm 2026-09-17**: dọn ~50 file kế thừa khung ISO_CA (xoá 6 file thừa, viết lại ~30 file docs/cl0X); chốt kiến trúc 3 máy cố định + 1 laptop admin, 2 cổng AI (Office+Admin), Xưởng không AI; viết `ODOO_COMPARISON.md` (9 khía cạnh khác Odoo chuẩn).

**Dữ liệu DEMO đã nạp vào database DEV (`avp_erp`, KHÔNG phải `avp_erp_test`) 2026-09-19** — Andy yêu cầu "lấy bộ hồ sơ của AVP làm mẫu" để test thử app local: 1 hồ sơ THẬT lấy từ `Data/4.WRAPPING/Wrapping_final.xlsm` (sheet `WORK ORDER` + `CHECKING SUMMARY`) + `Data/3.FINISHED PALLET/FINISHED PALLET REPORT_final.xlsm` (sheet `PartControl`) — **Traveler `718779`**, Part# `40073474` (150 pcs/box, Infasco), PO `194081`, Pot# `1768`, RECEIVE=5362, SELECT=4800 (máy TBL2, NV 391, ca chiều), SCRAP=1 (lý do MIXED), PACK=4800/32 thùng, Lot `6-259-07-C`, Skid# `SKID# 77`, **CHƯA Ship** (cố tình để Andy tự test nốt `/packing/new`). Đây là số THẬT, không bịa — nhưng vẫn là dữ liệu DEMO/thử nghiệm, KHÔNG phải hàng thật đang chạy qua hệ thống. Nếu dọn database dev sau này, nhớ traveler này KHÔNG xoá được thẳng (stock_moves append-only) — phải tính vào khi làm FID-ERP-013 migrate thật (loại trừ hoặc coi là 1 ca thật luôn).

**Tài liệu theo dõi tiến độ**: artifact `https://claude.ai/artifact/F6or9LJ6Ef3h17TdX1BAwq` (đã cập nhật liên tục theo tiến độ) + `docs/records/AVP_ERP Infrastructure.pdf` (Andy tự export bản tĩnh khi cần).

**SES-20260919-009 (2026-09-19, tiếp)** — Bắt đầu "Ưu tiên 3 — thử nghiệm thật": Andy dán `GEMINI_API_KEY` thật (copy từ `D:\AVP_AI\webapp\.env.local`) vào `webapp/.env`, tự thử `/capture` destination="po" với 1 PO thật (`Data/1.PO/PO PO SEP 8_193853.pdf`, 7 dòng) qua trình duyệt. Gặp lỗi `travelers_part_no_fkey` — dẫn tới phát hiện + sửa [FID-ERP-002 v1.1](../features/FID-ERP-002_20260918.md#10-thực-hiện): Part# OCR đọc (có hậu tố, vd `11549168-CA-IN-B`) phải cắt hậu tố khớp `part_control` theo mã gốc/"Finished Part Number" (Andy xác nhận bằng chứng từ thật, giải quyết luôn câu hỏi mở từ 2026-09-13 về ý nghĩa hậu tố Part#). Viết `webapp/lib/part.ts` (`stripPartSuffix`), 4 test mới, 17/17 PASS.

Andy yêu cầu tiếp: tổng hợp **TOÀN BỘ** `part_control` từ 4 nguồn thật (`BANG_MA_THAM_CHIEU_AVP_2026-09-17.xlsx`, `FINISHED PALLET REPORT_final.xlsm` 2 sheet, `Wrapping_final.xlsm`) thành 1 file tổng, không thiếu gì, có cột ghi chú cho Andy bổ sung sau. Đã tạo **`Data/PART_CONTROL_MASTER_2026-09-19.xlsx`** (sheet `PART_CONTROL_MASTER` = toàn bộ 1235 mã gốc sau khi cắt hậu tố + gộp trùng; sheet `CAN_XEM_LAI` = 190 dòng cần Andy xử lý: 160 thiếu Quantity/box, 20 thiếu Client, 11 xung đột số liệu giữa các nguồn — vd `11546366` có 2 nguồn ghi 1000 vs 1200). Đã nạp **1046 dòng đầy đủ/không xung đột** vào `part_control` (dev DB) — 164/164 test cũ vẫn PASS.

Andy hỏi thêm về ý nghĩa "Kho nguyên liệu" (RECEIVE) trong thiết kế — giải thích RECEIVE tách khỏi PO đúng chuẩn Odoo Goods Receipt (đối chiếu "Infasco khai" vs "AVP nhận thật", + là cổng khoá bắt buộc trước khi Xưởng thao tác SELECT). Andy sau đó yêu cầu thêm **nút tắt "PO + Nhận nguyên liệu luôn (bypass)"** — quản lý cho phép scan lại chính PO để chấp nhận số Pieces làm RECEIVE luôn, bỏ qua yêu cầu phiếu Traveler vật lý riêng. Đã thêm đích `"po_receive"` vào [FID-ERP-002 v1.2](../features/FID-ERP-002_20260918.md#10-thực-hiện) — dùng chung code path/quyền với `"warehouse"` (chỉ OFFICE/ADMIN), Traveler được upsert cả `poNo` lẫn `potNo`. Andy xác nhận: lấy số bằng cách OCR lại chính file PO (không lưu số dự báo từ bước "po" trước), cả OFFICE/ADMIN dùng được, không đánh dấu riêng dòng RECEIVE nào là bypass trong sổ cái. 4 test mới + 2 UI + 17 cũ = **21/21 PASS**, lint sạch, build thành công.

Andy làm rõ 1 phát biểu dễ hiểu lầm trước đó ("bỏ concession") — ý thật là: thiết kế CHUẨN ERP (RECEIVE tách khỏi PO) phải là baseline chung cho MỌI khách hàng tương lai nếu AVP_ERP dùng lại cho công ty khác, bypass `po_receive` CHỈ là ngoại lệ cộng thêm riêng cho nguyên tắc vận hành của AVP — đã ghi rõ nguyên tắc này vào FID-ERP-002 §2 WHY + lưu memory dự án (`project_multitenant_baseline`) để áp dụng cho các yêu cầu "bypass" tương tự sau này.

Andy tìm `11547369-BR-HA-T` (Part# có hậu tố, đúng như in trên nhãn) trong GlobalSearchBar không ra kết quả, dù mã gốc `11547369` đã có đủ trong `part_control` (nạp từ `PART_CONTROL_MASTER_2026-09-19.xlsx`). Phát hiện: `ILIKE contains` không khớp ngược khi chuỗi gõ (có hậu tố, dài hơn) không "nằm trong" mã gốc đã lưu (ngắn hơn) — hệ quả trực tiếp của quyết định cắt hậu tố ở FID-ERP-002 v1.1. Sửa [FID-ERP-004 v1.1](../features/FID-ERP-004_20260918.md) — `app/api/search/route.ts` tìm THÊM theo `stripPartSuffix(q)` bên cạnh chuỗi gõ nguyên văn. 1 test mới + 7 cũ = 8/8 PASS, **170/170 toàn bộ test PASS**, lint sạch, `tsc --noEmit` sạch.

Andy hỏi "PO tồn đọng" căn cứ vào đâu — giải thích công thức (PO có Traveler chưa SHIP hết), sau đó Andy chỉ ra 1 PO có thể trải trên rất nhiều Traveler nên nên theo dõi theo Traveler thay vì đếm PO. Kiểm tra DB thật: 3 PO tồn đọng nhưng tổng **36 Traveler** tồn đọng (PO `194141` riêng 28 Traveler) — đúng như Andy lo ngại, đếm PO làm nhẹ khối lượng việc thật. Andy chọn hiện CẢ 2 số. Sửa [FID-ERP-014 v1.1](../features/FID-ERP-014_20260919.md) — `app/page.tsx` cộng dồn field `outstanding` có sẵn trên mỗi PO, tile giờ hiện "3 / 36 Traveler". 170/170 test cũ không hồi quy, lint sạch, build thành công.

Andy tiếp tục "thử nghiệm thật" đi hết 1 vòng đời Traveler qua tay:
- `/lot/update` — dán email test (Claude soạn, khớp mẫu regex thật) tách đúng 7 cặp Traveler#+Lot# từ PO `193853`, ghi đúng `lot_updates` + `travelers.lotNo`. Concession (`717067`) lưu đúng 3 field `lotConcessionBy/Reason/At`.
- `/factory/select` (Xưởng) — nhập tay SELECT+SCRAP+REWORK cho `716958`/`717860`, đúng 1 transaction, giữ nguyên Lot thật đã có (không bị ghi đè placeholder).
- `/wrapping/check` (Xưởng) — Andy phát hiện lỗi thật: lưu Good/Hold được cho Traveler `717844` dù **CHƯA hề có `SELECT` nào**. Xác nhận đây là lỗ hổng, sửa [FID-ERP-005 v1.2](../features/FID-ERP-005_20260918.md#12-thực-hiện-v12-2026-09-19-cùng-phiên) — bắt buộc Traveler đã có `SELECT` trước khi cho ghi Wrapping check. 2 dòng `quality_checks` test thật đã lỡ ghi cho `717844` (append-only, không xoá được) còn lại vĩnh viễn trong DB dev, vô hại. 1 test mới + 16 cũ sửa fixture = 17/17 PASS, **171/171 toàn bộ**, lint sạch, build thành công.
- Chưa hoàn tất `/packing/new` cho traveler `718779` (demo) — phát hiện traveler này cũng THIẾU `quality_checks` (dữ liệu demo nạp thẳng SQL trước đây bỏ sót bước Good/Hold) — đã hướng dẫn Andy bù bằng `/wrapping/check` (Good, không PACK lại) trước khi lập PS, CHƯA có xác nhận đã làm xong.

Andy tiếp tục test `/wrapping/check` với PACK cho `717860` — phát hiện 2 lỗ hổng thật: (1) `boxCount=700` cho `qty=1000` (Part# `qtyPerBox=6000`) vẫn lưu được không cảnh báo (trung bình 1.4 pcs/thùng, rõ ràng gõ lộn 2 ô); (2) `shift="MONING"` (gõ nhầm) cũng không bị phát hiện. Kiểm tra `BANG_MA_THAM_CHIEU_AVP_2026-09-17.xlsx` (sheet `3_Ma_May`/`4_Ma_Nhan_Vien`) — cả 2 TỰ GHI "chưa xác nhận"/"chưa có danh sách chính thức" nên KHÔNG dùng làm rule. Andy chỉ hướng qua chứng từ thật `D:\AVP_AI\Data\4.WRAPPING\WRAPPING SUMMARY-SEP 4.jpeg` (đọc THAM KHẢO theo yêu cầu rõ, CLAUDE.md nguyên tắc #5) — xác nhận quy ước ca chỉ có `MRNNG`/`AFTRN`. Đã sửa [FID-ERP-005 v1.3](../features/FID-ERP-005_20260918.md#13-thực-hiện-v13-2026-09-19-cùng-phiên) + [FID-ERP-003 v1.2](../features/FID-ERP-003_20260918.md#11-thực-hiện-v12-2026-09-19-cùng-phiên-cảnh-báo-shift-phi-quy-ước) — thêm `webapp/lib/shift.ts` + cảnh báo boxCount/qty theo `part_control.qtyPerBox`, CẢ HAI đều KHÔNG chặn ghi (chỉ trả `warnings[]`, vì số Xưởng tự nhập tay không qua draft/OCR). 5 test mới, **176/176 PASS** toàn dự án, lint sạch, `tsc --noEmit` sạch, build thành công. Mã máy/mã nhân viên vẫn để dành chờ Owner cung cấp danh sách chính thức (Mục 4 việc đang mở, thêm mục mới).

Andy bấm "Xác nhận & Lưu" lặp lại cho `716958` ở `/wrapping/check` — mỗi lần ghi thêm 1 dòng `quality_checks` GOOD (4 dòng trùng, append-only không xoá được), không cảnh báo. Andy chọn cảnh báo (không chặn) + yêu cầu bước "Tra" verify trước cho cả Traveler và Wrapping. Đã làm [FID-ERP-005 v1.4](../features/FID-ERP-005_20260918.md) + [FID-ERP-003 v1.3](../features/FID-ERP-003_20260918.md): API cảnh báo trùng; UI `/wrapping/check` + `/factory/select` thêm nút "Tra" (tái dùng `/api/search`), `canSubmit` đòi tra đúng Traveler# đang gõ. **178/178 PASS**, lint/tsc/build sạch. CHƯA có xác nhận Andy đã thử lại UI mới trên trình duyệt. **Đã commit + push** toàn bộ thay đổi phiên SES-20260919-009 (commit `0a197ce`).

**SES-20260920-010 (đêm 2026-09-19 → 09-20)** — làm liên tục, Andy ngủ giữa chừng ("tự làm được tôi đi ngủ"):
- **FID-ERP-003 v1.4 + v1.5** (`/factory/select`): scan Traveler# (scanner) tự điền Part/Lot/Pot/Pcs-per-Carton từ DB, Total tự tính, bố cục giống tờ giấy (xám = tự có, vàng = copy từ giấy), bảng defect liệt kê sẵn 11 dòng theo tờ (thêm `OTHERS` — FID-001 v1.13), nút "Lần trước" cho máy/người, scan Part# BẮT BUỘC (double check Traveler/Part, lệch → khoá Lưu). Chọn hướng KHÔNG OCR (giữ "Xưởng không AI").
- **FID-ERP-005 v1.5** (`/wrapping/check`): tương tự + PACK mặc định bật khi còn hàng chưa đóng, "Đóng hết", bảng Reject liệt kê sẵn. Route mới `GET /api/quality/lookup`, `GET /api/factory/select/lookup`. Serial từng thùng vẫn là FID riêng (chờ 2 câu: tem 1 hay 3 barcode, máy scan).
- **FID-ERP-013 v0.2 — CHẠY THỬ TOÀN BỘ dữ liệu thật** (Andy cho phép format DB dev): xem FID-013 Mục 11 + **`docs/records/DEMO_GUIDE.md`** (kịch bản demo, số liệu, snapshot restore, giới hạn). DB dev đã format + nạp 6.550 Traveler / 16.362 stock_moves / 203 PS; quarantine 246.
- Kiểm chứng: 217/217 test · E2E HTTP 33/33 · UI Chrome bấm Lưu thật 20/20 · OCR Gemini thật 18/18 chứng từ (Part#/PO khớp 100%).
- Bài học: (1) Prisma CLI chặn `migrate reset` từ AI trừ khi đặt `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` = nguyên văn lời user; (2) mỗi lần chạy trên dữ liệu thật lộ thêm lỗi mà test mẫu không thấy (Part# có hậu tố làm oan 2.047 Traveler, `STUCK TGT` làm mất ~25% sản xuất nếu quarantine cả dòng, PACK thiếu → "chờ xuất" luôn 0, ngày xuất `now()`), và focus `setTimeout` trước khi render (UI) — vẫn phải thử thật.

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

---

### 5. GIT

Đã `init` + push từ 2026-09-18 (Andy tự làm qua PowerShell). Remote: **`https://github.com/vietsharescom/AVP_ERP.git`**, branch `main`. Quy tắc "không commit/push khi chưa xác nhận" (CLAUDE.md, global) áp dụng — mỗi lần commit/push trong phiên này đều đã hỏi Andy trước.

**Đã commit + PUSH hết** (2026-09-19, cuối phiên SES-20260919-008, Andy
xác nhận "commit push") — working tree sạch, `main` local = `main` remote.
3 commit đẩy lên đợt này (`f581367..5eb6f5f`):
- `fcfe437` — FID-ERP-012 (Báo cáo sản xuất Xưởng)
- `58ec75c` — FID-ERP-013 cơ chế migrate (CHƯA migrate dữ liệu thật, xem dưới)
- `5eb6f5f` — FID-ERP-014 (menu + trang chủ + đồng bộ 8 trang + responsive),
  file thay đổi: `docs/features/FID-ERP-014_20260919.md` (mới),
  `webapp/lib/ui/{tokens,navLinks}.ts` (mới),
  `webapp/components/{PageContainer,NavBar,NavBarClient,SearchBarSlot}.tsx`
  + `.module.css` liên quan (mới), `webapp/app/api/auth/me/route.ts` (mới),
  `webapp/app/layout.tsx` + `webapp/app/page.tsx` (viết lại),
  `webapp/components/GlobalSearchBar.tsx` (thêm prop `size`), 8 trang
  nghiệp vụ cũ (chỉ đổi khung/màu, xem FID-ERP-014 Mục 10),
  `webapp/tests/integration/auth.test.ts` (thêm 6 test).

**Đợt 2 (SES-20260919-009, Andy xác nhận "commit push")** — 1 commit đã push
(`53bd61e..0a197ce`): `0a197ce` — test thật CaptureGate/Wrapping: cắt hậu tố
Part# (`lib/part.ts`), đích `po_receive`, cảnh báo shift/boxCount/trùng lặp
(`lib/shift.ts`), bước "Tra" ở `/wrapping/check` + `/factory/select`, tìm
kiếm Part# có hậu tố, tile "PO / Traveler tồn đọng", file
`Data/PART_CONTROL_MASTER_2026-09-19.xlsx` (24 file). Commit báo cáo phiên
này (`docs: chốt báo cáo...009`) đi kèm sau — chưa push cho tới khi Andy
xác nhận.

**Việc chưa dứt điểm cần lưu ý phiên sau**: FID-ERP-013 mới xong PHẦN
CƠ CHẾ (test bằng data giả lập) — việc MIGRATE DỮ LIỆU LỊCH SỬ THẬT từ
AVP_AI VẪN CHƯA LÀM, còn nguyên 6 câu hỏi ở Mục 0 (file FID) chưa trả
lời, KHÔNG được coi FID này là "DONE" cho tới khi Andy quyết xong 6 câu
đó và chạy `run.ts` thật trên CSV export.

Có file khoá tạm của Excel (`Data/~$BANG_MA_THAM_CHIEU_AVP_2026-09-17.xlsx`,
`Data/3.FINISHED PALLET/~$FINISHED PALLET REPORT_final.xlsm` — sinh ra khi
Andy mở file trong Excel) xuất hiện trong
`git status` nhưng KHÔNG được add — không phải dữ liệu thật, Andy có thể
tự xoá (đóng Excel lại là tự mất), Claude không tự xoá.

Lịch sử commit chính phiên này (mới nhất trước):
```
0a197ce feat: Test thực CaptureGate/Wrapping — cắt hậu tố Part#, po_receive, cảnh báo, bước Tra, part_control master
5eb6f5f feat: Thiết kế UI thống nhất — menu+trang chủ+đồng bộ+responsive [FID-ERP-014]
58ec75c feat: Cơ chế migration từ AVP_AI + migration_quarantine [FID-ERP-013]
fcfe437 feat: Báo cáo sản xuất Xưởng [FID-ERP-012]
f581367 docs: chốt báo cáo kết thúc phiên SES-20260919-005
0d504bd feat: Phân quyền theo trạm — session/login đầu tiên [FID-ERP-011]
d27ec8a feat: Packing Slip + sửa FID-ERP-005 thêm PACK/Skid# [FID-ERP-009][FID-ERP-005 v1.1]
24b7ce6 feat: Rework/Return linkage (Pot#=GAYLORD) + Báo cáo đối chiếu PO [FID-ERP-007][FID-ERP-008]
70244ae docs: viết lại báo cáo phiên + kế hoạch phiên sau
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

**Ưu tiên 00 (sáng 2026-09-20) — Andy xem + quyết:** (1) đọc `docs/records/DEMO_GUIDE.md`, `npm run build` + `npx next start`, tự chạy thử kịch bản demo (Traveler `718085` → Xưởng → Wrapping → Packing Slip; PO `194141.pdf` cho Quét PO) và báo chỗ chưa ổn; (2) xác nhận commit/push (các file mới lớn: `Data/migration/*.csv`, `Data/backup/*.dump`); (3) 6 câu Mục 0 FID-013 — nay đã có số liệu thật để quyết; (4) Serial: tem 1 hay 3 barcode + loại máy scan; (5) ảnh giấy "WRAPPING SUMMARY" ở AVP_AI có cho đọc để khớp nhãn form Wrapping không; (6) loại máy in sticker (FID-010).

**Ưu tiên 0 — hoàn tất vòng đời traveler demo `718779`** (đang dở giữa phiên
009): traveler này THIẾU dòng `quality_checks` (dữ liệu demo nạp SQL bỏ sót)
→ `/wrapping/check` (Good, KHÔNG bật PACK, đăng nhập Xưởng `xuong-tam-2026`)
→ `/packing/new` (đăng nhập Office `office-tam-2026`, Tra `718779` → Duyệt PS).
Thử luôn UI "Tra" mới ở `/wrapping/check` + `/factory/select` (chưa có xác
nhận Andy đã thử trên trình duyệt). Traveler `716958`/`717860` đã SELECT +
Good, dùng được cho luồng thứ 2.

**Bài học phiên 009**: mọi lỗ hổng phát hiện trong phiên này đều do Andy
TEST THẬT trên trình duyệt bằng dữ liệu thật (không phải test tự động):
Part# có hậu tố, tìm không ra, PACK phi lý, ca gõ sai, lưu trùng. Test tự
động mock hết nên không thấy — phiên sau tiếp tục ưu tiên thử luồng thật.

**Ưu tiên 1 — quyết 6 câu hỏi FID-ERP-013 Mục 0** (khi Andy sẵn sàng
migrate dữ liệu lịch sử THẬT, không phải ngay phiên tới nếu chưa cần):
cách lấy CSV, mốc cắt (toàn bộ hay chỉ traveler chưa Shipped), xử lý
`reject` không khớp `reasonCode`, `totalPallets/Empty` mặc định 0, ưu
tiên Lot, thời điểm chạy — xem chi tiết FID-ERP-013 Mục 0.

**Ưu tiên 2 — FID-ERP-010** (In sticker) — vẫn CHỜ Andy (cần biết loại
máy in, xem Mục 4 #17) — bỏ qua nếu chưa có thông tin.

**Ưu tiên 3 — thử nghiệm thật (nếu Andy có thời gian)**:
- Dán `GEMINI_API_KEY` thật vào `webapp/.env`, thử `/capture` với file mẫu thật (`Data/2. Traveler/TRAVELER SHEETS SEP 9.pdf`) — hiện tại toàn bộ 160 test đều mock Gemini, chưa ai xác nhận OCR thật hoạt động đúng.
- ~~Đăng nhập thật qua `/login` (3 trạm) — xác nhận proxy chặn đúng route theo trạm trên trình duyệt thật~~ **ĐÃ XÁC NHẬN 2026-09-19** (kiểm chứng bằng Puppeteer lúc làm FID-ERP-014 — FACTORY/OFFICE đăng nhập thật, NavBar lọc đúng, `proxy.ts` chạy đúng qua Next.js server thật, không chỉ test logic thuần nữa).
- Chạy thử luồng đầy đủ 1 Traveler qua tay: `/capture` (RECEIVE) → `/factory/select` (SELECT, tự sinh Lot placeholder) → `/wrapping/check` (Good/Hold + PACK/Skid#) → `/lot/update` (Lot thật) → `/packing/new` (lập + duyệt Packing Slip, ghi SHIP) → search bằng ô tìm ở đầu trang — xác nhận dữ liệu liên kết đúng qua toàn bộ vòng đời 1 Traveler. **Gợi ý**: dùng luôn traveler DEMO `718779` đã nạp sẵn (xem Mục 2) — mới dừng ở PACK, đang chờ đúng bước `/packing/new` để hoàn tất demo.
- Thử luồng rework thật: `/capture` destination="po" với `potNo="GAYLORD"` → `/factory/select` lựa lại → `/reports/po-progress` xem `reworkTravelers` — xác nhận `RETURN` ghi đúng lúc lựa lại (FID-ERP-007).

**Ưu tiên 4 — việc mở ở Mục 4** — không chặn code, xử lý khi Andy có thời gian/quyết định (đặc biệt mục 1, 6, 7, 11, 12, 13, 14, 15, 16, 17 ảnh hưởng thiết kế các FID sau).

**Ưu tiên 5 — nếu Andy muốn tiếp tục việc UI để dành ở FID-ERP-014 Mục 0**:
đồng bộ style/UX sâu hơn cho 8 trang (hiện chỉ đồng bộ khung/màu, chưa
đồng bộ layout/form bên trong từng trang), làm nhẹ nhàng hơn cho di
động (hiện chỉ đảm bảo không vỡ, chưa tối ưu UX riêng), hoặc mở lại 2 ý
tưởng đã ghi để dành (scan tự nhận diện loại chứng từ, inbox lưu email
PO) nếu Andy đổi ý muốn làm.

**Khi bắt đầu phiên sau**: đọc file này (tự động) → nếu Mục 4 có gì Andy đã trả lời qua kênh khác (chat/note), cập nhật lại trước khi tiếp tục code.

---

*Session Report — viết lại đầy đủ 2026-09-18 (gộp lịch sử chi tiết theo FID vào bảng Mục 2 — chi tiết đầy đủ từng quyết định/lệch kế hoạch nằm trong Mục 10 "THỰC HIỆN" của từng file FID tương ứng, không lặp lại ở đây để tránh trôi dạt giữa 2 nơi mô tả cùng 1 việc). Kết thúc phiên SES-20260919-008 (2026-09-19): FID-ERP-012+013(cơ chế) DONE + commit local `fcfe437`/`58ec75c` (chưa push); FID-ERP-014 (UI) DONE — menu+trang chủ+đồng bộ 8 trang+responsive, 160/160 test PASS, kiểm chứng bằng ảnh chụp trình duyệt thật — CHƯA commit, chờ Andy xác nhận (xem Mục 5). Đã nạp 1 hồ sơ DEMO thật (traveler 718779) vào database dev để test UI (xem Mục 2).*
