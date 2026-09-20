// Test criteria cho FID-ERP-004 (GlobalSearchBar tương đương) — xem
// docs/features/FID-ERP-004_20260918.md §7 TEST CRITERIA.
// Chạy trên database avp_erp_test riêng (xem tests/db/setup.ts).
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { GET as searchGET } from "../../app/api/search/route";
import { prisma } from "../../lib/prisma";

const RUN = Date.now().toString();
const PART_NO = `TESTPART-SRCH-${RUN}`;
const TRAVELER_NO = `TESTTR-SRCH-${RUN}`;
const TRAVELER_NO_2 = `TESTTR2-SRCH-${RUN}`;
const PO_NO = `PO-SRCH-${RUN}`;
const PS_NO = `PS-SRCH-${RUN}`;

beforeAll(async () => {
  await prisma.partControl.create({ data: { partNo: PART_NO, qtyPerBox: 100, client: "Infasco" } });
  await prisma.traveler.create({ data: { travelerNo: TRAVELER_NO, partNo: PART_NO, poNo: PO_NO } });
  await prisma.traveler.create({ data: { travelerNo: TRAVELER_NO_2, partNo: PART_NO, poNo: PO_NO } });
  await prisma.stockMove.create({ data: { travelerNo: TRAVELER_NO, moveType: "RECEIVE", qty: 100 } });
  await prisma.stockMove.create({ data: { travelerNo: TRAVELER_NO, moveType: "SHIP", qty: 50 } });
  const ps = await prisma.packingSlip.create({ data: { psNo: PS_NO, totalPallets: 2, totalEmpty: 1 } });
  await prisma.packingSlipLine.create({
    data: { packingSlipId: ps.id, travelerNo: TRAVELER_NO, qty: 10, partNoSnap: PART_NO },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

function asNextRequest(url: string): NextRequest {
  return new Request(url) as unknown as NextRequest;
}

describe("FID-ERP-004 — GET /api/search", () => {
  it("q rỗng -> 3 mảng rỗng, không chạm DB", async () => {
    const spy = vi.spyOn(prisma.traveler, "findMany");
    const res = await searchGET(asNextRequest("http://localhost/api/search?q=  "));
    const data = await res.json();
    expect(data).toEqual({ ok: true, travelers: [], packingSlips: [], partControls: [] });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("khớp đúng travelerNo -> trả về Traveler đó, shipped=true, lastMoveType=SHIP", async () => {
    const res = await searchGET(asNextRequest(`http://localhost/api/search?q=${TRAVELER_NO}`));
    const data = await res.json();
    const found = data.travelers.find((t: { travelerNo: string }) => t.travelerNo === TRAVELER_NO);
    expect(found).toBeDefined();
    expect(found.shipped).toBe(true);
    expect(found.lastMoveType).toBe("SHIP");
  });

  it("Traveler chưa có SHIP -> shipped=false", async () => {
    const res = await searchGET(asNextRequest(`http://localhost/api/search?q=${TRAVELER_NO_2}`));
    const data = await res.json();
    const found = data.travelers.find((t: { travelerNo: string }) => t.travelerNo === TRAVELER_NO_2);
    expect(found.shipped).toBe(false);
    expect(found.lastMoveType).toBeNull();
  });

  it("khớp partNo -> trả về NHIỀU Traveler cùng Part# + partControls", async () => {
    const res = await searchGET(asNextRequest(`http://localhost/api/search?q=${PART_NO}`));
    const data = await res.json();
    const travelerNos = data.travelers.map((t: { travelerNo: string }) => t.travelerNo);
    expect(travelerNos).toEqual(expect.arrayContaining([TRAVELER_NO, TRAVELER_NO_2]));
    expect(data.partControls.some((pc: { partNo: string }) => pc.partNo === PART_NO)).toBe(true);
  });

  it("khớp poNo -> trả về đúng Traveler", async () => {
    const res = await searchGET(asNextRequest(`http://localhost/api/search?q=${PO_NO}`));
    const data = await res.json();
    const travelerNos = data.travelers.map((t: { travelerNo: string }) => t.travelerNo);
    expect(travelerNos).toEqual(expect.arrayContaining([TRAVELER_NO, TRAVELER_NO_2]));
  });

  it("khớp psNo -> trả về đúng Packing Slip", async () => {
    const res = await searchGET(asNextRequest(`http://localhost/api/search?q=${PS_NO}`));
    const data = await res.json();
    const found = data.packingSlips.find((ps: { psNo: string }) => ps.psNo === PS_NO);
    expect(found).toBeDefined();
    expect(found.lineCount).toBe(1);
  });

  it("không tìm thấy gì -> 3 mảng rỗng, không lỗi", async () => {
    const res = await searchGET(asNextRequest(`http://localhost/api/search?q=KHONGTONTAI-${RUN}-XYZ`));
    const data = await res.json();
    expect(data.travelers).toEqual([]);
    expect(data.packingSlips).toEqual([]);
    expect(data.partControls).toEqual([]);
  });

  // Phát hiện 2026-09-19: từ FID-ERP-002 v1.1, part_control/travelers
  // lưu Part# theo MÃ GỐC (đã cắt hậu tố) — gõ đúng mã IN TRÊN NHÃN thật
  // (có hậu tố) trước đó không ra kết quả nào vì `contains` không khớp
  // ngược (chuỗi dài hơn không "nằm trong" chuỗi ngắn hơn đã lưu).
  it("gõ Part# CÓ hậu tố (như in trên nhãn) vẫn tìm ra Traveler/partControl lưu theo mã gốc", async () => {
    const basePartNo = `TESTBASE-SRCH-${RUN}`;
    const suffixedQuery = `${basePartNo}-A`; // "-A" là hậu tố biết trước (lib/part.ts)
    const tr = `TESTTR-SRCH-SUFFIX-${RUN}`;
    await prisma.partControl.create({ data: { partNo: basePartNo, qtyPerBox: 100, client: "Infasco" } });
    await prisma.traveler.create({ data: { travelerNo: tr, partNo: basePartNo, poNo: PO_NO } });

    const res = await searchGET(asNextRequest(`http://localhost/api/search?q=${suffixedQuery}`));
    const data = await res.json();
    expect(data.travelers.some((t: { travelerNo: string }) => t.travelerNo === tr)).toBe(true);
    expect(data.partControls.some((pc: { partNo: string }) => pc.partNo === basePartNo)).toBe(true);
  });
});
