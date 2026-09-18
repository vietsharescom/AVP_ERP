# AI_POLICY.md | ISO/IEC 42001:2023 Clause 5.2 — MANDATORY | v3.0 — AVP_ERP
# Adapted from ISO_CA v2.0 template for AVP_ERP (manufacturing/logistics, no agent pipeline)
# ============================================================================

## POLICY STATEMENT
Maple Leaf Group is committed to responsible, transparent, and safe AI use in AVP_ERP.
AI (OCR/document reading) only produces a draft — final authority and responsibility for
every record filed always rest with the human operator (Office or Xưởng staff) who reviews
and confirms it. This mirrors the model already proven in production for 9 months at AVP_AI
(see CLAUDE.md NGUYÊN TẮC TUYỆT ĐỐI #2).

---

## CORE COMMITMENTS

### 1. Human Authorship — Non-Negotiable
AI (Gemini OCR) reads a document (PO email, Traveler sheet) and produces a draft. The human
operator is the author of the final record. **No AI output is written to Postgres without
explicit human review and a deliberate "Xác nhận" (Confirm) action — no auto-save, no
background write.**

### 2. Transparency in Every Output
Every AI-read output shown to the operator includes:
  - The original input (scanned PO/Traveler image or PDF)
  - Detected fields and their confidence score
  - Which field(s) AI is uncertain about, flagged for manual check
Operator sees the original document side-by-side with the AI reading — no black box.

### 3. Data Integrity — Never Invent
Part#, PO#, Traveler#, Lot#/LOT NO., Pot#, Quantity, and any figure that ends up on a
shipping document are **NEVER invented, guessed, or auto-corrected by AI**. If OCR
confidence is low or a field cannot be read reliably, it is left blank/flagged for the
operator to fill in manually — never silently auto-filled.

### 4. Privacy by Design — PIPEDA Compliance

Scope: PII in AVP_ERP is low-sensitivity (operator name/code only — no SIN, no health data,
no customer-consumer PII; Infasco is a B2B counterparty, not a data subject).

Data storage (PIPEDA P4 + P7):
  - Postgres runs on-premise, LAN only — no data leaves the internal network except the
    PO email fetch step (see SOFTWARE_ARCHITECTURE.md §2.2)
  - Encryption at rest for operator PII: [TO BE CONFIRMED — decide when infra is finalized,
    see FACILITIES_SETUP.md]
  - Retention: 7 years (PIPEDA default for general business records) unless Andy sets a
    different policy — see RISK_REGISTER.md R-P02 for the open backup/retention question

### 5. Canadian Legal Compliance

Federal — PIPEDA:
  P3  Consent:            Operator informed their name/code is logged against actions taken
  P4  Limiting Collection: Only operator code + action data collected, no other staff PII
  P5  Limiting Use:       Used only for production traceability, not performance monitoring
  P7  Safeguards:         LAN-only access, no internet-facing endpoint
  P10 Challenging:        Andy is the accountable contact for any compliance question

AI Law — AIDA (Bill C-27): NOT YET IN FORCE as of 2026. Monitor; no action required now.

Province: [TO BE CONFIRMED — see PROJECT_INFO_FORM.md Section 1]. No Quebec-specific
obligations (Law 25 / French requirement) apply unless the province is confirmed as Quebec.

### 6. Non-Discrimination
OCR accuracy is a data-quality concern here, not a demographic-fairness concern (documents
are printed/handwritten production forms, not people). Track OCR error patterns by
document type/source, not by any protected characteristic.

### 7. AI Advisory Intelligence (P6 — see CONSTITUTION.md)
AI MUST proactively surface improvement opportunities and regulatory changes relevant to
AVP_ERP without waiting to be asked, but never self-deploy — Andy decides.

### 8. Continuous Improvement
  - OCR confidence and operator-correction rate logged per document processed
  - If correction rate stays high for a field, flag for review (prompt tuning or add a
    stricter validation rule) rather than silently trusting AI more over time

---

## SECTOR-SPECIFIC RULES — Manufacturing / Contract Packing (AVP)

  - Output labeled to the operator as: "AI đọc được — vui lòng kiểm tra trước khi xác nhận"
  - Validation rules from PROJECT_INFO_FORM.md §4 apply before any write: Traveler↔Pot#↔Lot#
    1:1, Quantity variance >10% vs RawMaterial → warn, Part# must exist in `part_control`,
    1 Traveler = 1 LOT NO.
  - Shipping documents (Packing Slip) with a HOLD status or missing Lot# must be blocked at
    the database layer (CHECK constraint), not only at the UI layer

---

## PROHIBITED USES
- Writing any record to Postgres without human "Xác nhận" (Confirm)
- Auto-correcting or auto-filling Part#/Lot#/Quantity when AI confidence is low
- Using AVP production data (PO, Traveler, customer info) to train or fine-tune any model
  without Andy's explicit written approval
- Bypassing the human review screen in any non-emergency context

---

## SCOPE
All AI touchpoints in AVP_ERP. Currently: one bounded touchpoint — Gemini OCR reading
PO/Traveler documents at ingestion (FID-ERP-002). No other stage of AVP_ERP calls an LLM.

### AI Gateway — 2 controlled entry points (chốt 2026-09-17, SỬA LẠI cùng
ngày sau phản biện `docs/records/Consultations/260917-Pilot_Infra.md`)
File upload/OCR-trigger capability exists at exactly **two** stations: the **Office
operator (Trạm 1)** and the **admin laptop (Máy 4 — Giám đốc/Quản lý)**. The **Xưởng
operator (Trạm 2) is the only station that never has this capability** — see
SOFTWARE_ARCHITECTURE.md §2.1 and ROLES_RESPONSIBILITIES.md.

This was originally designed as a *single* gateway (Office only) for maximum
auditability; Andy revised it same-day so the admin role can perform the full business
workflow (not just view) from Máy 4. The control principle still holds at a smaller
scope: **the number of AI-trigger points stays fixed and small** (2, not "anyone
anywhere"), both stations are LAN-only (no remote/internet-facing upload path — see
SOFTWARE_ARCHITECTURE.md §2.1), and every AI-read record from either station still goes
through the same mandatory human-confirm gate (§1) before it reaches Postgres. Audit
trail (`stock_moves.operator_code`) distinguishes which station/person triggered which
OCR read, so widening from 1 to 2 gateways does not lose traceability.

## ACCOUNTABILITY
| Role | Accountability |
|---|---|
| System Owner (Andy Phan) | AI policy, system integrity, regulatory compliance |
| Giám đốc/Quản lý (Máy 4, full access) | Same AI-trigger + confirm responsibility as Office operator when using Máy 4 |
| Office operator | AI-trigger + reviewing and confirming every AI-read record before save |
| Xưởng operator | Confirming manually-entered records before save (no AI touchpoint at this station) |
| Maple Leaf Group | Data privacy, system maintenance, incident response |

## INCIDENT RESPONSE
Any AI output that causes or nearly causes a wrong shipment/record:
1. Immediate note in CHANGELOG.md / session record
2. Andy notified as soon as noticed
3. Root cause check before the same document type is processed again
4. Validation rule or prompt updated if the same error class could recur

Approved by: [PENDING — Andy to confirm] | Date: [PENDING] | Review: Annually or post-incident

*AI_POLICY v3.0 | AVP_ERP | ISO/IEC 42001:2023 Clause 5.2*
*Adapted 2026-09-17 from ISO_CA v2.0 — removed healthcare/restaurant/nail sector rules and
pipeline (L0-L10) references not applicable to AVP_ERP; kept PIPEDA + human-oversight core*
