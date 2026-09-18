# SOFTWARE_ARCHITECTURE.md — AVP_ERP
# ISO/IEC 12207:2017 Architecture Definition
# Version: v0.3 (draft) | Bắt đầu: 2026-09-17

---

## 0. QUAN HỆ VỚI AVP_AI (`D:\AVP_AI`)

AVP_ERP là **dự án kế tiếp, greenfield**, KHÔNG fork/copy code từ AVP_AI.
AVP_AI (Google Sheets + Next.js) tiếp tục chạy độc lập, giao hàng thật cho
Infasco mỗi ngày, trong lúc AVP_ERP được thiết kế + build song song. Chỉ
cắt hẳn sang khi AVP_ERP đạt đủ tính năng và qua thử nghiệm thật.

Tài liệu này kế thừa nghiệp vụ đã xác minh bằng dữ liệu thật ở
[`AVP_AI/THIET_KE_HE_THONG_MOI.md`](../../../AVP_AI/THIET_KE_HE_THONG_MOI.md)
(quy trình 6 khâu: Email PO → Kho NVL → Máy lựa → WorkStationArchive →
Wrapping/Status → Packing List) — KHÔNG kế thừa cấu trúc lưu trữ (5
Google Sheets), đổi hẳn sang PostgreSQL (xem Mục 3).

**✅ Đính chính phạm vi tài liệu (2026-09-17)**: file này CHỈ mô tả kiến
trúc KỸ THUẬT cụ thể (stack, hạ tầng, data model) — không mô tả quy trình
ISO/AI governance (đó là việc của `docs/cl05_leadership/AI_POLICY.md` —
ISO_CA quản lý QUÁ TRÌNH viết code + hồ sơ vận hành, không quy định kiến
trúc runtime của AVP_ERP phải theo khuôn nào). Bản nháp đầu có nhét 1 "mô
hình 5 lớp AI" vào đây — đã gỡ, vì đó là mô tả AVP_AI SAU KHI đã chạy
thật 9 tháng (retrofit cho hồ sơ ISO), không phải khuôn kiến trúc áp
trước khi AVP_ERP có dòng code nào.

**Nguyên tắc chọn mức áp dụng khung ISO_CA (Andy chốt 2026-09-17)**: "vừa
đủ, không cần quá nặng, nhưng an toàn cho code và vận hành sau này."

---

## 1. SYSTEM OVERVIEW

AVP_ERP là hệ thống quản lý sản xuất/đóng gói (packing flow) cho AVP
(gia công ốc vít cho Infasco).

**✅ Stack — đã chốt (2026-09-17)**:

| Thành phần | Công nghệ | Lý do |
|---|---|---|
| Frontend + Backend | **Next.js + TypeScript** | Kế thừa đúng code/pattern đã chạy thật 9 tháng ở AVP_AI (OCR, CaptureGate, GlobalSearchBar, validate rules) — an toàn hơn viết lại từ đầu bằng ngôn ngữ khác |
| Database | **PostgreSQL** | Thay Google Sheets — transaction thật, CHECK constraint, sổ cái bất biến (xem Mục 3) |
| Triển khai | On-premise, mạng nội bộ (LAN) — 3 máy vật lý cố định + 1 laptop di động (xem Mục 2) | Không phụ thuộc internet/tunnel để vận hành hàng ngày |

*Đánh đổi đã chấp nhận*: KHÔNG dùng bộ khung Python
(`Orchestrator`/`HumanGate`/`ImmutableLedger`) có sẵn của ISO_CA (khác
Ops_Ai — project đó dùng Python nên dùng thẳng được) — đã gỡ khỏi
`D:\AVP_ERP` (`src/`, `config/`, `tests/`, `requirements.txt`, `prompts/`
— code chết vì AVP_ERP không dùng Python). Giữ lại toàn bộ `docs/`
(documentation ISO không phụ thuộc ngôn ngữ lập trình).

---

## 2. KIẾN TRÚC HẠ TẦNG — 3 MÁY CỐ ĐỊNH + 1 LAPTOP DI ĐỘNG + MẠNG NỘI BỘ

### 2.1 Ba máy vật lý cố định + 1 laptop admin (đã chốt vai trò)

```
┌───────────────────────────┐
│  MÁY 1 — SERVER             │  Đặt tại Office. Có màn hình nhưng
│  Next.js + PostgreSQL       │  KHÔNG ai thao tác nghiệp vụ trực tiếp
│  headless, chỉ chạy nền     │  (chỉ xem khi cần kiểm tra/troubleshoot)
└─────────────┬─────────────────┘
              │  LAN nội bộ — IP nội bộ, KHÔNG tunnel
   ┌──────────┼──────────┬──────────────┐
   ▼          ▼          ▼              ▼
┌─────────┐ ┌─────────┐ ┌────────────────────┐
│ MÁY 2    │ │ MÁY 3    │ │ MÁY 4 — LAPTOP ADMIN │
│ Trạm 1   │ │ Trạm 2   │ │ Giám đốc/Quản lý     │
│ Office   │ │ Xưởng    │ │ (di động, nối WiFi   │
│          │ │          │ │ nội bộ khi có mặt tại│
│          │ │          │ │ Office/Xưởng —       │
│          │ │          │ │ KHÔNG remote)        │
└─────────┘ └─────────┘ └────────────────────┘
```

| Máy | Vai trò | Phần mềm cần |
|---|---|---|
| **Máy 1 — Server** | Chạy Next.js + PostgreSQL, không ai thao tác nghiệp vụ | Node.js runtime, PostgreSQL — không cần trình duyệt |
| **Máy 2 — Trạm 1 (Office)** | Search tổng + add file/đọc file (OCR đọc PO/Traveler) + tạo Packing List/Packing Slip + xem báo cáo | Chỉ cần trình duyệt (Chrome/Edge) |
| **Máy 3 — Trạm 2 (Xưởng)** | Search tổng (như `GlobalSearchBar`, **giống hệt Office**) + nhập data tay (như `CaptureGate`) + in sticker (tham khảo `PrintOut` cũ) — **KHÔNG add file/đọc file** | Chỉ cần trình duyệt + máy in sticker |
| **Máy 4 — Laptop admin (Giám đốc/Quản lý)** (MỚI 2026-09-17, sửa lại cùng ngày sau phản biện) | **FULL — toàn bộ nghiệp vụ**: search tổng + **add file/đọc file (OCR)** + tạo/sửa Packing Slip + xác nhận record + toàn bộ báo cáo (FID-ERP-012 + FID-ERP-008). Superset của cả Office lẫn Xưởng, dùng cho quản lý cấp cao thao tác từ xa trong LAN khi cần | Chỉ cần trình duyệt, nối WiFi nội bộ |

**✅ Chốt phân quyền theo trạm (2026-09-17, sửa lại cùng ngày)**: Search là
năng lực chung, đối xứng ở cả 3 điểm truy cập. **add file/đọc file (điểm
vào của OCR) có ở 2 nơi: Office VÀ Máy 4 (admin)** — Xưởng vẫn là nơi DUY
NHẤT không có quyền này. Quyết định ban đầu (2026-09-17, phiên trước) là
"1 cổng AI duy nhất — chỉ Office" đã bị Andy SỬA LẠI ngay sau khi phản biện
tài liệu `docs/records/Consultations/260917-Pilot_Infra.md`: Máy admin cần
làm được toàn bộ nghiệp vụ, không chỉ xem. Xem lý do đổi + tác động ở
`AI_POLICY.md` mục "AI Gateway" (đã đổi từ "Single" thành "2 cổng có kiểm
soát").

**✅ Chốt truy cập laptop admin (2026-09-17, không đổi)**: LAN-only — laptop
chỉ truy cập được khi có mặt tại Office/Xưởng và nối WiFi nội bộ, giống hệt
nguyên tắc Máy 2/Máy 3 (KHÔNG VPN, KHÔNG mở port ra internet). Nếu sau
này cần xem từ xa (nhà, đi công tác), đây là một quyết định kiến trúc
RIÊNG (cần VPN hoặc cơ chế truy cập từ xa an toàn) — CHƯA làm ở giai đoạn
này, hỏi lại Andy khi phát sinh nhu cầu thật.

**Vai trò "Giám đốc/Quản lý"**: một người khác, không phải Andy — đã bổ
sung vào `PROJECT_INFO_FORM.md` §3 và
`docs/cl05_leadership/ROLES_RESPONSIBILITIES.md`.

### 2.2 Mạng nội bộ (LAN) — nguyên tắc

Máy 2 và Máy 3 truy cập Máy 1 qua **địa chỉ IP nội bộ** (vd
`http://192.168.x.x:3000`), KHÔNG qua tunnel/internet — mất internet vẫn
thao tác bình thường ở cả 2 trạm. Internet CHỈ cần cho 1 việc: Máy 1 đọc
email PO từ Infasco.

Dây/kết nối cụ thể, switch, UPS, máy in sticker, backup — xem
[`FACILITIES_SETUP.md`](FACILITIES_SETUP.md) (checklist mua sắm/lắp đặt
riêng, tránh trùng lặp nội dung ở đây).

### 2.3 Câu hỏi hạ tầng còn mở

Xem đầy đủ ở `FACILITIES_SETUP.md` Mục 5 (checklist 9 mục) — quan trọng
nhất: khoảng cách vật lý Office↔Xưởng (quyết định dây Cat6 hay WiFi),
chính sách backup, và ai quản trị hệ thống.

*Phân quyền theo TÍNH NĂNG (search/add file) đã chốt ở Mục 2.1 trên. Phân
quyền theo TÀI KHOẢN (đăng nhập theo trạm hay theo người dùng cụ thể) — vẫn
để ngỏ, phụ thuộc số người dùng đồng thời thực tế mỗi trạm.*

---

## 3. DATA MODEL — HƯỚNG THAM KHẢO (chưa phải schema cuối)

*Đối chiếu đầy đủ giữa chuẩn Odoo và những gì AVP_ERP cố tình khác (kèm
bằng chứng dữ liệu thật cho từng điểm khác) — xem
[`ODOO_COMPARISON.md`](ODOO_COMPARISON.md).*

Tham khảo mô hình Odoo thật đã nghiên cứu ở
`AVP_AI/THIET_KE_HE_THONG_MOI.md` Phần 3-4 (`stock.move`/`stock.quant`/
`stock.lot`), áp dụng NGHIỆP VỤ AVP (không copy nguyên bảng Odoo):

- `travelers` — 1 dòng/Traveler#, khoá chính thật.
- `stock_moves` — sổ cái BẤT BIẾN (append-only): mỗi lần nhận/lựa/đóng
  gói/xuất là 1 bút toán mới, không sửa đè (thay hẳn cách AVP_AI sửa
  field trực tiếp — xem so sánh chi tiết ở `AI_POLICY.md`).
  `move_type` (chốt 2026-09-17, tham khảo `stock.picking` 3-loại-thao-tác +
  `stock.scrap` của Odoo — xem `D:\Ops_Ai\Data\References_app\Odoo\odoo_templates\Koai_claude.md`
  Mục III/IV): `RECEIVE` (nhận NVL), `SELECT` (qua máy lựa, gắn qcStatus),
  `PACK` (đóng gói vào Packing Slip), `SHIP` (xuất hàng, tương đương
  `stock.picking` loại Delivery WH/OUT), `SCRAP` (hàng lỗi/hỏng huỷ —
  tương đương `stock.scrap`, PHẢI có lý do/reason, không gộp chung với
  HOLD), `RETURN` (trả lại, link `Pot#`=GAYLORD — xem FID-ERP-007). Đây là
  nguồn dữ liệu DUY NHẤT cho báo cáo sản xuất (xem FID-ERP-012) — không tạo
  bảng tổng hợp riêng, mọi số liệu báo cáo đều SUM/COUNT/GROUP BY trực tiếp
  trên `stock_moves`, đúng nguyên tắc Odoo "Manufacturing Analysis" đọc
  thẳng `stock.move`, không dựng bảng cache riêng.

  **`machine_code`** (chốt 2026-09-17, Andy xác nhận: "sản lượng = traveler
  xong từng máy cộng hết lại") — BẮT BUỘC có trên mọi dòng `move_type =
  'SELECT'` VÀ `'PACK'` (2 khâu khác nhau, xem bằng chứng dữ liệu thật
  dưới đây), **kể cả khi Traveler được lựa TAY chứ không qua máy tự động**
  — Andy xác nhận 2026-09-17: "máy trạm hay lựa tay thì dựa vào mã máy",
  nghĩa là lựa tay vẫn phải gán 1 mã (vd mã trạm lựa tay riêng, không được
  để trống) — không có giá trị NULL/"manual" mơ hồ, vẫn 1 mã cụ thể như
  mọi máy khác. Xưởng có NHIỀU máy lựa chạy song song, mỗi Traveler xong ở
  ĐÚNG 1 máy. Sản lượng sản xuất KHÔNG phải 1 con số đơn — phải tính riêng
  theo từng máy (`GROUP BY machine_code`) rồi CỘNG DỒN lại thành tổng. Đây
  là điểm tương đương `mrp.workcenter`/Work Center Load của Odoo (xem
  `Koai_claude.md` Mục II.4c — Ops_Ai/khoai hiện CHƯA dùng phần này của
  Odoo, nhưng AVP_ERP cần ngay từ đầu vì nghiệp vụ thật có nhiều máy).

  **Đã xác minh bằng dữ liệu mẫu thật** (`Data/`, đọc 2026-09-17) — mã máy
  KHÔNG cần bịa, đã tồn tại thật ở nhiều khâu, dùng lại nguyên:
  - Phiếu Traveler giấy: trường **"Sorting M/C #"** (vd `MC112`)
  - `WorkStationArchive` (`Data/3.FINISHED PALLET/FINISHED PALLET REPORT_final.xlsm`): cột **`Station#`** (vd `BF116`, `bf118a/b`)
  - `CHECKING SUMMARY` (`Data/4.WRAPPING/Wrapping_final.xlsm`, khâu Wrapping/đóng gói): 2 cột riêng **`Machine`** + **`MC#`** (vd `Tbl` + `1`) — khâu PACK dùng mã khác khâu SELECT, không gộp chung 1 cột
  - `Data/6.Reports/Daily Sale by Station.xlsx`: cột **`Work Station`/`Station`** (vd `BF113`, `TB9-INF MV`, `LINE 1`) — ĐÃ có sẵn 1 báo cáo tổng hợp theo trạm/ngày ở AVP_AI, dùng làm đối chiếu số liệu thật khi test FID-ERP-012

  **`operator_code`** (MỚI, chốt 2026-09-17 cùng lúc — Andy: "skid đã có
  cột OPRTR và ký hiệu số là tên người công nhân") — cột `Oprtr` đã có
  thật trong `CHECKING SUMMARY` (vd `111`, `11/293` — mã số định danh công
  nhân, không phải tên chữ). BẮT BUỘC ghi trên `stock_moves` ở các khâu có
  người thao tác trực tiếp (SELECT/PACK), cùng lý do với `machine_code`:
  dữ liệu thật đã theo dõi đến mức này, không lược bớt khi chuyển sang
  Postgres.

  **`shift`** (MỚI, cùng lúc) — cột `SHIFT` đã có thật trong `CHECKING
  SUMMARY` (giá trị quan sát được: `Mrnng` = ca sáng; suy ra còn ca
  chiều/tối tương ứng) — BẮT BUỘC ghi cùng lúc với `operator_code`.

  Ảnh hưởng trực tiếp FID-ERP-001 (schema phải có đủ 3 cột
  `machine_code`/`operator_code`/`shift` — không chỉ 1 cột `machine_code`
  như bản nháp trước) và FID-ERP-003 (nhập liệu tại Xưởng phải ghi đủ máy
  nào/ai/ca nào xử lý) — [TO BE CONFIRMED: danh sách đầy đủ mã máy + mã ca
  (bao nhiêu ca/ngày, tên gọi chính xác ngoài "Mrnng") — dùng đúng giá trị
  thật quan sát được trong `Data/`, không tự đặt tên mới].
- `part_control` — Part# + Quantity/box + client, UNIQUE(part).
- `packing_slips` + `packing_slip_lines` — tách bảng đúng chuẩn (1
  header, nhiều dòng), transaction khi tạo.
- `print_log` (MỚI, phục vụ Máy 3) — mỗi lần in sticker ghi 1 dòng
  (Traveler#, Part#, ai in, lúc nào).

*Nguyên tắc governance (AI chỉ tạo nháp, người duyệt cuối, audit trail
bắt buộc...) — xem `docs/cl05_leadership/AI_POLICY.md`, không lặp lại ở
đây.*

## 4. LỘ TRÌNH ĐỀ XUẤT

1. Chốt câu hỏi hạ tầng còn mở (`FACILITIES_SETUP.md` Mục 5).
2. Điền `PROJECT_INFO_FORM.md`, chạy `CLAUDE_INIT_PROMPT.md` để tự động
   điền 5 file setup (CLAUDE.md, AIMS_SCOPE, BRS, AI_POLICY, RISK_REGISTER).
3. Thiết kế schema Postgres đầy đủ + dựng server thử nghiệm trên LAN.
4. Build song song với AVP_AI — không động vào AVP_AI trong lúc này.
5. Chạy thử thật quy mô nhỏ (1 PO, 1 ca), đối chứng song song AVP_AI.
6. Migrate dữ liệu lịch sử 1 lần, cắt hẳn khi đạt đủ tính năng + qua
   thử nghiệm.

---
*SOFTWARE_ARCHITECTURE v0.3 (draft) — AVP_ERP*
*Kế thừa AVP_AI/THIET_KE_HE_THONG_MOI.md (quy trình 6 khâu, đã xác minh dữ liệu thật)*
*Stack: Next.js + TypeScript + PostgreSQL — chốt 2026-09-17*
*Cập nhật: 2026-09-17 — gỡ "mô hình 5 lớp AI" ra khỏi file này (thuộc AI_POLICY.md, không phải kiến trúc runtime)*
