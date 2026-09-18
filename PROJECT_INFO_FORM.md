# PROJECT_INFO_FORM.md  v3.1 — ISO_CA
# Standard: ISO/IEC 42001:2023 + PIPEDA + Health Canada + IBM Design Thinking + ISO 29148
# Goal: Provide exactly what 5 setup docs + pipeline L0-L10 need to operate
# Note: EU AI Act Annex IV removed — AIDA not yet in force in Canada
# ============================================================================
# ĐÃ AI DỰ THẢO (2026-09-17) từ toàn bộ context AVP_AI hiện có (LATEST_SESSION,
# THIET_KE_HE_THONG_MOI.md, ISO_AI_CONTROL.md, docs/features/, 3 báo cáo
# 09-15) — KHÔNG bịa số liệu, mọi ô không chắc để nguyên [TO BE CONFIRMED].
# Andy đọc lại, sửa/điền các ô [TO BE CONFIRMED] rồi mới dán CLAUDE_INIT_PROMPT.md.
# ============================================================================

##############################################################################
## SECTION 1 — IDENTITY  →  fills: CLAUDE.md + AIMS_SCOPE.md
##############################################################################

Project Code:       AVP
Project Name:       AVP_ERP (kế tiếp AVP_AI, dùng Postgres thay Google Sheets)
Owner:              Andy Phan (Viet)
Organization:       Maple Leaf Group
Project Type:       Internal Tool (giai đoạn đầu — xem ghi chú dưới về khả năng mở rộng)
Local Path:         D:\AVP_ERP
GitHub URL:         https://github.com/vietsharescom/AVP_ERP (tạo mới 2026-09-18, riêng cho AVP_ERP — không dùng chung remote với AVP_AI)
Stack:              PostgreSQL, Next.js + TypeScript (kế thừa stack đã chạy thật ở AVP_AI),
                     Gemini AI (OCR đọc PO/Traveler — [TO BE CONFIRMED model cụ thể, AVP_AI
                     đang dùng gemini-3.5-flash-lite])
Start Date:         2026-09-17
MVP Deadline:       [TO BE CONFIRMED — chưa có hạn cụ thể]

Output Type:        Web App
Deployment:         On-premise (server tại mạng nội bộ xưởng — LAN) — chi tiết hạ tầng cụ
                     thể (máy nào, ai giữ, backup) CHƯA chốt, xem SOFTWARE_ARCHITECTURE.md
                     Mục 3 (6 câu hỏi mở)
Market:             Canada — [TO BE CONFIRMED tỉnh/bang cụ thể, CLAUDE.md AVP_AI chỉ ghi
                     "Canada", chưa ghi rõ province]
UI Language:        ⚠ Form này mặc định English/French — KHÔNG khớp thực tế AVP: giao diện
                     AVP_AI hiện tại 100% tiếng Việt (Andy + operator xưởng dùng tiếng Việt),
                     không phải English/French. Giữ nguyên tiếng Việt cho AVP_ERP — [TO BE
                     CONFIRMED nếu Andy muốn đổi]
Province:           [TO BE CONFIRMED]

##############################################################################
## SECTION 2 — PROBLEM & GOALS  →  fills: BRS.md + AIMS_SCOPE.md Clause 4.3
##############################################################################

Problem:
  Quy trình đóng gói/xuất hàng AVP (gia công ốc vít cho Infasco) trước đây
  chạy trên 2 file Excel (DAILY LOG CHECK SHEET.xlsm, PACKING SLIPS.xlsm),
  nhiều nguồn ghi song song không khớp nhau (đo thật: 0/30 ngày KPI khớp,
  797/1.847 traveler lệch giữa các sheet). AVP_AI (Google Sheets) đã giải
  quyết phần LỚN vấn đề này (1 sổ cái, cross-check, human CCP) nhưng bản
  thân Google Sheets thiếu transaction/khoá ngoại/audit trail thật ở tầng
  lưu trữ — vẫn còn lỗi thật kiểu "1 route quên 1 bước" (vd 22 traveler
  quên đánh shipped=TRUE do 1 script nhập lịch sử không đi qua route
  chung).

Value / Solution:
  Postgres làm nguồn sự thật duy nhất — transaction thật (ghi đủ hoặc
  không ghi gì), CHECK constraint ở tầng DB, sổ cái bất biến kiểu
  `stock.move` (Odoo). Giữ nguyên mô hình 5 lớp kiểm soát AI đã chạy thật
  ở AVP_AI (AI chỉ tạo nháp, người luôn là người duyệt cuối). Thêm kiến
  trúc 2 trạm vật lý (Office điều khiển / Xưởng thao tác tại chỗ + in
  sticker) thay vì 1 web app dùng chung không phân vai.

Hill 1: Nhân viên Office tạo Packing Slip đúng số lượng mà không cần dò
        tay qua nhiều Sheet/file Excel.
Hill 2: Quản lý xem báo cáo PO còn tồn đọng bao nhiêu Traveler mà không
        cần đếm tay.
Hill 3: Operator ở xưởng nhập liệu + in sticker tại đúng trạm, không cần
        quay lại office.

Metric 1: [TO BE CONFIRMED — AVP_AI đã đo baseline ~32 giờ hao phí/ngày
          (7h gõ tay + 25h dò tìm không hiệu quả); AVP_ERP giảm bao nhiêu
          là mục tiêu cụ thể cần Andy xác nhận]
Metric 2: KPI đối chiếu PO↔tiến độ khớp 100% tự động (AVP_AI hiện đo được
          0/30 ngày khớp bằng tay — mục tiêu tối thiểu: không còn phải
          đếm tay)
Metric 3: [TO BE CONFIRMED — chưa có mục tiêu adoption rate cụ thể]

Not in scope (kế thừa đúng phạm vi đã chốt ở AVP_AI, chưa mở lại):
  Hàng tháo rã (Unbuild, FID-006 — BLOCKED, chưa xác nhận có xảy ra thật)
  | Asset Ledger vòng đời container (Giai đoạn 3, chưa ưu tiên)
  | Tự động hoá đầy đủ chi phí lao động/OEE (module riêng, chưa bắt đầu)
  | Bộ lọc email tự động phân loại PO/Lot (FID-008 — Owner quyết định để
    dành khi có nhu cầu thật)

##############################################################################
## SECTION 3 — USERS & DOMAIN  →  fills: AIMS_SCOPE.md + L1_SEMANTIC + L6_AGENT
##############################################################################

Primary User:       3 persona (cập nhật 2026-09-17, sửa lại cùng ngày sau
                     phản biện Consultations/260917-Pilot_Infra.md) — (1)
                     Nhân viên Office: tạo Packing Slip, đọc email PO (OCR),
                     xem báo cáo — 1 trong 2 vai trò được add file/đọc file.
                     (2) Operator xưởng: nhập liệu tay, quét Traveler#/Part#,
                     in sticker — search giống Office nhưng KHÔNG add file
                     (vai trò DUY NHẤT không có quyền này). (3) Giám đốc/Quản
                     lý (MỚI — người khác, không phải Andy): dùng laptop
                     riêng (Máy 4 — "máy admin", LAN-only, không remote) —
                     **FULL quyền như Office CỘNG THÊM mọi báo cáo**
                     (FID-ERP-008, FID-ERP-012): search toàn bộ, add
                     file/OCR, tạo/sửa Packing Slip, xác nhận record.
Tech Level:          Basic — operator xưởng thao tác tay, không rành công
                     nghệ (đúng thực tế đã quan sát ở AVP_AI)
Pain Point:          Không biết dữ liệu ở sổ nào là đúng khi có nhiều nguồn
                     song song lệch nhau; xuất hàng thiếu Lot#/quá HOLD do
                     không ai chặn được ở đúng lúc.
Goal:                Tạo Packing Slip đúng, đủ điều kiện (không HOLD, có
                     Lot thật hoặc Concession), tra cứu nhanh mọi Traveler.

As-Is (steps, kế thừa từ AVP_AI đã xác minh):
  1. Email PO từ Infasco → gõ tay/OCR vào hệ thống.
  2. Máy lựa → PASS/HOLD ghi trên phiếu Traveler giấy.
  3. WorkStationArchive (Excel) — operator gõ Quantity/Defect/Partial tay.
  4. Wrapping/Status — kiểm tra thực tế, hiện chỉ đánh dấu tay trên giấy
     in, KHÔNG gõ lại vào hệ thống (gap đã biết).
  5. Tạo Packing Slip — tra cứu Traveler# tay hoặc qua GlobalSearchBar.
Biggest pain step: Bước 4 — báo cáo đã đúng số nhưng vẫn bị in giấy + tích
  tay lại, mất dấu vết điện tử.

Industry:            Logistics (gia công/đóng gói theo hợp đồng — contract
                     manufacturing & packing)
Sub-sector:          Metal fastener manufacturing & packing (gia công ốc
                     vít, nut/bolt) cho khách hàng Infasco
Domain terms:        Traveler#, Part#, Pot#, Lot#/LOT NO., Skid#, PO, PS
                     (Packing Slip), qcStatus (PASS/HOLD/CONCESSION),
                     Rework/Return (Pot#=GAYLORD), Partial Qty, Defect
                     (10 loại: Loose Washer Nut, Damaged Pilot...), Special
                     Notes, WorkStationArchive, CHECKING SUMMARY, PrintOut,
                     Quantity/box, Total Pallets/Total Empty
Industry Standards:  ISO 9001 Clause 8.7 (Nonconformance & Corrective
                     Action — đã áp dụng cho qcStatus/Concession/Rework ở
                     AVP_AI, tham khảo trực tiếp D:\Ops_Ai mục 18)

##############################################################################
## SECTION 4 — DATA & AI MODEL  →  fills: BRS.md + L1/L2/L6 config
##############################################################################

Input Type:          Document (PDF/ảnh/Excel .xlsm) + Structured (Postgres)
                     + Manual entry (Trạm 2 xưởng)
Input Source:        Email PO Infasco (PDF/ảnh) | File Excel gốc máy
                     (WorkStationArchive, CHECKING SUMMARY) | Nhập tay tại
                     Trạm 2
Input Language:      Tiếng Việt (phiếu Traveler, ghi chú operator) + số
                     liệu tiếng Anh (Part#/PO theo chuẩn Infasco)
Input Volume:        [TO BE CONFIRMED — AVP_AI đo được ~vài nghìn dòng/
                     tháng, cần số chính xác hơn từ Andy nếu cần]
Input Quality:       Chữ viết tay trên phiếu giấy (biến thiên) + file Excel
                     gõ tay (sạch hơn, có barcode xác định dòng)

Dataset:             Dữ liệu lịch sử AVP_AI (5 Google Sheets: RawMaterial,
                     Warehouse, FinishGood, PartControl, PackingList) — migrate
                     1 LẦN DUY NHẤT sau khi schema ổn định, KHÔNG đồng bộ 2
                     chiều liên tục (xem SOFTWARE_ARCHITECTURE.md Mục 0)
Dataset Path/URL:    D:\AVP_AI\Data\ (nguồn Excel gốc) + Google Sheets AVP_AI
                     hiện có — [TO BE CONFIRMED phạm vi copy cụ thể, Andy
                     yêu cầu "copy data qua riêng" nhưng chưa xác định copy
                     những gì]
Public Data Used:    Gemini AI (Google) — mô hình có sẵn, không dataset công
                     khai nào khác
Bias/Quality Risk:   OCR đọc chữ viết tay có thể sai (đã ghi nhận thật: lỗi
                     đọc lệch cột traveler 717544) — cần giữ nguyên cơ chế
                     cảnh báo đối chiếu chéo đã có ở AVP_AI

AI Model:            Gemini ([TO BE CONFIRMED phiên bản chính thức — AVP_AI
                     hiện dùng gemini-3.5-flash-lite])
Speech Model:        N/A
RAG / Embedding:     N/A
Fine-tune Needed:    No — general model đủ (đã kiểm chứng ở AVP_AI 9 tháng)

Min Confidence:      [TO BE CONFIRMED — AVP_AI có field `confidence` do AI
                     tự báo nhưng chưa có ngưỡng chặn cứng]
Hallucination Risk:  Medium — không phải y tế/pháp lý, nhưng sai số lượng
                     ảnh hưởng trực tiếp chứng từ xuất hàng thật cho khách
Validation Rules:    Traveler↔Pot#↔Lot# 1:1 | Quantity lệch >10% so với
                     Pieces RawMaterial → cảnh báo | Part# phải tồn tại
                     trong PartControl | 1 Traveler chỉ 1 LOT NO. thật

##############################################################################
## SECTION 5 — REGULATORY & GOVERNANCE (Canada)  →  fills: AI_POLICY.md
##############################################################################

AI Risk Tier:        Minimal Risk
Justification:       Nội bộ, B2B (gia công cho Infasco) — không phải
                     healthcare/legal/hiring/credit; sai sót ảnh hưởng vận
                     hành/chứng từ thương mại, không ảnh hưởng an toàn cá
                     nhân trực tiếp.

Privacy Law:         PIPEDA (federal)
PII Handled:         Có — mức thấp: tên/mã operator (Operator code), KHÔNG
                     có SIN/Health Card/dữ liệu y tế
PII Storage:         [TO BE CONFIRMED — tuỳ quyết định hạ tầng Mục 1;
                     Postgres tại LAN nội bộ, chưa quyết định có mã hoá
                     thêm không]
Data Retention:      [TO BE CONFIRMED — chưa có chính sách lưu trữ chính
                     thức]
Quebec Applicable:   [TO BE CONFIRMED — cần biết Province cụ thể]

Sector Regulation:
  Healthcare:   N/A
  Food Service: N/A
  Finance:      N/A
  Legal:        N/A
  Retail/Nail:  N/A
  (Manufacturing/Logistics — không có mục riêng trong form gốc; không có
  quy định ngành đặc thù nào được ghi nhận cho tới nay)

Audit Required:      [TO BE CONFIRMED — Infasco có yêu cầu audit/truy vết
                     riêng nào không, cần Andy xác nhận]

Human Oversight:     Full — nguyên tắc không thương lượng, kế thừa nguyên
                     văn AVP_AI: "AI chỉ tạo bản nháp, con người luôn là
                     người quyết định cuối cùng." Không bước nào tự động
                     ghi database.
Override Policy:     Người dùng luôn xem lại + sửa được trước khi bấm
                     "Xác nhận" — không có ngoại lệ.
Explainability:      Full — hiển thị đầy đủ dữ liệu AI đọc được để người
                     đối chiếu trước khi lưu (đúng cơ chế CCP-1 đã có).

French Required:     No
Languages:           Tiếng Việt (giao diện chính) — xem ghi chú Section 1

##############################################################################
## SECTION 6 — CONSTRAINTS  →  fills: BRS.md Constraints
##############################################################################

Legal:      [TO BE CONFIRMED — chưa có ràng buộc pháp lý đặc thù nào ghi
            nhận ngoài PIPEDA chung]
Technical:  Server chạy Postgres tại mạng nội bộ xưởng (LAN) — chi tiết
            phần cứng/OS/băng thông [TO BE CONFIRMED, xem
            SOFTWARE_ARCHITECTURE.md Mục 3]
Budget:     [TO BE CONFIRMED]
Timeline:   [TO BE CONFIRMED — không có hạn MVP cụ thể]
Team:       Dev: Andy + AI hỗ trợ thiết kế/code (như AVP_AI). Người dùng
            cuối: Office operator + Xưởng operator [TO BE CONFIRMED — số
            người cụ thể mỗi trạm] + Giám đốc (1 người, view-only, cập
            nhật 2026-09-17 — xem SECTION 3)

##############################################################################
## SECTION 7 — PROJECT RISKS  →  fills: RISK_REGISTER.md (R-P01 onward)
##############################################################################

Risk 1:     OCR đọc sai chữ viết tay trên phiếu Traveler/Split Form (đã có
            tiền lệ thật ở AVP_AI — traveler 717544 đọc lệch cột)
  Impact:   High
  Control:  Lớp 2 (rule-based validate) + Lớp 4 (Human Gate) — người luôn
            xem lại trước khi lưu, không tự động ghi

Risk 2:     Mất dữ liệu nếu server LAN hỏng/mất điện, chưa có backup rõ
            ràng (câu hỏi mở Mục 3.4 SOFTWARE_ARCHITECTURE.md)
  Impact:   High
  Control:  [TO BE CONFIRMED — cần Andy quyết định chính sách backup
            trước khi go-live thật]

Risk 3:     Operator xưởng chưa quen giao diện mới (đổi từ Excel/giấy quen
            thuộc sang hệ thống mới) → giảm adoption
  Impact:   Medium
  Control:  Chạy song song với AVP_AI 1 thời gian, không cắt đột ngột (xem
            SOFTWARE_ARCHITECTURE.md Mục 6 — lộ trình)

##############################################################################
## SECTION 8 — ATTACHED FILES (via [+] in Claude Code)
##############################################################################

File 1: D:\AVP_AI\ISO_AI_CONTROL.md (mô hình 5 lớp đã chạy thật — nguồn
        chính cho AI_POLICY.md)
File 2: D:\AVP_AI\THIET_KE_HE_THONG_MOI.md (quy trình 6 khâu đã xác minh
        dữ liệu thật — nguồn chính cho BRS.md)
File 3: D:\AVP_ERP\docs\cl08_operation\SOFTWARE_ARCHITECTURE.md (đã soạn
        sẵn — kiến trúc 2 trạm + Postgres + 5 lớp AI)

# ============================================================================
# GHI CHÚ CUỐI (AI thêm, không phải 1 trong 8 mục gốc):
# Form gốc ISO_CA giả định sản phẩm B2C có thể mở rộng nhiều khách hàng
# (Section "Market/Province/French Required") — AVP_ERP hiện là công cụ
# NỘI BỘ cho 1 doanh nghiệp (Maple Leaf Group/AVP). Nếu sau này thật sự
# đóng gói lại để triển khai cho doanh nghiệp khác (như Andy nêu ý định),
# cần viết LẠI Section 1-2 theo hướng sản phẩm/khách hàng, không phải nội
# bộ — chưa làm ở bản nháp này vì chưa có khách hàng thứ 2 cụ thể.
# ============================================================================
