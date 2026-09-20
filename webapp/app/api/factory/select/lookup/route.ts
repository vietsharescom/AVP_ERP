// FID-ERP-003 v1.4 §13.3 — tra Traveler# để form `/factory/select` tự điền
// Part#/PO/Pot/Lot/Pcs-per-Carton. Route riêng (không tái dùng /api/search
// như v1.3) vì /api/search khớp `contains` + giới hạn 8 dòng — không đảm
// bảo trả đúng qty_per_box của ĐÚNG Part# của Traveler này. CHỈ đọc.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

export async function GET(req: NextRequest) {
  const travelerNo = new URL(req.url).searchParams.get("travelerNo")?.trim() ?? "";
  if (travelerNo === "") {
    return NextResponse.json({ ok: false, error: "travelerNo bắt buộc." }, { status: 400 });
  }

  const traveler = await prisma.traveler.findUnique({ where: { travelerNo }, include: { part: true } });
  if (!traveler) {
    return NextResponse.json(
      {
        ok: false,
        error: `Không tìm thấy Traveler "${travelerNo}" — cần ghi RECEIVE ở Kho nguyên liệu trước.`,
      },
      { status: 404 },
    );
  }

  const [shippedMove, lastMove] = await Promise.all([
    prisma.stockMove.findFirst({ where: { travelerNo, moveType: "SHIP" }, select: { id: true } }),
    prisma.stockMove.findFirst({
      where: { travelerNo },
      orderBy: { createdAt: "desc" },
      select: { moveType: true },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    traveler: {
      travelerNo: traveler.travelerNo,
      partNo: traveler.partNo,
      poNo: traveler.poNo,
      potNo: traveler.potNo,
      lotNo: traveler.lotNo,
      qtyPerBox: traveler.part.qtyPerBox,
      shipped: shippedMove != null,
      lastMoveType: lastMove?.moveType ?? null,
    },
  });
}
