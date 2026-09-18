// FID-ERP-008 §4a — GET, đọc-only. Không có `po` = tất cả PO còn
// outstanding>0, sắp theo mở lâu nhất trước.
import { NextRequest, NextResponse } from "next/server";
import { getPoProgress, listOpenPoProgress } from "../../../../lib/reports/poProgress";

export async function GET(req: NextRequest) {
  const po = new URL(req.url).searchParams.get("po")?.trim();

  if (!po) {
    const reports = await listOpenPoProgress();
    return NextResponse.json({ ok: true, reports });
  }

  const report = await getPoProgress(po);
  if (!report) {
    return NextResponse.json({ ok: false, error: `PO "${po}" không tồn tại.` }, { status: 404 });
  }
  return NextResponse.json({ ok: true, ...report });
}
