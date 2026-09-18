# FID_LIST.md — Master Feature Intent Document Index (AVP_ERP)
# Kế hoạch làm việc — greenfield, Postgres + TypeScript
# Ngày lập: 2026-09-17 | Trạng thái: FID-ERP-001 DONE, FID-ERP-002 DRAFT, 11 FID còn lại CHƯA VIẾT/CHƯA CODE

---

## ⚠ Định dạng FID dùng cho AVP_ERP — KHÔNG dùng `FID_TEMPLATE.md` nguyên bản

`docs/features/FID_TEMPLATE.md` (khung ISO_CA gốc) dùng field `LAYER:
L0_INPUT...L10_OBSERVABILITY` — không áp dụng (AVP_ERP không phải agent
pipeline Python, xem `docs/cl08_operation/SOFTWARE_ARCHITECTURE.md` Mục
0). Mỗi FID của AVP_ERP dùng đúng 9 mục đã kiểm chứng ở AVP_AI thay cho
mục "LAYER":

```
1. INTENT — 1 câu
2. WHY — lý do nghiệp vụ
3. MODULE — thay "LAYER": Primary file(s) / Affected / NOT
4. CONTRACT — input/output JSON
5. RULES
6. EXAMPLE
7. TEST CRITERIA
8. NOT IN SCOPE
9. FILES — dự kiến thay đổi
```

---

## NGUYÊN TẮC LẬP KẾ HOẠCH

- **Không copy nghiệp vụ mù quáng** — mỗi FID dưới đây tham khảo đúng FID
  tương ứng đã DUYỆT/CHẠY THẬT ở AVP_AI (link kèm theo), nhưng phải viết
  lại CONTRACT theo bảng Postgres thật (không phải field tên cột Sheet).
- **FID-ERP-001 (schema) làm TRƯỚC TIÊN** — mọi FID khác phụ thuộc bảng
  đã có.
- Một số FID ở AVP_AI KHÔNG cần làm lại ở đây vì đã tự động có nhờ đổi
  sang Postgres (vd transaction thật thay route riêng lẻ) — ghi rõ trong
  cột "Ghi chú" khi có.

## THỨ TỰ ĐỀ XUẤT (phụ thuộc lẫn nhau)

| # | FID | Tên | Trạm | Tương ứng AVP_AI | Trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| 1 | [FID-ERP-001](FID-ERP-001_20260917.md) | Schema Postgres nền tảng | Máy 1 (Server) | — (mới, thay 5 Sheet) | **✅ DONE — v1.4, 15/15 test PASS** | `webapp/` đã scaffold (Next.js+Prisma 7). 8 bảng + VIEW + trigger append-only. Xem `FID-ERP-001` Mục 10 |
| 2 | [FID-ERP-002](FID-ERP-002_20260918.md) | CaptureGate tương đương — PO + Kho nguyên liệu | Máy 2 (Office) **+ Máy 4 (admin)** | `CaptureGate.tsx`+`TravelerSection.tsx` (có sẵn, không phải FID) | **DRAFT — xem file riêng** | 1 cổng quét, 2 đích đến (PO tham khảo / Kho nguyên liệu). "PO" chỉ đăng ký Traveler (KHÔNG ghi stock_moves); "Kho nguyên liệu" ghi RECEIVE thật |
| 3 | FID-ERP-003 | Trạm nhập liệu Xưởng — WorkStationArchive tương đương | Máy 3 (Xưởng) | [FID-001](../../../AVP_AI/docs/features/FID-001_ingest-workstation-archive.md) | **CHƯA VIẾT** | Nhập tay tại chỗ — **KHÔNG có quyền add file/đọc file** (chỉ Office + Máy admin được add file, xem `SOFTWARE_ARCHITECTURE.md` §2.1). **PHẢI ghi `machine_code` (kể cả lựa tay, không NULL) + `operator_code` + `shift`** (đã xác minh có thật trong `Data/4.WRAPPING/Wrapping_final.xlsm` CHECKING SUMMARY: cột `Machine`/`MC#`/`Oprtr`/`SHIFT`) — bắt buộc cho FID-ERP-012, xem `SOFTWARE_ARCHITECTURE.md` §3 |
| 4 | FID-ERP-004 | GlobalSearchBar tương đương | Cả 3 điểm truy cập (**search đối xứng, giống hệt nhau**) | `GlobalSearchBar.tsx` (có sẵn, không phải FID) | **CHƯA VIẾT** | Tra Postgres bằng `ILIKE`/full-text search thay vì loop JS trên toàn bộ Sheet — nhanh hơn hẳn |
| 5 | FID-ERP-005 | Status Good/Hold (Wrapping) | Máy 3 (Xưởng) | [FID-002](../../../AVP_AI/docs/features/FID-002_skid-status-good-hold.md) | **CHƯA VIẾT** | |
| 6 | FID-ERP-006 | Lot placeholder + parse email Lot thật | Máy 2 (Office) | [FID-003](../../../AVP_AI/docs/features/FID-003_lot-update-and-concession.md) | **CHƯA VIẾT** | Regex bắt cặp — giữ nguyên logic đã kiểm chứng, không AI |
| 7 | FID-ERP-007 | Rework/Return linkage (Pot#=GAYLORD) | Máy 2 (Office) | [FID-004](../../../AVP_AI/docs/features/FID-004_rework-return-linkage.md) | **CHƯA VIẾT** | Rule-based, ĐỠ phải "best-effort" tìm PS gốc nhờ `stock_moves` liên kết thật bằng khoá ngoại |
| 8 | FID-ERP-008 | Báo cáo đối chiếu PO | Máy 2 (Office) | [FID-005](../../../AVP_AI/docs/features/FID-005_po-reconciliation-report.md) | **CHƯA VIẾT** | SQL `GROUP BY` thật thay vì đọc toàn Sheet rồi group trong code |
| 9 | FID-ERP-009 | Packing List / Packing Slip + Total Pallets/Empty | Máy 2 (Office) | [FID-007](../../../AVP_AI/docs/features/FID-007_packing-slip-pallet-empty.md) | **CHƯA VIẾT** | Transaction thật khi duyệt PS — sửa đúng lỗi "22 traveler quên đánh shipped" đã gặp ở AVP_AI |
| 10 | FID-ERP-010 | In sticker (PrintOut redesign) | Máy 3 (Xưởng) | — (MỚI, AVP_AI chưa làm — xem `THIET_KE_HE_THONG_MOI.md` Phần 15 mục (a)) | **CHƯA VIẾT** | Cần biết loại máy in trước (xem `FACILITIES_SETUP.md`) |
| 11 | FID-ERP-011 | Phân quyền theo trạm/người dùng | Cả 4 điểm truy cập | — (MỚI, AVP_AI không có khái niệm nhiều trạm vật lý) | **CHƯA VIẾT** | Phân quyền THEO TÍNH NĂNG đã chốt (sửa 2026-09-17): search đối xứng cả 3 điểm; add file/đọc file ở Office VÀ Máy 4 (admin), KHÔNG có ở Xưởng; Máy 4 = FULL quyền (superset Office), không phải view-only như bản nháp trước — `SOFTWARE_ARCHITECTURE.md` §2.1. Còn mở: đăng nhập theo trạm hay theo người dùng cụ thể (`SOFTWARE_ARCHITECTURE.md` §2.3) |
| 12 | [FID-ERP-012](FID-ERP-012_20260917.md) | Báo cáo sản xuất Xưởng (dashboard) | Xưởng + Office + **Máy 4 (admin)** | — (MỚI, AVP_AI chưa có report dạng biểu đồ tổng hợp) | **DRAFT — xem file riêng** | Đối chiếu chuẩn Odoo Manufacturing Analysis + `stock.scrap` — tham khảo `D:\Ops_Ai` (đọc THAM KHẢO, không sửa). Phụ thuộc `stock_moves.move_type` đủ giá trị (đã bổ sung `SOFTWARE_ARCHITECTURE.md` §3) |
| 13 | FID-ERP-013 | Migration dữ liệu lịch sử từ AVP_AI | Máy 1 (Server, chạy 1 lần) | — (MỚI — phát hiện thiếu khi phản biện `docs/records/Consultations/260917-Pilot_Infra.md`) | **CHƯA VIẾT — để dành, chưa cần viết ngay** | 1 lần duy nhất, SAU khi schema ổn định + đã chạy thử thật (xem `SOFTWARE_ARCHITECTURE.md` §4 bước 6). Nguồn: 5 Google Sheets AVP_AI (`RawMaterial`, `Warehouse`, `FinishGood`, `PartControl`, `PackingList`) + `Data/` mẫu. KHÔNG đồng bộ 2 chiều liên tục. **Pattern bắt buộc** (chốt sau phản biện GPT+Grok, xem `Consultations/260917_Architechture/FINAL_DECISION.md`): scan lỗi trước → bảng `migration_quarantine` (row lỗi giữ nguyên `source_sheet`+`source_row`+`raw_data`+lý do) → Owner review từng dòng lỗi → reconciliation report (đối chiếu count/tổng qty Sheets cũ vs Postgres mới) → Owner ký xác nhận mới tắt AVP_AI. TUYỆT ĐỐI không để dòng bị bỏ qua mà không có ghi chú lý do |

*FID-006 (Unbuild/Tháo rã) của AVP_AI — vẫn BLOCKED, chưa đưa vào kế
hoạch AVP_ERP vì cùng lý do: chưa xác nhận có xảy ra thật.*

*Backup & Recovery — KHÔNG làm FID riêng (đã xác nhận 2026-09-17): đây là
quyết định hạ tầng/vận hành (tần suất, thiết bị), không phải tính năng
code — xem `docs/cl06_planning/RISK_REGISTER.md` R-D01/R-P02 và
`FACILITIES_SETUP.md` §5 checklist.*

## CÂU HỎI CHẶN TRƯỚC KHI VIẾT FID-ERP-001

1. ~~ORM/query nào~~ — **✅ ĐÃ CHỐT 2026-09-17: Prisma** (migration tự sinh,
   `schema.prisma` dễ đọc lại, phù hợp dự án 1 dev + AI).
2. `PROJECT_INFO_FORM.md` Andy chưa duyệt — nên duyệt trước hoặc song
   song với viết FID-ERP-001 (không bắt buộc chặn nhau).

**Không còn điểm chặn cứng nào khác** — FID-ERP-001 đã viết ở
[FID-ERP-001_20260917.md](FID-ERP-001_20260917.md), Status: DRAFT, chờ
Andy đọc + đổi Status = APPROVED trước khi bắt đầu code thật (đúng quy
trình CLAUDE.md).

## LỘ TRÌNH LÀM VIỆC ĐỀ XUẤT

```
Tuần 1:  FID-ERP-001 (schema) → dựng server thử nghiệm trên LAN
Tuần 2:  FID-ERP-002 + FID-ERP-003 (2 cổng nhập liệu chính, song song)
Tuần 3:  FID-ERP-004 (search) + FID-ERP-005 + FID-ERP-006 (đều phụ thuộc có data thật)
Tuần 4:  FID-ERP-007 + FID-ERP-008 (đọc dữ liệu, không rủi ro ghi sai)
Tuần 5:  FID-ERP-009 (Packing Slip — quan trọng nhất, cần kỹ)
Tuần 6:  FID-ERP-010 (sticker) + FID-ERP-011 (phân quyền)
Tuần 7:  FID-ERP-012 (báo cáo sản xuất Xưởng — đọc dữ liệu, làm sau khi có
         đủ stock_moves thật từ các FID trên để test số liệu đúng)
Sau đó:  FID-ERP-013 (migration 1 lần từ AVP_AI) → chạy thử song song
         AVP_AI 1 thời gian trước khi cắt hẳn
         (SOFTWARE_ARCHITECTURE.md Mục 4, bước 5-6)
```

*Thời gian ước lượng thô, chưa tính vào budget/timeline thật (còn
`[TO BE CONFIRMED]` trong `PROJECT_INFO_FORM.md`) — điều chỉnh khi có
số liệu thật.*

---
*FID_LIST v0.1 — AVP_ERP | Lập: 2026-09-17 | Chưa FID nào chuyển DRAFT*
