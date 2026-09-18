// FID-ERP-002 §4b — Ghi Postgres SAU KHI người xác nhận (CCP-1). 2 nhánh
// theo destination — xem docs/features/FID-ERP-002_20260918.md §4b/§5.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

type CaptureDestination = "po" | "warehouse";

type ConfirmRow = {
  travelerNo?: unknown;
  partNo?: unknown;
  poNo?: unknown;
  potNo?: unknown;
  qty?: unknown;
};

type ConfirmBody = {
  destination?: unknown;
  rows?: unknown;
  confirmedBy?: unknown;
  sourceStation?: unknown;
  deviceId?: unknown;
};

const ALLOWED_DESTINATIONS = new Set<CaptureDestination>(["po", "warehouse"]);
// Xưởng không có cổng AI (chốt 2026-09-17) — chặn ở tầng API, không chỉ ẩn ở UI.
const ALLOWED_SOURCE_STATIONS = new Set(["OFFICE", "ADMIN"]);

function badRequest(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}

export async function POST(req: NextRequest) {
  let body: ConfirmBody;
  try {
    body = await req.json();
  } catch {
    return badRequest("Body phải là JSON hợp lệ.");
  }

  const { destination, rows, confirmedBy, sourceStation, deviceId } = body;

  if (typeof destination !== "string" || !ALLOWED_DESTINATIONS.has(destination as CaptureDestination)) {
    return badRequest("destination phải là 'po' hoặc 'warehouse'.");
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    return badRequest("rows không được rỗng.");
  }
  if (typeof confirmedBy !== "string" || confirmedBy.trim() === "") {
    return badRequest("confirmedBy bắt buộc — phải có người xác nhận (CCP-1, AI_POLICY.md §1).");
  }

  const typedRows = rows as ConfirmRow[];
  for (const row of typedRows) {
    if (typeof row.travelerNo !== "string" || row.travelerNo.trim() === "") {
      return badRequest("Mỗi dòng cần travelerNo.");
    }
    if (typeof row.partNo !== "string" || row.partNo.trim() === "") {
      return badRequest("Mỗi dòng cần partNo.");
    }
  }

  if (destination === "warehouse") {
    if (typeof sourceStation !== "string" || !ALLOWED_SOURCE_STATIONS.has(sourceStation)) {
      return badRequest("sourceStation phải là 'OFFICE' hoặc 'ADMIN' — Xưởng không có cổng này.");
    }
    for (const row of typedRows) {
      if (typeof row.qty !== "number" || !Number.isInteger(row.qty) || row.qty <= 0) {
        return badRequest(`qty phải > 0 (traveler ${String(row.travelerNo)}).`);
      }
    }
  }

  try {
    if (destination === "po") {
      let saved = 0;
      for (const row of typedRows) {
        const travelerNo = row.travelerNo as string;
        const partNo = row.partNo as string;
        const poNo = typeof row.poNo === "string" ? row.poNo : null;
        await prisma.traveler.upsert({
          where: { travelerNo },
          update: { poNo },
          create: { travelerNo, partNo, poNo },
        });
        saved += 1;
      }
      return NextResponse.json({ ok: true, saved, skippedDuplicates: [], moveIds: [] });
    }

    // destination === "warehouse"
    const skippedDuplicates: string[] = [];
    const moveIds: number[] = [];
    let saved = 0;

    for (const row of typedRows) {
      const travelerNo = row.travelerNo as string;
      const partNo = row.partNo as string;
      const potNo = typeof row.potNo === "string" ? row.potNo : null;
      const qty = row.qty as number;

      // Trùng lặp phải CẢNH BÁO, không tự động bỏ qua/ghi đè (§5 RULES) —
      // vẫn ghi thêm dòng RECEIVE nếu người xác nhận muốn (nghiệp vụ thật:
      // hàng về nhiều đợt cùng 1 Traveler#).
      const existingReceive = await prisma.stockMove.findFirst({
        where: { travelerNo, moveType: "RECEIVE" },
        select: { id: true },
      });
      if (existingReceive) {
        skippedDuplicates.push(travelerNo);
      }

      const [, move] = await prisma.$transaction([
        prisma.traveler.upsert({
          where: { travelerNo },
          update: { potNo },
          create: { travelerNo, partNo, potNo },
        }),
        prisma.stockMove.create({
          data: {
            travelerNo,
            moveType: "RECEIVE",
            qty,
            sourceStation: sourceStation as string,
            deviceId: typeof deviceId === "string" ? deviceId : null,
          },
        }),
      ]);
      moveIds.push(move.id);
      saved += 1;
    }

    return NextResponse.json({ ok: true, saved, skippedDuplicates, moveIds });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Confirm failed." },
      { status: 500 },
    );
  }
}
