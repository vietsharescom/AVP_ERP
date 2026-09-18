# CONFIG_MANAGEMENT_PLAN.md | ISO/IEC 12207:2017 | v2.0 — AVP_ERP

## VERSION CONTROL
Tool: Git (not yet initialized — see docs/records/LATEST_SESSION.md) | Branch: main | Tag: avp-erp-v{MAJOR}.{MINOR}

## BASELINE
| Baseline | Date | Tag | Contents |
|---|---|---|---|
| Design v0.1 | 2026-09-17 | (pending git init) | Architecture + governance docs, no code yet |

## CHANGE CONTROL
All changes: FID (features) or issue (bugs) + tests passing + CHANGELOG + standard commit

## CONFIGURATION ITEMS
| Item | Location | Owner |
|---|---|---|
| Postgres schema (migrations) | webapp/prisma/ or webapp/drizzle/ (ORM TBD, see FID_LIST.md) | Andy |
| webapp/ source | webapp/ | Andy |
| FID documents | docs/features/ | Andy |

*CONFIG_MANAGEMENT_PLAN v2.0 -- AVP_ERP | ISO/IEC 12207:2017*
*Adapted 2026-09-17 — replaced graph_registry.json/module_contracts.json/src/core (pipeline-specific) with webapp/ + ORM schema location*
