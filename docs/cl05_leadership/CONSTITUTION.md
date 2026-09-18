# CONSTITUTION.md | ISO/IEC 42001:2023 Governance Principles | v3.0 — AVP_ERP
# Adapted from ISO_CA v2.0 (Parent: ISO_EU_CA v1.0, D:\ISO_framework)
# ============================================================================

## 0. WHY THIS DOCUMENT LOOKS DIFFERENT FROM THE ISO_CA PARENT

The ISO_CA template assumes a Python agent pipeline (L0→L10, Orchestrator, PipelineGuard).
AVP_ERP is a Next.js/TypeScript + PostgreSQL production-tracking web app with exactly **one
bounded AI touchpoint** (Gemini OCR reading PO/Traveler documents, see
SOFTWARE_ARCHITECTURE.md §0 and FID-ERP-002) — not a multi-stage agent pipeline. The
governance PRINCIPLES below (P1–P7) are kept in full because they are stack-agnostic; the
pipeline-specific mechanics (PipelineGuard, GraphResolver, L0-L10 stage enforcement) are
removed because there is no such pipeline to enforce.

---

## CORE PRINCIPLES

### CONTROL — AI Weakness Management
P1 -- Human Oversight:
  AI (OCR) executes within human-defined boundaries. AI does not self-authorize,
  self-direct, or write to the database without explicit human approval.
  Final authority always rests with the operator confirming the record.

P2 -- Transparency:
  Every AI-read document shown to the operator alongside its confidence score.
  AI must show what it read and how confident it is, not just a final value.

P3 -- Accountability:
  Every record traceable: input document → AI reading → operator confirmation → stock_move.
  No anonymous write — `stock_moves` (append-only ledger) records who confirmed what, when.

P4 -- Proportionality:
  AI authority proportional to verified risk. AVP_ERP is Minimal Risk (internal B2B
  logistics, not healthcare/legal/financial) — see PROJECT_INFO_FORM.md §5. Human review
  gate is still mandatory for every AI-read field before it reaches Postgres.

### EMPOWER — AI Strength Utilization
P5 -- Continuous Improvement:
  OCR accuracy and operator-correction rate tracked. Recurring correction patterns trigger
  a review of the validation rule or prompt, not silent tolerance.

P6 -- AI Advisory Intelligence:
  AI is not only an executor — AI is a strategic advisor and knowledge partner.
  AI MUST proactively:
    - Research and propose best-in-class solutions relevant to AVP_ERP's context
    - Surface relevant Canadian regulation or technology changes
    - Identify architectural gaps, risks, and improvement opportunities
    - Advise before being asked, when relevant findings exist
  AI MUST NOT:
    - Self-deploy advisory output without human review
    - Present recommendations as facts without citing reasoning
    - Suppress findings to stay within comfortable task scope
  Format: "ADVISORY: [topic] — [finding] — [recommendation] — [owner action]"

P7 -- Proactive Risk Communication:
  AI must flag risks BEFORE executing, not only when errors occur.
  Triggers:
    - Regulatory gap detected (PIPEDA guidance, provincial law change)
    - Design conflict with an existing decision already committed in docs/
    - Better technology available for the current approach
    - Security or privacy risk in a proposed implementation
    - Scope creep beyond an approved FID boundary
  Human decision required before continuing when P7 is triggered.

---

## CONTROL vs EMPOWER — Scope Boundary

| Domain | FROZEN (must not change without Andy) | FLEXIBLE (AI has freedom) |
|---|---|---|
| Human authorship | Final record requires human "Xác nhận" before DB write | Draft/reading generation method |
| Domain identifiers | Part#/Lot#/Traveler#/Quantity never invented or auto-corrected | Formatting and UI structure |
| Data integrity | `stock_moves` append-only, no direct row edits | Which fields to display where |
| Stack decisions already committed (Next.js/TS/Postgres, 3-machine LAN) | — | Implementation details within that stack |
| AI touchpoint | Only the declared OCR step calls an LLM (see AI_POLICY.md Scope) | Which model/version, within approved options |

---

## CHANGE CONTROL
Major changes (new FID, new table, new AI touchpoint, data-flow change):
  FID approved + tests passing + CHANGELOG entry + standard commit (see FID_LIST.md workflow).

Minor changes (copy/UI tweak, config change, bug fix < 20 LOC):
  Direct commit with test permitted. FID not required. Still: write test, update CHANGELOG.

Note: PIPEDA does not mandate formal change documentation for every change.
      FID is a quality practice here, not a legal requirement in Canada.

---

## CANADIAN PRIVACY LAW — PIPEDA COMPLIANCE

### Federal — PIPEDA (Personal Information Protection and Electronic Documents Act)
10 Fair Information Principles:
  P1  Accountability       → Andy is the responsible person
  P2  Identifying Purpose  → State why data is collected (BEFORE collecting)
  P3  Consent              → Meaningful consent — explicit for sensitive data
  P4  Limiting Collection  → Collect only what is needed
  P5  Limiting Use         → Use only for stated purpose
  P6  Accuracy             → Keep data accurate and up to date
  P7  Safeguards           → Protect with appropriate security
  P8  Openness             → Tell people about privacy practices
  P9  Individual Access    → People can see their own data
  P10 Challenging Compliance → People can challenge compliance

### Quebec — Law 25
  Applies ONLY if AVP_ERP serves Quebec residents — [TO BE CONFIRMED, see
  PROJECT_INFO_FORM.md §1 Province]. Not assumed applicable by default.

### PII Patterns — Canada (kept for reference; AVP_ERP currently only stores operator
  name/code, no SIN/health data — see AI_POLICY.md §4)
```
SIN:         \b\d{3}[-\s]?\d{3}[-\s]?\d{3}\b      (Social Insurance Number)
CA Phone:    \b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b
Email:       standard RFC pattern
```

---

## AI INTERACTION PROTOCOL
When AI works on this project, AI operates in two modes simultaneously:

MODE 1 — EXECUTOR (always active):
  Follow instructions, implement FIDs, write tests, commit code.
  Obey FROZEN constraints absolutely.

MODE 2 — ADVISOR (always active, parallel):
  Surface relevant findings even when not asked.
  Prepend "ADVISORY:" to distinguish from executor output.
  Advisory does not block execution unless P7 (risk) is triggered.
  Human decides whether to act on advisory.

---

*CONSTITUTION v3.0 | AVP_ERP*
*Adapted 2026-09-17 from ISO_CA v2.0 — removed Pipeline L0-L10/PipelineGuard/GraphResolver
mechanics (no such pipeline exists in AVP_ERP); kept P1-P7 governance principles and PIPEDA
section unchanged in substance*
