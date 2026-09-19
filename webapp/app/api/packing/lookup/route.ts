// FID-ERP-009 §4a — GET, đọc-only. Tra 1 Traveler TRƯỚC khi Office thêm
// vào Packing Slip nháp (client-side) — KHÔNG BAO GIỜ ghi DB.
import { NextRequest, NextResponse } from "next/server";
import { getPackingEligibility, findSameSkidTravelers } from "../../../../lib/packing";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const travelerNo = url.searchParams.get("travelerNo")?.trim();
  if (!travelerNo) {
    return NextResponse.json({ ok: false, error: "travelerNo bắt buộc." }, { status: 400 });
  }

  const eligibility = await getPackingEligibility(travelerNo);
  if (!eligibility) {
    return NextResponse.json({ ok: false, error: `Traveler "${travelerNo}" chưa tồn tại.` }, { status: 400 });
  }

  const excludeParam = url.searchParams.get("excludeTravelerNos");
  const excludeTravelerNos = excludeParam
    ? excludeParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const sameSkidTravelers = eligibility.skidNo
    ? await findSameSkidTravelers(eligibility.skidNo, [...excludeTravelerNos, travelerNo])
    : [];

  return NextResponse.json({ ok: true, ...eligibility, sameSkidTravelers });
}
