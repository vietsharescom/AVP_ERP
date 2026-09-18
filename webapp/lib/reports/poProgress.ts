// FID-ERP-008 — Báo cáo đối chiếu PO. SQL `GROUP BY` thật (raw query) —
// không đọc toàn bộ travelers rồi loop JS group. Xem
// docs/features/FID-ERP-008_20260918.md §4/§5.
import { prisma } from "../prisma";

export type ReworkTravelerEntry = { travelerNo: string; reworkOfPsNo: string | null; reworkOfLotNo: string | null };

export type PoProgressReport = {
  poNo: string;
  startDate: Date | null;
  endDate: Date | null;
  isOverdue: boolean;
  daysOpen: number;
  totalTravelers: number;
  completed: number;
  outstanding: number;
  reworkTravelers: ReworkTravelerEntry[];
};

type AggregateRow = { poNo: string; totalTravelers: bigint; completed: bigint; autoPoDate: Date };
type TrackingRow = { startDate: Date | null; endDate: Date | null } | null;

// `t.po_no IS NOT NULL` ở cả 2 truy vấn — Traveler chưa đăng ký PO nào
// (destination="warehouse" không qua "po" trước) không thuộc báo cáo này.
const AGGREGATE_SELECT = `
  SELECT t.po_no AS "poNo",
         COUNT(DISTINCT t.traveler_no) AS "totalTravelers",
         COUNT(DISTINCT sm.traveler_no) AS "completed",
         MIN(t.created_at) AS "autoPoDate"
  FROM travelers t
  LEFT JOIN stock_moves sm ON sm.traveler_no = t.traveler_no AND sm.move_type = 'SHIP'
  WHERE t.po_no IS NOT NULL
`;

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function buildReport(row: AggregateRow, tracking: TrackingRow, reworkTravelers: ReworkTravelerEntry[], now: Date): PoProgressReport {
  const totalTravelers = Number(row.totalTravelers);
  const completed = Number(row.completed);
  const outstanding = totalTravelers - completed;
  const startDate = tracking?.startDate ?? null;
  const endDate = tracking?.endDate ?? null;
  const daysOpen = daysBetween(startDate ?? row.autoPoDate, now);
  const isOverdue = endDate != null && now.getTime() > endDate.getTime() && outstanding > 0;

  return { poNo: row.poNo, startDate, endDate, isOverdue, daysOpen, totalTravelers, completed, outstanding, reworkTravelers };
}

async function reworkTravelersByPoNo(poNos: string[]): Promise<Map<string, ReworkTravelerEntry[]>> {
  const rows = await prisma.traveler.findMany({
    where: { poNo: { in: poNos }, isReturnForRework: true },
    select: { poNo: true, travelerNo: true, reworkOfPsNo: true, reworkOfLotNo: true },
  });
  const byPo = new Map<string, ReworkTravelerEntry[]>();
  for (const r of rows) {
    const list = byPo.get(r.poNo as string) ?? [];
    list.push({ travelerNo: r.travelerNo, reworkOfPsNo: r.reworkOfPsNo, reworkOfLotNo: r.reworkOfLotNo });
    byPo.set(r.poNo as string, list);
  }
  return byPo;
}

// `null` = PO không tồn tại (không Traveler nào mang poNo này, và cũng
// chưa từng được set po_tracking).
export async function getPoProgress(poNo: string, now: Date = new Date()): Promise<PoProgressReport | null> {
  const rows = await prisma.$queryRawUnsafe<AggregateRow[]>(
    `${AGGREGATE_SELECT} AND t.po_no = $1 GROUP BY t.po_no`,
    poNo,
  );
  const tracking = await prisma.poTracking.findUnique({ where: { poNo } });

  if (rows.length === 0) {
    if (!tracking) return null;
    // PO đã được nhân viên set ngày theo dõi nhưng CHƯA có Traveler nào
    // đăng ký — vẫn trả báo cáo (0 traveler), không coi là "không tồn tại".
    return buildReport(
      { poNo, totalTravelers: BigInt(0), completed: BigInt(0), autoPoDate: tracking.updatedAt },
      tracking,
      [],
      now,
    );
  }

  const reworkTravelers = (await reworkTravelersByPoNo([poNo])).get(poNo) ?? [];
  return buildReport(rows[0], tracking, reworkTravelers, now);
}

// Chỉ trả PO có outstanding>0, sắp theo mở lâu nhất trước (daysOpen giảm
// dần — tương đương "startDate/poDate cũ nhất trước").
export async function listOpenPoProgress(now: Date = new Date()): Promise<PoProgressReport[]> {
  const rows = await prisma.$queryRawUnsafe<AggregateRow[]>(
    `${AGGREGATE_SELECT} GROUP BY t.po_no HAVING COUNT(DISTINCT t.traveler_no) > COUNT(DISTINCT sm.traveler_no)`,
  );
  if (rows.length === 0) return [];

  const poNos = rows.map((r) => r.poNo);
  const [trackings, reworkByPo] = await Promise.all([
    prisma.poTracking.findMany({ where: { poNo: { in: poNos } } }),
    reworkTravelersByPoNo(poNos),
  ]);
  const trackingByPo = new Map(trackings.map((t) => [t.poNo, t]));

  const reports = rows.map((row) => buildReport(row, trackingByPo.get(row.poNo) ?? null, reworkByPo.get(row.poNo) ?? [], now));
  reports.sort((a, b) => b.daysOpen - a.daysOpen);
  return reports;
}

export type PoTrackingInput = { poNo: string; startDate?: Date | null; endDate?: Date | null; setBy?: string | null };

// Upsert — gọi lại nhiều lần cùng poNo = SỬA (không phải sổ cái, không
// cần lịch sử audit — xem FID-ERP-008 §4c).
export async function setPoTracking(input: PoTrackingInput) {
  return prisma.poTracking.upsert({
    where: { poNo: input.poNo },
    update: {
      ...(input.startDate !== undefined ? { startDate: input.startDate } : {}),
      ...(input.endDate !== undefined ? { endDate: input.endDate } : {}),
      ...(input.setBy !== undefined ? { setBy: input.setBy } : {}),
    },
    create: {
      poNo: input.poNo,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      setBy: input.setBy ?? null,
    },
  });
}
