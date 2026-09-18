// Test criteria cho FID-ERP-005 (Status Good/Hold, Wrapping) — xem
// docs/features/FID-ERP-005_20260918.md §7 TEST CRITERIA.
// Chạy trên database avp_erp_test riêng (xem tests/db/setup.ts).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";
import { POST as checkPOST } from "../../app/api/quality/check/route";
import { prisma } from "../../lib/prisma";

const RUN = Date.now().toString();
const PART_NO = `TESTPART-QC-${RUN}`;

beforeAll(async () => {
  await prisma.partControl.create({ data: { partNo: PART_NO, qtyPerBox: 100, client: "Infasco" } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

function travelerNo(suffix: string) {
  return `TESTTR-QC-${RUN}-${suffix}`;
}

async function makeTraveler(suffix: string) {
  const tr = travelerNo(suffix);
  await prisma.traveler.create({ data: { travelerNo: tr, partNo: PART_NO } });
  return tr;
}

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/quality/check", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe("FID-ERP-005 — validate trước khi ghi DB", () => {
  it("travelerNo không tồn tại -> 400, không ghi gì", async () => {
    const tr = travelerNo("NOTFOUND");
    const res = await checkPOST(makeRequest({ travelerNo: tr, status: "GOOD", checkedBy: "290" }));
    expect(res.status).toBe(400);
    const count = await prisma.qualityCheck.count({ where: { travelerNo: tr } });
    expect(count).toBe(0);
  });

  it("status=HOLD thiếu note -> 400", async () => {
    const tr = await makeTraveler("NONOTE");
    const res = await checkPOST(makeRequest({ travelerNo: tr, status: "HOLD", checkedBy: "290" }));
    expect(res.status).toBe(400);
  });

  it("concession kèm status=GOOD -> 400", async () => {
    const tr = await makeTraveler("CONCGOOD");
    const res = await checkPOST(
      makeRequest({
        travelerNo: tr,
        status: "GOOD",
        checkedBy: "290",
        concession: { by: "111", reason: "x" },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("concession thiếu by/reason -> 400", async () => {
    const tr = await makeTraveler("CONCMISSING");
    const res = await checkPOST(
      makeRequest({ travelerNo: tr, status: "HOLD", note: "thiếu label", checkedBy: "290", concession: {} }),
    );
    expect(res.status).toBe(400);
  });

  it("reject qty<=0 hoặc reasonCode không tồn tại -> 400 trước khi chạm DB", async () => {
    const tr = await makeTraveler("BADREJECT");
    const res = await checkPOST(
      makeRequest({
        travelerNo: tr,
        status: "GOOD",
        checkedBy: "290",
        reject: [{ reasonCode: "KHONG_TON_TAI", qty: 5 }],
      }),
    );
    expect(res.status).toBe(400);
    const count = await prisma.stockMove.count({ where: { travelerNo: tr } });
    expect(count).toBe(0);
  });
});

describe("FID-ERP-005 — ghi đúng quality_checks + SCRAP", () => {
  it("status=GOOD, không reject -> 1 quality_checks, concession null, không SCRAP", async () => {
    const tr = await makeTraveler("CLEAN");
    const res = await checkPOST(makeRequest({ travelerNo: tr, status: "GOOD", checkedBy: "290" }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.scrapMoveIds).toEqual([]);
    expect(data.totalRejectQty).toBe(0);

    const qc = await prisma.qualityCheck.findUnique({ where: { id: data.qualityCheckId } });
    expect(qc?.status).toBe("GOOD");
    expect(qc?.concessionBy).toBeNull();

    const moves = await prisma.stockMove.count({ where: { travelerNo: tr } });
    expect(moves).toBe(0);
  });

  it("status=HOLD + 1 reject -> 1 quality_checks(HOLD) + 1 SCRAP cùng transaction, operatorCode=checkedBy", async () => {
    const tr = await makeTraveler("HOLDREJECT");
    const res = await checkPOST(
      makeRequest({
        travelerNo: tr,
        status: "HOLD",
        note: "Chưa dán label",
        checkedBy: "290",
        reject: [{ reasonCode: "MIXED", qty: 5 }],
      }),
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.totalRejectQty).toBe(5);
    expect(data.scrapMoveIds).toHaveLength(1);

    const scrap = await prisma.stockMove.findFirst({ where: { travelerNo: tr, moveType: "SCRAP" } });
    expect(scrap?.qty).toBe(5);
    expect(scrap?.reasonCode).toBe("MIXED");
    expect(scrap?.operatorCode).toBe("290");
    expect(scrap?.sourceStation).toBe("FACTORY");
  });

  it("status=HOLD + concession hợp lệ -> quality_checks có đủ concessionBy/Reason/At", async () => {
    const tr = await makeTraveler("CONCOK");
    const res = await checkPOST(
      makeRequest({
        travelerNo: tr,
        status: "HOLD",
        note: "Chưa dán label",
        checkedBy: "290",
        concession: { by: "111", reason: "Khách đồng ý nhận dù thiếu label" },
      }),
    );
    const data = await res.json();
    const qc = await prisma.qualityCheck.findUnique({ where: { id: data.qualityCheckId } });
    expect(qc?.concessionBy).toBe("111");
    expect(qc?.concessionReason).toBe("Khách đồng ý nhận dù thiếu label");
    expect(qc?.concessionAt).not.toBeNull();
  });
});

describe("FID-ERP-005 — traveler_last_quality_check VIEW", () => {
  it("trả đúng lần kiểm tra gần nhất khi có nhiều lần check", async () => {
    const tr = await makeTraveler("VIEW");
    await checkPOST(makeRequest({ travelerNo: tr, status: "HOLD", note: "lần 1", checkedBy: "290" }));
    await new Promise((r) => setTimeout(r, 5));
    await checkPOST(makeRequest({ travelerNo: tr, status: "GOOD", checkedBy: "290" }));

    const rows = await prisma.$queryRaw<{ traveler_no: string; last_status: string }[]>`
      SELECT traveler_no, last_status FROM traveler_last_quality_check WHERE traveler_no = ${tr}
    `;
    expect(rows).toHaveLength(1);
    expect(rows[0].last_status).toBe("GOOD");
  });
});

describe("FID-ERP-005 — quality_checks bất biến ở tầng database", () => {
  it("chặn UPDATE trực tiếp 1 dòng đã ghi", async () => {
    const tr = await makeTraveler("IMMUT-UPD");
    const res = await checkPOST(makeRequest({ travelerNo: tr, status: "GOOD", checkedBy: "290" }));
    const data = await res.json();
    await expect(
      prisma.qualityCheck.update({ where: { id: data.qualityCheckId }, data: { status: "HOLD" } }),
    ).rejects.toThrow(/append-only/);
  });

  it("chặn DELETE 1 dòng đã ghi", async () => {
    const tr = await makeTraveler("IMMUT-DEL");
    const res = await checkPOST(makeRequest({ travelerNo: tr, status: "GOOD", checkedBy: "290" }));
    const data = await res.json();
    await expect(prisma.qualityCheck.delete({ where: { id: data.qualityCheckId } })).rejects.toThrow(
      /append-only/,
    );
  });
});
