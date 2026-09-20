# DEMO_GUIDE — bộ dữ liệu đầy đủ để Andy test + demo cho khách AVP

*Dựng ngày 2026-09-20 (đêm, Andy đã đi ngủ — Claude tự làm). Đây là dữ liệu CHẠY THỬ/DEMO, không phải migrate lịch sử thật chính thức (FID-ERP-013 vẫn DRAFT).*

## 1. Trạng thái hiện tại của database DEV (`avp_erp`)

Đã **format lại** (theo lời Andy "cần thì delete và format") rồi nạp toàn bộ dữ liệu có ở `D:\AVP_AI\Data` + `D:\AVP_ERP\Data`.

| Bảng | Số dòng | Ghi chú |
|---|---|---|
| `part_control` | 1.077 | từ `PART_CONTROL_MASTER_2026-09-19.xlsx` + 2 Part# suy qty/thùng từ dữ liệu thật |
| `travelers` | 6.550 | gộp 4 file WORK ORDER (Feb–Sep 2026) + Traveler chỉ có ở Wrapping/Finished Pallet/Shipping Archive |
| `stock_moves` | 16.362 | RECEIVE 2.911 · SELECT 3.791 · PACK 3.790 · SCRAP 1.086 · SHIP 4.784 |
| `packing_slips` / `packing_slip_lines` | 203 / 4.784 | PS 29570 → 30122 |
| `lots` | 4.498 | Lot IN HOA, Skid chuẩn `SKID# <số>` |
| `migration_quarantine` | 246 | dòng bị giữ lại kèm lý do (xem Mục 5) — KHÔNG mất im lặng |

Khoảng thời gian: sản xuất/đóng thùng chủ yếu **Jun → 16/09/2026** (daily rõ nhất từ 21/08). Đối chiếu số liệu đã kiểm: mọi chênh lệch CSV↔DB **bằng đúng tổng các dòng quarantine** (RECEIVE 1.107.468, SELECT/PACK 1.048.618, SHIP 1.704.132).

**Snapshot để khôi phục sạch trước mỗi buổi demo** (2 file `.dump` nằm trong git để đồng bộ Desktop ↔ Laptop; mất thì dựng lại bằng `xlsx_to_csv.py` + `run.ts`, xem FID-ERP-013 Mục 11. Dump là nhị phân, KHÔNG dùng để xem khác biệt; dựng lại snapshot mới thì commit đè và chấp nhận thêm ~400 KB vào lịch sử) (sau khi demo, mọi thứ ghi thêm là append-only, không xoá được — chỉ restore):
- `Data/backup/avp_erp_full_loaded_20260920.dump` — bộ dữ liệu đầy đủ, sạch (dùng file này).
- `Data/backup/avp_erp_dev_backup_20260920.dump` — DB dev CŨ trước khi format (37 Traveler test/demo của Andy).

```powershell
# dừng server web trước, rồi (trong PowerShell):
$url = ((Select-String -Path D:\AVP_ERP\webapp\.env -Pattern '^DATABASE_URL=').Line -replace '^DATABASE_URL=','' -replace '"','' -replace '\?.*$','')
& "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe" --clean --if-exists --no-owner -d $url D:\AVP_ERP\Data\backup\avp_erp_full_loaded_20260920.dump
```
(đã thử restore thật: số dòng khớp, trigger append-only còn nguyên.)

## 2. Chạy ứng dụng

```powershell
cd D:\AVP_ERP\webapp
npm run build        # bắt buộc sau khi có code mới (2 trang Xưởng đã đổi hôm 19–20/09)
npx next start -p 3001
```
Mật khẩu 3 trạm (Office / Xưởng / Admin) nằm ở `webapp/.env` (`STATION_*_PASSWORD`). Server cũ trên `localhost:3001` (nếu còn chạy) phải tắt + build lại mới thấy giao diện mới.

## 3. Kịch bản demo ~10 phút (đã thử bằng Chrome thật + API, không lỗi)

| # | Trạm | Việc | Dữ liệu dùng |
|---|---|---|---|
| 1 | Office | Trang chủ: ô tìm kiếm to + "Việc cần làm" (170 PO tồn đọng / 1.228 Traveler…). Gõ `718779` (hoặc Part# `40073474`, PO `194081`, Lot `6-259-07`, PS `30120`) → **bấm kết quả**: Traveler mở trang chi tiết (lịch sử RECEIVE→SELECT→PACK→SHIP…), PS mở danh sách dòng, Part# mở danh sách Traveler; ở trang có ô Traveler# (Xưởng/Wrapping/Packing) bấm sẽ tự điền + Tra | Traveler `718779` = ca thật đã dùng demo trước (Part 40073474, PO 194081, Skid 77) |
| 2 | Office | **Quét/Nhập PO+Kho** → chọn "PO + Nhận nguyên liệu luôn" → tải `Data/1.PO/194141.pdf` → Gemini đọc **28 Traveler mới** (chưa có trong DB, mọi Part# đã có trong `part_control`) → xem bản nháp → Xác nhận | Đây là bước AI duy nhất, người xác nhận mới ghi |
| 3 | Xưởng | **Trạm Xưởng** (`/factory/select`): scan/gõ Traveler `718085` + Enter → form tự điền Part 11546367, Pot, PO 194081, Pcs/Carton **700** → scan Part# `11546367` → gõ số thùng (vd 20 → Total 14.000 tự tính), máy/người/ca → Lưu | Traveler chỉ-đăng-ký (tháng 9): `718079`–`718086` (Part 11546367, PO 194081) |
| 4 | Xưởng | **Wrapping** (`/wrapping/check`): Traveler `718085` + scan Part# → bấm "Đóng hết: 20 thùng · 14000" → Skid# → Good → Lưu | (Traveler vừa SELECT ở bước 3) |
| 5 | Office | **Packing Slip** (`/packing/new`): Tra `718085` → đủ điều kiện xuất (nếu Lot còn placeholder: dùng **Cập nhật Lot** ở `/lot/update` hoặc Concession) → Duyệt PS mới (vd `30123`) → ghi SHIP trong 1 transaction | — |
| 6 | Office/Admin | **Báo cáo PO** + **Báo cáo sản xuất** (chọn 21/08 → 16/09, nhóm theo ngày: sản lượng từng máy BF/MC/TBL, lỗi theo lý do…) | — |
| 7 | Xưởng (tuỳ chọn) | Hold + Concession: chọn Traveler khác đã lựa, Wrapping → Hold + lý do → Office sẽ thấy "chưa đủ điều kiện" | — |
| 8 | Xưởng (tuỳ chọn) | Rework: `716494` (Pot GAYLORD, đã có cờ Rework) | — |

Traveler đã có vòng đời đầy đủ (RECEIVE→SELECT→PACK→SCRAP→SHIP) để **tra cứu/khoe lịch sử**: `716495`, `716490`, `716493` (Part NU1136-01, PO 193984). Traveler đã PACK + có Lot thật, chưa xuất (thử lập PS ngay): `718780`, `718778`, `718779`, `717880`, `718777`.

⚠️ Sau khi demo bước 3–5, restore lại snapshot (Mục 1) nếu muốn demo lại từ đầu.

## 4. Kiểm chứng đã làm đêm 2026-09-20 (kết quả thật)

| Việc | Kết quả |
|---|---|
| `npm test` (vitest, DB test riêng) | **229/229 PASS**, lint + `tsc --noEmit` sạch, build thành công |
| E2E qua HTTP thật, 3 trạm, cookie phiên (DB test) | **33/33 PASS**: vòng đời đủ 1 Traveler; Hold chặn PS / Concession gỡ; Rework (RETURN); phân quyền (Xưởng ↔ Office/Admin 403); chưa đăng nhập bị chặn; UPDATE/DELETE sổ cái bị trigger chặn |
| UI Chrome thật, bấm Lưu thật (DB test) | **20/20 PASS**: `/factory/select` + `/wrapping/check` (scan Traveler+Part, Total tự tính, nút "Lần trước", "Đóng hết", PACK khoá khi đã đóng hết, Part# sai khoá nút Lưu) |
| Smoke 9 trang + 12 API đọc trên dữ liệu đầy đủ | tất cả 200, phần lớn < 30 ms, trang chủ ~200 ms |
| **OCR Gemini thật trên 18 chứng từ** (12 PO + 6 Traveler) | 18/18 gọi thành công; các Traveler đã có trong DB: **Part# và PO khớp 100%**; Pot lệch duy nhất do dữ liệu cũ mất số 0 đầu (`099`↔`99`, xem Mục 5) |

## 5. Giới hạn đã biết của bộ dữ liệu này (nói thật với khách nếu bị hỏi)

1. **Không phải migrate chính thức**: nguồn là các file Excel cũ, không phải export Google Sheets sống; FID-ERP-013 vẫn DRAFT, 6 câu hỏi Mục 0 chưa được Andy trả lời (tôi dùng mặc định hợp lý, ghi ở `Data/migration/BUILD_REPORT.md`).
2. **RECEIVE (nhận kho) là SUY ra** từ `PIECES` của WORK ORDER, chỉ cho Traveler đã có bằng chứng xử lý/xuất — AVP_AI (Excel) không có sổ nhận kho riêng.
3. **Ngày xuất hàng ước tính** cho ~3.100 dòng (chỉ có số PS, không có ngày): nội/ngoại suy theo số PS, không sớm hơn ngày đóng thùng, ghi giờ 18:00. Số PS/số lượng xuất của 3.231 Traveler suy từ cờ `Shipped` + số PS trong WORK ORDER (qty = tổng SELECT hoặc PIECES).
4. **1.687 dòng WorkStationArchive** (Finished Pallet) không có cột Ca → ghi `shift=UNKNOWN` (không đoán ca theo giờ — dữ liệu thật cho thấy giờ ghi không quyết định ca).
5. **Không có Good/Hold lịch sử** (`quality_checks` = 0): file nguồn không có trạng thái này. Traveler đã PACK cần qua `/wrapping/check` (Good) trước khi lập PS mới.
6. **Không nạp**: Serial từng thùng (chưa có bảng `carton_serials` — chờ Andy trả lời tem/máy scan), Partial Boxes (chưa có FID).
7. **Quarantine 246 dòng**: 88 Traveler có Part# chưa có `qty/thùng` trong `part_control`, 9 Traveler thiếu ngày, 11 dòng xuất có số lượng lỗi (`#N/A`, 0), 138 dòng phụ thuộc các Traveler trên. Danh sách trong bảng `migration_quarantine`.
8. **Pot mất số 0 đầu** ở dữ liệu Excel cũ (`099` → `99`) — không khôi phục được.
9. `/reports/po-progress` hiển thị **cả 170 PO trên 1 trang** (chưa có phân trang) — chạy được, hơi dài.
10. Báo cáo sản xuất nhóm theo ngày **UTC**: giờ ghi tối muộn theo giờ địa phương có thể rơi sang ngày UTC kế tiếp (thiết kế FID-ERP-012, chưa đổi).
11. Trong 12 PO đem OCR: 16 dòng của 3 file PO có Traveler chưa có trong DB (bị quarantine hoặc thiếu ở file nguồn) + toàn bộ 28 dòng PO `194141` (chưa có trong file nguồn nào — chính là lý do dùng làm demo Quét PO mới).
