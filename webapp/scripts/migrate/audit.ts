// FID-ERP-013 Phase 0 — quét lỗi TRƯỚC khi migrate, KHÔNG ghi bất kỳ bảng
// nào (chỉ đọc `part_control`/`travelers` hiện có để kiểm FK). Chạy:
//   npx tsx scripts/migrate/audit.ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseCsv } from "../../lib/migrate/csv";
import { parsePositiveInt, parseSourceDate } from "../../lib/migrate/dates";
import { prisma } from "../../lib/prisma";
import type { FinishGoodRow, PackingListRow, PartControlRow, RawMaterialRow, WarehouseRow } from "../../lib/migrate/types";

const DIR = resolve(__dirname, "../../../Data/migration");

function readCsv<T>(file: string): T[] {
  const content = readFileSync(resolve(DIR, file), "utf-8");
  return parseCsv(content) as T[];
}

function report(sheet: string, total: number, errorsByRow: string[][]) {
  const bad = errorsByRow.filter((e) => e.length > 0);
  console.log(`\n${sheet}: ${total} dòng, ${bad.length} dòng có vấn đề`);
  const counts = new Map<string, number>();
  for (const errs of bad) for (const e of errs) counts.set(e, (counts.get(e) ?? 0) + 1);
  for (const [code, n] of counts) console.log(`  ${code}: ${n}`);
}

async function main() {
  const partControl = readCsv<PartControlRow>("PartControl.csv");
  report(
    "PartControl",
    partControl.length,
    partControl.map((r) => {
      const errs: string[] = [];
      if (!(r.part ?? "").trim()) errs.push("MISSING_PART");
      if (parsePositiveInt(r.qtyPerBox) === null) errs.push("INVALID_QTY_PER_BOX");
      return errs;
    }),
  );

  const validParts = new Set(partControl.map((r) => (r.part ?? "").trim()));

  const rawMaterial = readCsv<RawMaterialRow>("RawMaterial.csv");
  report(
    "RawMaterial",
    rawMaterial.length,
    rawMaterial.map((r) => {
      const errs: string[] = [];
      if (!(r.traveler ?? "").trim()) errs.push("MISSING_TRAVELER");
      if (!(r.partNo ?? "").trim()) errs.push("MISSING_PART_NO");
      else if (!validParts.has(r.partNo.trim())) errs.push("PART_NOT_IN_PART_CONTROL");
      if (!parseSourceDate(r.date)) errs.push("INVALID_DATE");
      return errs;
    }),
  );

  const knownTravelers = new Set(rawMaterial.map((r) => (r.traveler ?? "").trim()));

  const warehouse = readCsv<WarehouseRow>("Warehouse.csv");
  report(
    "Warehouse",
    warehouse.length,
    warehouse.map((r) => {
      const errs: string[] = [];
      if (!(r.traveler ?? "").trim()) errs.push("MISSING_TRAVELER");
      else if (!knownTravelers.has(r.traveler.trim())) errs.push("TRAVELER_NOT_FOUND");
      if (parsePositiveInt(r.receivedPieces) === null) errs.push("INVALID_RECEIVED_PIECES");
      if (!parseSourceDate(r.receiveDate) && !parseSourceDate(r.createdAt)) errs.push("INVALID_DATE");
      return errs;
    }),
  );

  const defectLabels = (await prisma.defectType.findMany()).map((d) => d.label.toUpperCase());
  const finishGood = readCsv<FinishGoodRow>("FinishGood.csv");
  report(
    "FinishGood",
    finishGood.length,
    finishGood.map((r) => {
      const errs: string[] = [];
      if (!(r.traveler ?? "").trim()) errs.push("MISSING_TRAVELER");
      else if (!knownTravelers.has(r.traveler.trim())) errs.push("TRAVELER_NOT_FOUND");
      if (parsePositiveInt(r.qty) === null) errs.push("INVALID_QTY");
      if (!`${r.machine ?? ""}${r.mcNo ?? ""}`.trim()) errs.push("MISSING_MACHINE_CODE");
      if (!(r.operator ?? "").trim()) errs.push("MISSING_OPERATOR_CODE");
      if (!(r.shift ?? "").trim()) errs.push("MISSING_SHIFT");
      if (!parseSourceDate(r.date) && !parseSourceDate(r.createdAt)) errs.push("INVALID_DATE");
      if (r.reject && parsePositiveInt(r.reject) !== null) {
        const notes = (r.specialNotes ?? "").trim().toUpperCase();
        if (!notes || !defectLabels.some((l) => notes.includes(l))) errs.push("SCRAP_REASON_NOT_FOUND");
      }
      return errs;
    }),
  );

  const packingList = readCsv<PackingListRow>("PackingList.csv");
  report(
    "PackingList",
    packingList.length,
    packingList.map((r) => {
      const errs: string[] = [];
      if (!(r.ps ?? "").trim()) errs.push("MISSING_PS");
      if (!(r.traveler ?? "").trim()) errs.push("MISSING_TRAVELER");
      else if (!knownTravelers.has(r.traveler.trim())) errs.push("TRAVELER_NOT_FOUND");
      if (!(r.partNo ?? "").trim()) errs.push("MISSING_PART_NO");
      if (parsePositiveInt(r.quantity) === null) errs.push("INVALID_QUANTITY");
      return errs;
    }),
  );

  console.log("\nAudit xong — KHÔNG có gì được ghi vào database. Chạy run.ts để migrate thật.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
