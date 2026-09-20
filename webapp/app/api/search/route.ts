// FID-ERP-004 — tra Postgres bằng ILIKE, đối xứng cả 3 điểm truy cập
// (không phân quyền theo trạm — chỉ add-file/OCR mới phân quyền, FID-ERP-011).
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { stripPartSuffix } from "../../../lib/part";

const LIMIT = 8;

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q === "") {
    return NextResponse.json({ ok: true, travelers: [], packingSlips: [], partControls: [] });
  }

  // v1.1 (FID-ERP-002) cắt hậu tố Part# trước khi ghi `travelers.partNo`/
  // `part_control.part_no` — gõ ĐÚNG mã in trên nhãn thật (CÓ hậu tố, vd
  // "11547369-BR-HA-T") sẽ không khớp `contains` với mã gốc đã lưu ngắn
  // hơn ("11547369"). Tìm THÊM theo mã đã cắt hậu tố (nếu khác `q`) để
  // vẫn ra kết quả đúng — phát hiện qua Andy tìm thật không ra 2026-09-19.
  const qStripped = stripPartSuffix(q);
  const partNoTerms = qStripped !== q ? [q, qStripped] : [q];

  const [travelerRows, packingSlipRows, partControlRows] = await Promise.all([
    prisma.traveler.findMany({
      where: {
        OR: [
          { travelerNo: { contains: q, mode: "insensitive" } },
          ...partNoTerms.map((term) => ({ partNo: { contains: term, mode: "insensitive" as const } })),
          { poNo: { contains: q, mode: "insensitive" } },
          { potNo: { contains: q, mode: "insensitive" } },
          { lotNo: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: LIMIT,
    }),
    prisma.packingSlip.findMany({
      where: { psNo: { contains: q, mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
      take: LIMIT,
      include: { _count: { select: { lines: true } } },
    }),
    prisma.partControl.findMany({
      where: { OR: partNoTerms.map((term) => ({ partNo: { contains: term, mode: "insensitive" as const } })) },
      take: LIMIT,
    }),
  ]);

  // Tối đa LIMIT traveler đã lọc — N+1 ở đây có chặn trên (không phải
  // toàn bộ bảng), xem FID-ERP-004 §5 RULES.
  const travelers = await Promise.all(
    travelerRows.map(async (t) => {
      const [shippedMove, lastMove] = await Promise.all([
        prisma.stockMove.findFirst({
          where: { travelerNo: t.travelerNo, moveType: "SHIP" },
          select: { id: true },
        }),
        prisma.stockMove.findFirst({
          where: { travelerNo: t.travelerNo },
          orderBy: { createdAt: "desc" },
          select: { moveType: true, createdAt: true },
        }),
      ]);
      return {
        travelerNo: t.travelerNo,
        partNo: t.partNo,
        poNo: t.poNo,
        potNo: t.potNo,
        lotNo: t.lotNo,
        shipped: shippedMove != null,
        lastMoveType: lastMove?.moveType ?? null,
        lastMoveAt: lastMove?.createdAt ?? null,
      };
    }),
  );

  return NextResponse.json({
    ok: true,
    travelers,
    packingSlips: packingSlipRows.map((ps) => ({
      psNo: ps.psNo,
      totalPallets: ps.totalPallets,
      totalEmpty: ps.totalEmpty,
      lineCount: ps._count.lines,
      createdAt: ps.createdAt,
    })),
    partControls: partControlRows.map((pc) => ({
      partNo: pc.partNo,
      qtyPerBox: pc.qtyPerBox,
      client: pc.client,
    })),
  });
}
