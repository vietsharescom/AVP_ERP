// Test criteria cho FID-ERP-007 (Rework/Return linkage, Pot#=GAYLORD) —
// xem docs/features/FID-ERP-007_20260918.md §7 TEST CRITERIA.
// Chạy trên database avp_erp_test riêng (xem tests/db/setup.ts).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";
import { isGaylordReturn, findReworkOrigin, hasReturnMove } from "../../lib/rework";
import { POST as captureConfirmPOST } from "../../app/api/capture/confirm/route";
import { POST as selectConfirmPOST } from "../../app/api/factory/select/confirm/route";
import { prisma } from "../../lib/prisma";

const RUN = Date.now().toString();
const PART_NO = `TESTPART-RWK-${RUN}`;

beforeAll(async () => {
  await prisma.partControl.create({ data: { partNo: PART_NO, qtyPerBox: 100, client: "Infasco" } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

function travelerNo(suffix: string) {
  return `TESTTR-RWK-${RUN}-${suffix}`;
}

function asNextRequest(req: Request): NextRequest {
  return req as unknown as NextRequest;
}

function makeCaptureRequest(body: unknown) {
  return asNextRequest(
    new Request("http://localhost/api/capture/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

function makeSelectRequest(body: unknown) {
  return asNextRequest(
    new Request("http://localhost/api/factory/select/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("FID-ERP-007 — isGaylordReturn", () => {
  it("khớp GAYLORD dù hoa/thường/khoảng trắng thừa", () => {
    expect(isGaylordReturn("GAYLORD")).toBe(true);
    expect(isGaylordReturn("gaylord")).toBe(true);
    expect(isGaylordReturn(" Gaylord ")).toBe(true);
  });
  it("không khớp giá trị khác", () => {
    expect(isGaylordReturn("693")).toBe(false);
    expect(isGaylordReturn("")).toBe(false);
    expect(isGaylordReturn(null)).toBe(false);
    expect(isGaylordReturn(undefined)).toBe(false);
  });
});

describe("FID-ERP-007 — findReworkOrigin / hasReturnMove", () => {
  it("Traveler chưa từng SHIP -> để trống, không lỗi", async () => {
    const tr = travelerNo("NOSHIP");
    await prisma.traveler.create({ data: { travelerNo: tr, partNo: PART_NO } });
    const origin = await findReworkOrigin(tr);
    expect(origin).toEqual({ reworkOfPsNo: null, reworkOfLotNo: null });
    expect(await hasReturnMove(tr)).toBe(false);
  });

  it("Traveler ĐÃ có SHIP + packing_slip_lines thật -> điền đúng reworkOfPsNo/reworkOfLotNo", async () => {
    const tr = travelerNo("SHIPPED");
    const lotNo = `TESTLOT-RWK-${RUN}`;
    await prisma.lot.create({ data: { lotNo } });
    await prisma.traveler.create({ data: { travelerNo: tr, partNo: PART_NO, lotNo } });
    await prisma.stockMove.create({ data: { travelerNo: tr, moveType: "SHIP", qty: 100, sourceStation: "OFFICE" } });
    const ps = await prisma.packingSlip.create({ data: { psNo: `PS-RWK-${RUN}` } });
    await prisma.packingSlipLine.create({
      data: { packingSlipId: ps.id, travelerNo: tr, qty: 100, partNoSnap: PART_NO, lotNoSnap: lotNo },
    });

    const origin = await findReworkOrigin(tr);
    expect(origin).toEqual({ reworkOfPsNo: ps.psNo, reworkOfLotNo: lotNo });
  });
});

describe("FID-ERP-007 — /api/capture/confirm, potNo=GAYLORD", () => {
  it("destination='po' -> chỉ gắn cờ, KHÔNG ghi stock_moves", async () => {
    const tr = travelerNo("PO-GAYLORD");
    const res = await captureConfirmPOST(
      makeCaptureRequest({
        destination: "po",
        rows: [{ travelerNo: tr, partNo: PART_NO, poNo: "PO-193984", potNo: "GAYLORD" }],
        confirmedBy: "111",
      }),
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.returnForRework).toEqual([{ travelerNo: tr, reworkOfPsNo: null, reworkOfLotNo: null }]);

    const traveler = await prisma.traveler.findUnique({ where: { travelerNo: tr } });
    expect(traveler?.isReturnForRework).toBe(true);
    expect(traveler?.reworkOfPsNo).toBeNull();
    const moves = await prisma.stockMove.count({ where: { travelerNo: tr } });
    expect(moves).toBe(0);
  });

  it("destination='warehouse', potNo=GAYLORD, kèm qty -> vẫn chỉ gắn cờ, KHÔNG ghi RECEIVE/RETURN", async () => {
    const tr = travelerNo("WH-GAYLORD");
    const res = await captureConfirmPOST(
      makeCaptureRequest({
        destination: "warehouse",
        rows: [{ travelerNo: tr, partNo: PART_NO, potNo: "Gaylord ", qty: 4500 }],
        confirmedBy: "111",
        sourceStation: "OFFICE",
      }),
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.saved).toBe(1);
    expect(data.returnForRework).toEqual([{ travelerNo: tr, reworkOfPsNo: null, reworkOfLotNo: null }]);

    const traveler = await prisma.traveler.findUnique({ where: { travelerNo: tr } });
    expect(traveler?.isReturnForRework).toBe(true);
    const moves = await prisma.stockMove.count({ where: { travelerNo: tr } });
    expect(moves).toBe(0);
  });

  it("destination='warehouse', potNo bình thường (không GAYLORD) -> hành vi cũ, không đổi gì (no regression)", async () => {
    const tr = travelerNo("WH-NORMAL");
    const res = await captureConfirmPOST(
      makeCaptureRequest({
        destination: "warehouse",
        rows: [{ travelerNo: tr, partNo: PART_NO, potNo: "693", qty: 45000 }],
        confirmedBy: "111",
        sourceStation: "OFFICE",
      }),
    );
    expect(res.status).toBe(200);
    const traveler = await prisma.traveler.findUnique({ where: { travelerNo: tr } });
    expect(traveler?.isReturnForRework).toBe(false);
    const moves = await prisma.stockMove.findMany({ where: { travelerNo: tr, moveType: "RECEIVE" } });
    expect(moves).toHaveLength(1);
  });
});

describe("FID-ERP-007 — /api/factory/select/confirm, Traveler isReturnForRework=true", () => {
  it("lần lựa ĐẦU TIÊN sau khi trả về -> ghi thêm RETURN (qty=SELECT+SCRAP+REWORK), cùng transaction", async () => {
    const tr = travelerNo("SELECT-1ST");
    await prisma.traveler.create({ data: { travelerNo: tr, partNo: PART_NO, isReturnForRework: true } });

    const res = await selectConfirmPOST(
      makeSelectRequest({
        travelerNo: tr,
        machineCode: "MC112",
        operatorCode: "275",
        shift: "MRNNG",
        selectQty: 2000,
        defects: [{ reasonCode: "MIS_FORMED", qty: 1000 }],
      }),
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.returnMoveId).toBeDefined();

    const moves = await prisma.stockMove.findMany({ where: { travelerNo: tr }, orderBy: { id: "asc" } });
    expect(moves).toHaveLength(3);
    const ret = moves.find((m) => m.moveType === "RETURN")!;
    expect(ret.qty).toBe(3000);
    expect(ret.machineCode).toBe("MC112");
    const select = moves.find((m) => m.moveType === "SELECT")!;
    expect(select.qty).toBe(2000);
    const scrap = moves.find((m) => m.moveType === "SCRAP")!;
    expect(scrap.qty).toBe(1000);
  });

  it("lần lựa THỨ 2 của cùng đợt (đã có RETURN rồi) -> KHÔNG ghi thêm RETURN", async () => {
    const tr = travelerNo("SELECT-2ND");
    await prisma.traveler.create({ data: { travelerNo: tr, partNo: PART_NO, isReturnForRework: true } });
    await prisma.stockMove.create({
      data: { travelerNo: tr, moveType: "RETURN", qty: 1000, machineCode: "MC1", operatorCode: "1", shift: "MRNNG", sourceStation: "FACTORY" },
    });

    const res = await selectConfirmPOST(
      makeSelectRequest({
        travelerNo: tr,
        machineCode: "MC112",
        operatorCode: "275",
        shift: "MRNNG",
        selectQty: 500,
      }),
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.returnMoveId).toBeUndefined();

    const returnMoves = await prisma.stockMove.findMany({ where: { travelerNo: tr, moveType: "RETURN" } });
    expect(returnMoves).toHaveLength(1); // vẫn đúng 1 dòng (dòng cũ), không thêm
  });

  it("Traveler bình thường (isReturnForRework=false) -> KHÔNG có RETURN nào (no regression)", async () => {
    const tr = travelerNo("SELECT-NORMAL");
    await prisma.traveler.create({ data: { travelerNo: tr, partNo: PART_NO } });

    const res = await selectConfirmPOST(
      makeSelectRequest({
        travelerNo: tr,
        machineCode: "MC112",
        operatorCode: "275",
        shift: "MRNNG",
        selectQty: 1000,
      }),
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.returnMoveId).toBeUndefined();
    const moves = await prisma.stockMove.findMany({ where: { travelerNo: tr } });
    expect(moves).toHaveLength(1);
    expect(moves[0].moveType).toBe("SELECT");
  });
});
