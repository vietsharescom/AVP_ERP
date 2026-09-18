# [PROJECT_CODE]-FID-[NNN]_[YYYYMMDD].md
# Feature Intent Document
# ISO/IEC 12207:2017 + ISO/IEC 42001:2023 Clause 8.4
# Status: DRAFT  (change to APPROVED before sending to AI)

---
## 1. INTENT -- 1 sentence, business language
```
[What this feature does, from user perspective]
```
Good: "When user speaks, system understands intent and routes correctly."

## 2. WHY -- Business justification
```
[What problem solved. What happens without this feature.]
```

## 3. LAYER
```
Primary:  L{N}_{NAME}
Affected: [list or "none"]
NOT:      [explicit exclusions -- prevents scope creep]
```
Layers: L0_INPUT, L1_SEMANTIC, L2_ENFORCER, L3_ROUTING,
        L4_DECISION_AUTHORITY, L5_POLICY_ENGINE, L6_AGENT,
        L7_MEMORY_TOOL, L8_RECOVERY, L9_RESPONSE, L10_OBSERVABILITY

## 4. CONTRACT
Input:  ```json { "example": "value" } ```
Output: ```json { "ok": true, "data": {}, "stage": "L{N}" } ```

## 5. RULES
MUST:     - [Required behavior -- from SOFTWARE_DESIGN.md]
MUST NOT: - [Forbidden -- copy from SOFTWARE_DESIGN.md for this layer]

## 6. EXAMPLE
Input:  [real example]
Output: { "ok": true, "data": "[real result]" }
Edge:   Input: [edge case] -> Output: [expected]

## 7. TEST CRITERIA (minimum 3)
- [ ] Happy path: [describe]
- [ ] Validation: [describe]
- [ ] Edge case:  [describe]
- [ ] All existing tests still PASS (no regression)
- [ ] CHANGELOG.md updated

## 8. NOT IN SCOPE
- Not doing: [explicit exclusion]
- Defer to FID-[NNN]: [what is deferred]

## 9. FILES -- Exactly what changes
New:    src/pipeline/[phase]/[stage].py
        tests/unit/pipeline/test_[stage].py
Update: CHANGELOG.md (mandatory)

---
## CHECKLIST BEFORE SENDING TO AI
- [ ] Section 1: 1 sentence, business language
- [ ] Section 3: Layer confirmed vs SOFTWARE_DESIGN.md
- [ ] Section 4: Concrete JSON examples
- [ ] Section 7: At least 3 test cases
- [ ] Section 8: Explicit exclusions
- [ ] Status = APPROVED

Then send: "Build [PROJECT_CODE]-FID-[NNN]_[DATE]"

*FID_TEMPLATE v1.0 | ISO/IEC 12207:2017 + ISO/IEC 42001:2023 Clause 8.4*
