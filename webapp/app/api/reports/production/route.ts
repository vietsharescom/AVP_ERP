// FID-ERP-012 §4 — GET, đọc-only.
import { NextRequest, NextResponse } from "next/server";
import { getProductionReport, GroupBy, ValidationError } from "../../../../lib/reports/productionReport";

const GROUP_BY_VALUES = ["day", "month", "year"];

export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams;
  const from = params.get("from")?.trim();
  const to = params.get("to")?.trim();
  const groupByRaw = params.get("groupBy")?.trim() ?? "day";

  if (!from || !to) {
    return NextResponse.json({ ok: false, error: "from và to bắt buộc (YYYY-MM-DD)." }, { status: 400 });
  }
  if (!GROUP_BY_VALUES.includes(groupByRaw)) {
    return NextResponse.json(
      { ok: false, error: `groupBy phải là 1 trong: ${GROUP_BY_VALUES.join(", ")}.` },
      { status: 400 },
    );
  }
  const groupBy = groupByRaw as GroupBy;

  try {
    const data = await getProductionReport({ from, to, groupBy });
    return NextResponse.json({ ok: true, data, period: { from, to, groupBy } });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Query failed." },
      { status: 500 },
    );
  }
}
