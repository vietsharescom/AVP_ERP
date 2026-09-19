// FID-ERP-011 — chặn route theo trạm TRƯỚC KHI vào page/API. Logic
// quyết định (isStationAllowed/isPublicPath) nằm ở lib/auth.ts (tách
// riêng để test được bằng Vitest — proxy.ts chỉ Next.js server mới chạy,
// không gọi trực tiếp được trong test).
// Next.js 16: "Middleware" đổi tên thành "Proxy" (file `proxy.ts`, hàm
// export tên `proxy`) — chức năng giống hệt, nhưng mặc định chạy Node.js
// runtime (khác Middleware cũ mặc định Edge runtime, không dùng được
// `crypto` của Node — xem lib/auth.ts).
import { NextRequest, NextResponse } from "next/server";
import { getStationFromRequest, isPublicPath, isStationAllowed } from "./lib/auth";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const station = getStationFromRequest(req);
  const isApi = pathname.startsWith("/api/");

  if (!station) {
    if (isApi) {
      return NextResponse.json({ ok: false, error: "Chưa đăng nhập." }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (!isStationAllowed(station, pathname)) {
    return NextResponse.json(
      { ok: false, error: `Trạm ${station} không có quyền truy cập "${pathname}".` },
      { status: 403 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
