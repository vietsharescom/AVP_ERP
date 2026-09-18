# TEST_PLAN.md | ISO/IEC/IEEE 29119-3:2021 | v2.0 — AVP_ERP

## SCOPE: All webapp/ features per approved FID, DB constraints, and the OCR human-gate flow.

## TEST TYPES
| Type | Location | Tool | Trigger |
|---|---|---|---|
| Unit | webapp/tests/unit/ | vitest/jest | Pre-commit |
| Integration | webapp/tests/integration/ | vitest/jest | Pre-commit |
| DB constraint | webapp/tests/db/ | vitest/jest against test DB | Pre-commit |

## NAMING
{feature}.test.ts

## ENTRY/EXIT CRITERIA
Entry: FID status = APPROVED | Exit: 100% tests PASS + CHANGELOG updated

*TEST_PLAN v2.0 -- AVP_ERP | ISO/IEC/IEEE 29119-3:2021*
*Adapted 2026-09-17 — replaced "pipeline stages L0-L10 / pytest" with webapp/ + vitest/jest per CLAUDE.md §3*
