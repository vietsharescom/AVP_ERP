// Test cho FID-ERP-013 v0.2 (chạy thử toàn bộ dữ liệu thật 2026-09-20): chuẩn
// hoá Part#/máy/ca, tách Reject+Special Notes thành nhiều dòng SCRAP, lot từ
// finalLot, ngày SHIP thật. Dùng database avp_erp_test riêng.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  migrateFinishGood,
  migratePackingList,
  migratePartControl,
  migrateRawMaterial,
} from "../../lib/migrate/migrate";
import { parseRejectLines } from "../../lib/migrate/reject";
import { normalizeLotNo, normalizeSkid } from "../../lib/migrate/normalize";
import { prisma } from "../../lib/prisma";

const RUN = Date.now().toString();
const PART = `MIGV2-${RUN}`;

let seq = 0;
function tr() {
  seq += 1;
  return `MIGV2TR-${RUN}-${seq}`;
}

afterAll(async () => {
  await prisma.$disconnect();
});

const TYPES = [
  { code: "MIXED", label: "Mixed" },
  { code: "SLIVERS", label: "Slivers" },
  { code: "STUCK_TOGETHER", label: "Stuck Together" },
  { code: "EXCESS_PLATING", label: "Excess Plating" },
  { code: "OTHERS", label: "Others" },
];

describe("FID-ERP-013 v0.2 — parseRejectLines (hàm thuần)", () => {
  it("danh sách số khớp danh sách tên -> ghép từng cặp, bí danh STUCK TGT/SILVERS đúng mã", () => {
    const r = parseRejectLines("3, 100, 4", "MIXED, SILVERS, STUCK TGT", TYPES);
    expect(r).toEqual({
      lines: [
        { qty: 3, reasonCode: "MIXED", note: null },
        { qty: 100, reasonCode: "SLIVERS", note: null },
        { qty: 4, reasonCode: "STUCK_TOGETHER", note: null },
      ],
    });
  });

  it("tên lỗi lạ (DAMAGED FIANGE) -> OTHERS + note giữ nguyên tên gốc", () => {
    const r = parseRejectLines("3, 7", "MIXED, DAMAGED FIANGE", TYPES);
    expect(r).toEqual({
      lines: [
        { qty: 3, reasonCode: "MIXED", note: null },
        { qty: 7, reasonCode: "OTHERS", note: "DAMAGED FIANGE" },
      ],
    });
  });

  it("số lượng KHÔNG khớp số tên lỗi -> 1 dòng OTHERS = tổng, note giữ Special Notes + Reject gốc (không đoán cách chia)", () => {
    const r = parseRejectLines("2, 29", "MIXED", TYPES);
    expect(r).toEqual({
      lines: [{ qty: 31, reasonCode: "OTHERS", note: "MIXED (reject gốc: 2, 29)" }],
    });
  });

  it("có Reject nhưng không có Special Notes -> 1 dòng OTHERS", () => {
    const r = parseRejectLines("5", undefined, TYPES);
    expect(r).toEqual({ lines: [{ qty: 5, reasonCode: "OTHERS", note: "(reject gốc: 5)" }] });
  });

  it("token không phải số nguyên dương -> INVALID_REJECT_QTY", () => {
    expect(parseRejectLines("abc", "MIXED", TYPES)).toEqual({ error: "INVALID_REJECT_QTY" });
    expect(parseRejectLines("3, 0", "MIXED, SLIVERS", TYPES)).toEqual({ error: "INVALID_REJECT_QTY" });
  });
});

describe("FID-ERP-013 v0.2 — RawMaterial: Part# + lot", () => {
  const partBase = `${PART}-RM`;
  beforeAll(async () => {
    await migratePartControl([{ part: partBase, qtyPerBox: "100", client: "Infasco" }]);
  });

  it("Part# có hậu tố + chữ thường -> cắt hậu tố, IN HOA, khớp part_control", async () => {
    const travelerNo = tr();
    const summary = await migrateRawMaterial([
      { traveler: travelerNo, partNo: `${partBase.toLowerCase()}-a`, date: "2026-07-09" },
    ]);
    expect(summary.quarantined).toBe(0);
    const t = await prisma.traveler.findUnique({ where: { travelerNo } });
    expect(t?.partNo).toBe(partBase);
  });

  it("finalLot hợp lệ -> travelers.lotNo; placeholder AVP_AI -> bỏ qua", async () => {
    const withLot = tr();
    const withPlaceholder = tr();
    await migrateRawMaterial([
      { traveler: withLot, partNo: partBase, date: "2026-07-09", finalLot: `6-999-${RUN.slice(-2)}-A` },
      { traveler: withPlaceholder, partNo: partBase, date: "2026-07-09", finalLot: "TRAVELERRECEIVED" },
    ]);
    expect((await prisma.traveler.findUnique({ where: { travelerNo: withLot } }))?.lotNo).toBe(`6-999-${RUN.slice(-2)}-A`);
    expect((await prisma.traveler.findUnique({ where: { travelerNo: withPlaceholder } }))?.lotNo).toBeNull();
  });

  it("lot từ FinishGood (migrate SAU) ghi đè finalLot", async () => {
    const travelerNo = tr();
    await migrateRawMaterial([{ traveler: travelerNo, partNo: partBase, date: "2026-07-09", finalLot: "6-111-11-A" }]);
    await migrateFinishGood([
      {
        date: "2026-07-12",
        shift: "mrnng",
        operator: "275",
        traveler: travelerNo,
        machine: "Tbl",
        mcNo: "4",
        lotNo: "6-222-22-B",
        qty: "1000",
      },
    ]);
    expect((await prisma.traveler.findUnique({ where: { travelerNo } }))?.lotNo).toBe("6-222-22-B");
  });
});

describe("FID-ERP-013 v0.2 — FinishGood: chuẩn hoá + nhiều dòng SCRAP", () => {
  const part = `${PART}-FG`;
  beforeAll(async () => {
    await migratePartControl([{ part, qtyPerBox: "100", client: "Infasco" }]);
  });

  it("máy/ca/người ghi IN HOA dù nguồn viết lẫn (Tbl+4, Mrnng, bf118a/b)", async () => {
    const travelerNo = tr();
    await migrateRawMaterial([{ traveler: travelerNo, partNo: part, date: "2026-07-09" }]);
    await migrateFinishGood([
      { date: "2026-07-12 09:00:00", shift: "Mrnng", operator: "ab-1", traveler: travelerNo, machine: "Tbl", mcNo: "4", qty: "500" },
    ]);
    const m = await prisma.stockMove.findFirst({ where: { travelerNo, moveType: "SELECT" } });
    expect(m?.machineCode).toBe("TBL4");
    expect(m?.shift).toBe("MRNNG");
    expect(m?.operatorCode).toBe("AB-1");
  });

  it("Reject 3 số + 3 tên -> 3 dòng SCRAP đúng mã, tên lạ vào OTHERS + note; tất cả cùng 1 transaction với SELECT", async () => {
    const travelerNo = tr();
    await migrateRawMaterial([{ traveler: travelerNo, partNo: part, date: "2026-07-09" }]);
    const summary = await migrateFinishGood([
      {
        date: "2026-07-12 10:00:00",
        shift: "MRNNG",
        operator: "275",
        traveler: travelerNo,
        machine: "BF",
        mcNo: "107",
        qty: "36000",
        reject: "3, 18, 1",
        specialNotes: "MIXED, SILVERS, DAMAGED FIANGE",
      },
    ]);
    expect(summary.inserted).toBe(1);
    const scraps = await prisma.stockMove.findMany({
      where: { travelerNo, moveType: "SCRAP" },
      orderBy: { id: "asc" },
    });
    expect(scraps.map((s) => [s.reasonCode, s.qty, s.note])).toEqual([
      ["MIXED", 3, null],
      ["SLIVERS", 18, null],
      ["OTHERS", 1, "DAMAGED FIANGE"],
    ]);
  });
});

describe("FID-ERP-013 v0.2 — FinishGood: ghi thêm PACK (dòng Wrapping = đóng thùng)", () => {
  const part = `${PART}-PK`;
  beforeAll(async () => {
    await migratePartControl([{ part, qtyPerBox: "100", client: "Infasco" }]);
  });

  it("có số thùng -> SELECT + PACK cùng qty, boxCount đúng, cùng máy/người/ca", async () => {
    const travelerNo = tr();
    await migrateRawMaterial([{ traveler: travelerNo, partNo: part, date: "2026-07-09" }]);
    await migrateFinishGood([
      { date: "2026-07-12 09:00:00", shift: "MRNNG", operator: "275", traveler: travelerNo, machine: "BF", mcNo: "107", qty: "3600", boxes: "36", skid: "skid# 30" },
    ]);
    const pack = await prisma.stockMove.findFirst({ where: { travelerNo, moveType: "PACK" } });
    expect(pack?.qty).toBe(3600);
    expect(pack?.boxCount).toBe(36);
    expect(pack?.machineCode).toBe("BF107");
    expect(pack?.shift).toBe("MRNNG");
    expect((await prisma.traveler.findUnique({ where: { travelerNo } }))?.skidNo).toBe("SKID# 30");
  });

  it("không có số thùng -> chỉ SELECT, không PACK", async () => {
    const travelerNo = tr();
    await migrateRawMaterial([{ traveler: travelerNo, partNo: part, date: "2026-07-09" }]);
    await migrateFinishGood([
      { date: "2026-07-12 09:00:00", shift: "MRNNG", operator: "275", traveler: travelerNo, machine: "BF", mcNo: "107", qty: "500" },
    ]);
    expect(await prisma.stockMove.count({ where: { travelerNo, moveType: "PACK" } })).toBe(0);
    expect(await prisma.stockMove.count({ where: { travelerNo, moveType: "SELECT" } })).toBe(1);
  });
});

describe("FID-ERP-013 v0.2 — PackingList: ngày xuất thật", () => {
  const part = `${PART}-PL`;
  beforeAll(async () => {
    await migratePartControl([{ part, qtyPerBox: "100", client: "Infasco" }]);
  });

  it("invDate hợp lệ -> SHIP.createdAt = ngày đó (không phải now())", async () => {
    const travelerNo = tr();
    await migrateRawMaterial([{ traveler: travelerNo, partNo: part, date: "2026-07-09" }]);
    await migratePackingList([
      { po: "P1", partNo: `${part}-t`, traveler: travelerNo, quantity: "500", invDate: "2026-07-20", ps: `PS-${RUN}-${seq}` },
    ]);
    const ship = await prisma.stockMove.findFirst({ where: { travelerNo, moveType: "SHIP" } });
    expect(ship?.createdAt.toISOString().slice(0, 10)).toBe("2026-07-20");
    const line = await prisma.packingSlipLine.findFirst({ where: { travelerNo } });
    expect(line?.partNoSnap).toBe(part); // đã cắt hậu tố + IN HOA
    // Packing Slip lập ngày = ngày sớm nhất của các dòng PS (không phải lúc chạy migrate)
    const ps = await prisma.packingSlip.findUnique({ where: { psNo: `PS-${RUN}-${seq}` } });
    expect(ps?.createdAt.toISOString().slice(0, 10)).toBe("2026-07-20");
  });
});

describe("FID-ERP-013 v0.2 — normalizeLotNo / normalizeSkid", () => {
  it("Lot: TRIM + IN HOA", () => {
    expect(normalizeLotNo("  6-258-40-a ")).toBe("6-258-40-A");
    expect(normalizeLotNo(undefined)).toBe("");
  });
  it("Skid: các dạng nguồn (skid# 30, SKID #240, Skid # 12) -> SKID# <số>", () => {
    expect(normalizeSkid("skid# 30")).toBe("SKID# 30");
    expect(normalizeSkid("SKID #240")).toBe("SKID# 240");
    expect(normalizeSkid("Skid # 12")).toBe("SKID# 12");
    expect(normalizeSkid("skid 77")).toBe("SKID# 77");
  });
  it("Skid dạng lạ -> chỉ TRIM + IN HOA, không đoán; rỗng -> rỗng", () => {
    expect(normalizeSkid("pallet-9a")).toBe("PALLET-9A");
    expect(normalizeSkid("")).toBe("");
  });
});
