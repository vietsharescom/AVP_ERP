# CLAUDE_INIT_PROMPT.md
# =================================================================
# DUNG KHI NAO : Chi 1 LAN DUY NHAT -- luc khoi tao project moi
# CACH DUNG    : Nhan [+] add PROJECT_INFO_FORM.md (+ file bo sung neu co)
#                Sau do COPY PHAN LENH DUOI DAY va dan vao chat Claude Code
# CAC SESSION SAU: KHONG can dan lai -- Claude tu doc CLAUDE.md
# =================================================================

---

## LENH DAN VAO CHAT (copy tu day xuong het):

Initialize ISO project setup from the attached PROJECT_INFO_FORM.md.

Read all attached files and fill exactly these 5 files:

**FILE 1: CLAUDE.md**
Fill the IDENTITY section:
- Project, Owner, Organization, Path, GitHub, Stack
- Replace all [PLACEHOLDER] with real values from the form

**FILE 2: docs/cl04_context/AIMS_SCOPE.md**
Fill: Organization, Project, Owner, Scope description,
Boundaries (In scope / Out scope), Interested Parties table

**FILE 3: docs/cl08_operation/BRS.md**
Fill: Problem statement, Value/solution, Business Objectives (min 2 rows),
Constraints table (Regulatory + Technical rows)

**FILE 4: docs/cl05_leadership/AI_POLICY.md**
Fill: scope, purpose, and AI usage policy appropriate for this project type

**FILE 5: docs/cl06_planning/RISK_REGISTER.md**
Add project-specific risks under PROJECT-SPECIFIC RISKS section only.
Row format: | R-P0N | [risk] | [High/Medium/Low] | [likelihood] | [control] |
Keep all existing architecture/AI/data/governance risks unchanged.

RULES:
- Replace [PLACEHOLDER] with real info -- never leave brackets in final output
- Keep existing file structure and formatting
- Write in English (ISO standard)
- If info is missing from form -> write [TO BE CONFIRMED] not invented text
- Do NOT set Status = APPROVED yet

WHEN DONE:
Show me a summary table:
| File | Key fields filled | Missing / needs review |
Then wait for my confirmation before marking anything APPROVED.

---

# =================================================================
# SAU KHI OWNER XAC NHAN "APPROVED":
#
# BUOC TIEP THEO -- TAO FEATURE DAU TIEN:
#   1. Copy: docs/features/FID_TEMPLATE.md
#         -> docs/features/[CODE]-FID-001_[YYYYMMDD].md
#   2. Dien 9 sections, set Status = APPROVED
#   3. Gui Claude: "Build [CODE]-FID-001_[YYYYMMDD]"
#
# CAC SESSION LÀM FEATURE SAU NAY:
#   Chi can gui: "Build [CODE]-FID-00N_[DATE]"
#   Claude tu doc CLAUDE.md va FID -- khong can dan prompt nay nua
# =================================================================
