// Test FID-ERP-015 (trang chi tiết Traveler / Packing Slip / Part#) — lib/detail.ts.
// Chạy trên database avp_erp_test riêng.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPackingSlipDetail, getPartDetail, getTravelerDetail } from "../../lib/detail";
import { prisma } from "../../lib/prisma";

const RUN = Date.now().toString();
const PART = `DTLPART-${RUN}`;
const TR = `DTLTR-${RUN}`;
const TR_BARE = `DTLTR-${RUN}-BARE`;
const PS = `DTLPS-${RUN}`;
const LOT = `DTLLOT-${RUN}`;

async function move(travelerNo: string, moveType: "RECEIVE" | "SELECT" | "PACK" | "SCRAP" | "SHIP", qty: number, at: string, extra = {}) {
  const withContext = moveType === "SELECT" || moveType === "PACK";
  return prisma.stockMove.create({
    data: {
      travelerNo,
      moveType,
      qty,
      createdAt: new Date(at),
      ...(withContext ? { machineCode: "MC1", operatorCode: "290", shift: "MRNNG" } : {}),
      ...extra,
    },
  });
}

beforeAll(async () => {
  await prisma.partControl.create({ data: { partNo: PART, qtyPerBox: 100, client: "Infasco" } });
  await prisma.lot.create({ data: { lotNo: LOT } });
  await prisma.traveler.create({ data: { travelerNo: TR, partNo: PART, poNo: "PO-1", potNo: "77", lotNo: LOT, skidNo: "SKID# 5" } });
  await prisma.traveler.create({ data: { travelerNo: TR_BARE, partNo: PART } });
  // sản xuất → đóng → xuất 1 phần (chèn không theo thứ tự thời gian để kiểm tra sắp xếp)
  await move(TR, "SHIP", 300, "2026-09-03T12:00:00Z");
  await move(TR, "RECEIVE", 1000, "2026-09-01T12:00:00Z");
  await move(TR, "SELECT", 900, "2026-09-02T12:00:00Z");
  await move(TR, "SCRAP", 30, "2026-09-02T12:00:00Z", { reasonCode: "MIXED" });
  await move(TR, "PACK", 800, "2026-09-02T18:00:00Z", { boxCount: 8 });
  await prisma.qualityCheck.create({ data: { travelerNo: TR, status: "GOOD", checkedBy: "290", createdAt: new Date("2026-09-02T19:00:00Z") } });
  await prisma.lotUpdate.create({ data: { travelerNo: TR, oldLotNo: null, newLotNo: LOT, updatedBy: "Andy", createdAt: new Date("2026-09-02T20:00:00Z") } });
  const ps = await prisma.packingSlip.create({ data: { psNo: PS, totalPallets: 2, totalEmpty: 1 } });
  await prisma.packingSlipLine.create({ data: { packingSlipId: ps.id, travelerNo: TR, qty: 300, partNoSnap: PART, lotNoSnap: LOT, skidNoSnap: "SKID# 5" } });
  await prisma.packingSlipLine.create({ data: { packingSlipId: ps.id, travelerNo: TR_BARE, qty: 50, partNoSnap: PART } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("FID-ERP-015 — getTravelerDetail", () => {
  it("tổng theo loại đúng, còn có thể đóng = SELECT−PACK, chờ xuất = PACK−SHIP", async () => {
    const d = await getTravelerDetail(TR);
    expect(d?.totals).toMatchObject({ RECEIVE: 1000, SELECT: 900, PACK: 800, SCRAP: 30, SHIP: 300 });
    expect(d?.availableToPack).toBe(100);
    expect(d?.awaitingShipment).toBe(500);
    expect(d).toMatchObject({ partNo: PART, poNo: "PO-1", potNo: "77", lotNo: LOT, skidNo: "SKID# 5", qtyPerBox: 100, client: "Infasco" });
  });

  it("lịch sử đúng thứ tự thời gian dù chèn lộn xộn", async () => {
    const d = await getTravelerDetail(TR);
    expect(d?.moves.map((m) => m.moveType)).toEqual(["RECEIVE", "SELECT", "SCRAP", "PACK", "SHIP"]);
    expect(d?.moves.find((m) => m.moveType === "PACK")?.boxCount).toBe(8);
    expect(d?.moves.find((m) => m.moveType === "SCRAP")?.reasonCode).toBe("MIXED");
  });

  it("có quality_checks, lot_updates, dòng Packing Slip", async () => {
    const d = await getTravelerDetail(TR);
    expect(d?.qualityChecks.map((q) => [q.status, q.checkedBy])).toEqual([["GOOD", "290"]]);
    expect(d?.lotUpdates.map((l) => [l.oldLotNo, l.newLotNo])).toEqual([[null, LOT]]);
    expect(d?.packingLines.map((l) => [l.psNo, l.qty])).toEqual([[PS, 300]]);
  });

  it("Traveler mới đăng ký (chưa có move nào) -> tổng 0, không lỗi", async () => {
    const d = await getTravelerDetail(TR_BARE);
    expect(d?.moves).toEqual([]);
    expect(d?.totals.SELECT).toBe(0);
    expect(d?.awaitingShipment).toBe(0);
  });

  it("Traveler không tồn tại -> null (trang trả 404)", async () => {
    expect(await getTravelerDetail(`KHONG-CO-${RUN}`)).toBeNull();
  });
});

describe("FID-ERP-015 — getPackingSlipDetail", () => {
  it("tổng số lượng = tổng dòng, thông tin PS đúng", async () => {
    const d = await getPackingSlipDetail(PS);
    expect(d).toMatchObject({ psNo: PS, totalPallets: 2, totalEmpty: 1, totalQty: 350 });
    expect(d?.lines.map((l) => [l.travelerNo, l.qty])).toEqual([[TR, 300], [TR_BARE, 50]]);
    expect(d?.lines[0]).toMatchObject({ partNoSnap: PART, lotNoSnap: LOT, skidNoSnap: "SKID# 5" });
  });

  it("PS không tồn tại -> null", async () => {
    expect(await getPackingSlipDetail(`KHONG-CO-${RUN}`)).toBeNull();
  });
});

describe("FID-ERP-015 — getPartDetail", () => {
  it("đếm Traveler tổng / chưa xuất; danh sách kèm trạng thái", async () => {
    const d = await getPartDetail(PART);
    expect(d).toMatchObject({ partNo: PART, qtyPerBox: 100, client: "Infasco", travelerCount: 2, openCount: 1 });
    const byNo = Object.fromEntries((d?.travelers ?? []).map((t) => [t.travelerNo, t]));
    expect(byNo[TR]).toMatchObject({ shipped: true, lastMoveType: "SHIP" });
    expect(byNo[TR_BARE]).toMatchObject({ shipped: false, lastMoveType: null });
  });

  it("Part# không tồn tại -> null", async () => {
    expect(await getPartDetail(`KHONG-CO-${RUN}`)).toBeNull();
  });
});
