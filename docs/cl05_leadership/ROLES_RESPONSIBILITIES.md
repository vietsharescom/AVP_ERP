# ROLES_RESPONSIBILITIES.md | ISO/IEC 42001:2023 Clause 5.3 -- MANDATORY | v2.0 — AVP_ERP

## ROLES

| Role | Person | Responsibility | Authority |
|---|---|---|---|
| System Owner | Andy Phan (Viet) | Ultimate accountability, AI policy sign-off, phase approval | Approve FIDs, approve AI_POLICY.md changes |
| Architecture / Dev | Andy Phan (Viet) + Claude (AI-assisted) | Schema design, Next.js implementation, module contracts (FID §3) | Approve FID contract changes |
| Office operator | [TO BE CONFIRMED — team size 1 for now, per PROJECT_INFO_FORM.md §6] | Search (full), **add file/OCR-read PO or Traveler documents**, confirm AI-read data, create Packing Slip | Confirm/reject AI-read records at Trạm 1; only role that can trigger the OCR touchpoint |
| Xưởng operator | [TO BE CONFIRMED] | Search (full, identical to Office), manual data entry, Good/Hold status, sticker printing | Confirm/reject manually-entered records at Trạm 2; **cannot add file/read file** (no OCR access — chốt 2026-09-17, see SOFTWARE_ARCHITECTURE.md §2.1) |
| Giám đốc/Quản lý (admin) | [TO BE CONFIRMED — a person other than Andy] | **FULL — same as Office, plus reports**: search, add file/OCR, create/edit Packing Slip, confirm records, all reports (FID-ERP-008, FID-ERP-012) | Máy 4 (laptop, LAN-only — see SOFTWARE_ARCHITECTURE.md §2.1); superset role — sửa lại 2026-09-17 (ban đầu định view-only, Andy đổi sau khi phản biện `Consultations/260917-Pilot_Infra.md`) |

Note: unlike the ISO_CA template (which assumes a 4-person team with a separate Audit
Lead), AVP_ERP is currently solo dev (Andy + AI-assisted development) but now has a
confirmed second stakeholder (Giám đốc/Quản lý, full access) — see PROJECT_INFO_FORM.md
§6 Team, needs updating. This table will be expanded further once Office/Xưởng staffing
for the new system is confirmed (see FACILITIES_SETUP.md §5 checklist).

## AI TOUCHPOINT AUTHORITY

AVP_ERP has one AI touchpoint (Gemini OCR at ingestion, FID-ERP-002) rather than an 11-stage
pipeline, so no per-layer authority map is needed. Authority over that touchpoint:

| Decision | Owner |
|---|---|
| Which OCR model/version used | Andy (System Owner) |
| Validation rules applied to OCR output | Architecture/Dev, per AI_POLICY.md §"Manufacturing/Contract Packing" |
| Who can trigger the OCR touchpoint (add file) | **Office operator AND Giám đốc/Quản lý (Máy 4)** — Xưởng is the only station without file-upload/read access, by design (2-gateway control, see AI_POLICY.md §"AI Gateway") |
| Confirming an AI-read record into Postgres | Whoever triggered the OCR read (Office or Máy 4) — human gate, never automatic |

*ROLES_RESPONSIBILITIES v2.0 | AVP_ERP | ISO/IEC 42001:2023 Clause 5.3*
*Adapted 2026-09-17 — removed "PIPELINE AUTHORITY MAP" (L0-L10 role mapping), not
applicable; kept human-gate authority principle from AI_POLICY.md/CONSTITUTION.md*
