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
import { stripPartSuffix } from "../part";
import { normalizeLotNo, normalizeSkid } from "./normalize";
import { parseRejectLines, type DefectTypeRef as RejectDefectType, type RejectLine } from "./reject";
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

// v0.2 — chuẩn hoá TRIM+UPPER khi ghi, đúng FID-ERP-001 §5 (machine_code/
// operator_code/shift) — AVP_AI viết lẫn hoa/thường (`Tbl`, `Mrnng`, `bf118a/b`),
// không chuẩn hoá thì báo cáo GROUP BY máy/ca tách thành nhiều nhóm.
function machineCodeOf(row: { machine?: string; mcNo?: string }): string {
  return `${(row.machine ?? "").trim()}${(row.mcNo ?? "").trim()}`.trim().toUpperCase();
}

// v0.2 — Part# theo quy ước AVP_ERP (FID-ERP-002 v1.1): cắt hậu tố về mã gốc
// (khớp part_control) + IN HOA (dữ liệu thật lẫn `nu3019-00`/`NU3019-00`).
export function normalizePartNo(raw: string | undefined): string {
  return stripPartSuffix((raw ?? "").trim()).toUpperCase();
}

// ── 1. PartControl ──────────────────────────────────────────────────────
export async function migratePartControl(rows: PartControlRow[]): Promise<MigrateSummary> {
  const summary: MigrateSummary = { inserted: 0, skipped: 0, quarantined: 0 };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const part = (row.part ?? "").trim().toUpperCase();
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
    const partNo = normalizePartNo(row.partNo);
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
    // v0.2 (Mục 0 #5) — `finalLot` chỉ dùng khi chưa có lot từ FinishGood; lot
    // từ FinishGood (migrate SAU) luôn ghi đè. Bỏ qua placeholder AVP_AI.
    const finalLot = normalizeLotNo(row.finalLot);
    const lotNo = finalLot && !isLegacyLotPlaceholder(finalLot) ? finalLot : null;
    if (lotNo) {
      await prisma.lot.upsert({ where: { lotNo }, update: {}, create: { lotNo } });
    }
    const existing = await prisma.traveler.findUnique({ where: { travelerNo }, select: { lotNo: true } });
    await prisma.traveler.upsert({
      where: { travelerNo },
      update: {
        poNo: (row.po ?? "").trim() || null,
        potNo,
        ...(lotNo && !existing?.lotNo ? { lotNo } : {}),
        ...(isGaylordReturn(potNo) ? { isReturnForRework: true } : {}),
      },
      create: {
        travelerNo,
        partNo,
        poNo: (row.po ?? "").trim() || null,
        potNo,
        lotNo,
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

let defectTypesCache: RejectDefectType[] | null = null;
async function defectTypesCached(): Promise<RejectDefectType[]> {
  if (!defectTypesCache) {
    defectTypesCache = await prisma.defectType.findMany({ select: { code: true, label: true } });
  }
  return defectTypesCache;
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
    const operatorCode = (row.operator ?? "").trim().toUpperCase();
    const shift = (row.shift ?? "").trim().toUpperCase();
    const createdAt = parseSourceDate(row.date) ?? parseSourceDate(row.createdAt);

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

    // v0.2 (Mục 0 #3) — Reject là DANH SÁCH số ghép với DANH SÁCH tên lỗi;
    // tên lỗi lạ -> `OTHERS` + ghi chú (không quarantine cả dòng như v0.1).
    let rejectLines: RejectLine[] = [];
    if ((row.reject ?? "").trim()) {
      const parsed = parseRejectLines(row.reject, row.specialNotes, await defectTypesCached());
      if ("error" in parsed) errors.push(parsed.error);
      else rejectLines = parsed.lines;
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

      // v0.2 — 1 dòng CHECKING SUMMARY (WRAPPING SUMMARY) là bản ghi ĐÓNG THÙNG:
      // `No. of boxes`/`TTL QNT`/`SKID#` cùng 1 dòng (FID-ERP-005 v1.1) -> ghi thêm
      // PACK cùng ngữ cảnh máy/người/ca. Không có số thùng hợp lệ -> không ghi PACK.
      const boxCount = parsePositiveInt(row.boxes);
      if (boxCount !== null) {
        await tx.stockMove.create({
          data: {
            travelerNo,
            moveType: "PACK",
            qty: qty!,
            boxCount,
            machineCode,
            operatorCode,
            shift,
            sourceStation: "FACTORY",
            createdAt: createdAt!,
          },
        });
      }

      for (const line of rejectLines) {
        await tx.stockMove.create({
          data: {
            travelerNo,
            moveType: "SCRAP",
            qty: line.qty,
            reasonCode: line.reasonCode,
            note: line.note,
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

      const lotNo = normalizeLotNo(row.lotNo);
      if (lotNo && !isLegacyLotPlaceholder(lotNo)) {
        await tx.lot.upsert({ where: { lotNo }, update: {}, create: { lotNo } });
        await tx.traveler.update({ where: { travelerNo }, data: { lotNo } });
      }

      const skid = normalizeSkid(row.skid);
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
    const lotNo = normalizeLotNo(fg.lotNo);
    if ((fg.ps ?? "").trim()) {
      lotByTravelerPs.set(key, lotNo && !isLegacyLotPlaceholder(lotNo) ? lotNo : null);
    }
  }

  // v0.2 — ngày lập Packing Slip = ngày SỚM NHẤT trong các dòng của PS đó (không phải `now()`).
  const psDate = new Map<string, Date>();
  for (const r of rows) {
    const ps = (r.ps ?? "").trim();
    const d = parseSourceDate(r.invDate);
    if (ps && d && (!psDate.has(ps) || d < psDate.get(ps)!)) psDate.set(ps, d);
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const psNo = (row.ps ?? "").trim();
    const travelerNo = (row.traveler ?? "").trim();
    const partNo = normalizePartNo(row.partNo);
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
      create: { psNo, totalPallets: 0, totalEmpty: 0, ...(psDate.has(psNo) ? { createdAt: psDate.get(psNo)! } : {}) },
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
          // v0.2 — ngày xuất thật (INV DATE) thay vì `now()` lúc chạy migrate;
          // rỗng -> mặc định của DB như cũ.
          ...(parseSourceDate(row.invDate) ? { createdAt: parseSourceDate(row.invDate)! } : {}),
        },
      }),
    ]);
    summary.inserted++;
  }

  return summary;
}
