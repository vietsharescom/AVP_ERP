// FID-ERP-003 §4a — danh sách cố định 10 defect_types cho dropdown UI,
// tránh hard-code trùng dữ liệu seed FID-ERP-001.
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  const types = await prisma.defectType.findMany({
    orderBy: { label: "asc" },
    select: { code: true, label: true },
  });
  return NextResponse.json({ ok: true, types });
}
