# APPLICABILITY.md
# AI Management System -- Applicability Statement
# ISO/IEC 42001:2023 Clause 1 -- Scope
# Version: v2.0 | Status: ACTIVE — AVP_ERP

---

## 1. STANDARD APPLICABILITY

This document records how ISO/IEC 42001:2023 applies to AVP_ERP.

ISO/IEC 42001:2023 specifies requirements for:
- Establishing an AI Management System (AIMS)
- Implementing responsible development and use of AI systems
- Continually improving AI governance

This standard applies to ANY organization that:
- Develops, provides, or uses AI systems
- Seeks to demonstrate responsible AI management

---

## 2. APPLICABILITY TO AVP_ERP

| ISO 42001 Requirement | Applicable | How Applied |
|---|---|---|
| Establishing AIMS | YES | This framework is the AIMS |
| AI Policy | YES | docs/cl05_leadership/AI_POLICY.md |
| Risk Management | YES | docs/cl06_planning/RISK_REGISTER.md |
| AI System Lifecycle | YES | One bounded OCR touchpoint (FID-ERP-002) — see AI_SYSTEM_TECHNICAL.md |
| Internal Audit | YES | AUDIT_PROGRAMME.md (adapted, no RuntimeAuditHook — audit is process review, not code hook) |
| Management Review | YES | docs/cl09_evaluation/MANAGEMENT_REVIEW.md |
| Continual Improvement | YES | docs/cl10_improvement/ |

---

## 3. ORGANIZATION TYPE

Maple Leaf Group / AVP_ERP is a:
- [ ] AI system developer (builds AI systems)
- [ ] AI system provider (offers AI as a service)
- [x] AI system user (uses AI — Gemini OCR — in operations)
- [ ] All of the above

---

## 4. AI SYSTEM CLASSIFICATION (EU AI Act Reference — for context only, AVP_ERP is Canada-only)

| Risk Category | Description | Applicable |
|---|---|---|
| Unacceptable risk | Prohibited AI | NO |
| High risk | Regulated AI (healthcare, transport, etc.) | NO |
| Limited risk | Transparency obligations | NO |
| Minimal risk | General AI applications | YES |

Classification: Minimal Risk — internal B2B logistics tool, not
healthcare/legal/hiring/credit; see PROJECT_INFO_FORM.md §5 for full justification.

---

*APPLICABILITY v2.0 -- AVP_ERP*
*ISO/IEC 42001:2023 Clause 1*
*Filled 2026-09-17*
