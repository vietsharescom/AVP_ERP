# AVP_ERP — Consultation Request: Schema Postgres + Kiến trúc hạ tầng + Mô hình phân quyền
# Ngày viết: 2026-09-17 | Viết bởi: Claude (phiên AVP_ERP)
# Người nhận: [ĐỂ TRỐNG — Andy điền nơi gửi: ChatGPT, Grok, hay chuyên gia khác]

---

## 1. DỰ ÁN AVP_ERP LÀ GÌ

**AVP_ERP** là hệ thống quản lý sản xuất/đóng gói (production & packing
tracking) nội bộ cho **AVP** — một xưởng gia công ốc vít (nut/bolt/fastener
contract manufacturing & packing) thuộc **Maple Leaf Group** (Canada, chủ
dự án: Andy Phan). Khách hàng B2B duy nhất hiện tại là **Infasco**.

Đây **KHÔNG phải sản phẩm bán ra ngoài** — là công cụ nội bộ, thay thế hệ
thống cũ **AVP_AI** (chạy trên Google Sheets + Next.js, đã chạy thật ~9
tháng, vẫn đang giao hàng thật hàng ngày cho Infasco song song trong lúc
AVP_ERP được thiết kế). AVP_ERP là dự án **greenfield kế tiếp**, không
fork code, chỉ kế thừa NGHIỆP VỤ đã kiểm chứng.

**Vấn đề thật cần giải quyết**: AVP_AI (Google Sheets) đã giải quyết phần
lớn vấn đề "nhiều sổ ghi song song lệch nhau" (đo thật trước đó: 0/30 ngày
KPI đối chiếu PO khớp bằng tay, 797/1.847 traveler lệch giữa các sheet)
nhưng **Google Sheets thiếu transaction thật + khoá ngoại + audit trail
tầng lưu trữ** — vẫn còn lỗi kiểu "1 route quên 1 bước" (ví dụ thật: 22
traveler quên đánh `shipped=TRUE` do 1 script nhập lịch sử không đi qua
route chung, sửa field trực tiếp không qua transaction).

**Giải pháp**: chuyển sang **PostgreSQL** làm nguồn sự thật duy nhất — có
transaction thật, CHECK constraint ở tầng DB, sổ cái bất biến kiểu
`stock.move` của Odoo — trong khi vẫn giữ nguyên UI pattern/stack đã chạy
thật ở AVP_AI (Next.js + TypeScript).

---

## 2. BỐI CẢNH NGHIỆP VỤ THẬT — với ví dụ dữ liệu thật

Quy trình 6 khâu đã xác minh bằng dữ liệu thật ở AVP_AI:
```
Email PO (Infasco) → Kho NVL (nhận hàng) → Máy lựa (phân loại PASS/HOLD)
  → WorkStationArchive (nhập liệu tại xưởng) → Wrapping/Status (đóng gói)
  → Packing List/Slip (xuất hàng)
```

### Domain terms thật (không phải khái niệm chung chung)
`Traveler#` (phiếu theo dõi, khoá chính nghiệp vụ), `Part#` (mã hàng khách
Infasco), `Pot#`/GAYLORD (thùng chứa, dùng khi Rework/Return), `Lot#`/`LOT
NO.` (số lô truy vết), `Skid#` (mã pallet), `PO`, `PS` (Packing Slip),
`qcStatus` (PASS/HOLD/CONCESSION).

### Ví dụ dữ liệu thật — phiếu Traveler giấy (`Data/2. Traveler/TRAVELER
SHEETS SEP 9.pdf`, đã đọc trực tiếp qua PDF)
```
Part#: 11546389-T          Traveler#: 718039        Pot#: 693
Lot#: 6-251-15-A            Split from: 6-251-15
Sorting M/C #: MC112        (viết tay — mã máy lựa)
Defect checklist (10 loại cố định trên phiếu):
  Stuck Together, Slivers, Excess Plating, Un-Tapped, Reamed,
  Mis-Formed, Mixed, Upside Down Washer, Damaged Pilot, Loose Washer Nut
# of PCS Found: 275          (số lượng lỗi thật tìm thấy đợt này)
Routing: RECEIVE NUT INFASCO → PLATE ANTI-FRICTION → FINAL INSPECTION
  INFASCO NUT → SORT AND PACK
```

### Ví dụ dữ liệu thật — file Excel `Data/4.WRAPPING/Wrapping_final.xlsm`,
sheet `CHECKING SUMMARY` (đọc bằng `openpyxl`, không phải suy đoán)
```
Cột thật: DATE | SHIFT | Oprtr | TRAVELER | PART# | POT# | LOT# | Type |
  O/C | Machine | MC# | S/P | Special Notes | No. of boxes | TTL QNT |
  SKID# | LOCATION | Reject | Serial | ROUTING | DEFECTS | CHECKER | SHIPPED

Dòng thật:
  2026-08-13 | Mrnng | 111 | 714135 | 11547369 | 911 | 655645 | Nut | O |
  Tbl | 1 | S/P | ... | 250 | 250 | ... | F | SHIPPED
```
→ `SHIFT` có giá trị `Mrnng` (ca sáng). `Oprtr` là **mã số công nhân**
(`111`, hoặc `11/293` — 2 người cùng ca), không phải tên chữ. `Machine` +
`MC#` là 2 cột TÁCH RIÊNG xác định trạm/máy đóng gói (vd `Tbl` + `1`).

### Ví dụ dữ liệu thật — `Data/6.Reports/Daily Sale by Station.xlsx`
```
Cột: Date | Work Station | Station | Part | Traveler | Boxes/Pieces |
  Unit Quantity | Total Quantity | Operator | Price

Dòng thật: Station = 'BF113', 'BF116', 'TB9-INF MV', 'LINE 1'
```
→ Đã có SẴN 1 report tổng hợp sản lượng theo trạm/máy/ngày ở hệ thống cũ.

### Ví dụ dữ liệu thật — `Data/6.Reports/Daily Infasco In&Out.xlsx`
```
Cột: Date | Receiving | Processing | Shipping | FINISHED PALLET-SHIPPED
  PALLET | Inventory on floor
Sub-cột: #Total Received | SPLIT TRAVELER INVENTORY | #Daily Traveler
  Processing | #Daily Finished Pallets | #Total Remaining | #Daily
  Shipped Tr# | #Daily Shipped Pallets | #Daily Tr# Leftover
```
→ Báo cáo tổng hợp ngày đã tồn tại thật, gần giống yêu cầu báo cáo mới
(FID-ERP-012) mà Owner vừa yêu cầu.

---

## 3. QUY TRÌNH LÀM VIỆC CỦA DỰ ÁN

Dựa trên khung **ISO/IEC 42001:2023** rút gọn (nội bộ gọi là "ISO_CA"),
nguyên tắc chính:

1. **Không code trước khi có FID (Feature Intent Document) được Owner
   duyệt** — mỗi tính năng viết 1 file 9 mục (Intent/Why/Module/Contract/
   Rules/Example/Test Criteria/Not-in-scope/Files), Status phải =
   `APPROVED` trước khi viết code thật.
2. **AI không được ghi thẳng database** — mọi output AI (hiện tại: 1 điểm
   duy nhất, Gemini OCR đọc PO/Traveler) phải qua người xem lại + bấm
   "Xác nhận" mới được lưu. Không có auto-save.
3. Test tự động (vitest/jest) phải PASS 100% trước khi commit.
4. Mỗi thay đổi ghi `CHANGELOG.md`.

---

## 4. TRẠNG THÁI HIỆN TẠI (tới 2026-09-17)

- **Giai đoạn THIẾT KẾ THUẦN — CHƯA có 1 dòng code `webapp/` nào.**
- 13 FID đã lên kế hoạch (`FID_LIST.md`), trong đó:
  - **FID-ERP-001 (schema Postgres nền tảng)** — đã viết đầy đủ 9 mục,
    Status: `DRAFT` (chưa APPROVED). Đây là FID **duy nhất** cần tư vấn kỹ
    thuật sâu ở giai đoạn này, vì mọi FID khác phụ thuộc nó.
  - **FID-ERP-012 (báo cáo sản xuất Xưởng)** — đã viết đầy đủ 9 mục,
    Status: `DRAFT`.
  - 11 FID còn lại — mới có 1 dòng tóm tắt trong bảng kế hoạch, CHƯA viết
    chi tiết.
- **ORM đã chốt: Prisma** (không cần tư vấn lại điểm này — Andy đã quyết,
  lý do: migration tự sinh, `schema.prisma` dễ đọc lại cho 1 dev + AI).
- **Chưa git init** — repo local thuần, chưa có remote GitHub.

---

## 5. KIẾN TRÚC HẠ TẦNG HIỆN TẠI (thiết kế, chưa build)

### 5.1 Stack
Next.js + TypeScript (frontend + backend, tái dùng pattern OCR/CaptureGate/
GlobalSearchBar đã chạy thật 9 tháng ở AVP_AI) + PostgreSQL + Prisma ORM.

### 5.2 Hạ tầng vật lý — on-premise, LAN nội bộ, KHÔNG cloud
```
MÁY 1 (Server, đặt Office)  ──LAN nội bộ, KHÔNG tunnel──┬── MÁY 2 (Trạm Office)
  Next.js + Postgres                                     ├── MÁY 3 (Trạm Xưởng)
  headless, không ai thao tác trực tiếp                  └── MÁY 4 (Laptop admin)
```
- Internet CHỈ cần cho 1 việc: Máy 1 đọc email PO từ Infasco. Mất internet
  vẫn thao tác bình thường ở mọi trạm (LAN nội bộ).
- **Không dùng VPN/tunnel** — nếu cần truy cập từ xa sau này là quyết định
  kiến trúc riêng, chưa làm.

### 5.3 Mô hình phân quyền (3 vai trò, 2 "cổng" kích hoạt AI)
| Trạm | Search | Add file/kích hoạt OCR | Tạo/sửa Packing Slip | Ghi chú |
|---|---|---|---|---|
| Office (Trạm 1) | Có | **Có** | Có | Đọc email PO, tạo Packing Slip |
| Xưởng (Trạm 2) | Có (giống Office) | **KHÔNG** | Không (chỉ nhập liệu tay: Good/Hold, in sticker) | Trạm DUY NHẤT không có OCR |
| Laptop admin — Giám đốc/Quản lý (Máy 4) | Có | **Có** | Có (full, superset Office) | LAN-only, không remote; ban đầu thiết kế "view-only" nhưng Owner đổi ý ngay trong phiên — xem Mục 7 câu hỏi 3 |

**Nguyên tắc AI duy nhất trong toàn hệ thống**: Gemini OCR đọc PO/Traveler
(PDF/ảnh) tại lúc nhập liệu — không có bước AI nào khác (không multi-agent,
không LLM ra quyết định nghiệp vụ). Mọi kết quả OCR bắt buộc người xem +
xác nhận trước khi ghi DB.

---

## 6. SCHEMA POSTGRES HIỆN TẠI (FID-ERP-001, bản Prisma draft)

```prisma
enum QcStatus { PASS  HOLD  CONCESSION }
enum MoveType { RECEIVE  SELECT  PACK  SHIP  SCRAP  RETURN }

model Lot {
  lotNo        String     @id @map("lot_no")   // vd "6-251-15-A"
  createdAt    DateTime   @default(now()) @map("created_at")
  travelers    Traveler[]
  @@map("lots")
}

model DefectType {
  code         String      @id   // vd "LOOSE_WASHER_NUT"
  label        String      @unique // vd "Loose Washer Nut" — seed đúng 10 giá trị thật (Mục 2)
  stockMoves   StockMove[]
  @@map("defect_types")
}

model Traveler {
  travelerNo   String     @id @map("traveler_no")
  partNo       String     @map("part_no")
  poNo         String?    @map("po_no")
  potNo        String?    @map("pot_no")   // GAYLORD, dùng khi Rework/Return
  lotNo        String?    @map("lot_no")   // FK -> Lot, NULL cho tới khi gán
  qcStatus     QcStatus?  @map("qc_status") // CACHE — nguồn sự thật thật là stock_moves.SELECT mới nhất
  createdAt    DateTime   @default(now()) @map("created_at")
  part         PartControl @relation(fields: [partNo], references: [partNo])
  lot          Lot?        @relation(fields: [lotNo], references: [lotNo])
  moves        StockMove[]
  @@map("travelers")
}

model StockMove {           // SỔ CÁI BẤT BIẾN — append-only, KHÔNG UPDATE
  id           Int       @id @default(autoincrement())
  travelerNo   String    @map("traveler_no")
  moveType     MoveType  @map("move_type")
  qty          Int
  machineCode  String?   @map("machine_code")   // TEXT tự do (vd "MC112","BF116","Tbl-1") — bắt buộc khi SELECT/PACK, kể cả lựa TAY
  operatorCode String?   @map("operator_code")  // TEXT tự do (vd "111") — bắt buộc khi SELECT/PACK
  shift        String?                          // TEXT tự do (vd "Mrnng") — bắt buộc khi SELECT/PACK
  reasonCode   String?   @map("reason_code")     // FK -> DefectType, bắt buộc khi SCRAP
  potNo        String?   @map("pot_no")          // dùng khi RETURN
  createdAt    DateTime  @default(now()) @map("created_at")
  traveler     Traveler    @relation(fields: [travelerNo], references: [travelerNo])
  defectType   DefectType? @relation(fields: [reasonCode], references: [code])
  @@map("stock_moves")
}

model PartControl {
  partNo     String     @id @map("part_no")
  qtyPerBox  Int        @map("qty_per_box")
  client     String     // "Infasco"
  @@map("part_control")
}

model PackingSlip {
  id           Int                @id @default(autoincrement())
  psNo         String             @unique @map("ps_no")
  totalPallets Int                @default(0) @map("total_pallets")
  totalEmpty   Int                @default(0) @map("total_empty")
  lines        PackingSlipLine[]
  @@map("packing_slips")
}

model PackingSlipLine {
  id            Int          @id @default(autoincrement())
  packingSlipId Int          @map("packing_slip_id")
  travelerNo    String       @map("traveler_no")
  qty           Int
  @@map("packing_slip_lines")
}

model PrintLog {
  id          Int      @id @default(autoincrement())
  travelerNo  String   @map("traveler_no")
  printedBy   String   @map("printed_by")
  printedAt   DateTime @default(now()) @map("printed_at")
  @@map("print_log")
}
```

**CHECK constraint dự kiến** (thêm bằng raw SQL sau khi Prisma sinh
migration, vì Prisma schema thuần không hỗ trợ điều kiện CHECK phụ thuộc
cột khác):
```sql
ALTER TABLE stock_moves ADD CONSTRAINT chk_select_pack_requires_context
  CHECK (move_type NOT IN ('SELECT','PACK')
         OR (machine_code IS NOT NULL AND operator_code IS NOT NULL AND shift IS NOT NULL));
ALTER TABLE stock_moves ADD CONSTRAINT chk_scrap_requires_reason
  CHECK (move_type != 'SCRAP' OR reason_code IS NOT NULL);
```

**Nguyên tắc thiết kế đã chốt** (không cần tư vấn lại, chỉ để hiểu bối
cảnh): KHÔNG có bảng `audit_log`/`operator_log` riêng — `stock_moves` với
đủ `operator_code`/`machine_code`/`shift`/`created_at` trên mỗi dòng
CHÍNH LÀ audit trail. Mọi báo cáo (FID-ERP-012) đọc thẳng `stock_moves`
bằng SQL `GROUP BY`, không dựng bảng cache/materialized view riêng.

---

## 7. ĐANG CẦN TƯ VẤN GÌ — câu hỏi cụ thể

### Câu hỏi 1 — CHECK constraint điều kiện qua raw SQL sau Prisma migration: đúng pattern chưa?
Prisma (bản hiện dùng) không hỗ trợ khai báo CHECK constraint điều kiện
(vd "NOT NULL cột B chỉ khi cột A = X") trực tiếp trong `schema.prisma`.
Cách dự kiến: chạy `prisma migrate dev --create-only`, rồi tay thêm
`ALTER TABLE ... ADD CONSTRAINT ... CHECK (...)` vào file migration SQL
trước khi apply. Đây có phải cách làm chuẩn/an toàn không? Có rủi ro gì
khi Prisma generate lại migration sau này (drift detection) không?

### Câu hỏi 2 — Cardinality Lot# ↔ Traveler#: 1-nhiều hay 1-1?
Vừa tách bảng `lots` riêng (trước đó `lotNo` chỉ là 1 cột text trên
`travelers`) — giả định 1 Lot# CÓ THỂ dùng chung cho NHIỀU Traveler (giống
`stock.lot` của Odoo, hỗ trợ truy vết genealogy 2 chiều: 1 lô lỗi → tìm
tất cả Traveler/thành phẩm liên quan). **Owner (Andy) chưa xác nhận rõ
cardinality thật** — dữ liệu mẫu thật cho thấy 1 phiếu Traveler có field
"Split from: 6-251-15" (Lot `6-251-15-A` tách từ Lot gốc `6-251-15`) —
điều này gợi ý Lot có thể PHÂN NHÁNH (1 lot cha → nhiều lot con), phức
tạp hơn quan hệ 1-nhiều đơn giản. **Câu hỏi**: mô hình `lots` nên thiết kế
thế nào để hỗ trợ đúng cả (a) 1 lot dùng cho nhiều traveler VÀ (b) lot có
thể tách nhánh (split lot) như dữ liệu thật cho thấy? Có cần thêm cột
`parent_lot_no` tự tham chiếu không?

### Câu hỏi 3 — Mô hình "2 cổng AI" (Office + Máy admin) có đủ an toàn/audit được không?
Ban đầu thiết kế "1 cổng AI duy nhất" (chỉ Office được add file/kích hoạt
OCR) để dễ audit. Owner sau đó đổi ý ngay trong phiên thiết kế — muốn Máy
4 (laptop Giám đốc/Quản lý) cũng có đầy đủ quyền add file/OCR như Office
(lý do: cần làm được toàn bộ nghiệp vụ khi cần, không chỉ xem). **Câu
hỏi**: với 2 điểm có thể kích hoạt AI thay vì 1, có cần thêm cơ chế kiểm
soát nào khác để bù lại (vd log riêng theo thiết bị, giới hạn tần suất,
cảnh báo bất thường) hay 2 điểm (thay vì nhiều điểm không giới hạn) là đã
đủ an toàn cho quy mô 1 xưởng nội bộ B2B?

### Câu hỏi 4 — `machine_code`/`operator_code`/`shift` để TEXT tự do có ổn không?
Quyết định: không ép các cột này thành ENUM/bảng lookup cố định, vì
**chưa có danh sách đầy đủ** tất cả máy lựa + tên ca thật (mới thấy ví dụ
`MC112`, `BF116`, `Tbl`+`1`, `Mrnng` qua vài file mẫu, không phải danh
sách đầy đủ). Rủi ro: dữ liệu có thể bị gõ sai/không nhất quán (`BF116`
vs `bf118a/b` — đã thấy cả chữ hoa/thường lẫn lộn trong dữ liệu thật). Có
nên vẫn giữ TEXT tự do ở giai đoạn này (chờ danh sách đầy đủ rồi migrate
sang lookup table sau), hay nên ép chuẩn hoá (vd `UPPER(machine_code)`
trigger, hoặc bảng `machines` ngay từ đầu dù danh sách chưa đầy đủ, chấp
nhận thêm dòng mới khi phát sinh)?

### Câu hỏi 5 — Volume dữ liệu thật có cần lo hiệu năng cho cách "đọc thẳng stock_moves, không cache" không?
Volume ước tính (AVP_AI cũ): "vài nghìn dòng/tháng" (chưa có số chính xác
hơn). Với volume này, FID-ERP-012 (báo cáo sản xuất, GROUP BY ngày +
GROUP BY máy) đọc thẳng `stock_moves` bằng SQL aggregate, không dựng bảng
cache/materialized view. **Câu hỏi**: ở quy mô này (vài nghìn dòng/tháng,
chạy trên 1 server on-premise nhỏ, không cloud), cách tiếp cận "không
cache" có ổn định lâu dài không, hay nên chuẩn bị sẵn 1 index/materialized
view ngay từ đầu để tránh phải làm lại khi dữ liệu tích luỹ nhiều năm?

### Câu hỏi 6 — Chiến lược migrate 1 lần từ Google Sheets (5 sheet) sang Postgres
Kế hoạch: **FID-ERP-013** (chưa viết chi tiết) — migrate dữ liệu lịch sử
từ 5 Google Sheets AVP_AI (`RawMaterial`, `Warehouse`, `FinishGood`,
`PartControl`, `PackingList`) sang schema Postgres mới ở Mục 6, MỘT LẦN
DUY NHẤT (không đồng bộ 2 chiều liên tục), sau khi schema ổn định + đã
chạy thử thật song song. Dữ liệu Sheets có sẵn vấn đề chất lượng đã biết
(797/1.847 traveler từng lệch giữa các sheet, một số dòng thiếu
`shipped=TRUE`). **Câu hỏi**: có khuyến nghị/pattern chuẩn nào cho việc
migrate 1 lần từ dữ liệu "bẩn" (Google Sheets, có sai lệch đã biết) sang
schema có CHECK constraint chặt (như Mục 6) mà không làm migration fail
hàng loạt? (vd: quét lỗi trước bằng script riêng, tạo bảng "quarantine"
tạm cho dòng lỗi thay vì chặn cứng toàn bộ migration...)

### Câu hỏi 7 — Backup/Recovery cho Postgres on-premise, không cloud
Server (Máy 1) chạy tại Office, KHÔNG có cloud backup, ngân sách/thiết bị
backup cụ thể chưa quyết (`FACILITIES_SETUP.md` còn để trống mục này).
**Câu hỏi**: với 1 server Postgres nhỏ chạy production thật cho 1 xưởng
(không downtime dài được vì ảnh hưởng giao hàng hàng ngày cho Infasco),
khuyến nghị cụ thể nào về tần suất backup (`pg_dump` cron hàng ngày? WAL
archiving?), lưu ở đâu (ổ cứng rời tại chỗ có đủ an toàn không, hay cần
tối thiểu 1 bản off-site), và RTO/RPO hợp lý cho quy mô này?

---

## 8. ĐỀ XUẤT CỦA CLAUDE (phiên AVP_ERP hôm nay) — CHƯA phải quyết định cuối, cần phản biện

1. **Câu hỏi 1 (CHECK constraint)**: giữ pattern raw-SQL-sau-migration —
   đơn giản, không cần thư viện thêm, chấp nhận phải cẩn thận khi chạy
   `prisma migrate dev` lần sau (dùng `migrate diff` để kiểm tra không bị
   Prisma tự xoá CHECK constraint đã thêm tay).
2. **Câu hỏi 2 (Lot cardinality)**: đề xuất tạm — thêm cột
   `parent_lot_no` tự tham chiếu (`Lot.parentLotNo -> Lot.lotNo`, nullable)
   để hỗ trợ split-lot, và giữ `Traveler.lotNo` là 1-nhiều tới `Lot`
   (nhiều Traveler có thể cùng 1 Lot). Cần Owner xác nhận thật trước khi
   FID-ERP-001 chuyển APPROVED.
3. **Câu hỏi 3 (2 cổng AI)**: đề xuất — thêm 1 cột phái sinh dễ query
   trên `stock_moves` để phân biệt "triggered_from" (Office/Admin), tận
   dụng `operator_code` sẵn có, không cần cơ chế mới — 2 điểm cố định
   (không mở rộng thêm) là đủ cho quy mô 1 xưởng nội bộ, KHÔNG cần thêm
   rate-limit/anomaly-detection phức tạp ở giai đoạn này.
4. **Câu hỏi 4 (TEXT tự do)**: giữ TEXT tự do ở FID-ERP-001 (không chặn
   tiến độ), nhưng thêm 1 test kiểm tra không phân biệt hoa/thường khi so
   sánh (`LOWER(machine_code)`) để giảm rủi ro trùng lặp do gõ khác kiểu
   chữ.
5. **Câu hỏi 5 (không cache)**: giữ nguyên "không cache" ở giai đoạn này
   (volume nhỏ, chưa cần tối ưu sớm — YAGNI), nhưng thêm index
   `(move_type, created_at)` và `(machine_code, created_at)` trên
   `stock_moves` ngay từ FID-ERP-001 để chuẩn bị cho query GROUP BY của
   FID-ERP-012.
6. **Câu hỏi 6 (migration)**: đề xuất — viết script quét lỗi độc lập
   TRƯỚC (liệt kê toàn bộ dòng vi phạm CHECK constraint dự kiến), cho
   Owner xem + quyết định sửa tay hay bỏ qua từng dòng, KHÔNG chạy
   migration thẳng vào schema có CHECK constraint và để nó tự fail hàng
   loạt.
7. **Câu hỏi 7 (backup)**: không tự đề xuất — đây là quyết định
   ngân sách/vận hành của Owner (đã ghi nhận là risk mở R-D01 trong
   `RISK_REGISTER.md`), cố tình để ngỏ chờ tư vấn kỹ hơn về best practice
   Postgres backup ở quy mô nhỏ.

**Mức độ tin cậy của các đề xuất trên**: rút ra từ 1 phiên thiết kế nội bộ
trong ngày với Owner, CHƯA kiểm chứng chéo với nguồn tư vấn kỹ thuật độc
lập nào khác — đây chính là lý do viết file này.

---

## 9. THÔNG TIN THAM CHIẾU (nếu người tư vấn cần đọc thêm)

- Toàn bộ nguyên tắc dự án: `CLAUDE.md` (gốc dự án `D:\AVP_ERP`)
- Kiến trúc đầy đủ: `docs/cl08_operation/SOFTWARE_ARCHITECTURE.md`
- Schema đầy đủ 9 mục: `docs/features/FID-ERP-001_20260917.md`
- Báo cáo sản xuất đầy đủ 9 mục: `docs/features/FID-ERP-012_20260917.md`
- Danh sách toàn bộ 13 FID kế hoạch: `docs/features/FID_LIST.md`
- Chính sách AI/human-oversight: `docs/cl05_leadership/AI_POLICY.md`
- Risk register: `docs/cl06_planning/RISK_REGISTER.md`
- Bối cảnh/quyết định mới nhất: `docs/records/LATEST_SESSION.md`
- Dữ liệu mẫu thật (nguồn mọi ví dụ ở Mục 2): thư mục `Data/` (PO,
  Traveler, FINISHED PALLET REPORT, Wrapping, Packing Slip, 2 report Excel)

---
*AVP-CONSULT-REQUEST v1.0 | AVP_ERP | viết 2026-09-17, chưa gửi đi*
