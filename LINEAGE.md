# LINEAGE.md — ISO Framework Version Family
# Chọn đúng version cho project của bạn
# ============================================================================

## FAMILY TREE

```
ISO_EU_CA (D:\ISO_framework)          ← BASE STANDARD — EU + Canada
│   Standard: ISO 42001 + EU AI Act 2024 + GDPR + PIPEDA
│   Dùng khi: Product EU/Canada, cần highest compliance tier
│   Regulatory: Health Canada, GDPR Article 35, EU AI Act Annex IV
│
├── ISO_VN (D:\ISO_VN)                ← VIETNAM FORK
│       Standard: ISO 42001 + Luật ATTT 2018 + NĐ13/2023
│       Dùng khi: Product thị trường Việt Nam
│       Regulatory: Bộ Y Tế, Cục ATTT, NĐ13/2023/NĐ-CP
│       Created: 2026-05-31 | Based on: ISO_EU_CA v1.0
│
└── ISO_CA_BIZ (planned)              ← CANADA BUSINESS FORK
        Dùng khi: Andy's Canada businesses (restaurant, nail, healthcare)
        Status: PLANNED — chưa tạo
```

---

## CHỌN VERSION NÀO?

| Sản phẩm | Version |
|---|---|
| Product bán cho khách EU hoặc Canada | **ISO_EU_CA** (D:\ISO_framework) |
| Y tế / Nhà hàng / Nail ở Việt Nam | **ISO_VN** (D:\ISO_VN) |
| Andy's Canada business | **ISO_CA_BIZ** (planned) |

---

## ĐIỀU GIỐNG NHAU (mọi version)

- Pipeline FROZEN: L0→L10
- Human authorship: AI không tự lưu output
- P1–P7 principles (CONSTITUTION.md)
- 100% tests trước commit
- FID workflow cho major features
- Audit logging per stage

## ĐIỀU KHÁC NHAU

| | ISO_EU_CA | ISO_VN |
|---|---|---|
| Privacy law | GDPR + PIPEDA | NĐ13/2023 + Luật ATTT 2018 |
| AI regulation | EU AI Act 2024 | VN AI guidelines (tham khảo EU) |
| Health | Health Canada SaMD | Bộ Y Tế + TT21/2019/TT-BYT |
| PII patterns | SIN, OHIP, EU national ID | CCCD 12 số, BHYT, SĐT 10 số |
| Data retention | GDPR right to erasure | TT21: 10 năm hồ sơ y tế |
| Language | English | Tiếng Việt + English |

---

## SYNC POLICY
Khi ISO_EU_CA cập nhật CONSTITUTION.md (P1–P7):
  → Merge P1–P7 changes vào ISO_VN và ISO_CA_BIZ thủ công
  → Domain-specific sections KHÔNG sync — giữ riêng từng version

*LINEAGE v1.0 | Created: 2026-05-31 | Owner: Andy Phan (Viet)*
