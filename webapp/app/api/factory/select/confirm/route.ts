// FID-ERP-003 §4b — ghi Postgres: 1 SELECT + 0..n SCRAP + 0..1 REWORK
// trong 1 transaction. Nhập tay thuần tại Xưởng, KHÔNG qua AI/OCR — không
// có bước "draft" như FID-ERP-002 (CCP-1 không áp dụng ở đây).
// FID-ERP-007 §4b — nếu Traveler đang isReturnForRework=true VÀ CHƯA
// từng có dòng RETURN nào, ghi THÊM 1 dòng RETURN (qty = tổng
// SELECT+SCRAP+REWORK, đúng số lượng thật quay lại xử lý) CÙNG
// transaction — đúng lúc lựa lại xong mới biết số lượng thật (xem
// docs/features/FID-ERP-007_20260918.md §2c).
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { generateLotPlaceholder } from "../../../../../lib/lot";
import { hasReturnMove } from "../../../../../lib/rework";
import { shiftWarning } from "../../../../../lib/shift";
import { notDivisibleWarning } from "../../../../../lib/factoryEntry";

type DefectInput = { reasonCode?: unknown; qty?: unknown };
type ReworkInput = { qty?: unknown; note?: unknown };

type ConfirmBody = {
  travelerNo?: unknown;
  machineCode?: unknown;
  operatorCode?: unknown;
  shift?: unknown;
  selectQty?: unknown;
  defects?: unknown;
  rework?: unknown;
  deviceId?: unknown;
};

function badRequest(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}

function normalize(value: string): string {
  return value.trim().toUpperCase();
}

function isPositiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

export async function POST(req: NextRequest) {
  let body: ConfirmBody;
  try {
    body = await req.json();
  } catch {
    return badRequest("Body phải là JSON hợp lệ.");
  }

  const { travelerNo, machineCode, operatorCode, shift, selectQty, defects, rework, deviceId } = body;

  if (typeof travelerNo !== "string" || travelerNo.trim() === "") {
    return badRequest("travelerNo bắt buộc.");
  }
  if (typeof machineCode !== "string" || machineCode.trim() === "") {
    return badRequest("machineCode bắt buộc.");
  }
  if (typeof operatorCode !== "string" || operatorCode.trim() === "") {
    return badRequest("operatorCode bắt buộc.");
  }
  if (typeof shift !== "string" || shift.trim() === "") {
    return badRequest("shift bắt buộc.");
  }
  if (!isPositiveInt(selectQty)) {
    return badRequest("selectQty phải > 0.");
  }

  const defectRows = Array.isArray(defects) ? (defects as DefectInput[]) : [];
  for (const d of defectRows) {
    if (typeof d.reasonCode !== "string" || d.reasonCode.trim() === "") {
      return badRequest("Mỗi defect cần reasonCode.");
    }
    if (!isPositiveInt(d.qty)) {
      return badRequest(`defect qty phải > 0 (reasonCode ${String(d.reasonCode)}).`);
    }
  }

  let reworkRow: { qty: number; note: string | null } | null = null;
  if (rework != null) {
    const r = rework as ReworkInput;
    if (!isPositiveInt(r.qty)) {
      return badRequest("rework.qty phải > 0.");
    }
    reworkRow = { qty: r.qty, note: typeof r.note === "string" ? r.note : null };
  }

  if (defectRows.length > 0) {
    const codes = defectRows.map((d) => (d.reasonCode as string).trim());
    const found = await prisma.defectType.findMany({
      where: { code: { in: codes } },
      select: { code: true },
    });
    const foundCodes = new Set(found.map((f) => f.code));
    const missing = codes.filter((c) => !foundCodes.has(c));
    if (missing.length > 0) {
      return badRequest(`reasonCode không tồn tại trong defect_types: ${missing.join(", ")}.`);
    }
  }

  const traveler = await prisma.traveler.findUnique({ where: { travelerNo }, include: { part: true } });
  if (!traveler) {
    return badRequest(
      `Traveler "${travelerNo}" chưa tồn tại — cần ghi RECEIVE ở Kho nguyên liệu (FID-ERP-002) trước.`,
    );
  }

  const normMachine = normalize(machineCode);
  const normOperator = normalize(operatorCode);
  const normShift = normalize(shift);
  const deviceIdValue = typeof deviceId === "string" ? deviceId : null;

  const totalDefectQty = defectRows.reduce((sum, d) => sum + (d.qty as number), 0);

  // FID-ERP-007 §4b — chỉ ghi RETURN ĐÚNG 1 LẦN cho mỗi đợt rework (lần
  // lựa lại ĐẦU TIÊN sau khi trả về). Lần lựa thứ 2+ của cùng đợt (đã có
  // RETURN rồi) — không ghi thêm.
  const needsReturnMove = traveler.isReturnForRework && !(await hasReturnMove(travelerNo));
  const returnQty = selectQty + totalDefectQty + (reworkRow?.qty ?? 0);

  try {
    const ops = [
      ...(needsReturnMove
        ? [
            prisma.stockMove.create({
              data: {
                travelerNo,
                moveType: "RETURN",
                qty: returnQty,
                machineCode: normMachine,
                operatorCode: normOperator,
                shift: normShift,
                sourceStation: "FACTORY",
                deviceId: deviceIdValue,
              },
            }),
          ]
        : []),
      prisma.stockMove.create({
        data: {
          travelerNo,
          moveType: "SELECT",
          qty: selectQty,
          machineCode: normMachine,
          operatorCode: normOperator,
          shift: normShift,
          sourceStation: "FACTORY",
          deviceId: deviceIdValue,
        },
      }),
      ...defectRows.map((d) =>
        prisma.stockMove.create({
          data: {
            travelerNo,
            moveType: "SCRAP",
            qty: d.qty as number,
            reasonCode: (d.reasonCode as string).trim(),
            machineCode: normMachine,
            operatorCode: normOperator,
            shift: normShift,
            sourceStation: "FACTORY",
            deviceId: deviceIdValue,
          },
        }),
      ),
      ...(reworkRow
        ? [
            prisma.stockMove.create({
              data: {
                travelerNo,
                moveType: "REWORK",
                qty: reworkRow.qty,
                note: reworkRow.note,
                machineCode: normMachine,
                operatorCode: normOperator,
                shift: normShift,
                sourceStation: "FACTORY",
                deviceId: deviceIdValue,
              },
            }),
          ]
        : []),
    ];

    const results = await prisma.$transaction(ops);
    const offset = needsReturnMove ? 1 : 0;
    const returnMove = needsReturnMove ? results[0] : null;
    const selectMove = results[offset];
    const scrapMoves = results.slice(offset + 1, offset + 1 + defectRows.length);
    const reworkMove = reworkRow ? results[offset + 1 + defectRows.length] : null;

    // FID-ERP-006 §4a — tự sinh Lot placeholder lần lựa ĐẦU TIÊN (Traveler
    // chưa có lotNo). Transaction RIÊNG (khác kiểu Model nên tách khỏi ops
    // trên để giữ type rõ ràng) — KHÔNG tự sinh lại nếu đã có lotNo
    // (placeholder hay thật) từ trước.
    if (traveler.lotNo == null) {
      const placeholder = generateLotPlaceholder(travelerNo);
      await prisma.$transaction([
        prisma.lot.upsert({ where: { lotNo: placeholder }, update: {}, create: { lotNo: placeholder } }),
        prisma.traveler.update({ where: { travelerNo }, data: { lotNo: placeholder } }),
        prisma.lotUpdate.create({
          data: { travelerNo, oldLotNo: null, newLotNo: placeholder, updatedBy: "SYSTEM" },
        }),
      ]);
    }

    // v1.1 — cảnh báo (KHÔNG chặn) nếu ca không khớp quy ước đã chốt
    // (MRNNG/AFTRN, nguồn chứng từ thật, xem lib/shift.ts).
    const warnings: string[] = [];
    const selectShiftWarning = shiftWarning(normShift);
    if (selectShiftWarning) warnings.push(selectShiftWarning);
    // v1.4 (Mục 13.3) — Total do QA sửa tay được, nên nhắc nếu không chia
    // hết Pcs/Carton (hợp lệ khi thùng cuối thiếu — chỉ cảnh báo).
    const divisibleWarning = notDivisibleWarning(selectQty, traveler.part.qtyPerBox);
    if (divisibleWarning) warnings.push(divisibleWarning);

    return NextResponse.json({
      ok: true,
      selectMoveId: selectMove.id,
      scrapMoveIds: scrapMoves.map((m) => m.id),
      totalDefectQty,
      ...(reworkMove ? { reworkMoveId: reworkMove.id } : {}),
      ...(returnMove ? { returnMoveId: returnMove.id } : {}),
      warnings,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Confirm failed." },
      { status: 500 },
    );
  }
}
