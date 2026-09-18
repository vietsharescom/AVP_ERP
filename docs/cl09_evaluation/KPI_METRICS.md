# KPI_METRICS.md | ISO/IEC 42001:2023 Clause 9.1 -- MANDATORY | v2.0 — AVP_ERP

## CATEGORY A -- Business Outcome (per PROJECT_INFO_FORM.md §2 Metrics)
| KPI | Description | Measure | Target |
|---|---|---|---|
| KPI-A01 | PO↔progress reconciliation automation (Metric 2) | Days/month matched without manual counting | 100% (AVP_AI baseline: 0/30 days) |
| KPI-A02 | Time saved vs AVP_AI baseline (Metric 1) | Hours/day hao phí | [TO BE CONFIRMED — target vs ~32h/day baseline] |
| KPI-A03 | Adoption rate (Metric 3) | % operators using AVP_ERP vs AVP_AI during parallel run | [TO BE CONFIRMED] |

## CATEGORY B -- AI/OCR Quality (per run)
| KPI | Description | Measure | Target |
|---|---|---|---|
| KPI-B01 | OCR read accuracy | Fields correct / fields read | >= 95% (or lower with mandatory human review) |
| KPI-B02 | Human-gate compliance | Records written without confirm step | 0 — CRITICAL if > 0 |

## CATEGORY C -- Code Quality (per commit)
| KPI | Description | Measure | Target |
|---|---|---|---|
| KPI-C01 | Test pass rate | passed / total | 100% |
| KPI-C02 | FID compliance rate | features with FID / total | 100% |
| KPI-C03 | CHANGELOG currency | hours since last entry on active work | <= 72h |

## MEASUREMENT TOOL
npm test (vitest/jest, per CLAUDE.md §3) — covers Category C

## BASELINE
Not yet measured — webapp/ does not exist (design phase, see LATEST_SESSION.md).
Baseline to be recorded when FID-ERP-001 ships.

*KPI_METRICS v2.0 -- AVP_ERP | ISO/IEC 42001:2023 Clause 9.1*
*Adapted 2026-09-17 — replaced "Pipeline success rate/Hook coverage" (pipeline-specific,
not applicable) with real AVP_ERP business + AI/OCR + code-quality KPIs*
