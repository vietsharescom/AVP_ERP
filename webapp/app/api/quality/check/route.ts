// FID-ERP-005 §4 — ghi 0..n SCRAP (reject phát hiện ở Wrapping) + 1
// quality_checks (Good/Hold/Concession) + 0..1 PACK (đóng thùng, v1.1)
// trong 1 transaction. Concession là 1 dòng MỚI (không UPDATE dòng cũ)
// — đúng append-only.
// v1.1 (FID-ERP-005) — thêm `pack` (số thùng + tổng qty + Skid#): dữ
// liệu thật (`Data/4.WRAPPING/Wrapping_final.xlsm` CHECKING SUMMARY)
// xác nhận đóng thùng + Skid# ghi CÙNG lúc/CÙNG dòng với Good/Hold, ở
// khâu Wrapping — không phải việc của Office lúc lập Packing Slip
// (FID-ERP-009).
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { shiftWarning } from "../../../../lib/shift";

type RejectInput = { reasonCode?: unknown; qty?: unknown };
type ConcessionInput = { by?: unknown; reason?: unknown };
type PackInput = { boxCount?: unknown; qty?: unknown; skidNo?: unknown; machineCode?: unknown; shift?: unknown };

type CheckBody = {
  travelerNo?: unknown;
  status?: unknown;
  note?: unknown;
  checkedBy?: unknown;
  reject?: unknown;
  concession?: unknown;
  pack?: unknown;
};

const ALLOWED_STATUS = new Set(["GOOD", "HOLD"]);

function badRequest(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}

function isPositiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function normalize(value: string): string {
  return value.trim().toUpperCase();
}

export async function POST(req: NextRequest) {
  let body: CheckBody;
  try {
    body = await req.json();
  } catch {
    return badRequest("Body phải là JSON hợp lệ.");
  }

  const { travelerNo, status, note, checkedBy, reject, concession, pack } = body;

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

  // v1.1 — `pack` optional: khi có, TẤT CẢ sub-field bắt buộc (đóng thùng
  // + Skid# luôn ghi ĐỦ trên cùng 1 dòng dữ liệu thật, không có trường
  // hợp chỉ có 1 phần). machineCode/shift bắt buộc vì CHECK constraint
  // `chk_select_pack_requires_context` (FID-ERP-001) đòi machine_code/
  // operator_code/shift non-empty cho move_type='PACK'.
  let packRow: { boxCount: number; qty: number; skidNo: string; machineCode: string; shift: string } | null = null;
  if (pack != null) {
    const p = pack as PackInput;
    if (!isPositiveInt(p.boxCount)) {
      return badRequest("pack.boxCount phải > 0.");
    }
    if (!isPositiveInt(p.qty)) {
      return badRequest("pack.qty phải > 0.");
    }
    if (typeof p.skidNo !== "string" || p.skidNo.trim() === "") {
      return badRequest("pack.skidNo bắt buộc.");
    }
    if (typeof p.machineCode !== "string" || p.machineCode.trim() === "") {
      return badRequest("pack.machineCode bắt buộc.");
    }
    if (typeof p.shift !== "string" || p.shift.trim() === "") {
      return badRequest("pack.shift bắt buộc.");
    }
    packRow = {
      boxCount: p.boxCount,
      qty: p.qty,
      skidNo: p.skidNo.trim(),
      machineCode: normalize(p.machineCode),
      shift: normalize(p.shift),
    };
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

  // v1.2 — Kiểm tra Wrapping là kiểm tra hàng ĐÃ QUA MÁY LỰA (Xưởng) —
  // Traveler chưa từng có SELECT thì chưa có hàng gì để kiểm tra, không
  // cho ghi Good/Hold. Andy xác nhận 2026-09-19 (phát hiện qua test thật:
  // route trước đó không chặn, cho lưu Good trên Traveler chưa SELECT).
  const hasSelect = await prisma.stockMove.findFirst({
    where: { travelerNo, moveType: "SELECT" },
    select: { id: true },
  });
  if (!hasSelect) {
    return badRequest(`Traveler "${travelerNo}" chưa qua máy lựa (SELECT) — chưa có gì để kiểm tra Wrapping.`);
  }

  // v1.4 — Trùng lặp phải CẢNH BÁO, không tự động bỏ qua/ghi đè (cùng
  // nguyên tắc `skippedDuplicates` ở FID-ERP-002) — Traveler đã từng có
  // 1 lần kiểm tra Wrapping trước đó vẫn CHO ghi thêm (ca thật: kiểm tra
  // lại sau khi sửa lỗi), chỉ cảnh báo để người dùng biết đang ghi thêm
  // chứ không phải lần đầu. Andy phát hiện qua test thật: bấm lại nhiều
  // lần cùng Traveler tạo nhiều dòng `quality_checks` trùng im lặng.
  const warnings: string[] = [];
  const lastCheck = await prisma.qualityCheck.findFirst({
    where: { travelerNo },
    orderBy: { createdAt: "desc" },
  });
  if (lastCheck) {
    warnings.push(
      `Traveler "${travelerNo}" đã có 1 lần kiểm tra Wrapping trước đó (status=${lastCheck.status}, lúc ${lastCheck.createdAt.toISOString()}) — vẫn ghi thêm dòng mới.`,
    );
  }

  // v1.1 — không đóng gói vượt quá số đã lựa (SUM SELECT) trừ đi số đã
  // đóng trước đó (SUM PACK) — tránh đóng nhiều hơn số thực có.
  if (packRow) {
    const [selectAgg, packAgg] = await Promise.all([
      prisma.stockMove.aggregate({ where: { travelerNo, moveType: "SELECT" }, _sum: { qty: true } }),
      prisma.stockMove.aggregate({ where: { travelerNo, moveType: "PACK" }, _sum: { qty: true } }),
    ]);
    const available = (selectAgg._sum.qty ?? 0) - (packAgg._sum.qty ?? 0);
    if (packRow.qty > available) {
      return badRequest(`pack.qty (${packRow.qty}) vượt quá số lượng đã lựa còn có thể đóng gói (còn ${available}).`);
    }

    // v1.3 — cảnh báo (KHÔNG chặn) nếu ca không khớp quy ước đã chốt
    // (MRNNG/AFTRN, nguồn chứng từ thật, xem lib/shift.ts).
    const packShiftWarning = shiftWarning(packRow.shift);
    if (packShiftWarning) warnings.push(packShiftWarning);

    // v1.3 — cảnh báo (KHÔNG chặn) nếu boxCount/qty phi lý so với
    // `part_control.qtyPerBox` — phát hiện qua test thật: Andy nhập
    // boxCount=700 cho qty=1000 (Part# có qtyPerBox=6000, tức trung bình
    // ~1.4 pcs/thùng — sai lệch rõ ràng, nhiều khả năng gõ lộn 2 ô).
    // Chỉ CẢNH BÁO vì đây là số liệu Xưởng tự nhập tay, không phải OCR —
    // không có "draft" để sửa trước, chặn cứng có thể cản trở ca thật
    // hợp lệ (thùng cuối đóng lẻ, v.v.).
    const partControl = await prisma.partControl.findUnique({ where: { partNo: traveler.partNo } });
    if (partControl) {
      const impliedPerBox = packRow.qty / packRow.boxCount;
      if (packRow.qty > packRow.boxCount * partControl.qtyPerBox) {
        warnings.push(
          `PACK ${packRow.boxCount} thùng x qty/thùng chuẩn ${partControl.qtyPerBox} = tối đa ${packRow.boxCount * partControl.qtyPerBox} pcs, nhưng qty gửi lên (${packRow.qty}) VƯỢT mức này — kiểm tra lại boxCount/qty.`,
        );
      } else if (impliedPerBox < partControl.qtyPerBox * 0.5) {
        warnings.push(
          `Trung bình ${Math.round(impliedPerBox)} pcs/thùng (qty=${packRow.qty} / boxCount=${packRow.boxCount}) thấp bất thường so với chuẩn ${partControl.qtyPerBox} pcs/thùng của Part# ${traveler.partNo} — kiểm tra lại có gõ lộn boxCount/qty không.`,
        );
      }
    }
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
      ...(packRow
        ? [
            prisma.stockMove.create({
              data: {
                travelerNo,
                moveType: "PACK" as const,
                qty: packRow.qty,
                boxCount: packRow.boxCount,
                machineCode: packRow.machineCode,
                operatorCode: checkedBy,
                shift: packRow.shift,
                sourceStation: "FACTORY",
              },
            }),
          ]
        : []),
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
    const packMove = packRow ? results[rejectRows.length] : null;
    const qualityCheck = results[results.length - 1];
    const totalRejectQty = rejectRows.reduce((sum, r) => sum + (r.qty as number), 0);

    // Skid# là cờ định danh MUTABLE trên travelers (giống potNo) — cập
    // nhật ở lệnh RIÊNG sau khi transaction chính ghi xong (khác kiểu
    // Model nên tách khỏi `ops` ở trên để giữ `.id` rõ ràng trên
    // StockMove/QualityCheck, đúng bài học FID-ERP-006 §10).
    if (packRow) {
      await prisma.traveler.update({ where: { travelerNo }, data: { skidNo: packRow.skidNo } });
    }

    return NextResponse.json({
      ok: true,
      qualityCheckId: qualityCheck.id,
      scrapMoveIds: scrapMoves.map((m) => m.id),
      totalRejectQty,
      ...(packMove ? { packMoveId: packMove.id } : {}),
      warnings,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Confirm failed." },
      { status: 500 },
    );
  }
}
