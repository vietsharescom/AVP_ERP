// Test criteria cho FID-ERP-009 (Packing Slip) — xem
// docs/features/FID-ERP-009_20260919.md §7 TEST CRITERIA.
// Chạy trên database avp_erp_test riêng (xem tests/db/setup.ts).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";
import { GET as lookupGET } from "../../app/api/packing/lookup/route";
import { POST as confirmPOST } from "../../app/api/packing/confirm/route";
import { prisma } from "../../lib/prisma";

const RUN = Date.now().toString();
const PART_NO = `TESTPART-PACK-${RUN}`;

beforeAll(async () => {
  await prisma.partControl.create({ data: { partNo: PART_NO, qtyPerBox: 100, client: "Infasco" } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

function travelerNo(suffix: string) {
  return `TESTTR-PACK-${RUN}-${suffix}`;
}
function psNo(suffix: string) {
  return `TESTPS-${RUN}-${suffix}`;
}

function asNextRequest(req: Request): NextRequest {
  return req as unknown as NextRequest;
}

function lookupRequest(qs: string) {
  return asNextRequest(new Request(`http://localhost/api/packing/lookup${qs}`));
}

function confirmRequest(body: unknown) {
  return asNextRequest(
    new Request("http://localhost/api/packing/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

async function pack(tr: string, qty: number, skidNo = "77") {
  await prisma.stockMove.create({
    data: {
      travelerNo: tr,
      moveType: "PACK",
      qty,
      boxCount: 1,
      machineCode: "TBL",
      operatorCode: "290",
      shift: "MRNNG",
      sourceStation: "FACTORY",
    },
  });
  await prisma.traveler.update({ where: { travelerNo: tr }, data: { skidNo } });
}

async function goodCheck(tr: string) {
  await prisma.qualityCheck.create({ data: { travelerNo: tr, status: "GOOD", checkedBy: "290" } });
}

async function holdCheck(tr: string, concession = false) {
  await prisma.qualityCheck.create({
    data: {
      travelerNo: tr,
      status: "HOLD",
      note: "test hold",
      checkedBy: "290",
      ...(concession ? { concessionBy: "111", concessionReason: "test", concessionAt: new Date() } : {}),
    },
  });
}

describe("FID-ERP-009 — GET /api/packing/lookup", () => {
  it("Traveler chưa tồn tại -> 400", async () => {
    const res = await lookupGET(lookupRequest(`?travelerNo=${travelerNo("NOTFOUND")}`));
    expect(res.status).toBe(400);
  });

  it("chưa PACK lần nào -> availableQty=0, eligible=false", async () => {
    const tr = travelerNo("NOPACK");
    await prisma.traveler.create({ data: { travelerNo: tr, partNo: PART_NO } });
    const res = await lookupGET(lookupRequest(`?travelerNo=${tr}`));
    const data = await res.json();
    expect(data.availableQty).toBe(0);
    expect(data.eligible).toBe(false);
  });

  it("HOLD chưa Concession -> eligible=false", async () => {
    const tr = travelerNo("HOLD");
    await prisma.traveler.create({ data: { travelerNo: tr, partNo: PART_NO } });
    await pack(tr, 1000);
    await holdCheck(tr);
    const res = await lookupGET(lookupRequest(`?travelerNo=${tr}`));
    const data = await res.json();
    expect(data.eligible).toBe(false);
    expect(data.blockReasons.join(" ")).toMatch(/HOLD/);
  });

  it("HOLD CÓ Concession -> eligible=true", async () => {
    const tr = travelerNo("HOLDCONC");
    await prisma.traveler.create({ data: { travelerNo: tr, partNo: PART_NO } });
    await pack(tr, 1000);
    await holdCheck(tr, true);
    const res = await lookupGET(lookupRequest(`?travelerNo=${tr}`));
    const data = await res.json();
    expect(data.eligible).toBe(true);
  });

  it("Lot còn placeholder, chưa Concession -> eligible=false", async () => {
    const tr = travelerNo("LOTPH");
    await prisma.lot.create({ data: { lotNo: `LOT-${tr}-260919` } });
    await prisma.traveler.create({ data: { travelerNo: tr, partNo: PART_NO, lotNo: `LOT-${tr}-260919` } });
    await pack(tr, 1000);
    await goodCheck(tr);
    const res = await lookupGET(lookupRequest(`?travelerNo=${tr}`));
    const data = await res.json();
    expect(data.eligible).toBe(false);
  });

  it("Lot còn placeholder NHƯNG có lotConcessionBy -> eligible=true", async () => {
    const tr = travelerNo("LOTPHCONC");
    await prisma.lot.create({ data: { lotNo: `LOT-${tr}-260919` } });
    await prisma.traveler.create({
      data: { travelerNo: tr, partNo: PART_NO, lotNo: `LOT-${tr}-260919`, lotConcessionBy: "111", lotConcessionReason: "gấp", lotConcessionAt: new Date() },
    });
    await pack(tr, 1000);
    await goodCheck(tr);
    const res = await lookupGET(lookupRequest(`?travelerNo=${tr}`));
    const data = await res.json();
    expect(data.eligible).toBe(true);
  });

  it("isReturnForRework=true -> vẫn eligible=true (nếu qua điều kiện khác), có warnings", async () => {
    const tr = travelerNo("REWORK");
    await prisma.traveler.create({ data: { travelerNo: tr, partNo: PART_NO, isReturnForRework: true } });
    await pack(tr, 500);
    await goodCheck(tr);
    const res = await lookupGET(lookupRequest(`?travelerNo=${tr}`));
    const data = await res.json();
    expect(data.eligible).toBe(true);
    expect(data.warnings.length).toBeGreaterThan(0);
  });

  it("PACK lúc GOOD, SAU ĐÓ có quality_checks MỚI HOLD chưa Concession -> eligible=false dù availableQty>0", async () => {
    const tr = travelerNo("PACKGOOD-THEN-HOLD");
    await prisma.traveler.create({ data: { travelerNo: tr, partNo: PART_NO } });
    await goodCheck(tr);
    await pack(tr, 6000);
    await new Promise((r) => setTimeout(r, 5));
    await holdCheck(tr);
    const res = await lookupGET(lookupRequest(`?travelerNo=${tr}`));
    const data = await res.json();
    expect(data.availableQty).toBe(6000);
    expect(data.eligible).toBe(false);
  });

  it("KHÔNG ghi bất kỳ dòng DB nào", async () => {
    const tr = travelerNo("READONLY");
    await prisma.traveler.create({ data: { travelerNo: tr, partNo: PART_NO } });
    await pack(tr, 1000);
    await goodCheck(tr);
    const before = await prisma.stockMove.count();
    await lookupGET(lookupRequest(`?travelerNo=${tr}`));
    const after = await prisma.stockMove.count();
    expect(after).toBe(before);
  });
});

describe("FID-ERP-009 — POST /api/packing/confirm", () => {
  it("1 dòng không đạt eligible -> 400 TOÀN BỘ, không ghi PS/line/SHIP nào", async () => {
    const trGood = travelerNo("MIX-GOOD");
    const trBad = travelerNo("MIX-BAD");
    await prisma.traveler.create({ data: { travelerNo: trGood, partNo: PART_NO } });
    await pack(trGood, 1000);
    await goodCheck(trGood);
    await prisma.traveler.create({ data: { travelerNo: trBad, partNo: PART_NO } }); // chưa PACK

    const res = await confirmPOST(
      confirmRequest({
        psNo: psNo("MIX"),
        lines: [
          { travelerNo: trGood, qty: 500 },
          { travelerNo: trBad, qty: 100 },
        ],
        confirmedBy: "111",
      }),
    );
    expect(res.status).toBe(400);
    const ps = await prisma.packingSlip.count({ where: { psNo: psNo("MIX") } });
    expect(ps).toBe(0);
    const ship = await prisma.stockMove.count({ where: { travelerNo: trGood, moveType: "SHIP" } });
    expect(ship).toBe(0);
  });

  it("qty > availableQty -> 400, không ghi gì", async () => {
    const tr = travelerNo("OVERQTY");
    await prisma.traveler.create({ data: { travelerNo: tr, partNo: PART_NO } });
    await pack(tr, 100);
    await goodCheck(tr);
    const res = await confirmPOST(
      confirmRequest({ psNo: psNo("OVERQTY"), lines: [{ travelerNo: tr, qty: 200 }], confirmedBy: "111" }),
    );
    expect(res.status).toBe(400);
  });

  it("psNo đã tồn tại -> 400, không ghi gì", async () => {
    const tr = travelerNo("DUPPS");
    await prisma.traveler.create({ data: { travelerNo: tr, partNo: PART_NO } });
    await pack(tr, 1000);
    await goodCheck(tr);
    const ps = psNo("DUP");
    await confirmPOST(confirmRequest({ psNo: ps, lines: [{ travelerNo: tr, qty: 500 }], confirmedBy: "111" }));

    const tr2 = travelerNo("DUPPS2");
    await prisma.traveler.create({ data: { travelerNo: tr2, partNo: PART_NO } });
    await pack(tr2, 1000);
    await goodCheck(tr2);
    const res2 = await confirmPOST(confirmRequest({ psNo: ps, lines: [{ travelerNo: tr2, qty: 500 }], confirmedBy: "111" }));
    expect(res2.status).toBe(400);
  });

  it("hợp lệ, 2 dòng -> ghi đúng 1 packing_slips + 2 packing_slip_lines (đủ snapshot) + 2 SHIP, trong 1 transaction", async () => {
    const tr1 = travelerNo("OK1");
    const tr2 = travelerNo("OK2");
    const lotNo1 = `LOT-OK-${RUN}`;
    await prisma.lot.create({ data: { lotNo: lotNo1 } });
    await prisma.traveler.create({ data: { travelerNo: tr1, partNo: PART_NO, lotNo: lotNo1, potNo: "693" } });
    await pack(tr1, 4800, "77");
    await goodCheck(tr1);
    await prisma.traveler.create({ data: { travelerNo: tr2, partNo: PART_NO } });
    await pack(tr2, 300, "88");
    await goodCheck(tr2);

    const ps = psNo("OK");
    const res = await confirmPOST(
      confirmRequest({
        psNo: ps,
        totalPallets: 34,
        totalEmpty: 36,
        lines: [
          { travelerNo: tr1, qty: 4500 },
          { travelerNo: tr2, qty: 300 },
        ],
        confirmedBy: "111",
      }),
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.linesSaved).toBe(2);
    expect(data.shipMoveIds).toHaveLength(2);

    const slip = await prisma.packingSlip.findUnique({ where: { psNo: ps }, include: { lines: true } });
    expect(slip?.totalPallets).toBe(34);
    expect(slip?.totalEmpty).toBe(36);
    expect(slip?.lines).toHaveLength(2);
    const line1 = slip?.lines.find((l) => l.travelerNo === tr1);
    expect(line1?.qty).toBe(4500);
    expect(line1?.lotNoSnap).toBe(lotNo1);
    expect(line1?.potNoSnap).toBe("693");
    expect(line1?.skidNoSnap).toBe("77");

    const shipMoves = await prisma.stockMove.findMany({ where: { travelerNo: tr1, moveType: "SHIP" } });
    expect(shipMoves).toHaveLength(1);
    expect(shipMoves[0].qty).toBe(4500);
    expect(shipMoves[0].sourceStation).toBe("OFFICE");
  });

  it("không gửi totalPallets/totalEmpty -> vẫn tạo PS được, không chặn", async () => {
    const tr = travelerNo("NOTOTALS");
    await prisma.traveler.create({ data: { travelerNo: tr, partNo: PART_NO } });
    await pack(tr, 500);
    await goodCheck(tr);
    const res = await confirmPOST(
      confirmRequest({ psNo: psNo("NOTOTALS"), lines: [{ travelerNo: tr, qty: 500 }], confirmedBy: "111" }),
    );
    expect(res.status).toBe(200);
  });

  it("sau confirm, availableQty giảm đúng bằng qty vừa xuất", async () => {
    const tr = travelerNo("AFTERSHIP");
    await prisma.traveler.create({ data: { travelerNo: tr, partNo: PART_NO } });
    await pack(tr, 1000);
    await goodCheck(tr);
    await confirmPOST(confirmRequest({ psNo: psNo("AFTERSHIP"), lines: [{ travelerNo: tr, qty: 400 }], confirmedBy: "111" }));

    const res = await lookupGET(lookupRequest(`?travelerNo=${tr}`));
    const data = await res.json();
    expect(data.availableQty).toBe(600);
    expect(data.eligible).toBe(true);
  });
});
