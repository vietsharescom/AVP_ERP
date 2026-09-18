// FID-ERP-008 §4b — nhân viên tự set/sửa ngày bắt đầu/kết thúc theo dõi
// 1 PO (KHÔNG OCR/không tự suy đoán — PO Infasco không ghi hạn tường
// minh). Upsert — gọi lại nhiều lần cùng poNo = SỬA.
import { NextRequest, NextResponse } from "next/server";
import { setPoTracking } from "../../../../../lib/reports/poProgress";

type TrackingBody = {
  poNo?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  setBy?: unknown;
};

function badRequest(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}

function parseDate(value: unknown, field: string): Date | null | undefined {
  if (value === undefined) return undefined; // không gửi field này -> không đổi
  if (value === null) return null; // gửi null tường minh -> xoá giá trị cũ
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new Error(`${field} phải là ngày hợp lệ (ISO string) hoặc null.`);
  }
  return new Date(value);
}

export async function POST(req: NextRequest) {
  let body: TrackingBody;
  try {
    body = await req.json();
  } catch {
    return badRequest("Body phải là JSON hợp lệ.");
  }

  const { poNo, setBy } = body;
  if (typeof poNo !== "string" || poNo.trim() === "") {
    return badRequest("poNo bắt buộc.");
  }

  let startDate: Date | null | undefined;
  let endDate: Date | null | undefined;
  try {
    startDate = parseDate(body.startDate, "startDate");
    endDate = parseDate(body.endDate, "endDate");
  } catch (err) {
    return badRequest(err instanceof Error ? err.message : "Ngày không hợp lệ.");
  }

  if (startDate != null && endDate != null && endDate.getTime() < startDate.getTime()) {
    return badRequest("endDate phải >= startDate.");
  }

  const tracking = await setPoTracking({
    poNo: poNo.trim(),
    startDate,
    endDate,
    setBy: typeof setBy === "string" ? setBy : undefined,
  });

  return NextResponse.json({ ok: true, poNo: tracking.poNo, startDate: tracking.startDate, endDate: tracking.endDate });
}
