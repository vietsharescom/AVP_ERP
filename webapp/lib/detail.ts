// FID-ERP-015 §4 — dữ liệu cho 3 trang chi tiết chỉ đọc (Traveler / Packing
// Slip / Part#). KHÔNG ghi DB. Gọi trực tiếp từ Server Component.
import { prisma } from "./prisma";

const MOVE_TYPES = ["RECEIVE", "SELECT", "PACK", "SCRAP", "REWORK", "RETURN", "SHIP"] as const;
export type MoveTotals = Record<(typeof MOVE_TYPES)[number], number>;

export type TravelerDetail = {
  travelerNo: string;
  partNo: string;
  poNo: string | null;
  potNo: string | null;
  lotNo: string | null;
  skidNo: string | null;
  isReturnForRework: boolean;
  createdAt: Date;
  qtyPerBox: number;
  client: string;
  totals: MoveTotals;
  availableToPack: number; // SELECT − PACK
  awaitingShipment: number; // PACK − SHIP (không âm)
  moves: {
    id: number;
    createdAt: Date;
    moveType: string;
    qty: number;
    machineCode: string | null;
    operatorCode: string | null;
    shift: string | null;
    reasonCode: string | null;
    boxCount: number | null;
    note: string | null;
    sourceStation: string | null;
  }[];
  qualityChecks: {
    id: number;
    createdAt: Date;
    status: string;
    note: string | null;
    checkedBy: string;
    concessionBy: string | null;
    concessionReason: string | null;
  }[];
  lotUpdates: { id: number; createdAt: Date; oldLotNo: string | null; newLotNo: string; updatedBy: string }[];
  packingLines: { psNo: string; qty: number; lotNoSnap: string | null; skidNoSnap: string | null; createdAt: Date }[];
};

export async function getTravelerDetail(travelerNo: string): Promise<TravelerDetail | null> {
  const t = await prisma.traveler.findUnique({ where: { travelerNo }, include: { part: true } });
  if (!t) return null;

  const [moves, qualityChecks, lotUpdates, lines] = await Promise.all([
    prisma.stockMove.findMany({ where: { travelerNo }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
    prisma.qualityCheck.findMany({ where: { travelerNo }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
    prisma.lotUpdate.findMany({ where: { travelerNo }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
    prisma.packingSlipLine.findMany({
      where: { travelerNo },
      include: { packingSlip: { select: { psNo: true, createdAt: true } } },
      orderBy: { id: "asc" },
    }),
  ]);

  const totals = Object.fromEntries(MOVE_TYPES.map((m) => [m, 0])) as MoveTotals;
  for (const m of moves) totals[m.moveType] += m.qty;

  return {
    travelerNo: t.travelerNo,
    partNo: t.partNo,
    poNo: t.poNo,
    potNo: t.potNo,
    lotNo: t.lotNo,
    skidNo: t.skidNo,
    isReturnForRework: t.isReturnForRework,
    createdAt: t.createdAt,
    qtyPerBox: t.part.qtyPerBox,
    client: t.part.client,
    totals,
    availableToPack: totals.SELECT - totals.PACK,
    awaitingShipment: Math.max(0, totals.PACK - totals.SHIP),
    moves: moves.map((m) => ({
      id: m.id,
      createdAt: m.createdAt,
      moveType: m.moveType,
      qty: m.qty,
      machineCode: m.machineCode,
      operatorCode: m.operatorCode,
      shift: m.shift,
      reasonCode: m.reasonCode,
      boxCount: m.boxCount,
      note: m.note,
      sourceStation: m.sourceStation,
    })),
    qualityChecks: qualityChecks.map((q) => ({
      id: q.id,
      createdAt: q.createdAt,
      status: q.status,
      note: q.note,
      checkedBy: q.checkedBy,
      concessionBy: q.concessionBy,
      concessionReason: q.concessionReason,
    })),
    lotUpdates: lotUpdates.map((l) => ({
      id: l.id,
      createdAt: l.createdAt,
      oldLotNo: l.oldLotNo,
      newLotNo: l.newLotNo,
      updatedBy: l.updatedBy,
    })),
    packingLines: lines.map((l) => ({
      psNo: l.packingSlip.psNo,
      qty: l.qty,
      lotNoSnap: l.lotNoSnap,
      skidNoSnap: l.skidNoSnap,
      createdAt: l.packingSlip.createdAt,
    })),
  };
}

export type PackingSlipDetail = {
  psNo: string;
  createdAt: Date;
  totalPallets: number;
  totalEmpty: number;
  totalQty: number;
  lines: {
    travelerNo: string;
    partNoSnap: string;
    lotNoSnap: string | null;
    potNoSnap: string | null;
    skidNoSnap: string | null;
    qty: number;
  }[];
};

export async function getPackingSlipDetail(psNo: string): Promise<PackingSlipDetail | null> {
  const ps = await prisma.packingSlip.findUnique({ where: { psNo }, include: { lines: { orderBy: { id: "asc" } } } });
  if (!ps) return null;
  return {
    psNo: ps.psNo,
    createdAt: ps.createdAt,
    totalPallets: ps.totalPallets,
    totalEmpty: ps.totalEmpty,
    totalQty: ps.lines.reduce((sum, l) => sum + l.qty, 0),
    lines: ps.lines.map((l) => ({
      travelerNo: l.travelerNo,
      partNoSnap: l.partNoSnap,
      lotNoSnap: l.lotNoSnap,
      potNoSnap: l.potNoSnap,
      skidNoSnap: l.skidNoSnap,
      qty: l.qty,
    })),
  };
}

const PART_TRAVELER_LIMIT = 100;

export type PartDetail = {
  partNo: string;
  qtyPerBox: number;
  client: string;
  travelerCount: number;
  openCount: number; // chưa có SHIP nào
  travelers: {
    travelerNo: string;
    poNo: string | null;
    potNo: string | null;
    lotNo: string | null;
    shipped: boolean;
    lastMoveType: string | null;
  }[];
};

export async function getPartDetail(partNo: string): Promise<PartDetail | null> {
  const part = await prisma.partControl.findUnique({ where: { partNo } });
  if (!part) return null;

  const [travelerCount, shippedCount, travelers] = await Promise.all([
    prisma.traveler.count({ where: { partNo } }),
    prisma.traveler.count({ where: { partNo, moves: { some: { moveType: "SHIP" } } } }),
    prisma.traveler.findMany({
      where: { partNo },
      orderBy: [{ createdAt: "desc" }, { travelerNo: "desc" }],
      take: PART_TRAVELER_LIMIT,
      include: {
        moves: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { moveType: true } },
      },
    }),
  ]);

  return {
    partNo: part.partNo,
    qtyPerBox: part.qtyPerBox,
    client: part.client,
    travelerCount,
    openCount: travelerCount - shippedCount,
    travelers: travelers.map((t) => ({
      travelerNo: t.travelerNo,
      poNo: t.poNo,
      potNo: t.potNo,
      lotNo: t.lotNo,
      shipped: t.moves.some((m) => m.moveType === "SHIP"),
      lastMoveType: t.moves[0]?.moveType ?? null,
    })),
  };
}
