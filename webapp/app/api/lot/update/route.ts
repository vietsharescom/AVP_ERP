// FID-ERP-006 §4c — ghi 1 dòng lot_updates (giữ oldLotNo) + đổi
// travelers.lotNo, trong 1 transaction. KHÔNG tạo Traveler mới.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

function badRequest(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}

export async function POST(req: NextRequest) {
  let body: { travelerNo?: unknown; newLotNo?: unknown; updatedBy?: unknown };
  try {
    body = await req.json();
  } catch {
    return badRequest("Body phải là JSON hợp lệ.");
  }

  const { travelerNo, newLotNo, updatedBy } = body;

  if (typeof travelerNo !== "string" || travelerNo.trim() === "") {
    return badRequest("travelerNo bắt buộc.");
  }
  if (typeof newLotNo !== "string" || newLotNo.trim() === "") {
    return badRequest("newLotNo bắt buộc.");
  }
  if (typeof updatedBy !== "string" || updatedBy.trim() === "") {
    return badRequest("updatedBy bắt buộc.");
  }

  const traveler = await prisma.traveler.findUnique({ where: { travelerNo } });
  if (!traveler) {
    return badRequest(`Traveler "${travelerNo}" chưa tồn tại.`);
  }
  if (traveler.lotNo === newLotNo) {
    return badRequest("Lot mới giống Lot hiện tại, không cần cập nhật.");
  }

  try {
    const results = await prisma.$transaction([
      prisma.lot.upsert({ where: { lotNo: newLotNo }, update: {}, create: { lotNo: newLotNo } }),
      prisma.traveler.update({ where: { travelerNo }, data: { lotNo: newLotNo } }),
      prisma.lotUpdate.create({
        data: { travelerNo, oldLotNo: traveler.lotNo, newLotNo, updatedBy },
      }),
    ]);
    const lotUpdate = results[2];

    return NextResponse.json({
      ok: true,
      travelerNo,
      oldLotNo: traveler.lotNo,
      newLotNo,
      lotUpdateId: lotUpdate.id,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Update failed." },
      { status: 500 },
    );
  }
}
