# NAMING_CONVENTION.md | ISO 9001:2015 Clause 7.5 + ISO/IEC 42001:2023 | v3.0 — AVP_ERP
# NGUỒN THAM CHIẾU DUY NHẤT cho tất cả định danh trong hệ thống
# ============================================================================

##############################################################################
## 1. FOLDER TREE -- CẤU TRÚC THẬT CỦA AVP_ERP
##############################################################################
# Khác với khung ISO_CA gốc (giả định agent pipeline Python L0-L10): AVP_ERP
# là Next.js/TypeScript + PostgreSQL, chưa có webapp/ (sẽ tạo khi FID-ERP-001
# bắt đầu code — xem CLAUDE.md "*Không có src/config/tests Python*").

AVP_ERP/
│
├── CLAUDE.md                               # AI đọc mỗi session
├── README.md                               # Tổng quan dự án
├── CHANGELOG.md                            # Lịch sử thay đổi (bắt buộc mỗi FID)
├── PROJECT_INFO_FORM.md                    # Owner điền — nguồn gốc của setup docs
├── LEGAL_CA.md                             # Tra cứu luật Canada theo ngành
├── LINEAGE.md                              # Version family của ISO_CA framework
├── .gitignore
│
├── webapp/                                 # Code thật (Next.js + TypeScript) — CHƯA TẠO
│   ├── app/ hoặc pages/                    # Routes theo FID (Trạm 1 / Trạm 2)
│   ├── lib/                                # DB client, validation rules, OCR call
│   ├── prisma/ hoặc drizzle/               # Schema + migration — tuỳ ORM quyết định (xem FID_LIST.md)
│   └── tests/                              # vitest/jest, 1 file/feature theo FID
│
├── Data/                                   # 5 file mẫu tham khảo (PO, Traveler, FINISHED PALLET, Wrapping, Packing Slip)
│
├── docs/
│   ├── cl01_scope/                         # ISO 42001 Clause 1
│   │   ├── APPLICABILITY.md
│   │   ├── SYSTEM_BOUNDARY.md
│   │   └── EXCLUSIONS.md
│   ├── cl02_normative_references/          # Clause 2
│   │   └── REFERENCED_STANDARDS.md
│   ├── cl03_terms_definitions/             # Clause 3
│   │   ├── GLOSSARY.md
│   │   └── ABBREVIATIONS.md
│   ├── cl04_context/                       # Clause 4 -- MANDATORY
│   │   ├── AIMS_SCOPE.md
│   │   ├── CONTEXT_ANALYSIS.md
│   │   └── INTERESTED_PARTIES.md
│   ├── cl05_leadership/                    # Clause 5 -- MANDATORY -- AI CONTROL LAYER
│   │   ├── AI_POLICY.md                    # Human-gate, PIPEDA, prohibited uses
│   │   ├── ROLES_RESPONSIBILITIES.md
│   │   └── CONSTITUTION.md                 # P1-P7 governance principles
│   ├── cl06_planning/                      # Clause 6 -- MANDATORY
│   │   ├── RISK_REGISTER.md
│   │   ├── RISK_ASSESSMENT.md
│   │   ├── RISK_TREATMENT_PLAN.md
│   │   ├── STATEMENT_OF_APPLICABILITY.md
│   │   └── AI_OBJECTIVES.md
│   ├── cl07_support/                       # Clause 7 -- MANDATORY
│   │   ├── DOCUMENT_CONTROL.md
│   │   ├── NAMING_CONVENTION.md            # FILE NÀY
│   │   ├── COMPETENCE_MATRIX.md
│   │   └── COMMUNICATION_PLAN.md
│   ├── cl08_operation/                     # Clause 8 -- MANDATORY
│   │   ├── SOFTWARE_ARCHITECTURE.md        # Kiến trúc kỹ thuật thật (3 máy, Postgres)
│   │   ├── FACILITIES_SETUP.md             # Checklist hạ tầng vật lý
│   │   ├── BRS.md
│   │   ├── AI_SYSTEM_TECHNICAL.md
│   │   ├── IMPACT_ASSESSMENT.md
│   │   ├── LIFECYCLE_PLAN.md
│   │   ├── OPERATIONS_MANUAL.md
│   │   └── PROJECT_KICKOFF.md
│   ├── cl09_evaluation/                    # Clause 9 -- MANDATORY
│   │   ├── KPI_METRICS.md
│   │   ├── AUDIT_PROGRAMME.md
│   │   ├── MANAGEMENT_REVIEW.md
│   │   ├── TEST_PLAN.md
│   │   ├── QA_PLAN.md
│   │   └── CONFIG_MANAGEMENT_PLAN.md
│   ├── cl10_improvement/                   # Clause 10 -- MANDATORY
│   │   ├── CORRECTIVE_ACTION.md
│   │   └── IMPROVEMENT_LOG.md
│   ├── features/                           # FID documents — 9-mục format, xem FID_LIST.md
│   │   ├── FID_LIST.md                     # Master index, 11 FID kế hoạch
│   │   ├── FID_TEMPLATE.md                 # Mẫu gốc ISO_CA (field LAYER — KHÔNG dùng, xem FID_LIST.md đầu file)
│   │   └── FID-ERP-[NNN]_[YYYYMMDD].md
│   └── records/                            # Logs, session reports
│       └── LATEST_SESSION.md
│
# KHÔNG có: src/core/, src/audit/, config/pipeline/, prompts/, scripts/*.ps1 — đây là
# code chết của khung ISO_CA gốc (Python agent pipeline), đã gỡ khỏi AVP_ERP 2026-09-17
# (xem SOFTWARE_ARCHITECTURE.md §1 "Đánh đổi đã chấp nhận").


##############################################################################
## 2. DOCUMENT ID SYSTEM -- QUY TẮC ĐẶT MÃ SỐ CHUẨN ISO
##############################################################################
# Format chung: AVP-[TYPE]-[NNN]_[YYYYMMDD]
# NNN          : 3 số, bắt đầu từ 001
# YYYYMMDD     : Ngày tạo hoặc ngày sửa cuối

## 2.1 TÀI LIỆU THIẾT KẾ / QUẢN TRỊ (governance docs)
# -- Cố định, không có số thứ tự trong tên file vì chỉ có 1 bản

| Mã tài liệu    | File name              | Mô tả                          |
|----------------|------------------------|--------------------------------|
| AVP-CL04-001   | AIMS_SCOPE.md          | Phạm vi và mục tiêu (Clause 4) |
| AVP-CL05-001   | AI_POLICY.md           | Chính sách AI (Clause 5)      |
| AVP-CL05-002   | CONSTITUTION.md        | Nguyên tắc quản trị           |
| AVP-CL06-001   | RISK_REGISTER.md       | Danh sách rủi ro              |
| AVP-CL06-002   | STATEMENT_OF_APP.md    | Tuyên bố áp dụng              |
| AVP-CL08-BRS   | BRS.md                 | Yêu cầu nghiệp vụ             |
| AVP-CL09-KPI   | KPI_METRICS.md         | Chỉ số đo lường               |

## 2.2 FID -- FEATURE INTENT DOCUMENT (1 FID / 1 tính năng)
Format:   FID-ERP-[NNN]_[YYYYMMDD].md
Ví dụ:    FID-ERP-001_20260917.md   (Schema Postgres nền tảng)
Trong file: Status: DRAFT -> APPROVED -> DONE
Dùng đúng khuôn 9 mục ở FID_LIST.md (KHÔNG dùng field LAYER của FID_TEMPLATE.md gốc)

## 2.3 SESSION LOG (ghi chép phiên làm việc)
Format:   SES-[YYYYMMDD]-[NNN].md
Ví dụ:    SES-20260917-001.md

## 2.4 CORRECTIVE ACTION
Format:   CA-[NNN]_[YYYYMMDD]
Ví dụ:    CA-001_20260917

## 2.5 RISK ENTRIES (trong RISK_REGISTER.md)
Format:   R-[PREFIX][NN]
Prefix:   S=AI/OCR, D=Data, G=Governance, P=Project-specific
Ví dụ:    R-S01, R-D02, R-P01
(Bỏ prefix A=Architecture-pipeline của khung gốc — không có pipeline nhiều tầng để gán risk theo kiến trúc đó; risk kiến trúc thật của AVP_ERP nằm trong nhóm D/G)


##############################################################################
## 3. TRACEABILITY CHAIN -- LIÊN KẾT GIỮA CÁC TÀI LIỆU
##############################################################################

PROJECT_INFO_FORM.md
    |
    +--> [Setup Docs] AIMS_SCOPE + BRS + AI_POLICY + RISK_REGISTER + CLAUDE.md
              |
              +--> FID-ERP-[NNN]_[YYYYMMDD].md (9-mục format, thay SRS+FID_TEMPLATE gốc)
                    |
                    +--> webapp/... (implementation theo Mục 9 "FILES" trong FID)
                    |
                    +--> webapp/tests/... (Test Criteria trong FID)
                    |
                    +--> CHANGELOG.md
                    |
                    +--> git commit: feat: description [FID-ERP-NNN]

# TRUY VẾT NGƯỢC (backward trace): từ bug về gốc
git log -> CHANGELOG -> FID -> BRS -> PROJECT_INFO_FORM


##############################################################################
## 4. REQUIREMENTS TRACEABILITY -- MÃ SỐ YÊU CẦU
##############################################################################

| Loại          | Format          | Ví dụ          | Mô tả                        |
|---------------|-----------------|----------------|------------------------------|
| Business Obj  | BO-[NNN]        | BO-001         | Trong BRS.md                 |
| FID           | FID-ERP-[NNN]   | FID-ERP-001    | Tên tắt trong CHANGELOG      |
| KPI           | KPI-[NNN]       | KPI-001        | Trong KPI_METRICS.md         |
| Risk          | R-[X][NN]       | R-P01          | Trong RISK_REGISTER.md       |
| Corrective    | CA-[NNN]        | CA-001         | Trong CORRECTIVE_ACTION.md   |


##############################################################################
## 5. SOURCE CODE NAMING (Next.js / TypeScript)
##############################################################################

TypeScript files: camelCase.ts hoặc kebab-case.tsx theo convention Next.js chuẩn
Test files:       {name}.test.ts  (vitest/jest, theo CLAUDE.md §3)
Schema:           tuỳ ORM chọn (Prisma schema.prisma / Drizzle *.ts / raw SQL *.sql — xem FID_LIST.md câu hỏi chặn)

Code annotations (khuyến khích, không bắt buộc như khung Python gốc):
  // @implements FID-ERP-NNN — mô tả ngắn


##############################################################################
## 6. GIT COMMIT FORMAT
##############################################################################

{type}: {description} [{FID-reference}]

Types:  feat    -- tính năng mới (cần FID APPROVED)
        fix     -- sửa lỗi
        docs    -- tài liệu
        test    -- thêm/sửa test
        refactor-- tái cấu trúc (không đổi chức năng)
        chore   -- build, config, ci

Ví dụ:
  feat: schema Postgres nền tảng [FID-ERP-001]
  fix: reject packing slip khi Lot# rỗng [FID-ERP-009]
  docs(cl06): update RISK_REGISTER với R-P03

*NAMING_CONVENTION v3.0 -- AVP_ERP | ISO 9001:2015 Cl7.5 + ISO/IEC 42001:2023*
*Viết lại 2026-09-17 — thay cây thư mục src/pipeline/l{N}_*.py + config/*.json (khung ISO_CA
Python gốc, không tồn tại trong AVP_ERP) bằng cấu trúc thật webapp/ Next.js*
