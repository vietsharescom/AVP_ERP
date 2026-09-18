# CHANGELOG -- AVP_ERP
# Bat dau: 2026-09-17

## [Unreleased]

### Added
- feat: schema Postgres nền tảng [FID-ERP-001] — scaffold `webapp/` (Next.js
  16 + TypeScript + Prisma 7), 8 bảng (`travelers`, `stock_moves`, `lots`,
  `defect_types`, `part_control`, `packing_slips`+`lines`, `print_log`) +
  1 VIEW (`traveler_last_select_status`), 3 CHECK constraint trên
  `stock_moves` + 1 trên `packing_slip_lines`, trigger append-only
  (`stock_moves` bất biến ở tầng database), seed 10 `defect_types` thật.
  15/15 test PASS (`webapp/tests/db/fid-erp-001.test.ts`), lint sạch,
  build thành công. Database `avp_erp` (dev) + `avp_erp_test` (test riêng)
  chạy trên PostgreSQL 18 local.
- feat: CaptureGate tương đương — cổng quét/nhập PO + Kho nguyên liệu
  [FID-ERP-002] — `webapp/app/capture/page.tsx` (UI chọn đích đến + xem
  draft OCR trước khi lưu), `webapp/app/api/capture/extract/route.ts`
  (Gemini OCR qua `webapp/lib/ocr/gemini.ts`, CHỈ đọc, KHÔNG BAO GIỜ ghi
  DB), `webapp/app/api/capture/confirm/route.ts` (ghi Postgres sau khi
  người xác nhận — CCP-1). Đích `"po"` chỉ upsert `travelers.poNo` (KHÔNG
  ghi `stock_moves` — nguyên liệu chưa về thật); đích `"warehouse"` upsert
  `travelers` + ghi 1 dòng `stock_moves` loại `RECEIVE` trong 1 transaction
  (ghi đủ hoặc không ghi gì). Chặn `sourceStation="FACTORY"` (Xưởng không
  có cổng này) và `qty<=0` ở tầng API trước khi chạm DB. Trùng lặp (Traveler
  đã có RECEIVE trước đó) → cảnh báo qua `skippedDuplicates`, vẫn cho ghi
  thêm nếu người xác nhận muốn (không tự động chặn cứng — đúng nghiệp vụ
  thật hàng về nhiều đợt). OCR không chắc → field đó `null` +
  `lowConfidenceFields`, không tự đoán. 28/28 test PASS (gồm 15 test
  FID-ERP-001 không hồi quy + 13 test mới `webapp/tests/integration/capture.test.ts`,
  Gemini OCR được mock vì chưa có `GEMINI_API_KEY` thật), lint sạch, build
  thành công. Excel (.xlsx/.xlsm) CHƯA hỗ trợ ở FID này (chặn 400, để dành
  FID sau — Gemini vision chỉ nhận ảnh/PDF).

### Changed
- schema: `stock_moves.move_type` thêm giá trị `REWORK` + thêm cột
  `stock_moves.note` (TEXT, nullable) [FID-ERP-001 v1.5] — phát sinh khi
  viết FID-ERP-003: hàng lỗi TRONG lúc lựa nhưng CÒN DÙNG ĐƯỢC (tạm giữ
  chờ xử lý lại), khác `SCRAP` (loại bỏ hẳn) và khác `RETURN`/FID-ERP-007
  (Traveler ĐÃ XUẤT bị trả lại toàn bộ). Migration
  `20260918015252_add_rework_movetype_and_note` áp dụng cho cả `avp_erp`
  (dev) và `avp_erp_test` (test — phải baseline bằng `prisma migrate
  resolve --applied` trước vì db test chưa có lịch sử migration). 28/28
  test cũ vẫn PASS, build thành công.

### Added
- feat: Trạm nhập liệu Xưởng — máy lựa + defect + rework [FID-ERP-003] —
  `webapp/app/factory/select/page.tsx` (UI nhập tay, không qua AI/OCR),
  `webapp/app/api/factory/select/confirm/route.ts` (ghi 1 `SELECT` + 0..n
  `SCRAP` theo từng loại defect + 0..1 `REWORK` trong 1 transaction),
  `webapp/app/api/factory/defect-types/route.ts` (GET 10 defect_types cho
  dropdown). `sourceStation` cố định `"FACTORY"` ở server, không nhận từ
  client. Traveler phải đã tồn tại (từ RECEIVE ở FID-ERP-002) — route
  không tự tạo Traveler mới. `machineCode`/`operatorCode`/`shift` chuẩn
  hoá TRIM+UPPER trước khi ghi, áp dụng cho cả 3 loại move. Response trả
  `totalDefectQty` tự tính. 9 test mới
  (`webapp/tests/integration/factory-select.test.ts`) + 28 test cũ không
  hồi quy = **37/37 PASS**, lint sạch, build thành công. Partial Qty
  KHÔNG cần ghi mới ở FID này — suy ra được từ so sánh `SUM(SELECT/PACK)`
  theo `lot_no`, để dành báo cáo riêng sau (xem FID-ERP-003 §8).
