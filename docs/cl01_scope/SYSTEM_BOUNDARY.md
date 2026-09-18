# SYSTEM_BOUNDARY.md
# AI System Boundary Definition
# ISO/IEC 42001:2023 Clause 1 -- Scope
# Version: v2.0 | Status: ACTIVE — AVP_ERP

---

## 1. SYSTEM BOUNDARY

Defines exactly what is INSIDE and OUTSIDE the AI management system for AVP_ERP.

---

## 2. IN BOUNDARY

| Component | Description | Location |
|---|---|---|
| Ingestion + OCR | Reads PO/Traveler PDF/image via Gemini | webapp/ (Trạm 1, FID-ERP-002) |
| Human review/confirm gate | Operator reviews AI reading before it becomes a record | webapp/ (all data-entry screens) |
| Postgres | System of record — `travelers`, `stock_moves`, `part_control`, `packing_slips`, `print_log` | Máy 1 (Server) |
| Audit trail | `stock_moves` append-only ledger + `print_log` | Máy 1 (Server), Postgres |
| All data processed | Input document through confirmed Postgres record | End-to-end |

---

## 3. OUT OF BOUNDARY

| Component | Reason Excluded |
|---|---|
| Gemini (Google) model infrastructure | Third-party — covered by Google's own terms, not AVP_ERP's AIMS |
| Office/Xưởng operator's own device/browser | Not under organizational control beyond LAN access |
| AVP_AI (Google Sheets system) | Separate, independently-run legacy system during parallel operation — see SOFTWARE_ARCHITECTURE.md §0 |

---

## 4. BOUNDARY DIAGRAM

```
+--------------------------------------------------------------+
|                     AVP_ERP AIMS BOUNDARY                     |
|                                                                |
|  [PO email] --> Máy 1 (Server: Next.js + Postgres)            |
|                       |                                        |
|         +-------------+-------------+                         |
|         v                           v                         |
|  Máy 2 -- Trạm 1 (Office)    Máy 3 -- Trạm 2 (Xưởng)          |
|  OCR (Gemini) + review        Manual entry + sticker print     |
|  Packing Slip creation        Good/Hold status                 |
|         |                           |                          |
|         +-------------+-------------+                         |
|                       v                                        |
|              stock_moves (audit ledger, always active)         |
+---------------------------+------------------------------------+
                            |
                    OUTSIDE BOUNDARY:
                    Gemini model infrastructure (Google)
                    Operator's own device/browser
                    AVP_AI (legacy, runs independently)
```

---

*SYSTEM_BOUNDARY v2.0 -- AVP_ERP*
*ISO/IEC 42001:2023 Clause 1*
*Adapted 2026-09-17 — replaced L0-L10 pipeline diagram (src/core/orchestrator.py etc, not
applicable) with the real 3-machine architecture from SOFTWARE_ARCHITECTURE.md*
