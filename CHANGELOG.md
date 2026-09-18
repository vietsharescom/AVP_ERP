# CHANGELOG -- AVP_ERP
# Bat dau: 2026-09-17

## [Unreleased]

### Added
- feat: schema Postgres nền tảng [FID-ERP-001] — scaffold `webapp/` (Next.js
  16 + TypeScript + Prisma 7), 8 bảng (`travelers`, `stock_moves`, `lots`,
  `defect_types`, `part_control`, `packing_slips`+`lines`, `print_log`) +
  1 VIEW (`traveler_last_select_status`), 3 CHECK constraint trên
  `stock_moves` + 1 trên `packing_slip_lines`, trigger append-only
  (`stock_moves` bất biến ở tầng database), seed 10 `defect_types` thật.
  15/15 test PASS (`webapp/tests/db/fid-erp-001.test.ts`), lint sạch,
  build thành công. Database `avp_erp` (dev) + `avp_erp_test` (test riêng)
  chạy trên PostgreSQL 18 local.
