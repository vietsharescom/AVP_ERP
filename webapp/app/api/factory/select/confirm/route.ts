// FID-ERP-003 §4b — ghi Postgres: 1 SELECT + 0..n SCRAP + 0..1 REWORK
// trong 1 transaction. Nhập tay thuần tại Xưởng, KHÔNG qua AI/OCR — không
// có bước "draft" như FID-ERP-002 (CCP-1 không áp dụng ở đây).
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { generateLotPlaceholder } from "../../../../../lib/lot";

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

  const traveler = await prisma.traveler.findUnique({ where: { travelerNo } });
  if (!traveler) {
    return badRequest(
      `Traveler "${travelerNo}" chưa tồn tại — cần ghi RECEIVE ở Kho nguyên liệu (FID-ERP-002) trước.`,
    );
  }

  const normMachine = normalize(machineCode);
  const normOperator = normalize(operatorCode);
  const normShift = normalize(shift);
  const deviceIdValue = typeof deviceId === "string" ? deviceId : null;

  try {
    const ops = [
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
    const selectMove = results[0];
    const scrapMoves = results.slice(1, 1 + defectRows.length);
    const reworkMove = reworkRow ? results[1 + defectRows.length] : null;

    const totalDefectQty = defectRows.reduce((sum, d) => sum + (d.qty as number), 0);

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

    return NextResponse.json({
      ok: true,
      selectMoveId: selectMove.id,
      scrapMoveIds: scrapMoves.map((m) => m.id),
      totalDefectQty,
      ...(reworkMove ? { reworkMoveId: reworkMove.id } : {}),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Confirm failed." },
      { status: 500 },
    );
  }
}
