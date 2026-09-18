# GLOSSARY.md
# Terms and Definitions
# ISO/IEC 42001:2023 Clause 3 + ISO/IEC 22989:2022
# Version: v2.0 | Status: ACTIVE — AVP_ERP

---

## PURPOSE

Defines all terms used in this AIMS.
Source: ISO/IEC 42001:2023 Clause 3 + ISO/IEC 22989:2022 (AI concepts).
Project-specific terms are marked [AVP].

---

## A

**AI System**
An engineered system that generates outputs such as predictions,
recommendations, decisions, or content that influence real or virtual environments.
*(ISO/IEC 22989:2022)*

**AI Management System (AIMS)**
Management system with regard to AI.
*(ISO/IEC 42001:2023, 3.1)*

---

## C

**Concession** [AVP]
Approval to ship a part despite a nonconformance, per ISO 9001 Clause 8.7 — carried
forward from AVP_AI's verified qcStatus model.

---

## F

**FID -- Feature Intent Document** [AVP]
A structured document that must be APPROVED before any feature is built.
AVP_ERP uses a 9-section format (Intent/Why/Module/Contract/Rules/Example/Test
Criteria/Not In Scope/Files) — see FID_LIST.md — instead of the generic ISO_CA
FID_TEMPLATE.md, which assumes a Python agent-pipeline "Layer" field not applicable here.

---

## G

**Governance**
System by which an organization directs and controls AI-related activities.
*(ISO/IEC 42001:2023, 3.8)*

---

## H

**Human Oversight**
Capacity of humans to understand, monitor, and correct AI system behavior.
*(ISO/IEC 42001:2023)* In AVP_ERP: the mandatory "Xác nhận" (Confirm) gate before any
AI-read data reaches Postgres — see AI_POLICY.md §1.

---

## L

**Lot# / LOT NO.** [AVP]
Traceability identifier for a production batch. One Traveler = one LOT NO. (validation
rule, see PROJECT_INFO_FORM.md §4).

---

## P

**Part#** [AVP]
Customer (Infasco) part number. Must exist in `part_control` before use.

**Packing Slip (PS)** [AVP]
Shipping document generated from `packing_slips` + `packing_slip_lines`. Blocked at the
database layer if any line has qcStatus=HOLD or a missing Lot# (see RISK_REGISTER.md R-G03).

**Pot#** [AVP]
Container/gaylord identifier, used to link Rework/Return records.

**Policy**
Statement of intent that guides decisions and actions.
*(ISO 9000:2015)*

---

## Q

**qcStatus** [AVP]
Quality status of a traveler line: PASS / HOLD / CONCESSION.

---

## R

**Risk**
Effect of uncertainty on objectives.
*(ISO 31000:2018, 3.1)*

**Risk Assessment**
Overall process of risk identification, risk analysis, and risk evaluation.
*(ISO 31000:2018, 3.4)*

---

## S

**Statement of Applicability (SoA)**
Document stating which controls from Annex A are applicable and why.
*(ISO/IEC 42001:2023, 6.1.3)*

**stock_moves** [AVP]
Append-only, immutable ledger table (modeled on Odoo's `stock.move`) — every
receive/select/pack/ship event is a new entry, never an overwrite. Replaces AVP_AI's
pattern of editing a field in place. See SOFTWARE_ARCHITECTURE.md §3.

---

## T

**Traveler#** [AVP]
Unique identifier for one traveler sheet — primary key in the `travelers` table.

**Transparency**
Property of an AI system that allows humans to understand its behavior.
*(ISO/IEC 42001:2023)*

---

*GLOSSARY v2.0 -- AVP_ERP*
*ISO/IEC 42001:2023 Clause 3 + ISO/IEC 22989:2022*
*Adapted 2026-09-17 — removed pipeline-specific terms (Audit Hook, ExecutionProof,
GraphResolver, Orchestrator, Pipeline, PipelineGuard, Stage, StageResult, UnifiedItem —
not applicable, no such pipeline in AVP_ERP), added AVP domain terms from
PROJECT_INFO_FORM.md §3*
