# PROJECT_KICKOFF.md | AVP-CL08-PKF | ISO/IEC 42001:2023 §4 + §8.1 | Template v1.1
# Mandatory before any new project or major feature initiative starts.
# AI (Claude) fills Sections 1-9. Owner reviews + signs Section 10.
# No FID, no code until Section 10 is signed.
# Fixed encoding 2026-09-17 (source file had mojibake from a prior save) — content unchanged.

---

## WHY THIS FORM EXISTS

Industry norm (ISO 9001 §4.1, ISO 42001 §4.2, PMI PMBOK): context analysis before architecture.
MediVoice lesson: VN legal requirements (NĐ13/2023, TT21/2019) were discovered mid-development,
causing architecture rework. This form prevents that.

AI model selection lesson: Choosing a model without cost/legal analysis leads to lock-in.
(Example: cloud LLM OK for Canada, illegal for VN if data leaves country.)

Note for AVP_ERP: this project's kickoff context (problem, stack, architecture) is already
captured in PROJECT_INFO_FORM.md + SOFTWARE_ARCHITECTURE.md. This template is kept for
future major feature initiatives that need the same rigor (e.g. if AVP_ERP is later
repackaged as a product for a second customer, per PROJECT_INFO_FORM.md's closing note).

---

## SECTION 1: PROBLEM STATEMENT
*AI fills this from owner's brief. Owner corrects.*

| Field | Value |
|---|---|
| Problem | |
| Who has this problem | |
| Quantified pain (time/money/risk) | |
| What happens if not solved | |
| Why now | |

**Owner brief (paste raw input here):**
```
[Andy pastes or dictates the problem description]
```

---

## SECTION 2: TARGET MARKET

| Field | Value |
|---|---|
| Country / Region | e.g. Vietnam / Canada / EU / USA |
| Language(s) | e.g. VI / EN / FR |
| User type | e.g. Doctor / Patient / Restaurant staff |
| Deployment target | Local device / Cloud SaaS / Hybrid |
| Internet requirement | Required / Optional / Offline-capable |
| Scale (users at launch) | 1-10 / 10-1000 / 1000+ |
| Scale (users at 12 months) | |

---

## SECTION 3: LEGAL & REGULATORY SCAN
*AI MUST research and fill this section before any architecture decision.*
*Claude: search current laws for the target market above. Do not assume.*

### 3a. Data Privacy
| Regulation | Applicable? | Key Obligations | Status |
|---|---|---|---|
| Vietnam NĐ13/2023 (PDPA-VN) | if VN user data | Explicit consent, data residency VN, 72h breach report | ☐ N/A / ☐ Applies |
| EU GDPR | if EU user data | Consent, DPA required for processors, right to erasure | ☐ N/A / ☐ Applies |
| Canada PIPEDA | if Canadian user data | Consent, safeguards, breach notification | ☐ N/A / ☐ Applies |
| USA HIPAA | if US medical data | PHI safeguards, BAA with cloud vendors | ☐ N/A / ☐ Applies |
| Other | | | |

### 3b. Domain-specific regulation
| Domain | Regulation | Impact on Architecture |
|---|---|---|
| Medical | VN: Luật KCB 2023, TT21/2019, QĐ5837/BYT | Bệnh án lưu 10 năm, bác sĩ phê duyệt |
| Medical | CA: Health Canada SaMD classification | AI docs assistant ≠ SaMD if Phase 1 |
| Finance | VN: Luật NHNN, NĐ64/2024 | |
| Food/Beverage | VN: Luật ATTP | |
| Other | | |

### 3c. AI-specific regulation
| Regulation | Applicable? | Notes |
|---|---|---|
| EU AI Act (High Risk?) | if EU market | High Risk = medical, education, employment |
| Vietnam AI Circular (draft 2025+) | if VN market | Monitor — not final yet |
| Data residency requirement | per market | VN: data must stay in Vietnam |

### 3d. Regulatory verdict
- **Blocking before launch** (must resolve): ___
- **Non-blocking** (monitor, plan for Phase 2): ___
- **Not applicable**: ___
- **ISO framework to use** (pre-answer for Section 6): ___

---

## SECTION 4: INPUT DATA ASSESSMENT

| Field | Value |
|---|---|
| Data source | Real production / Kaggle / Synthetic / Public dataset / Mixed |
| Dataset name / URL | |
| Data quality | Clean / Noisy / Mixed |
| Volume | < 1k / 1k–100k / > 100k samples |
| Labels | Fully labeled / Unlabeled / Partial |
| Contains PII? | Yes → Section 3 privacy rules apply / No |
| Patient/user consent? | Required + obtained / Not required |
| Licence | CC BY / Apache 2.0 / MIT / Proprietary / Research only |
| Licence allows commercial use? | Yes / No / Unknown |
| Data freshness | Year of collection: ___ |
| Known biases | Language / demographic / regional |

---

## SECTION 5: USE CASE CLASSIFICATION

| Field | Value |
|---|---|
| Primary use case type | Learning/PoC / Internal testing / Production / Industrial |
| End user action | Read-only / Decision support / Autonomous action |
| Criticality | High (medical/finance/safety) / Medium / Low |
| Failure mode tolerance | Silent degradation OK / Must fail loudly |
| Real-time latency | Batch OK / < 5s / < 1s / < 200ms |
| Accuracy requirement | Best-effort / > 90% / > 95% / > 99% |
| Auditability required | Full trace / Summary / None |
| Human-in-loop required | Always / On flag / Never |

---

## SECTION 6: ISO FRAMEWORK SELECTION
*Based on Sections 2–3.*

| Framework | Select | Rationale |
|---|---|---|
| ISO_EU_CA (D:\ISO_framework) — EU AI Act + GDPR + PIPEDA | ☐ | For EU/Canada dual-market products |
| ISO_VN (D:\ISO_VN) — NĐ13/2023 + Bộ Y Tế + Luật ATTT | ☐ | For Vietnam-first products |
| ISO_CA (D:\16.ISO_CA) — PIPEDA only, no EU AI Act overhead | ☑ (AVP_ERP, already selected) | Canada-only, non-medical, internal B2B tool |
| Hybrid | ☐ | Specify: ___ |

Selected: ISO_CA | Rationale: AVP_ERP is a Canada-only internal manufacturing/logistics tool, minimal AI risk tier (see PROJECT_INFO_FORM.md §5)

---

## SECTION 7: 5M RESOURCE PLANNING

### Man (People)
| Role | Person / Resource | Hours estimated |
|---|---|---|
| Owner / Decision maker | Andy Phan | |
| AI developer | Claude (primary) / Human (review) | |
| Domain expert | e.g. Doctor / Accountant / Chef | |
| Legal advisor | Needed? Yes / No | |
| Tester | Automated (vitest/jest) + Claude | |
| External AI reviewers | ChatGPT + Grok per module | |

### Machine (Infrastructure)
| Resource | Spec | Status |
|---|---|---|
| Dev environment | Local Windows 11 | |
| GPU required? | No | |
| GPU spec needed | N/A | |
| Storage | < 10GB | |
| Deployment target | On-premise LAN (3 machines) — see SOFTWARE_ARCHITECTURE.md | |
| Network requirement | LAN (offline-capable except PO email fetch) | |

### Method (Process)
| Item | Value |
|---|---|
| Methodology | Single-developer agile |
| FID required for? | All changes > 50 LOC |
| Minor changes | < 20 LOC → direct commit with test |
| Test coverage | 100% pass before commit |
| Review cycle | Per module: ChatGPT + Grok review |
| Deployment method | Manual |

### Money (Budget)
| Item | Estimate | Notes |
|---|---|---|
| AI model API cost | Gemini OCR, low volume | [TO BE CONFIRMED] |
| Cloud compute | $0 — on-premise | |
| Dataset licence fee | $0 | |
| GPU hardware (one-time) | $0 | |
| Total Phase 1 estimate | [TO BE CONFIRMED] | See PROJECT_INFO_FORM.md §6 |
| Budget approved | TBD | |

### Material (Data & Tools)
| Item | Value |
|---|---|
| Training / fine-tune data | None — general model, no fine-tuning (see PROJECT_INFO_FORM.md §4) |
| Base model | Gemini (Google) |
| Frameworks | Next.js, TypeScript, PostgreSQL |
| External APIs needed | Google Gemini |
| Proprietary licences needed | None |

---

## SECTION 8: SOLUTION OPTIONS — A / B / C
*AI MUST analyze ≥ 3 options. Never propose only one path.*

This section applies to NEW major decisions (e.g. a future architecture pivot), not to
AVP_ERP's already-committed stack (Next.js/TypeScript/PostgreSQL, on-premise LAN — see
SOFTWARE_ARCHITECTURE.md, decided 2026-09-17). Fill when the next major decision arises
(e.g. ORM choice — see FID_LIST.md blocking question).

---

## SECTION 9: LATEST TECHNOLOGY SCAN
*AI MUST scan for breakthroughs before finalizing architecture.*

Not run for AVP_ERP's initial architecture (stack was chosen to reuse 9 months of proven
AVP_AI production code, not to chase the latest tech — see SOFTWARE_ARCHITECTURE.md §1).
Run this scan if a genuinely new AI touchpoint (beyond OCR) is proposed later.

---

## SECTION 10: APPROVAL GATE

| Checkpoint | Status |
|---|---|
| S1: Problem statement clear | ✅ Done (PROJECT_INFO_FORM.md §2) |
| S2: Target market defined | ✅ Done (PROJECT_INFO_FORM.md §1) |
| S3: Legal scan complete — no blocking issue unresolved | ✅ Done (PIPEDA, Minimal Risk Tier) |
| S4: Data assessed + licence confirmed | ✅ Done (internal data, no licensing issue) |
| S5: Use case classified | ✅ Done (Production, Human-in-loop always) |
| S6: ISO framework selected | ✅ Done (ISO_CA) |
| S7: 5M resources estimated | ☐ Partial — Budget/Timeline/Team still [TO BE CONFIRMED] |
| S8: ≥ 3 solution options with cost analysis | N/A for this kickoff — stack already committed |
| S9: Latest tech scan done | N/A for this kickoff — see Section 9 note |
| Owner reviewed all sections | ☐ Pending |

**Decision:**
- [x] APPROVED — proceed to FID (architecture + BRS already approved 2026-09-17; Section 7 budget/timeline gaps do not block starting FID-ERP-001)

Approved by: Andy Phan | Date: 2026-09-17

---

*AVP-CL08-PKF | PROJECT_KICKOFF v1.1 | ISO/IEC 42001:2023 §4.1 + §8.1*
