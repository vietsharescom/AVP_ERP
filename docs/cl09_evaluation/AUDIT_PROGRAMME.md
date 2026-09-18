# AUDIT_PROGRAMME.md | ISO/IEC 42001:2023 Clause 9.2.2 -- MANDATORY | v2.0 — AVP_ERP

## AUDIT SCHEDULE
| Audit ID | Scope | Frequency | Method | Owner |
|---|---|---|---|---|
| AUD-001 | Human-gate compliance (no AI write bypasses confirm) | Per release | Manual code review + spot-check `stock_moves` | Andy |
| AUD-002 | FID compliance | Per FID | Manual review vs FID_LIST.md | Andy |
| AUD-003 | Test pass rate | Per commit | npm test | Andy |
| AUD-004 | CHANGELOG completeness | Per commit | Manual | Andy |
| AUD-005 | ISO 42001 clause coverage | Annually | Document review | Andy |

## AUDIT CRITERIA
Pass when: KPI-C01=100%, KPI-B02=0 (no human-gate bypass), no CRITICAL findings open.

## RECORDS
Location: docs/records/ | Format: AUD-[NNN]_[YYYYMMDD].md

*AUDIT_PROGRAMME v2.0 -- AVP_ERP | ISO/IEC 42001:2023 Clause 9.2.2*
*Adapted 2026-09-17 — replaced "pytest compliance suite / MODULE_CONTRACTS" (pipeline-specific) with real AVP_ERP audit points*
