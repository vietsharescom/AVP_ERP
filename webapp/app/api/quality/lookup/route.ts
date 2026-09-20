// FID-ERP-005 v1.5 §15.4 — tra Traveler# cho form `/wrapping/check` tự điền:
// Part#/Lot/Pot/PO, Pcs-per-Carton, số đã lựa/đã đóng/còn có thể đóng, máy
// của lần lựa gần nhất (nút gợi ý), lần kiểm tra Wrapping gần nhất. CHỈ đọc —
// `POST /api/quality/check` vẫn validate lại toàn bộ, không tin số liệu client.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET(req: NextRequest) {
  const travelerNo = new URL(req.url).searchParams.get("travelerNo")?.trim() ?? "";
  if (travelerNo === "") {
    return NextResponse.json({ ok: false, error: "travelerNo bắt buộc." }, { status: 400 });
  }

  const traveler = await prisma.traveler.findUnique({ where: { travelerNo }, include: { part: true } });
  if (!traveler) {
    return NextResponse.json(
      { ok: false, error: `Không tìm thấy Traveler "${travelerNo}".` },
      { status: 404 },
    );
  }

  const [shippedMove, lastMove, selectAgg, packAgg, lastSelect, lastQualityCheck] = await Promise.all([
    prisma.stockMove.findFirst({ where: { travelerNo, moveType: "SHIP" }, select: { id: true } }),
    prisma.stockMove.findFirst({
      where: { travelerNo },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { moveType: true },
    }),
    prisma.stockMove.aggregate({ where: { travelerNo, moveType: "SELECT" }, _sum: { qty: true } }),
    prisma.stockMove.aggregate({ where: { travelerNo, moveType: "PACK" }, _sum: { qty: true } }),
    prisma.stockMove.findFirst({
      where: { travelerNo, moveType: "SELECT" },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { machineCode: true, operatorCode: true, shift: true },
    }),
    prisma.qualityCheck.findFirst({
      where: { travelerNo },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { status: true, createdAt: true },
    }),
  ]);

  const selectedQty = selectAgg._sum.qty ?? 0;
  const packedQty = packAgg._sum.qty ?? 0;

  return NextResponse.json({
    ok: true,
    traveler: {
      travelerNo: traveler.travelerNo,
      partNo: traveler.partNo,
      poNo: traveler.poNo,
      potNo: traveler.potNo,
      lotNo: traveler.lotNo,
      qtyPerBox: traveler.part.qtyPerBox,
      selectedQty,
      packedQty,
      availableToPack: selectedQty - packedQty,
      lastSelect,
      lastQualityCheck,
      shipped: shippedMove != null,
      lastMoveType: lastMove?.moveType ?? null,
    },
  });
}
