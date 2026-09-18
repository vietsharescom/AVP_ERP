# CLAUDE_SYNC_PROMPT.md
# =================================================================
# DUNG KHI NAO : Moi khi owner thay doi thong tin trong PROJECT_INFO_FORM.md
# CACH DUNG    :
#   1. Chay: .\scripts\Sync-ProjectInfo.ps1   (cap nhat CLAUDE.md tu dong)
#   2. Nhan [+] add PROJECT_INFO_FORM.md
#   3. Copy phan LENH duoi day -> Dan vao Claude Code chat -> Enter
# =================================================================

---

## LENH DAN VAO CHAT:

Sync project info from updated PROJECT_INFO_FORM.md.

The form has been updated by the owner. CLAUDE.md IDENTITY is already synced.
Now update these 4 files to match the current form values:

**FILE 1: docs/cl04_context/AIMS_SCOPE.md**
- Organization, Project, Owner <- Section 1 Identity
- Scope description <- Section 2 Value/Solution
- Out scope Boundaries <- Section 2 Not in scope
- Interested Parties End Users row <- Section 3 Primary User

**FILE 2: docs/cl08_operation/BRS.md**
- Problem, Value <- Section 2
- Business Objectives (BO-001, BO-002...) <- Section 2 Hills + Success Metrics
- Constraints Regulatory <- Section 5 Data Protection + Sector Regulation
- Constraints Technical <- Section 6 Technical

**FILE 3: docs/cl05_leadership/AI_POLICY.md**
- AI scope + purpose <- Section 2 Value/Solution
- Human oversight policy <- Section 5 Human Oversight + Override Policy
- Regulatory compliance tier <- Section 5 EU AI Act Tier

**FILE 4: docs/cl06_planning/RISK_REGISTER.md**
- Update or add R-P01, R-P02, R-P03 <- Section 7 Risks
- KEEP all R-A, R-S, R-D, R-G rows exactly unchanged

RULES:
- Replace only changed values -- do NOT restructure files
- Write in English (ISO standard)
- If a value is "N/A" in the form -> keep existing doc content unchanged
- Show a summary table when done: File | Fields updated | Fields unchanged
- Do NOT mark anything as APPROVED until owner confirms

---

# =================================================================
# DE PHONG: neu can reset toan bo 5 docs tu form
# Dung: CLAUDE_INIT_PROMPT.md  (full re-init, ghi de het)
# Dung: CLAUDE_SYNC_PROMPT.md  (chi update nhung gi thay doi)
# =================================================================
