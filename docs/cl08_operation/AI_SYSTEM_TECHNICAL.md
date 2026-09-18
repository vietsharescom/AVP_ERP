# AI_SYSTEM_TECHNICAL.md | ISO/IEC 42001:2023 Annex A.6.2.7 -- MANDATORY | v2.0 — AVP_ERP

## SYSTEM IDENTIFICATION
Name: AVP_ERP | Version: v0.1 (design phase, no code yet) | Standard: ISO/IEC 42001:2023

## AI COMPONENTS
| Component | Type | Provider | Version | Usage |
|---|---|---|---|---|
| OCR / document reading | Gemini (Google) | Google | [TO BE CONFIRMED — AVP_AI currently uses gemini-3.5-flash-lite] | Read PO/Traveler PDF/image at ingestion (FID-ERP-002) only |

There is no embeddings/RAG/memory component, no multi-stage agent pipeline, and no second
AI touchpoint anywhere else in AVP_ERP (see SOFTWARE_ARCHITECTURE.md §0).

## LATENCY / PERFORMANCE TARGET
| Component | Input | Output | Latency Target |
|---|---|---|---|
| OCR ingestion | PO/Traveler PDF or image | Structured draft (fields + confidence) | [TO BE CONFIRMED — measure once FID-ERP-002 is built; AVP_AI baseline can inform this] |

## INFRASTRUCTURE
Node.js + Next.js (TypeScript) | PostgreSQL | Git | vitest/jest (per CLAUDE.md §3)
Deployment: on-premise, 3 physical machines on LAN — see SOFTWARE_ARCHITECTURE.md §2

*AI_SYSTEM_TECHNICAL v2.0 | AVP_ERP | ISO/IEC 42001:2023 Annex A.6.2.7*
*Adapted 2026-09-17 — replaced L0-L10 pipeline latency table (Python) with the actual
single AI touchpoint and Next.js/Postgres infrastructure*
