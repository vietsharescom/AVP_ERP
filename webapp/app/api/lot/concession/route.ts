// FID-ERP-006 §4d — cờ Concession cho phép xuất dù Lot còn placeholder.
// MUTABLE (giống poNo/potNo) — không phải sổ cái, xem FID-ERP-001 v1.7.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

function badRequest(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}

export async function POST(req: NextRequest) {
  let body: { travelerNo?: unknown; by?: unknown; reason?: unknown };
  try {
    body = await req.json();
  } catch {
    return badRequest("Body phải là JSON hợp lệ.");
  }

  const { travelerNo, by, reason } = body;

  if (typeof travelerNo !== "string" || travelerNo.trim() === "") {
    return badRequest("travelerNo bắt buộc.");
  }
  if (typeof by !== "string" || by.trim() === "") {
    return badRequest("by bắt buộc.");
  }
  if (typeof reason !== "string" || reason.trim() === "") {
    return badRequest("reason bắt buộc.");
  }

  const traveler = await prisma.traveler.findUnique({ where: { travelerNo } });
  if (!traveler) {
    return badRequest(`Traveler "${travelerNo}" chưa tồn tại.`);
  }

  const concessionAt = new Date();
  await prisma.traveler.update({
    where: { travelerNo },
    data: { lotConcessionBy: by, lotConcessionReason: reason, lotConcessionAt: concessionAt },
  });

  return NextResponse.json({ ok: true, travelerNo, concessionAt });
}
