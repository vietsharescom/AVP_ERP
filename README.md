# AVP_ERP

Hệ thống quản lý sản xuất/đóng gói (packing flow) cho AVP — gia công ốc vít cho khách hàng
Infasco. Dự án kế tiếp của [AVP_AI](../AVP_AI) (Google Sheets), chuyển sang Next.js +
TypeScript + PostgreSQL để có transaction thật, CHECK constraint, và sổ cái bất biến.

> Governance: xây trên khung ISO_CA (ISO/IEC 42001:2023 + PIPEDA), áp dụng "vừa đủ" theo
> yêu cầu Andy — xem [CLAUDE.md](CLAUDE.md) và [docs/cl05_leadership/AI_POLICY.md](docs/cl05_leadership/AI_POLICY.md)
> cho layer kiểm soát AI.

## Trạng thái hiện tại
Giai đoạn THIẾT KẾ — chưa có dòng code `webapp/` nào. Xem
[docs/records/LATEST_SESSION.md](docs/records/LATEST_SESSION.md) cho tiến độ mới nhất.

## Bắt đầu (khi FID-ERP-001 sẵn sàng)
```powershell
cd webapp
npm install
npm run dev
npm test
```

## Kiến trúc
- [docs/cl08_operation/SOFTWARE_ARCHITECTURE.md](docs/cl08_operation/SOFTWARE_ARCHITECTURE.md) — stack, 3 máy vật lý, data model
- [docs/cl08_operation/FACILITIES_SETUP.md](docs/cl08_operation/FACILITIES_SETUP.md) — checklist hạ tầng

## ISO Document Index
| Folder | ISO Clause | Key Documents |
|---|---|---|
| docs/cl01_scope/ | Clause 1 | APPLICABILITY, SYSTEM_BOUNDARY, EXCLUSIONS |
| docs/cl02_normative_references/ | Clause 2 | REFERENCED_STANDARDS |
| docs/cl03_terms_definitions/ | Clause 3 | GLOSSARY, ABBREVIATIONS |
| docs/cl04_context/ | Clause 4 | AIMS_SCOPE (M), CONTEXT_ANALYSIS |
| docs/cl05_leadership/ | Clause 5 | AI_POLICY (M) — layer kiểm soát AI, ROLES (M), CONSTITUTION |
| docs/cl06_planning/ | Clause 6 | RISK_REGISTER (M), SoA (M), OBJECTIVES (M) |
| docs/cl07_support/ | Clause 7 | DOCUMENT_CONTROL (M), NAMING_CONVENTION |
| docs/cl08_operation/ | Clause 8 | SOFTWARE_ARCHITECTURE, BRS (M), IMPACT_ASSESSMENT (M) |
| docs/cl09_evaluation/ | Clause 9 | KPI_METRICS (M), AUDIT_PROGRAMME (M), MGMT_REVIEW (M) |
| docs/cl10_improvement/ | Clause 10 | CORRECTIVE_ACTION (M) |
(M) = MANDATORY per ISO/IEC 42001:2023

## Thêm 1 Feature
1. Xem [docs/features/FID_LIST.md](docs/features/FID_LIST.md) — dùng khuôn 9 mục (Intent/Why/Module/Contract/Rules/Example/Test Criteria/Not In Scope/Files), KHÔNG dùng field LAYER của FID_TEMPLATE.md gốc
2. Điền, set Status = APPROVED
3. Implement trong `webapp/`
4. Viết test (vitest/jest), 100% PASS
5. Cập nhật CHANGELOG.md
6. Commit: `feat: mô tả [FID-ERP-NNN]`

---
*README v2.0 | AVP_ERP — viết lại 2026-09-17, thay README framework ISO_CA gốc (Python/pytest)*
