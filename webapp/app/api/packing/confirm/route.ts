// FID-ERP-009 §4b — duyệt Packing Slip: ghi PackingSlip + PackingSlipLine
// (snapshot) + SHIP từng dòng TRONG 1 TRANSACTION DUY NHẤT — sửa đúng lỗi
// "22 traveler quên đánh shipped" đã gặp ở AVP_AI. Re-validate ĐỦ điều
// kiện eligible cho TỪNG dòng ở đây (không chỉ tin UI đã lọc qua `lookup`).
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getPackingEligibility } from "../../../../lib/packing";

type LineInput = { travelerNo?: unknown; qty?: unknown };

type ConfirmBody = {
  psNo?: unknown;
  totalPallets?: unknown;
  totalEmpty?: unknown;
  lines?: unknown;
  confirmedBy?: unknown;
};

function badRequest(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}

function isPositiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isNonNegativeInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

export async function POST(req: NextRequest) {
  let body: ConfirmBody;
  try {
    body = await req.json();
  } catch {
    return badRequest("Body phải là JSON hợp lệ.");
  }

  const { psNo, totalPallets, totalEmpty, lines, confirmedBy } = body;

  if (typeof psNo !== "string" || psNo.trim() === "") {
    return badRequest("psNo bắt buộc.");
  }
  if (typeof confirmedBy !== "string" || confirmedBy.trim() === "") {
    return badRequest("confirmedBy bắt buộc — phải có người xác nhận (CCP-1).");
  }
  if (!Array.isArray(lines) || lines.length === 0) {
    return badRequest("lines không được rỗng.");
  }
  if (totalPallets !== undefined && totalPallets !== null && !isNonNegativeInt(totalPallets)) {
    return badRequest("totalPallets phải là số nguyên >= 0 nếu có.");
  }
  if (totalEmpty !== undefined && totalEmpty !== null && !isNonNegativeInt(totalEmpty)) {
    return badRequest("totalEmpty phải là số nguyên >= 0 nếu có.");
  }

  const typedLines = lines as LineInput[];
  for (const line of typedLines) {
    if (typeof line.travelerNo !== "string" || line.travelerNo.trim() === "") {
      return badRequest("Mỗi dòng cần travelerNo.");
    }
    if (!isPositiveInt(line.qty)) {
      return badRequest(`qty phải > 0 (traveler ${String(line.travelerNo)}).`);
    }
  }

  const existingPs = await prisma.packingSlip.findUnique({ where: { psNo } });
  if (existingPs) {
    return badRequest(`Packing Slip "${psNo}" đã tồn tại.`);
  }

  // Re-validate ĐỦ điều kiện eligible cho TỪNG travelerNo duy nhất —
  // TỔNG qty các dòng CÙNG travelerNo (nếu có) không được vượt
  // availableQty (tránh lách bằng cách chia nhỏ nhiều dòng).
  const requestedByTraveler = new Map<string, number>();
  for (const line of typedLines) {
    const tr = (line.travelerNo as string).trim();
    requestedByTraveler.set(tr, (requestedByTraveler.get(tr) ?? 0) + (line.qty as number));
  }

  const eligibilityByTraveler = new Map<string, Awaited<ReturnType<typeof getPackingEligibility>>>();
  for (const travelerNo of requestedByTraveler.keys()) {
    const eligibility = await getPackingEligibility(travelerNo);
    if (!eligibility) {
      return badRequest(`Traveler "${travelerNo}" chưa tồn tại.`);
    }
    if (!eligibility.eligible) {
      return badRequest(`Traveler "${travelerNo}" chưa đủ điều kiện xuất: ${eligibility.blockReasons.join("; ")}`);
    }
    const requestedQty = requestedByTraveler.get(travelerNo)!;
    if (requestedQty > eligibility.availableQty) {
      return badRequest(
        `Traveler "${travelerNo}": qty yêu cầu (${requestedQty}) vượt quá số còn có thể xuất (${eligibility.availableQty}).`,
      );
    }
    eligibilityByTraveler.set(travelerNo, eligibility);
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const slip = await tx.packingSlip.create({
        data: {
          psNo,
          ...(totalPallets != null ? { totalPallets } : {}),
          ...(totalEmpty != null ? { totalEmpty } : {}),
        },
      });

      const shipMoveIds: number[] = [];
      for (const line of typedLines) {
        const travelerNo = (line.travelerNo as string).trim();
        const qty = line.qty as number;
        const eligibility = eligibilityByTraveler.get(travelerNo)!;

        await tx.packingSlipLine.create({
          data: {
            packingSlipId: slip.id,
            travelerNo,
            qty,
            partNoSnap: eligibility.partNo,
            lotNoSnap: eligibility.lotNo,
            potNoSnap: eligibility.potNo,
            skidNoSnap: eligibility.skidNo,
          },
        });

        const ship = await tx.stockMove.create({
          data: { travelerNo, moveType: "SHIP", qty, sourceStation: "OFFICE" },
        });
        shipMoveIds.push(ship.id);
      }

      return { slip, shipMoveIds };
    });

    return NextResponse.json({
      ok: true,
      psId: result.slip.id,
      psNo: result.slip.psNo,
      shipMoveIds: result.shipMoveIds,
      linesSaved: typedLines.length,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Confirm failed." },
      { status: 500 },
    );
  }
}
