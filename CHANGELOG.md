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
- feat: GlobalSearchBar tương đương — tra cứu Postgres đối xứng cả 3
  điểm truy cập [FID-ERP-004] — `webapp/app/api/search/route.ts` (GET,
  `ILIKE` trên `travelers`/`packing_slips`/`part_control`, mỗi nhóm tối
  đa 8 kết quả), `webapp/components/GlobalSearchBar.tsx` (client
  component, debounce 300ms, gắn vào `webapp/app/layout.tsx` — hiện ở
  MỌI trang, không phân quyền theo trạm). `shipped`/`lastMoveType`/
  `lastMoveAt` suy ra từ `stock_moves` cho tối đa 8 Traveler đã lọc,
  không cache riêng. Query rỗng → trả 3 mảng rỗng ngay, không chạm DB.
  7 test mới (`webapp/tests/integration/search.test.ts`) + 37 test cũ
  không hồi quy = **44/44 PASS**, lint sạch, build thành công.

### Changed
- schema: thêm bảng `quality_checks` (append-only, trigger riêng
  `prevent_quality_checks_mutation`) + enum `QualityStatus` (`GOOD`/
  `HOLD`) + VIEW `traveler_last_quality_check` [FID-ERP-001 v1.6] — cổng
  QC/workflow khâu Wrapping (Good/Hold/Concession), phát sinh khi viết
  FID-ERP-005. Concession là 1 dòng MỚI (concessionBy/Reason/At), KHÔNG
  UPDATE dòng cũ — đúng append-only, khác AVP_AI. Migration
  `20260918023102_add_quality_checks` áp dụng cho cả `avp_erp` (dev) và
  `avp_erp_test` (test). 44/44 test cũ vẫn PASS, build thành công.

### Added
- feat: Status Good/Hold (khâu Wrapping) + Reject [FID-ERP-005] —
  `webapp/app/api/quality/check/route.ts` (POST, ghi 0..n `SCRAP`
  (reject phát hiện thêm ở Wrapping — dữ liệu thật đối chiếu
  `Wrapping_final.xlsm` cột `Reject`, KHÔNG phải trạng thái thứ 4, đối
  chiếu Odoo `stock.scrap` vs `quality.check` là 2 model tách riêng) +
  1 `quality_checks` (Good/Hold, Concession đè lên Hold) trong 1
  transaction), `webapp/app/wrapping/check/page.tsx` (UI). `status=HOLD`
  bắt buộc `note`; `concession` chỉ hợp lệ khi `HOLD`, cần `by`+`reason`.
  Không tự mở rộng `defect_types` dù vài tên lỗi thật ở Wrapping
  (`DAMAGED FLANGE`, `DAMAGED LOCKING`) chưa khớp 10 giá trị hiện có —
  để dành, cần Andy xác nhận riêng. 11 test mới
  (`webapp/tests/integration/quality-check.test.ts`) + 44 test cũ không
  hồi quy = **55/55 PASS**, lint sạch, build thành công.

### Changed
- schema: thêm bảng `lot_updates` (append-only, trigger riêng
  `prevent_lot_updates_mutation`) + 3 cột `lotConcessionBy`/
  `lotConcessionReason`/`lotConcessionAt` trên `travelers` (mutable,
  giống `poNo`/`potNo`) [FID-ERP-001 v1.7] — phát sinh khi viết
  FID-ERP-006. Andy xác nhận "không sửa đè, ghi audit trail đầy đủ" khi
  đổi Lot — khác AVP_AI (chỉ ghi đè `lotUpdatedBy/At`, mất `oldLotNo`).
  Migration `20260918025603_add_lot_updates_and_concession` áp dụng cho
  cả `avp_erp` (dev) và `avp_erp_test` (test). 55/55 test cũ vẫn PASS.

### Added
- feat: Lot placeholder + parse email Lot thật [FID-ERP-006] —
  `webapp/lib/lot.ts` (`isLotPlaceholder`, `generateLotPlaceholder`,
  `parseLotEmail` — regex bắt CẶP Traveler#+Lot#, KHÔNG AI, đúng nguyên
  tắc "1 điểm AI duy nhất" cả dự án), `webapp/app/api/lot/parse-email/route.ts`
  (chỉ đọc), `webapp/app/api/lot/update/route.ts` (ghi 1 dòng
  `lot_updates` + đổi `travelers.lotNo` trong 1 transaction),
  `webapp/app/api/lot/concession/route.ts`, `webapp/app/lot/update/page.tsx`.
  Sửa `webapp/app/api/factory/select/confirm/route.ts` (FID-ERP-003) —
  tự sinh Lot placeholder (`LOT-{travelerNo}-{YYMMDD}`) lần lựa ĐẦU TIÊN
  của 1 Traveler, ghi kèm `lot_updates` (oldLotNo=null, updatedBy=
  "SYSTEM"). 14 test mới (`webapp/tests/integration/lot.test.ts`) + 55
  test cũ không hồi quy = **69/69 PASS**, lint sạch, build thành công.
