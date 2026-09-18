# LEGAL_CA.md — Canada Legal Quick Reference by Sector
# Use when filling PROJECT_INFO_FORM.md Section 5 — Regulatory
# Updated: 2026-05-31 | Verify when new legislation passes
# ============================================================================

## UNIVERSAL — Applies to ALL Canadian AI Projects

| Law / Regulation | Content | Applies to AI |
|---|---|---|
| **PIPEDA** (federal) | Personal Information Protection and Electronic Documents Act | Collecting, storing, processing PII of Canadians |
| **AIDA** (Bill C-27) | Artificial Intelligence and Data Act — **NOT YET IN FORCE** | Monitor — design with its principles now |
| **Anti-Spam (CASL)** | Canada's Anti-Spam Legislation | Any email/SMS notifications from the system |
| **Accessibility** | AODA (Ontario) / ACA (federal) | UI must be accessible |

---

## HEALTHCARE

| Law | Jurisdiction | Content | AI Requirement |
|---|---|---|---|
| **PHIPA** | Ontario | Personal Health Information Protection Act | 10-year retention, consent, breach notification to IPC within 30 days |
| **PIPA** | BC / Alberta | Personal Information Protection Act | Stricter than PIPEDA for health data |
| **HIA** | Alberta | Health Information Act | Alberta-specific health data rules |
| **LSSSS + Law 25** | Quebec | Health services + Quebec privacy | PIA required, 72h breach to CAI |
| **Health Canada SaMD** | Federal | Software as Medical Device guidance | Phase 1 (documentation only) = outside scope. Phase 2 (clinical) = full review |
| **FHIR / HL7** | Standard | Health data interoperability | Not law, but required for EMR integration |

### Healthcare PII — What to protect
```
Must hash or anonymize:
  - OHIP number (Ontario)        → SHA-256 only
  - BC Personal Health Number    → SHA-256 only
  - AB Personal Health Number    → SHA-256 only
  - Full name + DOB combination  → Anonymize in analytics
  - Diagnosis + name combination → Sensitive category

Retention (Ontario PHIPA s.13):
  - Adult records: 10 years from last entry
  - Pediatric: 10 years from age 18
  - After retention period: secure destruction required
```

### Health Canada SaMD — Phase Decision Tree
```
Is your AI making or influencing clinical decisions? → YES → SaMD Review needed
Is your AI documenting only (scribe/transcription)? → YES → Phase 1 = outside SaMD
Is your AI recommending diagnoses?                  → YES → High Risk SaMD
Is your AI scheduling or administrative only?       → YES → Not SaMD
```

---

## FOOD SERVICE / RESTAURANT

| Law | Jurisdiction | Content | AI Requirement |
|---|---|---|---|
| **Health Canada Food Safety** | Federal | Food safety standards | Menu AI must not make false safety claims |
| **DineSafe** | Toronto | Restaurant inspection program | Public disclosure — AI can't hide inspection results |
| **Fraser Health** | BC | Restaurant inspections | Same principle |
| **CRA Records** | Federal | Canada Revenue Agency — 6-year retention | Financial records from AI system must be retained |
| **Employment Standards** | Provincial | Staff scheduling apps | AI scheduling must comply with minimum rest periods |

### Restaurant AI rules
```
Order data:      Session only — delete after order fulfilled
Customer PII:    Consent required for loyalty programs (PIPEDA P3)
Payment data:    NEVER touch — use PCI-DSS certified processor
Staff data:      PIPEDA applies — consent for any AI monitoring
Health claims:   "AI-suggested healthy option" = regulated — get legal review
```

---

## NAIL / BEAUTY SERVICES

| Law | Jurisdiction | Content | AI Requirement |
|---|---|---|---|
| **Provincial Consumer Protection** | Each province | Client rights | Clear pricing, no hidden fees |
| **PIPEDA** | Federal | Client personal data | Consent for records, max retention 3 years for most |
| **Workplace Safety** | Provincial | Staff safety | AI scheduling must respect rest rules |

### Nail Salon AI rules
```
Client photos (nails/hands):  Biometric-adjacent → explicit written consent
Client contact info:          PIPEDA consent required, can unsubscribe anytime
Appointment data:             3-year retention max (no legal requirement longer)
Staff tips/earnings:          CRA records — 6-year retention
Loyalty programs:             PIPEDA P3 consent — must be opt-in, not opt-out
```

---

## FINANCE / FINTECH

| Law | Jurisdiction | Content | AI Requirement |
|---|---|---|---|
| **OSFI** | Federal | Office of the Superintendent of Financial Institutions | AI in lending/insurance must be explainable |
| **FINTRAC** | Federal | Financial Transactions and Reports Analysis Centre | AML/ATF — report suspicious transactions |
| **FCAC** | Federal | Financial Consumer Agency of Canada | Consumer protection in financial AI |
| **PIPEDA** | Federal | Financial PII protection | Strong consent for financial data |

---

## RETAIL / E-COMMERCE

| Law | Jurisdiction | Content | AI Requirement |
|---|---|---|---|
| **Consumer Protection Act** | Provincial | Unfair practices, returns | AI pricing must not be deceptive |
| **CASL** | Federal | Anti-spam | Email/SMS marketing from AI requires express consent |
| **PIPEDA** | Federal | Customer data | Consent for personalization, can opt out |
| **Accessibility** | Ontario (AODA) | Accessible customer service | AI chatbot must support accessibility |

---

## PROVINCE QUICK COMPARISON

| | Federal (PIPEDA) | Ontario | BC | Alberta | Quebec |
|---|---|---|---|---|---|
| Privacy Law | PIPEDA | PHIPA (health) + PIPEDA | PIPA | PIPA + HIA | Law 25 |
| Breach Notification | PIPEDA (real risk of harm) | IPC Ontario, 30 days | OIPC BC | OIPC AB | CAI, 72 hours |
| Health Retention | PIPEDA default | PHIPA: 10 years | PIPA: 16 years | HIA: 10 years | 10 years |
| PIA Required | No | PHIPA PIAs for health | Recommended | Recommended | **YES — Law 25** |
| French Required | No | No | No | No | **YES — Law 101** |
| Fines | CAD $100,000 | CAD $500,000 (PHIPA) | CAD $100,000 | CAD $100,000 | CAD $25M or 4% |

---

## COMPLIANCE CHECKLIST — Before Deployment

```
[ ] Identified what PII is collected and why (PIPEDA P2 — purpose)
[ ] Consent mechanism in place — explicit for sensitive data (PIPEDA P3)
[ ] PII encrypted at rest and in transit (PIPEDA P7)
[ ] Retention period defined and deletion process exists
[ ] Audio / recordings deleted immediately after processing
[ ] Breach notification process documented (who calls regulator, when)
[ ] Quebec users? → Privacy Impact Assessment (PIA) completed
[ ] Healthcare? → Province-specific health law reviewed (PHIPA / PIPA / HIA)
[ ] AIDA monitoring plan: check status quarterly
[ ] All AI output labeled "AI-assisted — requires professional review"
[ ] Staff trained on privacy obligations
```

---

## KEY CONTACTS

| Regulator | Jurisdiction | For |
|---|---|---|
| OPC (Office of the Privacy Commissioner) | Federal | PIPEDA complaints |
| IPC Ontario | Ontario | PHIPA + Ontario privacy |
| OIPC BC | BC | PIPA BC |
| OIPC Alberta | Alberta | PIPA AB + HIA |
| CAI (Commission d'accès à l'information) | Quebec | Law 25 |
| Health Canada | Federal | SaMD / medical device queries |

---

*LEGAL_CA v1.0 | ISO_CA | Updated: 2026-05-31*
*Note: Quick reference only — not a substitute for qualified legal advice*
*Verify when AIDA passes or when provincial laws are amended*
