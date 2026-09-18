# RISK_REGISTER.md | ISO/IEC 42001:2023 Clause 6.1 + ISO 31000:2018 -- MANDATORY | v2.0 — AVP_ERP

## AI / OCR RISKS
| ID | Risk | Impact | Likelihood | Control |
|---|---|---|---|---|
| R-S01 | OCR reads handwritten Traveler/Split Form incorrectly (precedent: traveler 717544 column misread at AVP_AI) | High | Likely | Human review + confirm gate before any Postgres write (AI_POLICY.md §1) |
| R-S02 | AI silently auto-fills/auto-corrects a low-confidence field | Critical | Possible | AI_POLICY.md §3 "Data Integrity — Never Invent" — low-confidence fields left blank/flagged, never auto-filled |

## DATA RISKS
| ID | Risk | Impact | Likelihood | Control |
|---|---|---|---|---|
| R-D01 | Server (Máy 1) loses power/hardware fails, no backup policy yet defined | High | Possible | UPS + backup policy. Recommended default (GPT+Grok consultation, 2026-09-17, see `Consultations/260917_Architechture/FINAL_DECISION.md`): daily `pg_dump` + 1 off-site copy (external drive/NAS) + optional WAL archiving later; RPO≤24h/RTO≤2-4h as starting target. Budget/device + final RPO/RTO — Andy deferred ("để sau"), see FACILITIES_SETUP.md §5 |
| R-D02 | Manual entry at Trạm 2 violates a business rule (wrong Part#, Quantity variance) | Medium | Likely | DB CHECK constraints + validation rules (PROJECT_INFO_FORM.md §4) |
| R-D03 | Data lost/corrupted during one-time migration from AVP_AI (Google Sheets) | Medium | Possible | One-time migration only after schema stable, no continuous 2-way sync (SOFTWARE_ARCHITECTURE.md §0) |

## GOVERNANCE RISKS
| ID | Risk | Impact | Likelihood | Control |
|---|---|---|---|---|
| R-G01 | AI output written to DB bypassing human review | Critical | Possible | AI_POLICY.md §1 — "Xác nhận" (Confirm) required, no auto-save path exists in design |
| R-G02 | Feature built without an approved FID | Medium | Possible | FID_LIST.md workflow gate — Status must be APPROVED before code |
| R-G03 | Shipment goes out with HOLD status or missing Lot# | Critical | Possible | DB-level CHECK constraint blocks packing_slip creation (SOFTWARE_ARCHITECTURE.md §3) |

## PROJECT-SPECIFIC RISKS (from PROJECT_INFO_FORM.md §7)
| ID | Risk | Impact | Likelihood | Control |
|---|---|---|---|---|
| R-P01 | OCR misreads handwritten Traveler/Split Form | High | Likely | Rule-based validation + human gate — same as R-S01 |
| R-P02 | Server LAN hardware fails/power loss, no backup policy | High | Possible | Same as R-D01 — recommended default plan exists (daily pg_dump + off-site copy), Andy to confirm budget/device before go-live |
| R-P03 | Xưởng operators resist new UI (used to Excel/paper) → low adoption | Medium | Possible | Run in parallel with AVP_AI for a transition period, no abrupt cutover (SOFTWARE_ARCHITECTURE.md §4) |

## RESIDUAL RISK
AI/OCR = Medium (mitigated by mandatory human gate), Data = Medium (backup policy still
open — R-D01/R-P02), Governance = Low (human-gate + FID workflow enforced by process).
Overall: ACCEPTABLE to proceed to FID-ERP-001, PROVIDED backup policy (R-D01) is decided
before real production go-live (not before design/build).

*RISK_REGISTER v2.0 | AVP_ERP | ISO/IEC 42001:2023 Clause 6.1 + ISO 31000:2018*
*Adapted 2026-09-17 — replaced Architecture-pipeline risks (PipelineGuard/GraphResolver/
L2_ENFORCER, not applicable — no such pipeline in AVP_ERP) with real AVP_ERP risks from
PROJECT_INFO_FORM.md §7 and SOFTWARE_ARCHITECTURE.md open questions*
