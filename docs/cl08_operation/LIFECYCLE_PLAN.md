# LIFECYCLE_PLAN.md | ISO/IEC 12207:2017 + ISO/IEC 42001:2023 Clause 8.3 | v2.0 — AVP_ERP

| Phase | Name | Entry | Exit |
|---|---|---|---|
| P0 | Design | Repo created (2026-09-17) | Architecture + BRS approved, ORM decided |
| P1 | Requirements | P0 done | BRS approved, FID-ERP-001 (schema) written + APPROVED |
| P2 | Implementation | FID approved | Feature built, tests 100% pass |
| P3 | Integration | P2 done | End-to-end flow works on LAN test server |
| P4 | Validation | P3 done | Real PO/Traveler produces correct Packing Slip, parallel-run vs AVP_AI matches |
| P5 | Production | P4 signed off | Cut over from AVP_AI, monitoring active |

CURRENT PHASE: P0 -- Design (see docs/records/LATEST_SESSION.md for current open items)

*LIFECYCLE_PLAN v2.0 | AVP_ERP | ISO/IEC 12207:2017*
*Adapted 2026-09-17 — removed "SRS, RTM" exit criteria (files removed, AVP_ERP uses FID_LIST.md 9-section format instead); phases retitled to match SOFTWARE_ARCHITECTURE.md §4 roadmap*
