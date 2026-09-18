// Test setup cho webapp/tests/db/ — nạp .env.test (database riêng, không
// dùng chung DB dev). Xem docs/features/FID-ERP-001_20260917.md §9 FILES.
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(__dirname, "../../.env.test") });

if (!process.env.DATABASE_URL?.includes("avp_erp_test")) {
  throw new Error(
    "DATABASE_URL không trỏ về avp_erp_test — dừng lại để tránh chạy test " +
      "nhầm vào database dev/production (stock_moves bất biến, không dọn được).",
  );
}
