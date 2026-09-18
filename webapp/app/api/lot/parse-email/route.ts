// FID-ERP-006 §4b — tách cặp Traveler#+Lot# từ text email, KHÔNG AI.
// Chỉ đọc/tính, KHÔNG ghi DB.
import { NextRequest, NextResponse } from "next/server";
import { parseLotEmail } from "../../../../lib/lot";

export async function POST(req: NextRequest) {
  let body: { emailText?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body phải là JSON hợp lệ." }, { status: 400 });
  }

  if (typeof body.emailText !== "string" || body.emailText.trim() === "") {
    return NextResponse.json({ ok: false, error: "emailText bắt buộc." }, { status: 400 });
  }

  const { matches, unmatched } = parseLotEmail(body.emailText);
  return NextResponse.json({ ok: true, matches, unmatched });
}
