// FID-ERP-011 §4a — đăng nhập theo TRẠM (mật khẩu chung, không phải tài
// khoản cá nhân). Sai station/password KHÔNG tiết lộ lý do cụ thể (tránh
// dò trạm nào tồn tại).
import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, SESSION_MAX_AGE_SECONDS, createSessionCookieValue, isStation, verifyStationPassword } from "../../../../lib/auth";

type LoginBody = { station?: unknown; password?: unknown };

export async function POST(req: NextRequest) {
  let body: LoginBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body phải là JSON hợp lệ." }, { status: 400 });
  }

  const { station, password } = body;
  if (!isStation(station) || typeof password !== "string" || password === "") {
    return NextResponse.json({ ok: false, error: "Sai trạm hoặc mật khẩu." }, { status: 401 });
  }
  if (!verifyStationPassword(station, password)) {
    return NextResponse.json({ ok: false, error: "Sai trạm hoặc mật khẩu." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, station });
  res.cookies.set(COOKIE_NAME, createSessionCookieValue(station), {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return res;
}
