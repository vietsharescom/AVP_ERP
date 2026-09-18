# RISK_ASSESSMENT.md | ISO/IEC 42001:2023 Clause 6.1.2 -- MANDATORY | v2.0 — AVP_ERP

## METHODOLOGY
Method: ISO 31000 | Scale: Impact x Likelihood | Frequency: Per release + on incident

## TOP RISKS (see RISK_REGISTER.md for full list)
| Risk ID | Risk | Raw Rating | Control | Residual |
|---|---|---|---|---|
| R-S02 | AI silently auto-fills a low-confidence field | Critical x Possible = HIGH | AI_POLICY.md §3 human gate | Low |
| R-G03 | Shipment goes out HOLD/missing Lot# | Critical x Possible = HIGH | DB CHECK constraint | Low |
| R-D01 / R-P02 | Server power/hardware failure, no backup policy | High x Possible = HIGH | OPEN — backup policy not yet decided | Medium (until decided) |
| R-S01 / R-P01 | OCR misreads handwritten document | High x Likely = HIGH | Human review + confirm gate | Medium |
| R-P03 | Operator adoption resistance | Medium x Possible = MEDIUM | Parallel run with AVP_AI, no abrupt cutover | Low |

## SIGN-OFF
Assessed by: Andy Phan (Viet) | Date: 2026-09-17 | Next: on next major architecture decision or incident

*RISK_ASSESSMENT v2.0 | AVP_ERP | ISO/IEC 42001:2023 Clause 6.1.2*
*Adapted 2026-09-17 from ISO_CA pipeline-risk template*
