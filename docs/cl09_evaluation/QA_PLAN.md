# QA_PLAN.md | ISO 9001:2015 Clause 8 + ISO/IEC 12207 | v2.0 — AVP_ERP

## QA GATES
| Gate | Condition | Tool | Blocks |
|---|---|---|---|
| Pre-commit | All tests pass | npm test (vitest/jest) | Commit |
| Pre-FID-build | FID APPROVED | Manual | Build start |
| Pre-release | KPI-C01=100%, KPI-B02=0 (no human-gate bypass) | Manual review | Release |

## QA ACTIVITIES
| Activity | When | Owner |
|---|---|---|
| Code review vs FID contract (§4) | Per FID | Andy |
| Human-gate spot-check | Per release | Andy |
| CHANGELOG audit | Per commit | Andy |

*QA_PLAN v2.0 -- AVP_ERP | ISO 9001:2015 Clause 8*
*Adapted 2026-09-17 — replaced "MODULE_CONTRACTS/session_end.ps1" (not applicable) with FID contract review*
