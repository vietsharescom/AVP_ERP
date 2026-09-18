// Test criteria cho FID-ERP-006 (Lot placeholder + parse email) — xem
// docs/features/FID-ERP-006_20260918.md §7 TEST CRITERIA.
// Chạy trên database avp_erp_test riêng (xem tests/db/setup.ts).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";
import { isLotPlaceholder, parseLotEmail } from "../../lib/lot";
import { POST as parseEmailPOST } from "../../app/api/lot/parse-email/route";
import { POST as lotUpdatePOST } from "../../app/api/lot/update/route";
import { POST as concessionPOST } from "../../app/api/lot/concession/route";
import { POST as factorySelectPOST } from "../../app/api/factory/select/confirm/route";
import { prisma } from "../../lib/prisma";

const RUN = Date.now().toString();
const PART_NO = `TESTPART-LOT-${RUN}`;

beforeAll(async () => {
  await prisma.partControl.create({ data: { partNo: PART_NO, qtyPerBox: 100, client: "Infasco" } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

function travelerNo(suffix: string) {
  return `TESTTR-LOT-${RUN}-${suffix}`;
}

async function makeTraveler(suffix: string) {
  const tr = travelerNo(suffix);
  await prisma.traveler.create({ data: { travelerNo: tr, partNo: PART_NO } });
  return tr;
}

function makeRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe("FID-ERP-006 — isLotPlaceholder()", () => {
  it("nhận diện đúng mẫu placeholder", () => {
    expect(isLotPlaceholder("LOT-718039-260918")).toBe(true);
    expect(isLotPlaceholder("6-253-14-B")).toBe(false);
    expect(isLotPlaceholder(null)).toBe(false);
    expect(isLotPlaceholder(undefined)).toBe(false);
  });
});

describe("FID-ERP-006 — parseLotEmail() regex bắt cặp, không AI", () => {
  it("tách đúng nhiều cặp Traveler#+Lot# hợp lệ", () => {
    const text = "Traveler 717365: Lot 6-253-14-B\nTraveler 717366: Lot 6-253-14-C";
    const { matches, unmatched } = parseLotEmail(text);
    expect(matches).toEqual([
      { travelerNo: "717365", lotNo: "6-253-14-B" },
      { travelerNo: "717366", lotNo: "6-253-14-C" },
    ]);
    expect(unmatched).toEqual([]);
  });

  it("bỏ qua im lặng dòng không có mẫu Lot# nào (banner/chữ ký)", () => {
    const text = "AVP Fasteners Inc.\nTel: 416-555-1234\nTraveler 717365: Lot 6-253-14-B";
    const { matches, unmatched } = parseLotEmail(text);
    expect(matches).toEqual([{ travelerNo: "717365", lotNo: "6-253-14-B" }]);
    expect(unmatched).toEqual([]);
  });

  it("dòng có Lot# nhưng không tìm được Traveler# -> vào unmatched", () => {
    const text = "Lot mới: 6-253-14-B (chưa rõ traveler nào)";
    const { matches, unmatched } = parseLotEmail(text);
    expect(matches).toEqual([]);
    expect(unmatched).toHaveLength(1);
  });
});

describe("FID-ERP-006 — POST /api/lot/parse-email", () => {
  it("emailText rỗng -> 400", async () => {
    const res = await parseEmailPOST(makeRequest("http://localhost/api/lot/parse-email", { emailText: "" }));
    expect(res.status).toBe(400);
  });

  it("tách đúng qua route", async () => {
    const res = await parseEmailPOST(
      makeRequest("http://localhost/api/lot/parse-email", { emailText: "TR 717365 - Lot 6-253-14-B" }),
    );
    const data = await res.json();
    expect(data.matches).toEqual([{ travelerNo: "717365", lotNo: "6-253-14-B" }]);
  });
});

describe("FID-ERP-006 — POST /api/lot/update", () => {
  it("travelerNo không tồn tại -> 400", async () => {
    const tr = travelerNo("NOTFOUND");
    const res = await lotUpdatePOST(
      makeRequest("http://localhost/api/lot/update", { travelerNo: tr, newLotNo: "6-1-1-A", updatedBy: "111" }),
    );
    expect(res.status).toBe(400);
  });

  it("newLotNo giống lotNo hiện tại -> 400", async () => {
    const tr = await makeTraveler("SAME");
    await prisma.lot.create({ data: { lotNo: `SAMELOT-${RUN}` } });
    await prisma.traveler.update({ where: { travelerNo: tr }, data: { lotNo: `SAMELOT-${RUN}` } });
    const res = await lotUpdatePOST(
      makeRequest("http://localhost/api/lot/update", {
        travelerNo: tr,
        newLotNo: `SAMELOT-${RUN}`,
        updatedBy: "111",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("ghi đúng 1 dòng lot_updates (giữ oldLotNo) + đổi travelers.lotNo, hoạt động cả khi đã SHIP", async () => {
    const tr = await makeTraveler("UPDATE");
    await prisma.lot.create({ data: { lotNo: `OLDLOT-${RUN}` } });
    await prisma.traveler.update({ where: { travelerNo: tr }, data: { lotNo: `OLDLOT-${RUN}` } });
    await prisma.stockMove.create({ data: { travelerNo: tr, moveType: "SHIP", qty: 10 } });

    const res = await lotUpdatePOST(
      makeRequest("http://localhost/api/lot/update", {
        travelerNo: tr,
        newLotNo: `NEWLOT-${RUN}`,
        updatedBy: "111",
      }),
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.oldLotNo).toBe(`OLDLOT-${RUN}`);
    expect(data.newLotNo).toBe(`NEWLOT-${RUN}`);

    const traveler = await prisma.traveler.findUnique({ where: { travelerNo: tr } });
    expect(traveler?.lotNo).toBe(`NEWLOT-${RUN}`);

    const lotUpdates = await prisma.lotUpdate.findMany({ where: { travelerNo: tr } });
    expect(lotUpdates).toHaveLength(1);
    expect(lotUpdates[0].oldLotNo).toBe(`OLDLOT-${RUN}`);
    expect(lotUpdates[0].newLotNo).toBe(`NEWLOT-${RUN}`);
  });
});

describe("FID-ERP-006 — POST /api/lot/concession", () => {
  it("thiếu by/reason -> 400", async () => {
    const tr = await makeTraveler("CONCMISSING");
    const res = await concessionPOST(makeRequest("http://localhost/api/lot/concession", { travelerNo: tr }));
    expect(res.status).toBe(400);
  });

  it("ghi đúng 3 cột lotConcession*", async () => {
    const tr = await makeTraveler("CONCOK");
    const res = await concessionPOST(
      makeRequest("http://localhost/api/lot/concession", {
        travelerNo: tr,
        by: "111",
        reason: "Khách cần gấp",
      }),
    );
    expect(res.status).toBe(200);
    const traveler = await prisma.traveler.findUnique({ where: { travelerNo: tr } });
    expect(traveler?.lotConcessionBy).toBe("111");
    expect(traveler?.lotConcessionReason).toBe("Khách cần gấp");
    expect(traveler?.lotConcessionAt).not.toBeNull();
  });
});

describe("FID-ERP-006 — tự sinh placeholder trong FID-ERP-003 confirm", () => {
  function makeFactoryRequest(body: unknown) {
    return new Request("http://localhost/api/factory/select/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }) as unknown as NextRequest;
  }

  it("Traveler chưa có lotNo -> tự sinh LOT-{travelerNo}-{YYMMDD} + ghi 1 dòng lot_updates (oldLotNo=null)", async () => {
    const tr = await makeTraveler("PLACEHOLDER");
    await factorySelectPOST(
      makeFactoryRequest({ travelerNo: tr, machineCode: "MC1", operatorCode: "111", shift: "MRNNG", selectQty: 100 }),
    );

    const traveler = await prisma.traveler.findUnique({ where: { travelerNo: tr } });
    expect(isLotPlaceholder(traveler?.lotNo)).toBe(true);
    expect(traveler?.lotNo).toContain(tr);

    const lotUpdates = await prisma.lotUpdate.findMany({ where: { travelerNo: tr } });
    expect(lotUpdates).toHaveLength(1);
    expect(lotUpdates[0].oldLotNo).toBeNull();
    expect(lotUpdates[0].newLotNo).toBe(traveler?.lotNo);
    expect(lotUpdates[0].updatedBy).toBe("SYSTEM");
  });

  it("Traveler ĐÃ có lotNo -> không đổi gì, không ghi lot_updates mới", async () => {
    const tr = await makeTraveler("HASLOT");
    await prisma.lot.create({ data: { lotNo: `EXISTING-${RUN}` } });
    await prisma.traveler.update({ where: { travelerNo: tr }, data: { lotNo: `EXISTING-${RUN}` } });

    await factorySelectPOST(
      makeFactoryRequest({ travelerNo: tr, machineCode: "MC1", operatorCode: "111", shift: "MRNNG", selectQty: 100 }),
    );

    const traveler = await prisma.traveler.findUnique({ where: { travelerNo: tr } });
    expect(traveler?.lotNo).toBe(`EXISTING-${RUN}`);
    const lotUpdates = await prisma.lotUpdate.count({ where: { travelerNo: tr } });
    expect(lotUpdates).toBe(0);
  });
});

describe("FID-ERP-006 — lot_updates bất biến ở tầng database", () => {
  it("chặn UPDATE/DELETE trực tiếp 1 dòng đã ghi", async () => {
    const tr = await makeTraveler("IMMUT");
    const lotUpdate = await prisma.lotUpdate.create({
      data: { travelerNo: tr, oldLotNo: null, newLotNo: `X-${RUN}`, updatedBy: "111" },
    });
    await expect(
      prisma.lotUpdate.update({ where: { id: lotUpdate.id }, data: { newLotNo: "HACKED" } }),
    ).rejects.toThrow(/append-only/);
    await expect(prisma.lotUpdate.delete({ where: { id: lotUpdate.id } })).rejects.toThrow(/append-only/);
  });
});
