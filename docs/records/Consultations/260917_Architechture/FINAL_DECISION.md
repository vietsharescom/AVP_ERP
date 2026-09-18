# AVP_ERP — Báo cáo tổng hợp + Đề xuất cuối cùng cho FID-ERP-001
# Sau khi phản biện với GPT + Grok (2 bài review độc lập)
# Viết bởi: Claude | 2026-09-17 | ĐÃ CẬP NHẬT: Andy xác nhận xong, FID-ERP-001 đã lên v1.2

---

## TÓM TẮT 1 DÒNG

Cả 2 AI đều đồng ý: **kiến trúc tổng thể đúng hướng** (Postgres + sổ cái
bất biến + Prisma + human-confirm), nhưng **schema FID-ERP-001 hiện tại
chưa đủ chặt cho 5 điểm** — 4 điểm chỉ GPT tìm ra (Grok bám sát 7 câu hỏi
gốc nên không phát hiện), phần còn lại 2 AI hội tụ cùng kết luận. Đề xuất
dưới đây là quyết định cuối của tôi sau khi cân nhắc cả 2, không phải chỉ
chọn 1 bên.

---

## BẢNG QUYẾT ĐỊNH — 11 điểm (7 câu hỏi gốc + 4 GPT tự phát hiện)

| # | Vấn đề | GPT | Grok | Quyết định cuối |
|---|---|---|---|---|
| 1 | CHECK constraint qua raw SQL sau Prisma migration | Approve with change | Approve, giữ nguyên | **✅ Giữ pattern, thêm quy trình 6 bước bắt buộc + test tích hợp riêng** |
| 2 | Lot ↔ Traveler + split lot | Approve with change | Approve, khuyến nghị mạnh | **✅ Thêm `parentLotNo` tự tham chiếu (2 AI đồng thuận, giữ nguyên). Cardinality Traveler↔Lot: sau 2 vòng sửa (nhiều-nhiều → kiểm chứng dữ liệu thật `WorkOrder` sheet) chốt CUỐI CÙNG là **1:1 đơn giản** — xem "CẬP NHẬT v1.3" ngay dưới bảng schema** |
| 3 | 2 cổng AI (Office+Admin) | Approve, nhưng "triggered_from" chưa đủ | Approve, thêm triggered_from | **✅ Giữ 2 cổng. Tách 2 cột `sourceStation` + `deviceId` (theo GPT, chi tiết hơn Grok)** |
| 4 | machine/operator/shift = TEXT | Approve with change (canonicalize) | Approve, thêm lookup mềm optional | **✅ Giữ TEXT + chuẩn hoá TRIM/UPPER khi ghi. CHƯA làm bảng lookup (để dành, không blocking)** |
| 5 | Performance/index | Approve with change (thận trọng) | Approve, bắt buộc index ngay | **✅ Thêm index — nghiêng về Grok vì FID-ERP-012 ĐÃ là query contract thật, không phải đoán** |
| 6 | Migration Google Sheets | Đồng ý hoàn toàn + thêm rule giữ lý do reject | Đồng ý, chi tiết y hệt | **✅ Chốt pattern scan→quarantine→review→reconciliation cho FID-ERP-013** |
| 7 | Backup/Recovery | Phải chốt trước production, đề xuất 3 lớp | Đề xuất 3 lớp cụ thể (pg_dump+WAL+offsite) | **✅ Chốt kế hoạch mặc định, còn ngân sách/thiết bị cụ thể chờ Andy** |
| 8 | `qty` có dấu hay luôn dương? (GPT tự phát hiện) | 🔴 MUST DEFINE | — (không đề cập) | **✅ QUAN TRỌNG NHẤT — chốt: `qty` LUÔN DƯƠNG, ý nghĩa +/- suy ra từ `move_type`** |
| 9 | `Traveler.qcStatus` cache (GPT tự phát hiện) | 🔴 REMOVE/RECONSIDER | — (không đề cập) | **✅ QUAN TRỌNG NHẤT — BỎ hẳn cột này, tính qua VIEW/query trực tiếp `stock_moves`** |
| 10 | CHECK chưa bắt chuỗi rỗng (GPT tự phát hiện) | 🔴 MUST FIX | — (không đề cập) | **✅ Sửa CHECK dùng `NULLIF(TRIM(x),'')` thay vì `IS NOT NULL`** |
| 11 | `PackingSlipLine` thiếu snapshot (GPT tự phát hiện) | 🔴 MUST DEFINE | — (không đề cập) | **✅ Thêm cột snapshot (`partNoSnap`, `lotNoSnap`, `potNoSnap`) — Packing Slip là chứng từ, không được tự đổi theo traveler sau này** |

**Nhận xét quan trọng**: 4/11 điểm (8, 9, 10, 11) — đúng những điểm nặng ký
nhất — chỉ có GPT tìm ra, Grok không đề cập vì bám sát đúng 7 câu hỏi gốc
tôi đặt ra (không có 4 câu này trong đề bài ban đầu). Nếu chỉ hỏi 1 AI,
đã bỏ sót đúng phần quan trọng nhất.

---

## THAY ĐỔI SCHEMA CỤ THỂ (FID-ERP-001 → v1.2)

```prisma
model Traveler {
  travelerNo   String     @id @map("traveler_no")
  partNo       String     @map("part_no")
  poNo         String?    @map("po_no")
  potNo        String?    @map("pot_no")
  // ❌ ĐÃ BỎ: cột lotNo đơn — Andy xác nhận Traveler↔Lot là NHIỀU-NHIỀU
  //    (1 Traveler có thể có nhiều Lot), dùng bảng nối traveler_lots dưới
  // ❌ ĐÃ BỎ: qcStatus — không còn cache, tính qua VIEW (xem RULES)
  createdAt    DateTime   @default(now()) @map("created_at")
  lots         TravelerLot[]
  ...
}

// MỚI — bảng nối nhiều-nhiều (Andy xác nhận 2026-09-17: 1 Traveler có thể
// có NHIỀU Lot, đảo ngược giả định ban đầu của cả GPT/Grok)
model TravelerLot {
  travelerNo String   @map("traveler_no")
  lotNo      String   @map("lot_no")
  traveler   Traveler @relation(fields: [travelerNo], references: [travelerNo])
  lot        Lot      @relation(fields: [lotNo], references: [lotNo])
  @@id([travelerNo, lotNo])
  @@map("traveler_lots")
}

model Lot {
  lotNo        String     @id @map("lot_no")
  parentLotNo  String?    @map("parent_lot_no")     // MỚI — hỗ trợ split lot
  parentLot    Lot?       @relation("LotSplit", fields: [parentLotNo], references: [lotNo])
  childLots    Lot[]      @relation("LotSplit")
  createdAt    DateTime   @default(now()) @map("created_at")
  travelerLots TravelerLot[]
  @@index([parentLotNo])
  @@map("lots")
}

**⚠️ CẬP NHẬT v1.3 (SAU khi viết bảng trên) — cardinality Traveler↔Lot đảo
lại lần 2, đây mới là bản CUỐI CÙNG**: Claude đọc trực tiếp sheet
`WorkOrder`/`WORK ORDER` (`Data/3.FINISHED PALLET/...xlsm`,
`Data/4.WRAPPING/...xlsm`) — toàn bộ dòng quan sát được đều 1 Traveler =
1 Lot#, không phản ví dụ. Andy xác nhận AVP không có bước biến đổi/trộn
nguyên liệu (không BOM). **→ BỎ bảng `TravelerLot`, quay lại cột đơn**:
```prisma
model Traveler {
  ...
  lotNo  String?  @map("lot_no")   // v1.3: cột đơn, 1 Traveler = 1 Lot
  lot    Lot?     @relation(fields: [lotNo], references: [lotNo])
}
model Lot {
  lotNo        String     @id @map("lot_no")
  parentLotNo  String?    @map("parent_lot_no")
  parentLot    Lot?       @relation("LotSplit", fields: [parentLotNo], references: [lotNo])
  childLots    Lot[]      @relation("LotSplit")
  travelers    Traveler[]
  @@index([parentLotNo])
  @@map("lots")
}
```
Đồng thời xác nhận thật: **1 PO → nhiều Traveler** (PO `188424` trải trên
4 Traveler, mỗi Traveler 1 Lot riêng) — giữ nguyên `poNo` TEXT tự do trên
`Traveler`, không cần bảng `purchase_orders` riêng ở FID này.

Bảng `StockMove` không đổi:
```prisma
model StockMove {
  id           Int       @id @default(autoincrement())
  travelerNo   String    @map("traveler_no")
  moveType     MoveType  @map("move_type")
  qty          Int       // LUÔN DƯƠNG — ý nghĩa +/- suy từ moveType, xem RULES
  machineCode  String?   @map("machine_code")
  operatorCode String?   @map("operator_code")
  shift        String?
  reasonCode   String?   @map("reason_code")
  potNo        String?   @map("pot_no")
  sourceStation String?  @map("source_station")   // MỚI: OFFICE | FACTORY | ADMIN
  deviceId     String?   @map("device_id")        // MỚI: vd "OFFICE-PC-01"
  createdAt    DateTime  @default(now()) @map("created_at")
  ...
  @@index([travelerNo])
  @@index([moveType, createdAt])
  @@index([machineCode, createdAt])
  @@index([createdAt])
  @@map("stock_moves")
}

model PackingSlipLine {
  id            Int          @id @default(autoincrement())
  packingSlipId Int          @map("packing_slip_id")
  travelerNo    String       @map("traveler_no")   // vẫn giữ FK để trace ngược
  qty           Int
  partNoSnap    String       @map("part_no_snap")  // MỚI — snapshot lúc tạo PS
  lotNoSnap     String?      @map("lot_no_snap")   // MỚI
  potNoSnap     String?      @map("pot_no_snap")   // MỚI
  @@map("packing_slip_lines")
}

// MỚI — VIEW thay cho Traveler.qcStatus cache
// CREATE VIEW traveler_current_status AS
//   SELECT DISTINCT ON (traveler_no) traveler_no, ... status suy từ SELECT/RECEIVE mới nhất
//   FROM stock_moves WHERE move_type = 'SELECT' ORDER BY traveler_no, created_at DESC;
```

CHECK constraint sửa lại:
```sql
ALTER TABLE stock_moves ADD CONSTRAINT chk_select_pack_requires_context
  CHECK (move_type NOT IN ('SELECT','PACK') OR (
    NULLIF(TRIM(machine_code), '') IS NOT NULL AND
    NULLIF(TRIM(operator_code), '') IS NOT NULL AND
    NULLIF(TRIM(shift), '') IS NOT NULL
  ));
ALTER TABLE stock_moves ADD CONSTRAINT chk_scrap_requires_reason
  CHECK (move_type != 'SCRAP' OR reason_code IS NOT NULL);
ALTER TABLE stock_moves ADD CONSTRAINT chk_qty_positive
  CHECK (qty > 0);
```

---

## VIỆC PHÁT SINH THÊM — ảnh hưởng FID-ERP-005 (chưa viết)

Bỏ `Traveler.qcStatus` nghĩa là **FID-ERP-005 (Status Good/Hold)** không
còn "sửa 1 cột trên Traveler" nữa — mà phải **ghi 1 dòng mới vào
`stock_moves`** mỗi lần đổi trạng thái (đúng nguyên tắc bất biến). Câu hỏi
mới phát sinh (KHÔNG có trong 7 câu hỏi gốc, KHÔNG có AI nào trả lời):
**có cần thêm 1 `move_type` riêng (vd `STATUS_CHANGE`) cho trường hợp đổi
PASS→HOLD→CONCESSION SAU khi đã qua `SELECT`, hay dùng lại `SELECT`
nhiều lần?** — Để ngỏ, quyết khi viết FID-ERP-005.

---

## ĐÃ ANDY XÁC NHẬN (2026-09-17, sau khi đọc báo cáo này)

1. **Cardinality Lot#↔Traveler#** — 2 vòng sửa trong ngày:
   - Vòng 1 (v1.2): Andy nói "về nguyên tắc thiết kế 1 traveller có thể
     có nhiều lot" → đổi sang bảng nối nhiều-nhiều `traveler_lots`.
   - Vòng 2 (v1.3, SAU KHI kiểm chứng dữ liệu thật): Claude đọc trực tiếp
     sheet `WorkOrder`/`WORK ORDER` (2 file Excel mẫu) — TOÀN BỘ dòng
     quan sát được đều đúng 1 Traveler = 1 Lot#, không có phản ví dụ.
     Andy xác nhận thêm: AVP không có bước biến đổi/trộn nguyên liệu
     (không BOM) — Traveler chỉ lựa + đóng gói, không có lý do nghiệp vụ
     nào để 1 Traveler cần nhiều Lot. **→ QUAY LẠI cột đơn `Traveler.lotNo`
     (1:1 đơn giản), bỏ bảng nối `traveler_lots`.**
   - Đồng thời XÁC NHẬN THẬT (từ sheet WorkOrder): **1 PO → NHIỀU
     Traveler** (PO `188424` trải trên 4 Traveler khác nhau, mỗi Traveler
     1 Lot riêng) — điểm này GPT/Grok không sai, giữ nguyên `poNo` dạng
     TEXT tự do trên `Traveler` (đã tự nhiên hỗ trợ).
2. **Backup ngân sách/thiết bị cụ thể** — Andy: "để sau". Giữ nguyên như
   risk mở (`RISK_REGISTER.md` R-D01), không chặn FID-ERP-001.
3. **RPO/RTO** — Andy hỏi khái niệm (đã giải thích trực tiếp trong chat:
   RPO = mất tối đa bao nhiêu dữ liệu tính theo thời gian, RTO = mất bao
   lâu để khôi phục xong). Đi cùng quyết định "để sau" ở mục 2 — không
   chốt số cụ thể lúc này, không chặn FID-ERP-001 (đây là quyết định vận
   hành, không phải quyết định schema).

---

## VÒNG 2 — GPT ĐỌC LẠI BẢN v1.3 (cùng ngày, sau khi Claude sửa xong theo mục trên)

GPT tự quay lại đọc `FID-ERP-001` v1.3 (không được yêu cầu, tự chủ động —
đúng tinh thần "phản biện độc lập"). Đánh giá: hầu hết điểm trước đã xử
lý đúng (qcStatus bỏ, qty dương, CHECK bắt chuỗi rỗng, snapshot, Lot
1:1...). Nhưng vẫn CHƯA duyệt APPROVED — còn 3 điểm:

| # | Vấn đề | Mức độ | Quyết định |
|---|---|---|---|
| A | View `traveler_current_status` chỉ lọc `move_type='SELECT'` → nếu Traveler đã qua PACK/SHIP/SCRAP, view vẫn báo "SELECT" — tên gọi "current status" gây hiểu nhầm, SAI nếu đọc là trạng thái vòng đời | 🔴 MUST FIX | Đổi tên → `traveler_last_select_status`, thu hẹp đúng phạm vi tài liệu (chỉ là "lần SELECT gần nhất", không phải "đang ở đâu trong vòng đời") |
| B | `stock_moves` "bất biến" hiện chỉ ở tầng ứng dụng (không route nào UPDATE) — nhưng DB vẫn cho UPDATE/DELETE trực tiếp nếu ai đó bypass qua SQL tay | 🔴 MUST DECIDE | Chọn **database-enforced**: thêm trigger chặn UPDATE/DELETE ngay ở Postgres — đúng tinh thần gốc dự án (lỗi AVP_AI là do có đường tắt bỏ qua route chuẩn) |
| C | `stock_moves` là inventory ledger hay workflow/audit event ledger — chưa nói rõ, dễ hiểu lầm thiếu 1 trong 2 | 🟠 SHOULD CLARIFY | Làm rõ: **là CẢ HAI, cùng 1 bảng, có chủ đích** — qty+moveType trả lời phần inventory, operator/machine/shift/source trả lời phần audit. Không cần thêm bảng/cột, chỉ cần viết rõ trong FID |

**Nhận xét của GPT (đáng lưu ý)**: "Tôi sẽ KHÔNG sửa lại toàn bộ FID...
Không nên tiếp tục xoay schema mãi... tôi không khuyến nghị tiếp tục thêm
bảng/field chỉ vì 'có thể sau này cần'." — tự giới hạn phạm vi sửa, không
đề xuất thêm phức tạp ngoài 3 điểm trên.

**Đã sửa `FID-ERP-001` → v1.4**: áp đúng 3 điểm A/B/C, không sửa gì khác.

---

## BƯỚC TIẾP THEO

Nếu Andy đồng ý bảng quyết định trên, tôi sẽ:
1. ~~Sửa `FID-ERP-001_20260917.md` → v1.2~~ → đã lên tới **v1.4** (qua v1.2
   phản biện GPT+Grok, v1.3 kiểm chứng dữ liệu thật, v1.4 phản biện vòng 2)
2. Cập nhật `FID_LIST.md` (FID-ERP-013 ghi rõ nguyên tắc quarantine +
   giữ lý do reject) — ✅ đã làm
3. Cập nhật `RISK_REGISTER.md` R-D01 + `FACILITIES_SETUP.md` (kế hoạch
   backup mặc định, chờ Andy điền ngân sách/thiết bị) — ✅ đã làm
4. Cập nhật `LATEST_SESSION.md` — ✅ đã làm
5. Sau đó Andy đọc `FID-ERP-001` **v1.4** lần cuối → đổi Status = APPROVED
   → mới bắt đầu code.

---
*FINAL_DECISION v1.1 | AVP_ERP | 2026-09-17, cập nhật sau vòng phản biện 2 của GPT*
