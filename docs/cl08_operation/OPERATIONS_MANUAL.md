# OPERATIONS_MANUAL.md | ISO/IEC 42001:2023 Clause 8.5 | v2.0 — AVP_ERP
# Status: PENDING — webapp/ does not exist yet (design phase, see LATEST_SESSION.md)

## STARTUP (once webapp/ exists — FID-ERP-001+)
```powershell
cd D:\AVP_ERP\webapp
npm install
npm run dev
```

## ADDING A FEATURE
1. Write FID: docs/features/FID-ERP-[NNN]_[YYYYMMDD].md using the 9-section format in
   FID_LIST.md (not FID_TEMPLATE.md's L{N} layer format — not applicable to AVP_ERP)
2. Status = APPROVED
3. Implement in webapp/
4. Write tests (vitest/jest per CLAUDE.md §3), 100% PASS required
5. Update CHANGELOG.md
6. Commit: feat: description [FID-ERP-NNN]

*OPERATIONS_MANUAL v2.0 | AVP_ERP | ISO/IEC 42001:2023 Clause 8.5*
*Adapted 2026-09-17 — replaced Python Orchestrator startup code with Next.js equivalent; will need a real update once webapp/ is scaffolded*
