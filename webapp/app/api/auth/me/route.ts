// FID-ERP-014 §4b — trả trạm hiện tại (đọc-only), phục vụ UI (NavBar/
// trang chủ). KHÔNG dùng để bypass kiểm tra quyền ở route thật — mọi
// route vẫn tự kiểm tra qua webapp/proxy.ts như cũ.
import { NextRequest, NextResponse } from "next/server";
import { getStationFromRequest } from "../../../../lib/auth";

export async function GET(req: NextRequest) {
  const station = getStationFromRequest(req);
  return NextResponse.json({ ok: true, station });
}
