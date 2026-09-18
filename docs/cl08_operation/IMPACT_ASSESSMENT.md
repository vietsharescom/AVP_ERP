# IMPACT_ASSESSMENT.md | ISO/IEC 42001:2023 Clause 8.2 / Annex A.5.3 -- MANDATORY | v2.0 — AVP_ERP

## SYSTEM
Name: AVP_ERP | Version: v0.1 (design phase) | Use Case: production/packing tracking for
AVP (gia công ốc vít cho Infasco) | Users: Office operator (Trạm 1), Xưởng operator (Trạm 2)

## IMPACT ASSESSMENT
| ID | Impact Area | Severity | Likelihood | Control | Residual |
|---|---|---|---|---|---|
| IA-001 | Privacy -- operator name/code (low-sensitivity PII, no SIN/health data) | Low | Low | AI_POLICY.md §4 | Low |
| IA-002 | Fairness -- biased decisions | N/A | N/A | No demographic decision-making in this system (internal B2B logistics) | N/A |
| IA-003 | Transparency | Low | Low | AI_POLICY.md §2 — original document shown alongside AI reading | Low |
| IA-004 | Safety -- incorrect Part#/Lot#/Quantity reaches a shipment | High | Medium | Human confirm gate + DB CHECK constraints (AI_POLICY.md §1/§3, RISK_REGISTER.md R-S01/R-G03) | Low |
| IA-005 | Human oversight erosion (auto-save bypass) | High | Low | No auto-save code path by design (AI_POLICY.md Prohibited Uses) | Low |

## OVERALL RATING: [X] Low  [ ] Medium  [ ] High  [ ] Critical
(Minimal AI Risk Tier per PROJECT_INFO_FORM.md §5 — internal B2B tool, not
healthcare/legal/hiring/credit; residual risk after human-gate control is Low)

## KEY MITIGATIONS
1. Human confirm gate — no AI output reaches Postgres without operator review
2. `stock_moves` append-only ledger — full audit trail
3. DB-level CHECK constraints block HOLD/missing-Lot shipments
4. One bounded AI touchpoint (OCR) — no autonomous multi-step AI execution

Sign-off: [PENDING — Andy] | Date: [PENDING] | Review: Annually + on major change

*IMPACT_ASSESSMENT v2.0 | AVP_ERP | ISO/IEC 42001:2023 Clause 8.2 / Annex A.5.3*
*Adapted 2026-09-17 from ISO_CA pipeline template*
