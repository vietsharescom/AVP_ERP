# AIMS_SCOPE.md | ISO/IEC 42001:2023 Clause 4.3 -- MANDATORY | v2.0 — AVP_ERP

## 1. ORGANIZATION
Organization: Maple Leaf Group
Project:      AVP_ERP
Owner:        Andy Phan (Viet)

## 2. SCOPE
Applies to: the one AI touchpoint in AVP_ERP (Gemini OCR reading PO/Traveler documents at
ingestion, FID-ERP-002) and all data it produces, from input document through Postgres
write. See SOFTWARE_ARCHITECTURE.md §0 for why this is not a multi-stage agent pipeline.

## 3. BOUNDARIES
In scope:  OCR reading of PO/Traveler documents, human review/confirm gate before any
           Postgres write, audit trail (`stock_moves` append-only ledger, `print_log`)
Out scope: Hàng tháo rã (Unbuild), Asset Ledger container lifecycle, full labor
           cost/OEE automation, automated PO/Lot email classification — all deferred per
           PROJECT_INFO_FORM.md §2 "Not in scope" (same boundary already accepted at AVP_AI)

## 4. INTERESTED PARTIES
| Party | Interest | Requirement |
|---|---|---|
| System Owner (Andy) | Control + governance | Full auditability via `stock_moves` |
| Office operator | Create Packing Slip fast, correct | Accurate AI reading + fast search |
| Xưởng operator | Enter data + print sticker at their station | Simple UI, works offline from internet (LAN only) |
| Infasco (customer) | Correct, on-time shipments with valid Lot# | Packing Slip blocked if HOLD/missing Lot |
| Regulators (PIPEDA) | Law compliance | See AI_POLICY.md |

*AIMS_SCOPE v2.0 | AVP_ERP | ISO/IEC 42001:2023 Clause 4.3*
*Filled 2026-09-17 from PROJECT_INFO_FORM.md — replaces generic "pipeline L0-L10" scope*
