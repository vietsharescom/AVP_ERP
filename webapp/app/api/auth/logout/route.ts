// FID-ERP-011 §4b — xoá session, không cần input.
import { NextResponse } from "next/server";
import { COOKIE_NAME } from "../../../../lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", { httpOnly: true, sameSite: "strict", path: "/", maxAge: 0 });
  return res;
}
