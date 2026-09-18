// FID-ERP-005 §4 — ghi 0..n SCRAP (reject phát hiện ở Wrapping) + 1
// quality_checks (Good/Hold/Concession) trong 1 transaction. Concession
// là 1 dòng MỚI (không UPDATE dòng cũ) — đúng append-only.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

type RejectInput = { reasonCode?: unknown; qty?: unknown };
type ConcessionInput = { by?: unknown; reason?: unknown };

type CheckBody = {
  travelerNo?: unknown;
  status?: unknown;
  note?: unknown;
  checkedBy?: unknown;
  reject?: unknown;
  concession?: unknown;
};

const ALLOWED_STATUS = new Set(["GOOD", "HOLD"]);

function badRequest(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}

function isPositiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

export async function POST(req: NextRequest) {
  let body: CheckBody;
  try {
    body = await req.json();
  } catch {
    return badRequest("Body phải là JSON hợp lệ.");
  }

  const { travelerNo, status, note, checkedBy, reject, concession } = body;

  if (typeof travelerNo !== "string" || travelerNo.trim() === "") {
    return badRequest("travelerNo bắt buộc.");
  }
  if (typeof status !== "string" || !ALLOWED_STATUS.has(status)) {
    return badRequest("status phải là 'GOOD' hoặc 'HOLD'.");
  }
  if (typeof checkedBy !== "string" || checkedBy.trim() === "") {
    return badRequest("checkedBy bắt buộc.");
  }
  if (status === "HOLD" && (typeof note !== "string" || note.trim() === "")) {
    return badRequest("note bắt buộc khi status='HOLD'.");
  }

  const rejectRows = Array.isArray(reject) ? (reject as RejectInput[]) : [];
  for (const r of rejectRows) {
    if (typeof r.reasonCode !== "string" || r.reasonCode.trim() === "") {
      return badRequest("Mỗi reject cần reasonCode.");
    }
    if (!isPositiveInt(r.qty)) {
      return badRequest(`reject qty phải > 0 (reasonCode ${String(r.reasonCode)}).`);
    }
  }

  let concessionRow: { by: string; reason: string } | null = null;
  if (concession != null) {
    if (status !== "HOLD") {
      return badRequest("concession chỉ hợp lệ khi status='HOLD'.");
    }
    const c = concession as ConcessionInput;
    if (typeof c.by !== "string" || c.by.trim() === "") {
      return badRequest("concession.by bắt buộc.");
    }
    if (typeof c.reason !== "string" || c.reason.trim() === "") {
      return badRequest("concession.reason bắt buộc.");
    }
    concessionRow = { by: c.by, reason: c.reason };
  }

  if (rejectRows.length > 0) {
    const codes = rejectRows.map((r) => (r.reasonCode as string).trim());
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
    return badRequest(`Traveler "${travelerNo}" chưa tồn tại.`);
  }

  try {
    const ops = [
      ...rejectRows.map((r) =>
        prisma.stockMove.create({
          data: {
            travelerNo,
            moveType: "SCRAP",
            qty: r.qty as number,
            reasonCode: (r.reasonCode as string).trim(),
            operatorCode: checkedBy,
            sourceStation: "FACTORY",
          },
        }),
      ),
      prisma.qualityCheck.create({
        data: {
          travelerNo,
          status: status as "GOOD" | "HOLD",
          note: typeof note === "string" ? note : null,
          checkedBy,
          concessionBy: concessionRow?.by ?? null,
          concessionReason: concessionRow?.reason ?? null,
          concessionAt: concessionRow ? new Date() : null,
        },
      }),
    ];

    const results = await prisma.$transaction(ops);
    const scrapMoves = results.slice(0, rejectRows.length);
    const qualityCheck = results[results.length - 1];
    const totalRejectQty = rejectRows.reduce((sum, r) => sum + (r.qty as number), 0);

    return NextResponse.json({
      ok: true,
      qualityCheckId: qualityCheck.id,
      scrapMoveIds: scrapMoves.map((m) => m.id),
      totalRejectQty,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Confirm failed." },
      { status: 500 },
    );
  }
}
