import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./tests/db/setup.ts"],
    testTimeout: 15000,
    hookTimeout: 15000,
    // Test integration dùng CHUNG 1 database Postgres thật (avp_erp_test,
    // append-only — không dọn được stock_moves). Chạy song song nhiều file
    // gây race cho bất kỳ truy vấn KHÔNG scope theo khoá riêng của test đó
    // (vd FID-ERP-012 finished_goods_awaiting_shipment — cố ý KHÔNG lọc
    // theo ngày/traveler, đọc toàn bộ bảng). Chạy tuần tự để tránh flaky.
    fileParallelism: false,
  },
});
