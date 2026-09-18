# ODOO_COMPARISON.md — Đối chiếu chuẩn ERP (Odoo) vs AVP_ERP đang làm
# ISO/IEC 42001:2023 Clause 8 — tài liệu tham chiếu kiến trúc
# Viết: 2026-09-18 | Trạng thái: ACTIVE

---

## MỤC ĐÍCH

Ghi lại rõ ràng: AVP_ERP **cố tình khác** chuẩn ERP đầy đủ (Odoo) ở những
điểm nào, và **vì sao** — để không ai (kể cả AI sau này) nhầm những chỗ
khác biệt này là thiếu sót cần "sửa cho giống Odoo hơn". Mỗi điểm khác
đều có bằng chứng dữ liệu thật hoặc quyết định đã ghi lại, không phải suy
đoán.

---

## 1. BỐI CẢNH — đây không phải ý tưởng mới

Chủ đề này đã được Andy bàn trước ở **AVP_AI**
(`D:\AVP_AI\THIET_KE_HE_THONG_MOI.md` Phần 15.2, 2026-09-16), trích
nguyên văn mô tả của Andy lúc đó: *"tất cả tập trung về kho, chỉ khác cột
location/trạng thái, xuất data đều từ 1 bảng cái"* — đúng mô tả kiến trúc
`stock.move` của Odoo.

Quyết định ghi lại ở AVP_AI lúc đó: mô hình "1 sổ cái duy nhất" này
**không áp vào AVP_AI** (rủi ro cao cho hệ thống đang chạy thật, giao
hàng thật cho Infasco hàng ngày) mà **để dành cho 1 dự án MỚI hoàn toàn
riêng**. Dự án đó chính là **AVP_ERP**. Nói cách khác: `stock_moves`
trong AVP_ERP là bản hiện thực hoá đúng ý tưởng đã thống nhất từ trước,
không phải thiết kế mới phát sinh giữa chừng.

---

## 2. BẢNG ĐỐI CHIẾU

| Khía cạnh | Odoo chuẩn | AVP_ERP hiện tại | Vì sao khác |
|---|---|---|---|
| **Sổ cái kho** | `stock.move` — có `location_id`+`location_dest_id` (2 cột riêng) + `state` (draft/waiting/confirmed/done/cancel) | `stock_moves` — chỉ `move_type` (1 cột enum: RECEIVE/SELECT/PACK/SHIP/SCRAP/RETURN), KHÔNG có location riêng, KHÔNG có state | Dữ liệu thật xác nhận AVP chỉ 1 địa điểm vật lý (xem Mục 3) — gộp location vào move_type đủ dùng |
| **Tồn kho hiện tại** | `stock.quant` — bảng riêng, cache tồn theo (product, location, lot) | Không có bảng riêng — tính trực tiếp từ `SUM(stock_moves)` mỗi lần cần | Tránh 2 nguồn sự thật (bài học sinh ra AVP_ERP — cache lệch = lỗi cũ AVP_AI, "22 traveler quên đánh shipped=TRUE") |
| **Trạng thái bản ghi** | `draft` → `done` — bản ghi tồn tại ở DB ngay cả khi còn nháp | KHÔNG có draft trong DB — OCR đọc xong chỉ hiện màn hình, CHỈ ghi khi người bấm "Xác nhận" (CCP-1, FID-ERP-002) | `AI_POLICY.md` — AI không tự lưu, chặt hơn Odoo (Odoo vẫn lưu draft, chỉ chưa "done") |
| **Bất biến (immutable)** | Ràng buộc ở business logic (module Python), không phải DB-level cứng | **Trigger Postgres chặn UPDATE/DELETE** trên `stock_moves` — cứng ở tầng database | Cố tình chặt hơn Odoo — đúng bài học AVP_AI (đường tắt bỏ qua route chuẩn); quyết định sau phản biện GPT vòng 2, xem `FID-ERP-001` v1.4 |
| **Sản xuất (Manufacturing)** | `mrp.production` (Work Order) + `mrp.bom` (công thức) + `mrp.workcenter` (máy/công suất) — đầy đủ | KHÔNG có — không BOM, không Work Order, không Work Center chính thức (`machine_code` chỉ là TEXT tự do) | AVP không "sản xuất" theo nghĩa biến đổi nguyên liệu — chỉ lựa (QC) + đóng gói, item vật lý không đổi (Andy xác nhận 2026-09-17) |
| **Lot/Serial** | `stock.lot` — gắn trực tiếp vào TỪNG `stock.move` | `lots` — chỉ gắn ở `travelers` (1 Traveler = 1 Lot), KHÔNG gắn riêng từng `stock_moves` | Đơn giản hoá vì 1 Traveler xuyên suốt chỉ 1 Lot — kiểm chứng bằng dữ liệu thật (sheet WorkOrder, không có phản ví dụ), xem `FID-ERP-001` v1.3 |
| **Hàng lỗi/hỏng** | `stock.scrap` — model riêng | `move_type='SCRAP'` + `reason_code` (FK `defect_types`, 10 giá trị thật) — gộp vào cùng sổ cái | Volume nhỏ, không cần tách bảng — vẫn giữ nguyên tắc Odoo là BẮT BUỘC có lý do |
| **Đơn hàng (PO)** | `purchase.order` — model đầy đủ, nhiều dòng, trạng thái riêng | `Traveler.poNo` — chỉ 1 cột TEXT | AVP không tự tạo PO (Infasco phát hành sẵn, có barcode in sẵn) — chưa chứng minh cần model riêng, để dành nếu FID-ERP-008 cần sâu hơn |
| **Nhiều kho/nhiều công ty** | Multi-warehouse, multi-company chuẩn sẵn | 1 site, 1 công ty (Maple Leaf Group/AVP) | Quy mô thật — không có nhu cầu |
| **AI/OCR** | Không có sẵn, phải tích hợp module ngoài | Thiết kế sẵn 1 điểm chạm AI (Gemini OCR), 2 cổng kích hoạt (Office+Admin), human-gate bắt buộc, `sourceStation`/`deviceId` để audit | AVP_ERP xây RIÊNG cho đúng nhu cầu đọc PO/Traveler viết tay/scan của Infasco — Odoo không có sẵn |

---

## 3. BẰNG CHỨNG DỮ LIỆU THẬT — vì sao không cần multi-location

Đọc trực tiếp cột `LOCATION` trong `CHECKING SUMMARY`
(`Data/4.WRAPPING/Wrapping_final.xlsm`, 2.143 dòng thật, 2026-09-18):

```
LOCATION = 'F' : 2.104 dòng
LOCATION = 'f' : 39 dòng    (chỉ khác hoa/thường, CÙNG 1 giá trị)
```

**100% chỉ 1 giá trị thật** → AVP không phân biệt nhiều khu vực kho vật
lý trong vận hành hàng ngày. Nếu sau này AVP thật sự mở rộng ra nhiều địa
điểm tách biệt, lúc đó mới cần thêm bảng `locations` + cột
`fromLocation`/`toLocation` trên `stock_moves` (không tốn kém — sổ cái
vẫn append-only, thêm cột mới không phá dữ liệu cũ).

**[TO BE CONFIRMED]**: `LOCATION = 'F'` là viết tắt của gì — chưa rõ, chỉ
xác nhận được là hằng số, không ảnh hưởng tới kết luận thiết kế.

---

## 4. TÓM TẮT

AVP_ERP là **Odoo rút gọn đúng theo dữ liệu thật đo được** — giữ nguyên
tư duy cốt lõi của Odoo (1 sổ cái bất biến, không bảng cache riêng), bỏ
những phần Odoo có mà AVP chưa từng chứng minh cần (nhiều kho, BOM/sản
xuất thật, lot-theo-từng-move, PO model đầy đủ), và **thêm 1 thứ Odoo
không có sẵn**: layer kiểm soát AI/OCR + bất biến chặn cứng ở tầng
database (chặt hơn Odoo mặc định).

Nguyên tắc xuyên suốt: **không xây cho tình huống giả định chưa chứng
minh được** — mỗi chỗ rút gọn so với Odoo đều có bằng chứng dữ liệu thật
đi kèm (không phải "đoán chắc không cần"), và mỗi chỗ có thể mở rộng lại
dễ dàng khi có bằng chứng thật đòi hỏi (thêm cột/bảng, không sửa kiến
trúc gốc).

---

## THAM CHIẾU

- `docs/cl08_operation/SOFTWARE_ARCHITECTURE.md` — kiến trúc kỹ thuật đầy đủ
- `docs/features/FID-ERP-001_20260917.md` — schema chi tiết + lịch sử quyết định
- `docs/records/Consultations/260917_Architechture/FINAL_DECISION.md` — phản biện GPT+Grok
- `D:\AVP_AI\THIET_KE_HE_THONG_MOI.md` Phần 15.2 — nguồn gốc ý tưởng "1 sổ cái" (đọc THAM KHẢO, không sửa)

---
*ODOO_COMPARISON v1.0 | AVP_ERP | 2026-09-18*
