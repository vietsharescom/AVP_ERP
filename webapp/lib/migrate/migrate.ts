// FID-ERP-013 — Migration 1 lần từ AVP_AI. Xem
// docs/features/FID-ERP-013_20260919.md §4/§5 cho quy tắc đầy đủ.
//
// THỨ TỰ BẮT BUỘC (phụ thuộc FK, xem §5 RULES):
//   migratePartControl -> migrateRawMaterial -> migrateWarehouse
//   -> migrateFinishGood -> migratePackingList
//
// Idempotent: gọi lại nhiều lần trên CÙNG dữ liệu không tạo dòng trùng —
// mỗi hàm tự kiểm tra "đã migrate chưa" bằng khoá tự nhiên trước khi ghi.
import { prisma } from "../prisma";
import { isGaylordReturn } from "../rework";
import { isLegacyLotPlaceholder } from "./legacyLot";
import { parsePositiveInt, parseSourceDate } from "./dates";
import type {
  FinishGoodRow,
  MigrateSummary,
  PackingListRow,
  PartControlRow,
  RawMaterialRow,
  WarehouseRow,
} from "./types";

async function quarantine(sourceSheet: string, sourceRow: number, rawData: unknown, errorCodes: string[]) {
  await prisma.migrationQuarantine.create({
    data: { sourceSheet, sourceRow, rawData: rawData as object, errorCodes },
  });
}

function machineCodeOf(row: { machine?: string; mcNo?: string }): string {
  return `${(row.machine ?? "").trim()}${(row.mcNo ?? "").trim()}`.trim();
}

// ── 1. PartControl ──────────────────────────────────────────────────────
export async function migratePartControl(rows: PartControlRow[]): Promise<MigrateSummary> {
  const summary: MigrateSummary = { inserted: 0, skipped: 0, quarantined: 0 };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const part = (row.part ?? "").trim();
    const qtyPerBox = parsePositiveInt(row.qtyPerBox);

    if (!part || qtyPerBox === null) {
      await quarantine("PartControl", i + 1, row, [!part ? "MISSING_PART" : "INVALID_QTY_PER_BOX"]);
      summary.quarantined++;
      continue;
    }

    await prisma.partControl.upsert({
      where: { partNo: part },
      update: { qtyPerBox, client: row.client ?? "" },
      create: { partNo: part, qtyPerBox, client: row.client ?? "" },
    });
    summary.inserted++;
  }

  return summary;
}

// ── 2. RawMaterial -> travelers (đăng ký, KHÔNG ghi stock_moves — đúng
//    tương đương đích "po" ở FID-ERP-002) ───────────────────────────────
export async function migrateRawMaterial(rows: RawMaterialRow[]): Promise<MigrateSummary> {
  const summary: MigrateSummary = { inserted: 0, skipped: 0, quarantined: 0 };
  const validParts = new Set((await prisma.partControl.findMany({ select: { partNo: true } })).map((p) => p.partNo));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const travelerNo = (row.traveler ?? "").trim();
    const partNo = (row.partNo ?? "").trim();
    const createdAt = parseSourceDate(row.date);
    const errors: string[] = [];

    if (!travelerNo) errors.push("MISSING_TRAVELER");
    if (!partNo) errors.push("MISSING_PART_NO");
    if (partNo && !validParts.has(partNo)) errors.push("PART_NOT_IN_PART_CONTROL");
    if (!createdAt) errors.push("INVALID_DATE");

    if (errors.length > 0) {
      await quarantine("RawMaterial", i + 1, row, errors);
      summary.quarantined++;
      continue;
    }

    const potNo = (row.pot ?? "").trim() || null;
    await prisma.traveler.upsert({
      where: { travelerNo },
      update: {
        poNo: (row.po ?? "").trim() || null,
        potNo,
        ...(isGaylordReturn(potNo) ? { isReturnForRework: true } : {}),
      },
      create: {
        travelerNo,
        partNo,
        poNo: (row.po ?? "").trim() || null,
        potNo,
        createdAt: createdAt!,
        isReturnForRework: isGaylordReturn(potNo),
      },
    });
    summary.inserted++;
  }

  return summary;
}

// ── 3. Warehouse -> stock_moves RECEIVE (tương đương đích "warehouse" ở
//    FID-ERP-002) ───────────────────────────────────────────────────────
export async function migrateWarehouse(rows: WarehouseRow[]): Promise<MigrateSummary> {
  const summary: MigrateSummary = { inserted: 0, skipped: 0, quarantined: 0 };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const travelerNo = (row.traveler ?? "").trim();
    const qty = parsePositiveInt(row.receivedPieces);
    const createdAt = parseSourceDate(row.receiveDate) ?? parseSourceDate(row.createdAt);
    const errors: string[] = [];

    if (!travelerNo) errors.push("MISSING_TRAVELER");
    if (qty === null) errors.push("INVALID_RECEIVED_PIECES");
    if (!createdAt) errors.push("INVALID_DATE");

    if (travelerNo && errors.length === 0) {
      const traveler = await prisma.traveler.findUnique({ where: { travelerNo } });
      if (!traveler) errors.push("TRAVELER_NOT_FOUND");
    }

    if (errors.length > 0) {
      await quarantine("Warehouse", i + 1, row, errors);
      summary.quarantined++;
      continue;
    }

    // Idempotent — 1 Warehouse row/traveler theo đúng bất biến thật (nhận
    // kho chỉ xảy ra 1 lần cho 1 lô nguyên liệu).
    const existing = await prisma.stockMove.findFirst({ where: { travelerNo, moveType: "RECEIVE" } });
    if (existing) {
      summary.skipped++;
      continue;
    }

    await prisma.stockMove.create({
      data: {
        travelerNo,
        moveType: "RECEIVE",
        qty: qty!,
        operatorCode: (row.receivedBy ?? "").trim() || null,
        sourceStation: "OFFICE",
        note: row.note || null,
        createdAt: createdAt!,
      },
    });
    summary.inserted++;
  }

  return summary;
}

async function resolveReasonCodeFromNotes(notes: string | null | undefined): Promise<string | null> {
  const normalized = (notes ?? "").trim().toUpperCase();
  if (!normalized) return null;
  const types = await prisma.defectType.findMany();
  return types.find((t) => normalized.includes(t.label.toUpperCase()))?.code ?? null;
}

// ── 4. FinishGood -> stock_moves SELECT(+SCRAP) + quality_checks + Lot ──
export async function migrateFinishGood(rows: FinishGoodRow[]): Promise<MigrateSummary> {
  const summary: MigrateSummary = { inserted: 0, skipped: 0, quarantined: 0 };

  // Xử lý theo thứ tự thời gian tăng dần — "Lot/Skid mới nhất thắng" khi
  // ghi vào travelers (mutable), đúng Mục 0 #5 (FID-ERP-013).
  const ordered = rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const da = parseSourceDate(a.row.date ?? a.row.createdAt)?.getTime() ?? 0;
      const db = parseSourceDate(b.row.date ?? b.row.createdAt)?.getTime() ?? 0;
      return da - db;
    });

  for (const { row, index } of ordered) {
    const travelerNo = (row.traveler ?? "").trim();
    const qty = parsePositiveInt(row.qty);
    const machineCode = machineCodeOf(row);
    const operatorCode = (row.operator ?? "").trim();
    const shift = (row.shift ?? "").trim();
    const createdAt = parseSourceDate(row.date) ?? parseSourceDate(row.createdAt);
    const rejectQty = row.reject ? parsePositiveInt(row.reject) : null;

    const errors: string[] = [];
    if (!travelerNo) errors.push("MISSING_TRAVELER");
    if (qty === null) errors.push("INVALID_QTY");
    if (!machineCode) errors.push("MISSING_MACHINE_CODE");
    if (!operatorCode) errors.push("MISSING_OPERATOR_CODE");
    if (!shift) errors.push("MISSING_SHIFT");
    if (!createdAt) errors.push("INVALID_DATE");

    let traveler: { travelerNo: string; potNo: string | null } | null = null;
    if (travelerNo) {
      traveler = await prisma.traveler.findUnique({ where: { travelerNo }, select: { travelerNo: true, potNo: true } });
      if (!traveler) errors.push("TRAVELER_NOT_FOUND");
    }

    let reasonCode: string | null = null;
    if (row.reject && rejectQty !== null) {
      reasonCode = await resolveReasonCodeFromNotes(row.specialNotes);
      if (!reasonCode) errors.push("SCRAP_REASON_NOT_FOUND");
    } else if (row.reject && rejectQty === null) {
      errors.push("INVALID_REJECT_QTY");
    }

    if (errors.length > 0) {
      await quarantine("FinishGood", index + 1, row, errors);
      summary.quarantined++;
      continue;
    }

    // Idempotent — 1 lần scan thật khớp đúng (travelerNo, createdAt).
    const existingSelect = await prisma.stockMove.findFirst({
      where: { travelerNo, moveType: "SELECT", createdAt: createdAt! },
    });
    if (existingSelect) {
      summary.skipped++;
      continue;
    }

    await prisma.$transaction(async (tx) => {
      await tx.stockMove.create({
        data: {
          travelerNo,
          moveType: "SELECT",
          qty: qty!,
          machineCode,
          operatorCode,
          shift,
          sourceStation: "FACTORY",
          createdAt: createdAt!,
        },
      });

      if (rejectQty !== null && reasonCode) {
        await tx.stockMove.create({
          data: {
            travelerNo,
            moveType: "SCRAP",
            qty: rejectQty,
            reasonCode,
            machineCode,
            operatorCode,
            shift,
            sourceStation: "FACTORY",
            createdAt: createdAt!,
          },
        });
      }

      const qc = (row.qcStatus ?? "").trim().toUpperCase();
      if (qc === "PASS" || qc === "HOLD") {
        const status = qc === "PASS" ? "GOOD" : "HOLD";
        await tx.qualityCheck.create({
          data: {
            travelerNo,
            status,
            note: status === "HOLD" ? row.specialNotes || "Di chuyển từ AVP_AI (không có ghi chú gốc)." : null,
            checkedBy: "MIGRATION",
            createdAt: createdAt!,
          },
        });

        if ((row.concessionBy ?? "").trim()) {
          await tx.qualityCheck.create({
            data: {
              travelerNo,
              status,
              note: row.specialNotes || null,
              checkedBy: "MIGRATION",
              concessionBy: row.concessionBy!.trim(),
              concessionReason: row.concessionReason || null,
              concessionAt: parseSourceDate(row.concessionAt) ?? createdAt!,
              createdAt: createdAt!,
            },
          });
        }
      }

      const lotNo = (row.lotNo ?? "").trim();
      if (lotNo && !isLegacyLotPlaceholder(lotNo)) {
        await tx.lot.upsert({ where: { lotNo }, update: {}, create: { lotNo } });
        await tx.traveler.update({ where: { travelerNo }, data: { lotNo } });
      }

      const skid = (row.skid ?? "").trim();
      if (skid) {
        await tx.traveler.update({ where: { travelerNo }, data: { skidNo: skid } });
      }

      const pot = (row.pot ?? "").trim() || traveler!.potNo;
      if (isGaylordReturn(pot)) {
        await tx.traveler.update({ where: { travelerNo }, data: { isReturnForRework: true } });
      }
    });

    summary.inserted++;
  }

  return summary;
}

// ── 5. PackingList -> packing_slips + packing_slip_lines + SHIP ────────
export async function migratePackingList(
  rows: PackingListRow[],
  finishGoodRows: FinishGoodRow[] = [],
): Promise<MigrateSummary> {
  const summary: MigrateSummary = { inserted: 0, skipped: 0, quarantined: 0 };

  const lotByTravelerPs = new Map<string, string | null>();
  for (const fg of finishGoodRows) {
    const key = `${(fg.traveler ?? "").trim()}|${(fg.ps ?? "").trim()}`;
    const lotNo = (fg.lotNo ?? "").trim();
    if ((fg.ps ?? "").trim()) {
      lotByTravelerPs.set(key, lotNo && !isLegacyLotPlaceholder(lotNo) ? lotNo : null);
    }
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const psNo = (row.ps ?? "").trim();
    const travelerNo = (row.traveler ?? "").trim();
    const partNo = (row.partNo ?? "").trim();
    const qty = parsePositiveInt(row.quantity);
    const errors: string[] = [];

    if (!psNo) errors.push("MISSING_PS");
    if (!travelerNo) errors.push("MISSING_TRAVELER");
    if (!partNo) errors.push("MISSING_PART_NO");
    if (qty === null) errors.push("INVALID_QUANTITY");

    if (travelerNo && errors.length === 0) {
      const traveler = await prisma.traveler.findUnique({ where: { travelerNo } });
      if (!traveler) errors.push("TRAVELER_NOT_FOUND");
    }

    if (errors.length > 0) {
      await quarantine("PackingList", i + 1, row, errors);
      summary.quarantined++;
      continue;
    }

    const packingSlip = await prisma.packingSlip.upsert({
      where: { psNo },
      update: {},
      create: { psNo, totalPallets: 0, totalEmpty: 0 },
    });

    const existingLine = await prisma.packingSlipLine.findFirst({
      where: { packingSlipId: packingSlip.id, travelerNo, qty: qty! },
    });
    if (existingLine) {
      summary.skipped++;
      continue;
    }

    const lotNoSnap = lotByTravelerPs.get(`${travelerNo}|${psNo}`) ?? null;

    await prisma.$transaction([
      prisma.packingSlipLine.create({
        data: {
          packingSlipId: packingSlip.id,
          travelerNo,
          qty: qty!,
          partNoSnap: partNo,
          lotNoSnap,
          potNoSnap: (row.pot ?? "").trim() || null,
        },
      }),
      prisma.stockMove.create({
        data: {
          travelerNo,
          moveType: "SHIP",
          qty: qty!,
          sourceStation: "OFFICE",
        },
      }),
    ]);
    summary.inserted++;
  }

  return summary;
}
