# RISK_TREATMENT_PLAN.md | ISO/IEC 42001:2023 Clause 6.1.3 -- MANDATORY | v2.0 — AVP_ERP

## TREATMENT ACTIONS
| Risk ID | Treatment | Implementation | Owner | Status |
|---|---|---|---|---|
| R-S01/R-P01 | CONTROL | Human review + confirm gate before Postgres write | Andy | PLANNED (FID-ERP-002) |
| R-S02 | CONTROL | AI_POLICY.md §3 — never auto-fill low-confidence field | Andy | PLANNED (FID-ERP-002) |
| R-D01/R-P02 | CONTROL | UPS + backup policy (device/frequency) | Andy | **OPEN — decision needed, see FACILITIES_SETUP.md §5** |
| R-D02 | CONTROL | DB CHECK constraints + validation rules | Andy | PLANNED (FID-ERP-001 schema) |
| R-G01 | AVOID | No auto-save code path by design | Andy | PLANNED |
| R-G03 | CONTROL | DB CHECK constraint blocks HOLD/missing-Lot packing slip | Andy | PLANNED (FID-ERP-001/009) |
| R-P03 | CONTROL | Parallel run with AVP_AI before cutover | Andy | PLANNED (post go-live, SOFTWARE_ARCHITECTURE.md §4) |

*RISK_TREATMENT_PLAN v2.0 | AVP_ERP | ISO/IEC 42001:2023 Clause 6.1.3*
*Adapted 2026-09-17 from ISO_CA pipeline-risk template*
