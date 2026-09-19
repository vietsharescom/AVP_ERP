// FID-ERP-013 Phase 3 — đối chiếu COUNT/SUM giữa CSV gốc và Postgres sau
// khi `run.ts` chạy xong. Andy ký xác nhận (ghi vào LATEST_SESSION.md)
// TRƯỚC KHI tắt AVP_AI — xem docs/features/FID-ERP-013_20260919.md §5.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseCsv } from "../../lib/migrate/csv";
import { parsePositiveInt } from "../../lib/migrate/dates";
import { prisma } from "../../lib/prisma";
import type { FinishGoodRow, PackingListRow, PartControlRow, RawMaterialRow, WarehouseRow } from "../../lib/migrate/types";

const DIR = resolve(__dirname, "../../../Data/migration");

function readCsv<T>(file: string): T[] {
  const content = readFileSync(resolve(DIR, file), "utf-8");
  return parseCsv(content) as T[];
}

function sumBy<T>(rows: T[], pick: (r: T) => string | undefined): number {
  return rows.reduce((s, r) => s + (parsePositiveInt(pick(r)) ?? 0), 0);
}

function line(label: string, csvValue: number, dbValue: number) {
  const flag = csvValue === dbValue ? "OK " : "⚠ LỆCH";
  console.log(`  [${flag}] ${label}: CSV=${csvValue} | Postgres=${dbValue}`);
}

async function main() {
  const partControl = readCsv<PartControlRow>("PartControl.csv");
  const rawMaterial = readCsv<RawMaterialRow>("RawMaterial.csv");
  const warehouse = readCsv<WarehouseRow>("Warehouse.csv");
  const finishGood = readCsv<FinishGoodRow>("FinishGood.csv");
  const packingList = readCsv<PackingListRow>("PackingList.csv");

  const [quarantineCounts] = await Promise.all([
    prisma.migrationQuarantine.groupBy({ by: ["sourceSheet"], _count: { _all: true } }),
  ]);
  const quarantinedBySheet = new Map(quarantineCounts.map((q) => [q.sourceSheet, q._count._all]));

  console.log("=== FID-ERP-013 — Reconciliation Report ===\n");

  console.log("PartControl:");
  line("Số Part#", partControl.length, await prisma.partControl.count());
  console.log(`  Quarantine: ${quarantinedBySheet.get("PartControl") ?? 0}`);

  const csvTravelers = new Set(rawMaterial.map((r) => (r.traveler ?? "").trim()).filter(Boolean));
  console.log("\nRawMaterial:");
  line("Số Traveler#", csvTravelers.size, await prisma.traveler.count({ where: { travelerNo: { in: [...csvTravelers] } } }));
  console.log(`  Quarantine: ${quarantinedBySheet.get("RawMaterial") ?? 0}`);

  console.log("\nWarehouse (RECEIVE):");
  const receiveAgg = await prisma.stockMove.aggregate({ where: { moveType: "RECEIVE" }, _sum: { qty: true }, _count: true });
  line("SUM receivedPieces/qty", sumBy(warehouse, (r) => r.receivedPieces), receiveAgg._sum.qty ?? 0);
  console.log(`  Quarantine: ${quarantinedBySheet.get("Warehouse") ?? 0}`);

  console.log("\nFinishGood (SELECT + SCRAP):");
  const selectAgg = await prisma.stockMove.aggregate({ where: { moveType: "SELECT" }, _sum: { qty: true } });
  const scrapAgg = await prisma.stockMove.aggregate({ where: { moveType: "SCRAP" }, _sum: { qty: true } });
  line("SUM qty (SELECT)", sumBy(finishGood, (r) => r.qty), selectAgg._sum.qty ?? 0);
  line("SUM reject (SCRAP)", sumBy(finishGood, (r) => r.reject), scrapAgg._sum.qty ?? 0);
  console.log(`  Quarantine: ${quarantinedBySheet.get("FinishGood") ?? 0} (dòng reject không khớp reasonCode KHÔNG có SELECT/SCRAP nào được ghi — lệch SUM ở đây là BÌNH THƯỜNG cho tới khi Andy xử lý xong quarantine)`);

  console.log("\nPackingList (SHIP):");
  const shipAgg = await prisma.stockMove.aggregate({ where: { moveType: "SHIP" }, _sum: { qty: true } });
  const psCount = new Set(packingList.map((r) => (r.ps ?? "").trim()).filter(Boolean)).size;
  line("SUM quantity", sumBy(packingList, (r) => r.quantity), shipAgg._sum.qty ?? 0);
  line("Số Packing Slip (ps distinct)", psCount, await prisma.packingSlip.count());
  console.log(`  Quarantine: ${quarantinedBySheet.get("PackingList") ?? 0}`);

  const totalQuarantine = await prisma.migrationQuarantine.count({ where: { resolved: false } });
  console.log(`\nTổng dòng quarantine CHƯA xử lý: ${totalQuarantine}`);
  console.log("Andy review + resolve hết (hoặc chấp nhận bỏ qua có ghi chú) TRƯỚC KHI ký xác nhận tắt AVP_AI.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
