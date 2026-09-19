// FID-ERP-012 — Báo cáo sản xuất Xưởng. SQL `GROUP BY` thật (raw query),
// không loop JS trên toàn bộ stock_moves. Xem
// docs/features/FID-ERP-012_20260917.md §4/§5.
import { prisma } from "../prisma";

export type GroupBy = "day" | "month" | "year";

export type ProductionReportInput = { from: string; to: string; groupBy: GroupBy };

export type MachineQty = { machine_code: string; qty: number };
export type ProductionBucket = { date: string; qty: number; by_machine: MachineQty[] };
export type DefectReason = { reason: string; qty: number };

export type ProductionReport = {
  production: ProductionBucket[];
  defects: { scrap_qty: number; return_qty: number; by_reason: DefectReason[] };
  travelers_open_at_day_start: number;
  finished_goods_awaiting_shipment: number;
};

export class ValidationError extends Error {}

const GROUP_BY_VALUES: GroupBy[] = ["day", "month", "year"];

function parseDateOnly(value: string, field: string): Date {
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) {
    throw new ValidationError(`${field} không hợp lệ (định dạng YYYY-MM-DD): "${value}".`);
  }
  return d;
}

function addUnit(date: Date, groupBy: GroupBy): Date {
  const d = new Date(date);
  if (groupBy === "day") d.setUTCDate(d.getUTCDate() + 1);
  else if (groupBy === "month") d.setUTCMonth(d.getUTCMonth() + 1);
  else d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d;
}

function truncToUnit(date: Date, groupBy: GroupBy): Date {
  if (groupBy === "day") return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  if (groupBy === "month") return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  return new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
}

function bucketKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Tạo đủ mọi bucket trong khoảng [from, toExclusive) — kể cả bucket không
// có stock_moves nào (qty=0, by_machine=[]), tránh biểu đồ bị thiếu điểm.
function allBucketKeys(from: Date, toExclusive: Date, groupBy: GroupBy): string[] {
  const keys: string[] = [];
  let cursor = truncToUnit(from, groupBy);
  while (cursor.getTime() < toExclusive.getTime()) {
    keys.push(bucketKey(cursor));
    cursor = addUnit(cursor, groupBy);
  }
  return keys;
}

type ProductionRow = { bucket: Date; machineCode: string; qty: bigint };
type DefectAggRow = { qty: bigint | null };
type DefectReasonRow = { reason: string; qty: bigint };
type CountRow = { cnt: bigint };

// Cột `machine_code` MẶC ĐỊNH NOT NULL trên dòng SELECT/PACK (FID-ERP-001
// §5) — coalesce phòng hờ dữ liệu cũ/test thiếu, không để lọt NULL group riêng.
// So khớp "cùng 1 lần rework" bằng traveler_no + created_at TUYỆT ĐỐI —
// Postgres giữ NGUYÊN 1 giá trị now() cho mọi câu lệnh trong CÙNG 1
// transaction (xem FID-ERP-012 §5, FID-ERP-007 §4b/§8).
const PRODUCTION_QUERY = `
  SELECT bucket, machine_code AS "machineCode", SUM(qty)::bigint AS qty
  FROM (
    SELECT date_trunc($1, s.created_at) AS bucket, COALESCE(s.machine_code, 'UNKNOWN') AS machine_code, s.qty AS qty
    FROM stock_moves s
    WHERE s.move_type = 'SELECT'
      AND s.created_at >= $2 AND s.created_at < $3
      AND NOT EXISTS (
        SELECT 1 FROM stock_moves r
        WHERE r.move_type = 'RETURN' AND r.traveler_no = s.traveler_no AND r.created_at = s.created_at
      )
    UNION ALL
    SELECT date_trunc($1, s.created_at) AS bucket, COALESCE(s.machine_code, 'UNKNOWN') AS machine_code, -s.qty AS qty
    FROM stock_moves s
    WHERE s.move_type = 'SCRAP'
      AND s.created_at >= $2 AND s.created_at < $3
      AND EXISTS (
        SELECT 1 FROM stock_moves r
        WHERE r.move_type = 'RETURN' AND r.traveler_no = s.traveler_no AND r.created_at = s.created_at
      )
  ) t
  GROUP BY bucket, machine_code
`;

async function loadProduction(from: Date, toExclusive: Date, groupBy: GroupBy): Promise<ProductionBucket[]> {
  const rows = await prisma.$queryRawUnsafe<ProductionRow[]>(PRODUCTION_QUERY, groupBy, from, toExclusive);

  const byBucket = new Map<string, MachineQty[]>();
  for (const row of rows) {
    const key = bucketKey(row.bucket);
    const list = byBucket.get(key) ?? [];
    list.push({ machine_code: row.machineCode, qty: Number(row.qty) });
    byBucket.set(key, list);
  }

  return allBucketKeys(from, toExclusive, groupBy).map((date) => {
    const by_machine = (byBucket.get(date) ?? []).sort((a, b) => a.machine_code.localeCompare(b.machine_code));
    const qty = by_machine.reduce((sum, m) => sum + m.qty, 0);
    return { date, qty, by_machine };
  });
}

async function loadDefects(from: Date, toExclusive: Date): Promise<ProductionReport["defects"]> {
  const [scrapRows, returnRows, reasonRows] = await Promise.all([
    prisma.$queryRawUnsafe<DefectAggRow[]>(
      `SELECT SUM(qty)::bigint AS qty FROM stock_moves WHERE move_type = 'SCRAP' AND created_at >= $1 AND created_at < $2`,
      from,
      toExclusive,
    ),
    prisma.$queryRawUnsafe<DefectAggRow[]>(
      `SELECT SUM(qty)::bigint AS qty FROM stock_moves WHERE move_type = 'RETURN' AND created_at >= $1 AND created_at < $2`,
      from,
      toExclusive,
    ),
    prisma.$queryRawUnsafe<DefectReasonRow[]>(
      `SELECT dt.label AS reason, SUM(sm.qty)::bigint AS qty
       FROM stock_moves sm
       JOIN defect_types dt ON dt.code = sm.reason_code
       WHERE sm.move_type = 'SCRAP' AND sm.created_at >= $1 AND sm.created_at < $2
       GROUP BY dt.label
       ORDER BY qty DESC`,
      from,
      toExclusive,
    ),
  ]);

  return {
    scrap_qty: Number(scrapRows[0]?.qty ?? BigInt(0)),
    return_qty: Number(returnRows[0]?.qty ?? BigInt(0)),
    by_reason: reasonRows.map((r) => ({ reason: r.reason, qty: Number(r.qty) })),
  };
}

// Snapshot tại 00:00 ngày `from` — Traveler đã tồn tại trước mốc đó VÀ
// CHƯA có SHIP trước mốc đó (xem FID-ERP-012 §5).
async function loadTravelersOpenAtDayStart(boundary: Date): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<CountRow[]>(
    `SELECT COUNT(*)::bigint AS cnt FROM travelers t
     WHERE t.created_at < $1
       AND NOT EXISTS (
         SELECT 1 FROM stock_moves s
         WHERE s.traveler_no = t.traveler_no AND s.move_type = 'SHIP' AND s.created_at < $1
       )`,
    boundary,
  );
  return Number(rows[0]?.cnt ?? BigInt(0));
}

// Không giới hạn theo period — đây là trạng thái HIỆN TẠI (đối xứng: mỗi
// PACK tối đa 1 SHIP theo sau, xem FID-ERP-012 §5).
async function loadFinishedGoodsAwaitingShipment(): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<DefectAggRow[]>(
    `SELECT SUM(p.qty)::bigint AS qty FROM stock_moves p
     WHERE p.move_type = 'PACK'
       AND NOT EXISTS (
         SELECT 1 FROM stock_moves s
         WHERE s.move_type = 'SHIP' AND s.traveler_no = p.traveler_no AND s.created_at > p.created_at
       )`,
  );
  return Number(rows[0]?.qty ?? BigInt(0));
}

export async function getProductionReport(input: ProductionReportInput): Promise<ProductionReport> {
  if (!GROUP_BY_VALUES.includes(input.groupBy)) {
    throw new ValidationError(`groupBy phải là 1 trong: ${GROUP_BY_VALUES.join(", ")}.`);
  }
  const from = parseDateOnly(input.from, "from");
  const to = parseDateOnly(input.to, "to");
  if (from.getTime() > to.getTime()) {
    throw new ValidationError(`from (${input.from}) phải <= to (${input.to}).`);
  }
  const toExclusive = addUnit(to, "day");

  const [production, defects, travelersOpenAtDayStart, finishedGoodsAwaitingShipment] = await Promise.all([
    loadProduction(from, toExclusive, input.groupBy),
    loadDefects(from, toExclusive),
    loadTravelersOpenAtDayStart(from),
    loadFinishedGoodsAwaitingShipment(),
  ]);

  return {
    production,
    defects,
    travelers_open_at_day_start: travelersOpenAtDayStart,
    finished_goods_awaiting_shipment: finishedGoodsAwaitingShipment,
  };
}
