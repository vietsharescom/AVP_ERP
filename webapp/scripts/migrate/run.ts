// FID-ERP-013 — chạy migration 1 lần từ file CSV export của AVP_AI. Đọc
// docs/features/FID-ERP-013_20260919.md TRƯỚC KHI chạy trên dữ liệu thật
// (Status hiện tại: DRAFT — chờ Andy trả lời Mục 0 trước khi APPROVED).
//
// Cách chạy: đặt 5 file CSV vào Data/migration/ (RawMaterial.csv,
// Warehouse.csv, FinishGood.csv, PartControl.csv, PackingList.csv) rồi:
//   npx tsx scripts/migrate/run.ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseCsv } from "../../lib/migrate/csv";
import {
  migrateFinishGood,
  migratePackingList,
  migratePartControl,
  migrateRawMaterial,
  migrateWarehouse,
} from "../../lib/migrate/migrate";
import type { FinishGoodRow, PackingListRow, PartControlRow, RawMaterialRow, WarehouseRow } from "../../lib/migrate/types";

const DIR = resolve(__dirname, "../../../Data/migration");

function readCsv<T>(file: string): T[] {
  const content = readFileSync(resolve(DIR, file), "utf-8");
  return parseCsv(content) as T[];
}

async function main() {
  const partControl = readCsv<PartControlRow>("PartControl.csv");
  const rawMaterial = readCsv<RawMaterialRow>("RawMaterial.csv");
  const warehouse = readCsv<WarehouseRow>("Warehouse.csv");
  const finishGood = readCsv<FinishGoodRow>("FinishGood.csv");
  const packingList = readCsv<PackingListRow>("PackingList.csv");

  console.log("PartControl:", await migratePartControl(partControl));
  console.log("RawMaterial:", await migrateRawMaterial(rawMaterial));
  console.log("Warehouse:  ", await migrateWarehouse(warehouse));
  console.log("FinishGood: ", await migrateFinishGood(finishGood));
  console.log("PackingList:", await migratePackingList(packingList, finishGood));
  console.log("\nXem bảng migration_quarantine cho các dòng bị lỗi (chưa migrate).");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
