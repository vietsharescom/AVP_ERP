# STATEMENT_OF_APPLICABILITY.md | ISO/IEC 42001:2023 Clause 6.1.3 -- MANDATORY | v2.0 — AVP_ERP

## ANNEX A CONTROL APPLICABILITY
| Control | Title | Applicable | Justification | Implemented By |
|---|---|---|---|---|
| A.2.2 | AI system design policy | YES | Core governance | CONSTITUTION.md |
| A.3.3 | Roles and responsibilities | YES | Required | ROLES_RESPONSIBILITIES.md |
| A.4.2 | AI resource documentation | YES | OCR touchpoint documented | AI_SYSTEM_TECHNICAL.md |
| A.5.2 | AI system impact assessment | YES | Required | IMPACT_ASSESSMENT.md |
| A.5.3 | AI impact assessment report | YES | MANDATORY | IMPACT_ASSESSMENT.md |
| A.6.1.1 | AI system design process | YES | Architecture documented | SOFTWARE_ARCHITECTURE.md |
| A.6.2.3 | Design documentation | YES | Per-feature contract | FID_LIST.md (FID replaces SOFTWARE_DESIGN.md — no multi-stage pipeline to design) |
| A.6.2.6 | Testing | YES | vitest/jest per FID (CLAUDE.md §NGUYÊN TẮC 3) | Per-FID test files (webapp/, not yet created) |
| A.6.2.7 | Technical documentation | YES | System documented | AI_SYSTEM_TECHNICAL.md |
| A.7.2 | Data management policy | PARTIAL | Retention/backup policy still open | AI_POLICY.md §4 + RISK_REGISTER.md R-D01 |
| A.8.2 | Supplier policy | PARTIAL | Gemini (Google) is the only external AI supplier | AI_POLICY.md Scope |
| A.9.3 | Restrictions on AI use | YES | Enforced via review process, not code contracts (no pipeline) | AI_POLICY.md Prohibited Uses |

*SoA v2.0 | AVP_ERP | ISO/IEC 42001:2023 Clause 6.1.3 -- MANDATORY*
*Adapted 2026-09-17 — removed references to module_contracts.json/llm_adapter.py (pipeline-specific files that don't exist in AVP_ERP)*
