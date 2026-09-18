# INTERESTED_PARTIES.md | ISO/IEC 42001:2023 Clause 4.2 | v2.0 — AVP_ERP

| ID | Party | Type | Needs | How Addressed |
|---|---|---|---|---|
| SH-001 | System Owner (Andy) | Internal | Control, visibility | `stock_moves` audit ledger + print_log |
| SH-002 | Office operator | Internal | Fast, correct Packing Slip creation | AI-assisted OCR + human confirm gate |
| SH-003 | Xưởng operator | Internal | Simple entry + sticker printing at their station | Trạm 2 UI, LAN-only (no internet dependency) |
| SH-004 | Infasco (customer) | External | Correct shipments, valid Lot#, on-time PO fulfillment | DB-level CHECK constraints block HOLD/missing-Lot shipments |
| SH-005 | Regulators (PIPEDA) | External | Law compliance | AI_POLICY.md + CONSTITUTION.md |

*INTERESTED_PARTIES v2.0 | AVP_ERP | ISO/IEC 42001:2023 Clause 4.2*
*Filled 2026-09-17 from PROJECT_INFO_FORM.md — replaces generic "Developers/MODULE_CONTRACTS" entry (no separate developer stakeholder distinct from System Owner at this stage)*
