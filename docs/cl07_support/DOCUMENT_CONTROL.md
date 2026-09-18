# DOCUMENT_CONTROL.md | ISO/IEC 42001:2023 Clause 7.5 + ISO 9001:2015 -- MANDATORY | v2.0 — AVP_ERP

## DOCUMENT TYPES
| Type | Location | Control |
|---|---|---|
| Governance docs | docs/cl0{N}/ | Version in header + git (once initialized) |
| Feature docs (FID) | docs/features/ | Status: DRAFT->APPROVED->DONE |
| Session records | docs/records/ | Date-stamped, append-only |
| Source code | webapp/ (not yet created) | Git + FID reference in commit |
| Data samples | Data/ | Reference only, not schema source of truth |

## DOCUMENT LIFECYCLE
DRAFT -> REVIEW -> APPROVED -> ACTIVE -> SUPERSEDED

## RETENTION
| Type | Retention |
|---|---|
| Governance | Permanent |
| Audit records (`stock_moves`, `print_log`) | Permanent (immutable ledger) |
| Session logs | 1 year |

*DOCUMENT_CONTROL v2.0 -- AVP_ERP | ISO/IEC 42001:2023 Clause 7.5*
*Adapted 2026-09-17 — replaced src/ + config/ (pipeline-specific) with webapp/*
