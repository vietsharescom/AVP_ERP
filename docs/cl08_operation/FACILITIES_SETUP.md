# FACILITIES_SETUP.md — AVP_ERP
# Yêu cầu hạ tầng vật lý (phần cứng/mạng) — chờ lắp đặt trước khi dùng
# Trạng thái: DRAFT — nhiều mục còn [TO BE CONFIRMED], cần đo/quyết định
# thật tại chỗ trước khi mua sắm/lắp đặt
# Cập nhật: 2026-09-17

---

> Tài liệu này gộp lại TOÀN BỘ yêu cầu cấu hình/hạ tầng đã bàn trong
> phiên thiết kế 2026-09-17 — tách riêng khỏi
> [`SOFTWARE_ARCHITECTURE.md`](SOFTWARE_ARCHITECTURE.md) (thiết kế
> phần mềm) để dùng làm checklist mua sắm/lắp đặt thực tế. Hướng dẫn
> CÀI ĐẶT CHI TIẾT từng bước (cấu hình router, gán IP tĩnh cụ thể...) —
> ĐỂ DÀNH viết sau khi đã có đủ thông tin đo đạc thật tại xưởng, chưa
> viết ở bản này.

---

## 0. TỔNG QUAN — 3 MÁY VẬT LÝ CỐ ĐỊNH + 1 LAPTOP DI ĐỘNG

```
┌───────────────────────────┐
│  MÁY 1 — SERVER             │  Đặt tại Office. Có màn hình nhưng
│  (Postgres + app)           │  KHÔNG ai thao tác nghiệp vụ trực tiếp.
└─────────────┬─────────────────┘
              │  LAN nội bộ (IP nội bộ, KHÔNG tunnel)
   ┌──────────┼──────────┬──────────────┐
   ▼          ▼          ▼              ▼
┌─────────┐ ┌─────────┐ ┌──────────────────┐
│ MÁY 2    │ │ MÁY 3    │ │ MÁY 4 — LAPTOP     │
│ Office   │ │ Xưởng    │ │ Giám đốc (BYOD,     │
│          │ │          │ │ WiFi nội bộ, không  │
│          │ │          │ │ mua sắm gì thêm)    │
└─────────┘ └─────────┘ └──────────────────┘
```

**Máy 4 (laptop Giám đốc, thêm 2026-09-17)** không cần mục checklist mua
sắm riêng (BYOD — laptop cá nhân của Giám đốc, không phải thiết bị AVP mua)
— chỉ cần WiFi nội bộ phủ sóng tới nơi Giám đốc ngồi (Office và/hoặc
Xưởng), đã nằm trong phạm vi khảo sát Mục 4 dưới đây. Không có kết nối
mạng riêng, không dây/switch bổ sung.

---

## 1. MÁY 1 — SERVER

| Hạng mục | Yêu cầu | Trạng thái |
|---|---|---|
| Vị trí | Office | ✅ Đã chốt |
| Vai trò | Chạy Postgres + app server (Next.js/Python — tuỳ stack) | ✅ |
| Người thao tác | KHÔNG ai dùng cho việc khác — chỉ chạy nền | ⚠ Cần xác nhận máy hiện có hay mua mới |
| CPU/RAM/ổ cứng | Tối thiểu tham khảo: RAM 8GB+, ổ SSD (Postgres nhanh hơn) | [TO BE CONFIRMED — cấu hình máy thật] |
| Hệ điều hành | Windows hoặc Linux | [TO BE CONFIRMED — phụ thuộc stack TypeScript/Python] |
| UPS (lưu điện) | **Bắt buộc** — chống mất điện đột ngột làm hỏng dữ liệu Postgres đang ghi | [TO BE CONFIRMED — cần mua] |
| IP nội bộ | Cần **IP tĩnh** (static) hoặc DHCP reservation trên router — không đổi khi router khởi động lại | [TO BE CONFIRMED — cần cấu hình] |
| Internet | Cần, băng thông thấp đủ dùng — CHỈ để nhận email PO từ Infasco, KHÔNG phải để Trạm 1/2 truy cập app (đi qua LAN nội bộ, không qua internet) | ✅ Đã có sẵn (Office đang dùng internet) |
| Backup | Kế hoạch mặc định đề xuất (sau tư vấn GPT+Grok 2026-09-17, xem `docs/records/Consultations/260917_Architechture/FINAL_DECISION.md`): `pg_dump` hàng ngày + 1 bản copy sang thiết bị khác (ổ cứng rời/NAS, không cùng máy Server) | [TO BE CONFIRMED — Andy để "sau": chưa quyết ngân sách/thiết bị cụ thể + RPO/RTO chính thức] |
| Người quản trị | Ai có quyền truy cập/quản trị máy chủ | [TO BE CONFIRMED — chỉ Andy hay có người khác] |

## 2. MÁY 2 — TRẠM 1 (OFFICE)

| Hạng mục | Yêu cầu |
|---|---|
| Vai trò | PO (đọc email/OCR) + tạo Packing List/Packing Slip + xem báo cáo |
| Phần cứng | Máy tính văn phòng thường — không cần cấu hình đặc biệt (xử lý nặng nằm ở Máy 1) |
| Phần mềm | Chỉ cần trình duyệt web hiện đại (Chrome/Edge) — không cài gì riêng |
| Kết nối | LAN/WiFi nội bộ, trỏ tới IP nội bộ của Máy 1 |
| Máy hiện có? | [TO BE CONFIRMED — dùng máy Andy đang dùng, hay máy riêng] |

## 3. MÁY 3 — TRẠM 2 (XƯỞNG)

| Hạng mục | Yêu cầu |
|---|---|
| Vai trò | Search tổng + nhập data tay + in sticker |
| Phần cứng | Trình duyệt web — không cần máy mạnh. Môi trường xưởng (bụi/ẩm/rung) → cân nhắc vỏ bảo vệ hoặc industrial panel PC thay vì máy tính văn phòng thường | [TO BE CONFIRMED — mức độ khắc nghiệt môi trường thật tại vị trí đặt máy] |
| Máy in sticker | Tra Traveler#+Part# → in sticker dán phiếu Traveler giấy (tham khảo `PrintOut` cũ) | [TO BE CONFIRMED — loại máy in AVP đang dùng cho sticker cũ: khổ tem, kết nối USB hay mạng] |
| Kết nối | LAN/WiFi nội bộ, trỏ tới IP nội bộ của Máy 1 | Xem Mục 4 |
| Vị trí đặt máy trong xưởng | [TO BE CONFIRMED — vị trí cụ thể, ảnh hưởng phương án đi dây] |

## 4. MẠNG NỘI BỘ (LAN)

**Nguyên tắc**: Máy 2 (Office) và Máy 3 (Xưởng) đều truy cập Máy 1 qua
**địa chỉ IP nội bộ**, KHÔNG qua tunnel/internet — để đạt mục tiêu "mất
internet vẫn thao tác được" (chỉ riêng việc đọc email PO mới cần
internet, xem Mục 1).

| Hạng mục | Yêu cầu | Trạng thái |
|---|---|---|
| Switch mạng | 1 switch đủ cổng cho 3 máy + chừa dư, đặt gần Máy 1 | [TO BE CONFIRMED — cần mua] |
| Dây nối Máy 1 ↔ Máy 2 (Office) | Cat6 Ethernet — 2 máy cùng khu Office, khoảng cách thường ngắn, kéo dây dễ | [TO BE CONFIRMED — khoảng cách thật] |
| Dây/kết nối Máy 1 ↔ Máy 3 (Xưởng) | **Ưu tiên Cat6 Ethernet** (ổn định hơn WiFi — máy móc kim loại trong xưởng gây nhiễu sóng WiFi). Nếu khoảng cách xa/khó kéo dây (qua tường bê tông, khu vực khác) → phương án thay thế: **WiFi access point** riêng cho khu xưởng, hoặc **powerline adapter** (dùng dây điện có sẵn) | [TO BE CONFIRMED — cần đo khoảng cách + khảo sát đường đi dây thật] |
| Khoảng cách Office ↔ Xưởng | — | **[TO BE CONFIRMED — QUAN TRỌNG NHẤT, quyết định chọn dây hay WiFi]** |

*Hướng dẫn lắp đặt chi tiết từng bước (đi dây qua đâu, cấu hình switch/
router cụ thể, gán IP tĩnh) — viết SAU khi có đủ số đo khoảng cách +
khảo sát thực tế tại xưởng.*

## 5. CHECKLIST TỔNG HỢP — CẦN ĐO/QUYẾT ĐỊNH TRƯỚC KHI MUA SẮM

- [ ] Khoảng cách vật lý Office ↔ Xưởng (mét) — quyết định dây hay WiFi
- [ ] Cấu hình máy hiện có (nếu tái dùng) cho cả 3 máy, hay cần mua mới
- [ ] Hệ điều hành Máy 1 (Windows/Linux) — phụ thuộc quyết định stack
      TypeScript/Python (xem `SOFTWARE_ARCHITECTURE.md` Mục 2)
- [ ] Ai quản trị hệ thống (chỉ Andy hay có người khác)
- [ ] Tần suất + thiết bị backup (ổ cứng rời/NAS)
- [ ] Loại máy in sticker hiện dùng (khổ tem, USB hay mạng)
- [ ] Số người dùng đồng thời thực tế mỗi trạm
- [ ] Mức độ khắc nghiệt môi trường tại vị trí đặt Máy 3 (bụi/ẩm/rung)
- [ ] Ngân sách dự kiến cho phần cứng (switch, dây, UPS, máy in, máy tính
      nếu cần mua mới)

---
*FACILITIES_SETUP v0.1 (draft) — AVP_ERP*
*Đối chiếu: `SOFTWARE_ARCHITECTURE.md` Mục 3-4 (thiết kế phần mềm/mạng)*
*Cập nhật: 2026-09-17*
