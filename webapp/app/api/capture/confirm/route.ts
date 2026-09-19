// FID-ERP-002 §4b — Ghi Postgres SAU KHI người xác nhận (CCP-1). 2 nhánh
// theo destination — xem docs/features/FID-ERP-002_20260918.md §4b/§5.
// FID-ERP-007 §4a — khi potNo khớp GAYLORD (Traveler trả lại rework), CẢ
// 2 destination chỉ gắn cờ isReturnForRework + best-effort reworkOfPsNo/
// reworkOfLotNo, KHÔNG ghi stock_moves nào (số lượng thật ghi ở
// FID-ERP-003 lúc lựa lại xong — xem docs/features/FID-ERP-007_20260918.md §4b).
// FID-ERP-011 §4d — `sourceStation` ĐỌC TỪ SESSION (đăng nhập theo trạm),
// KHÔNG còn nhận từ body client gửi lên (client gửi gì cũng bị bỏ qua).
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { isGaylordReturn, findReworkOrigin } from "../../../../lib/rework";
import { getStationFromRequest } from "../../../../lib/auth";

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
  deviceId?: unknown;
};

type ReturnForReworkEntry = { travelerNo: string; reworkOfPsNo: string | null; reworkOfLotNo: string | null };

const ALLOWED_DESTINATIONS = new Set<CaptureDestination>(["po", "warehouse"]);

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

  const { destination, rows, confirmedBy, deviceId } = body;

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

  // FID-ERP-011 — Xưởng không có cổng AI (chốt 2026-09-17); ADMIN có cùng
  // quyền OFFICE (đã xác nhận 2026-09-19, xem lib/auth.ts ROUTE_RULES).
  // Middleware đã chặn trạm sai trước khi tới đây — kiểm tra LẠI ở route
  // (defense in depth, không chỉ tin middleware).
  const station = getStationFromRequest(req);
  if (destination === "warehouse") {
    if (station !== "OFFICE" && station !== "ADMIN") {
      return badRequest("Chưa đăng nhập đúng trạm (OFFICE hoặc ADMIN) — Xưởng không có cổng này.");
    }
    for (const row of typedRows) {
      // FID-ERP-007 §5 — dòng GAYLORD KHÔNG cần qty (bỏ qua dù có gửi),
      // số lượng thật chưa biết lúc này, chỉ ghi ở FID-ERP-003.
      if (isGaylordReturn(typeof row.potNo === "string" ? row.potNo : null)) continue;
      if (typeof row.qty !== "number" || !Number.isInteger(row.qty) || row.qty <= 0) {
        return badRequest(`qty phải > 0 (traveler ${String(row.travelerNo)}).`);
      }
    }
  }

  try {
    if (destination === "po") {
      let saved = 0;
      const returnForRework: ReturnForReworkEntry[] = [];
      for (const row of typedRows) {
        const travelerNo = row.travelerNo as string;
        const partNo = row.partNo as string;
        const poNo = typeof row.poNo === "string" ? row.poNo : null;
        const potNo = typeof row.potNo === "string" ? row.potNo : null;

        if (isGaylordReturn(potNo)) {
          const origin = await findReworkOrigin(travelerNo);
          await prisma.traveler.upsert({
            where: { travelerNo },
            update: { poNo, potNo, isReturnForRework: true, ...origin },
            create: { travelerNo, partNo, poNo, potNo, isReturnForRework: true, ...origin },
          });
          returnForRework.push({ travelerNo, ...origin });
        } else {
          await prisma.traveler.upsert({
            where: { travelerNo },
            update: { poNo },
            create: { travelerNo, partNo, poNo },
          });
        }
        saved += 1;
      }
      return NextResponse.json({
        ok: true,
        saved,
        skippedDuplicates: [],
        moveIds: [],
        ...(returnForRework.length > 0 ? { returnForRework } : {}),
      });
    }

    // destination === "warehouse"
    const skippedDuplicates: string[] = [];
    const moveIds: number[] = [];
    const returnForRework: ReturnForReworkEntry[] = [];
    let saved = 0;

    for (const row of typedRows) {
      const travelerNo = row.travelerNo as string;
      const partNo = row.partNo as string;
      const potNo = typeof row.potNo === "string" ? row.potNo : null;

      if (isGaylordReturn(potNo)) {
        // FID-ERP-007 §4a/§5 — chỉ gắn cờ, KHÔNG ghi stock_moves (kể cả
        // có gửi qty) — số lượng thật ghi ở FID-ERP-003 lúc lựa lại xong.
        const origin = await findReworkOrigin(travelerNo);
        await prisma.traveler.upsert({
          where: { travelerNo },
          update: { potNo, isReturnForRework: true, ...origin },
          create: { travelerNo, partNo, potNo, isReturnForRework: true, ...origin },
        });
        returnForRework.push({ travelerNo, ...origin });
        saved += 1;
        continue;
      }

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
            sourceStation: station,
            deviceId: typeof deviceId === "string" ? deviceId : null,
          },
        }),
      ]);
      moveIds.push(move.id);
      saved += 1;
    }

    return NextResponse.json({
      ok: true,
      saved,
      skippedDuplicates,
      moveIds,
      ...(returnForRework.length > 0 ? { returnForRework } : {}),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Confirm failed." },
      { status: 500 },
    );
  }
}
