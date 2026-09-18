# CONTEXT_ANALYSIS.md | ISO/IEC 42001:2023 Clause 4.1 | v2.0 — AVP_ERP

## INTERNAL CONTEXT
| Factor | Description |
|---|---|
| Mission | Maple Leaf Group runs AVP, a contract manufacturing/packing operation (metal fasteners — nut/bolt gia công) for customer Infasco |
| AI Strategy | AI is used narrowly — one bounded OCR touchpoint to read PO/Traveler documents, always human-confirmed before it becomes a record. Not an autonomous decision-maker. |
| Technical Capabilities | 9 months of production experience running this model at AVP_AI (Google Sheets + Next.js + Gemini OCR) — AVP_ERP re-implements the same proven approach on PostgreSQL for real transactions/audit trail |

## EXTERNAL CONTEXT
| Factor | Description |
|---|---|
| Regulatory | PIPEDA (federal) — no EU AI Act exposure (Canada-only, B2B). AIDA (Bill C-27) not yet in force — monitor only. See LEGAL_CA.md |
| Industry | ISO 9001 Clause 8.7 (Nonconformance & Corrective Action) already applied to qcStatus/Concession/Rework at AVP_AI, carried forward |
| Social | Internal tool, not consumer-facing — societal AI-fairness expectations are low-relevance (B2B logistics, not hiring/credit/health) |

*CONTEXT_ANALYSIS v2.0 | AVP_ERP | ISO/IEC 42001:2023 Clause 4.1*
*Filled 2026-09-17 from PROJECT_INFO_FORM.md*
