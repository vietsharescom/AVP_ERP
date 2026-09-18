// Test criteria cho FID-ERP-008 (Báo cáo đối chiếu PO) — xem
// docs/features/FID-ERP-008_20260918.md §7 TEST CRITERIA.
// Chạy trên database avp_erp_test riêng (xem tests/db/setup.ts).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";
import { GET as poProgressGET } from "../../app/api/reports/po-progress/route";
import { POST as trackingPOST } from "../../app/api/reports/po-progress/tracking/route";
import { prisma } from "../../lib/prisma";

const RUN = Date.now().toString();
const PART_NO = `TESTPART-PO-${RUN}`;

beforeAll(async () => {
  await prisma.partControl.create({ data: { partNo: PART_NO, qtyPerBox: 100, client: "Infasco" } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

function poNo(suffix: string) {
  return `TESTPO-${RUN}-${suffix}`;
}
function travelerNo(suffix: string) {
  return `TESTTR-PO-${RUN}-${suffix}`;
}

function asNextRequest(req: Request): NextRequest {
  return req as unknown as NextRequest;
}

function getRequest(qs: string) {
  return asNextRequest(new Request(`http://localhost/api/reports/po-progress${qs}`));
}

function trackingRequest(body: unknown) {
  return asNextRequest(
    new Request("http://localhost/api/reports/po-progress/tracking", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("FID-ERP-008 — GET /api/reports/po-progress", () => {
  it("PO không tồn tại (không traveler, không tracking) -> 404", async () => {
    const res = await poProgressGET(getRequest(`?po=${poNo("NOTFOUND")}`));
    expect(res.status).toBe(404);
  });

  it("đếm đúng totalTravelers/completed/outstanding, reworkTravelers lọc theo isReturnForRework", async () => {
    const po = poNo("BASIC");
    const trShipped = travelerNo("SHIPPED");
    const trOpen = travelerNo("OPEN");
    const trRework = travelerNo("REWORK");

    await prisma.traveler.create({ data: { travelerNo: trShipped, partNo: PART_NO, poNo: po } });
    await prisma.stockMove.create({ data: { travelerNo: trShipped, moveType: "SHIP", qty: 10, sourceStation: "OFFICE" } });
    await prisma.traveler.create({ data: { travelerNo: trOpen, partNo: PART_NO, poNo: po } });
    // rework: isReturnForRework=true nhưng reworkOfPsNo/reworkOfLotNo ĐỀU
    // null (đúng bài học AVP_AI — vẫn phải xuất hiện trong reworkTravelers)
    await prisma.traveler.create({
      data: { travelerNo: trRework, partNo: PART_NO, poNo: po, isReturnForRework: true },
    });

    const res = await poProgressGET(getRequest(`?po=${po}`));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.totalTravelers).toBe(3);
    expect(data.completed).toBe(1);
    expect(data.outstanding).toBe(2);
    expect(data.reworkTravelers).toEqual([{ travelerNo: trRework, reworkOfPsNo: null, reworkOfLotNo: null }]);
    expect(data.startDate).toBeNull();
    expect(data.endDate).toBeNull();
    expect(data.isOverdue).toBe(false);
    expect(typeof data.daysOpen).toBe("number");
  });

  it("Traveler isReturnForRework=false -> KHÔNG xuất hiện trong reworkTravelers", async () => {
    const po = poNo("NOREWORK");
    const tr = travelerNo("NORMAL");
    await prisma.traveler.create({ data: { travelerNo: tr, partNo: PART_NO, poNo: po } });
    const res = await poProgressGET(getRequest(`?po=${po}`));
    const data = await res.json();
    expect(data.reworkTravelers).toEqual([]);
  });

  it("không có ?po -> chỉ trả PO có outstanding>0", async () => {
    const poDone = poNo("ALLDONE");
    const trDone = travelerNo("ALLDONE");
    await prisma.traveler.create({ data: { travelerNo: trDone, partNo: PART_NO, poNo: poDone } });
    await prisma.stockMove.create({ data: { travelerNo: trDone, moveType: "SHIP", qty: 10, sourceStation: "OFFICE" } });

    const poOpenName = poNo("STILLOPEN");
    const trOpen = travelerNo("STILLOPEN");
    await prisma.traveler.create({ data: { travelerNo: trOpen, partNo: PART_NO, poNo: poOpenName } });

    const res = await poProgressGET(getRequest(""));
    const data = await res.json();
    expect(res.status).toBe(200);
    const poNos = data.reports.map((r: { poNo: string }) => r.poNo);
    expect(poNos).toContain(poOpenName);
    expect(poNos).not.toContain(poDone);
  });
});

describe("FID-ERP-008 — POST /api/reports/po-progress/tracking", () => {
  it("thiếu poNo -> 400", async () => {
    const res = await trackingPOST(trackingRequest({ startDate: "2026-09-11" }));
    expect(res.status).toBe(400);
  });

  it("endDate < startDate -> 400", async () => {
    const res = await trackingPOST(
      trackingRequest({ poNo: poNo("BADRANGE"), startDate: "2026-09-18", endDate: "2026-09-11" }),
    );
    expect(res.status).toBe(400);
  });

  it("set ngày rồi GET lại -> startDate/endDate khớp, daysOpen tính từ startDate, isOverdue đúng", async () => {
    const po = poNo("TRACKED");
    const tr = travelerNo("TRACKED");
    await prisma.traveler.create({ data: { travelerNo: tr, partNo: PART_NO, poNo: po } });

    const setRes = await trackingPOST(
      trackingRequest({ poNo: po, startDate: "2026-09-01", endDate: "2026-09-05", setBy: "111" }),
    );
    expect(setRes.status).toBe(200);

    const res = await poProgressGET(getRequest(`?po=${po}`));
    const data = await res.json();
    expect(new Date(data.startDate).toISOString().slice(0, 10)).toBe("2026-09-01");
    expect(new Date(data.endDate).toISOString().slice(0, 10)).toBe("2026-09-05");
    expect(data.isOverdue).toBe(true); // endDate đã qua từ lâu, outstanding>0
  });

  it("outstanding=0 dù đã qua endDate -> isOverdue=false", async () => {
    const po = poNo("OVERDUE-BUT-DONE");
    const tr = travelerNo("OVERDUE-DONE");
    await prisma.traveler.create({ data: { travelerNo: tr, partNo: PART_NO, poNo: po } });
    await prisma.stockMove.create({ data: { travelerNo: tr, moveType: "SHIP", qty: 10, sourceStation: "OFFICE" } });
    await trackingPOST(trackingRequest({ poNo: po, startDate: "2026-09-01", endDate: "2026-09-05" }));

    const res = await poProgressGET(getRequest(`?po=${po}`));
    const data = await res.json();
    expect(data.outstanding).toBe(0);
    expect(data.isOverdue).toBe(false);
  });

  it("gọi lại lần 2 cùng poNo -> ghi đè (upsert), không tạo dòng thứ 2", async () => {
    const po = poNo("UPSERT");
    await trackingPOST(trackingRequest({ poNo: po, startDate: "2026-09-01" }));
    await trackingPOST(trackingRequest({ poNo: po, startDate: "2026-09-05" }));
    const rows = await prisma.poTracking.findMany({ where: { poNo: po } });
    expect(rows).toHaveLength(1);
    expect(rows[0].startDate?.toISOString().slice(0, 10)).toBe("2026-09-05");
  });
});
