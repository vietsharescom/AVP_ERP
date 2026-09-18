# BRS.md -- Business Requirements Specification | ISO/IEC/IEEE 29148:2018 | v2.0 — AVP_ERP

## BUSINESS CONTEXT
Problem: Quy trình đóng gói/xuất hàng AVP (gia công ốc vít cho Infasco) chạy trên 2 file
  Excel song song không khớp nhau (đo thật: 0/30 ngày KPI khớp, 797/1.847 traveler lệch
  giữa các sheet). AVP_AI (Google Sheets) đã giải quyết phần lớn nhưng Google Sheets thiếu
  transaction/khoá ngoại/audit trail thật ở tầng lưu trữ.

Value: Postgres làm nguồn sự thật duy nhất — transaction thật, CHECK constraint ở tầng DB,
  sổ cái bất biến kiểu `stock.move` (Odoo). Giữ nguyên mô hình kiểm soát AI đã chạy thật ở
  AVP_AI (AI chỉ tạo nháp, người luôn duyệt cuối — xem AI_POLICY.md). Thêm kiến trúc 2 trạm
  vật lý (Office / Xưởng) thay vì 1 web app dùng chung không phân vai.

## BUSINESS OBJECTIVES
| ID | Objective | Priority | Success Metric |
|---|---|---|---|
| BO-001 | Office tạo Packing Slip đúng số lượng không cần dò tay qua nhiều Sheet/Excel | Must Have | Xem OBJ-001, AI_OBJECTIVES.md |
| BO-002 | Quản lý xem báo cáo PO còn tồn đọng bao nhiêu Traveler không cần đếm tay | Must Have | PO↔tiến độ khớp 100% tự động (OBJ-002) |
| BO-003 | Operator xưởng nhập liệu + in sticker tại đúng trạm, không cần quay lại office | Must Have | 0 round-trip Office/Xưởng mỗi ca (OBJ-003) |

## CONSTRAINTS
| Type | Constraint |
|---|---|
| Regulatory | PIPEDA (federal, Canada) — Minimal AI Risk Tier, no EU AI Act exposure. See AI_POLICY.md and LEGAL_CA.md |
| Technical | Next.js + TypeScript + PostgreSQL, on-premise LAN (3 máy vật lý cố định + 1 laptop di động), no internet dependency for daily operation except PO email fetch. See SOFTWARE_ARCHITECTURE.md |
| Technical | ORM/query lib: **Prisma** (chốt 2026-09-17, see FID_LIST.md) |
| Budget/Timeline/Team | [TO BE CONFIRMED — see PROJECT_INFO_FORM.md §6] |

*BRS v2.0 | AVP_ERP | ISO/IEC/IEEE 29148:2018*
*Filled 2026-09-17 from PROJECT_INFO_FORM.md §2 and §6*
