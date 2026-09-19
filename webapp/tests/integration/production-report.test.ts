// Test criteria cho FID-ERP-012 (Báo cáo sản xuất Xưởng) — xem
// docs/features/FID-ERP-012_20260917.md §7 TEST CRITERIA.
// Chạy trên database avp_erp_test riêng (xem tests/db/setup.ts).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";
import { GET as productionGET } from "../../app/api/reports/production/route";
import { prisma } from "../../lib/prisma";

const RUN_NUM = Date.now();
const RUN = RUN_NUM.toString();
const PART_NO = `TESTPART-PROD-${RUN}`;

// stock_moves là sổ cái BẤT BIẾN (không xoá được, xem FID-ERP-001 §5) —
// nếu dùng ngày lịch cố định, mỗi lần chạy lại suite sẽ CỘNG DỒN dữ liệu
// của các lần chạy trước vào cùng 1 ngày, làm sai lệch SUM. Suy ra 1 NĂM
// GIẢ ĐỊNH duy nhất từ RUN (xa mọi năm thật) để mỗi lần chạy test dùng
// hẳn 1 dải ngày riêng, không cộng dồn qua các lần chạy.
const YEAR = 3000 + (RUN_NUM % 5000);

beforeAll(async () => {
  await prisma.partControl.create({ data: { partNo: PART_NO, qtyPerBox: 100, client: "Infasco" } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

let seq = 0;
function travelerNo() {
  seq += 1;
  return `TESTTR-PROD-${RUN}-${seq}`;
}

async function createTraveler(travelerNoValue: string, createdAt: Date) {
  await prisma.traveler.create({ data: { travelerNo: travelerNoValue, partNo: PART_NO, createdAt } });
}

function asNextRequest(req: Request): NextRequest {
  return req as unknown as NextRequest;
}

function getRequest(qs: string) {
  return asNextRequest(new Request(`http://localhost/api/reports/production${qs}`));
}

describe("FID-ERP-012 — GET /api/reports/production", () => {
  it("thiếu from/to -> 400", async () => {
    const res = await productionGET(getRequest(""));
    expect(res.status).toBe(400);
  });

  it("from > to -> 400", async () => {
    const res = await productionGET(getRequest(`?from=${YEAR}-01-10&to=${YEAR}-01-01&groupBy=day`));
    expect(res.status).toBe(400);
  });

  it("groupBy không hợp lệ -> 400", async () => {
    const res = await productionGET(getRequest(`?from=${YEAR}-01-01&to=${YEAR}-01-05&groupBy=week`));
    expect(res.status).toBe(400);
  });

  it("happy path: đủ điểm dữ liệu cho mọi ngày trong khoảng, kể cả ngày không có move", async () => {
    const from = `${YEAR}-02-01`;
    const to = `${YEAR}-02-05`;
    const tr = travelerNo();
    await createTraveler(tr, new Date(`${YEAR}-02-01T08:00:00.000Z`));
    await prisma.stockMove.create({
      data: {
        travelerNo: tr,
        moveType: "SELECT",
        qty: 500,
        machineCode: "MAY-01",
        operatorCode: "111",
        shift: "MRNNG",
        sourceStation: "FACTORY",
        createdAt: new Date(`${YEAR}-02-01T09:00:00.000Z`),
      },
    });

    const res = await productionGET(getRequest(`?from=${from}&to=${to}&groupBy=day`));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.production).toHaveLength(5); // 01..05
    const day1 = body.data.production.find((p: { date: string }) => p.date === `${YEAR}-02-01`);
    expect(day1.qty).toBe(500);
    expect(day1.by_machine).toEqual([{ machine_code: "MAY-01", qty: 500 }]);
    const day2 = body.data.production.find((p: { date: string }) => p.date === `${YEAR}-02-02`);
    expect(day2.qty).toBe(0);
    expect(day2.by_machine).toEqual([]);
  });

  it("tổng qty của 1 ngày = đúng bằng SUM by_machine ngày đó (nhiều máy)", async () => {
    const from = `${YEAR}-03-01`;
    const to = `${YEAR}-03-01`;
    const tr1 = travelerNo();
    const tr2 = travelerNo();
    await createTraveler(tr1, new Date(`${YEAR}-03-01T08:00:00.000Z`));
    await createTraveler(tr2, new Date(`${YEAR}-03-01T08:00:00.000Z`));
    await prisma.stockMove.create({
      data: {
        travelerNo: tr1,
        moveType: "SELECT",
        qty: 700,
        machineCode: "MAY-01",
        operatorCode: "111",
        shift: "MRNNG",
        sourceStation: "FACTORY",
        createdAt: new Date(`${YEAR}-03-01T09:00:00.000Z`),
      },
    });
    await prisma.stockMove.create({
      data: {
        travelerNo: tr2,
        moveType: "SELECT",
        qty: 300,
        machineCode: "MAY-02",
        operatorCode: "112",
        shift: "MRNNG",
        sourceStation: "FACTORY",
        createdAt: new Date(`${YEAR}-03-01T09:30:00.000Z`),
      },
    });

    const res = await productionGET(getRequest(`?from=${from}&to=${to}&groupBy=day`));
    const body = await res.json();
    const day = body.data.production[0];
    expect(day.qty).toBe(1000);
    const sumByMachine = day.by_machine.reduce((s: number, m: { qty: number }) => s + m.qty, 0);
    expect(sumByMachine).toBe(day.qty);
  });

  it("SCRAP bình thường (không kèm RETURN) -> tính vào defects.scrap_qty, KHÔNG trừ khỏi sản lượng", async () => {
    const from = `${YEAR}-04-01`;
    const to = `${YEAR}-04-01`;
    const tr = travelerNo();
    await createTraveler(tr, new Date(`${YEAR}-04-01T08:00:00.000Z`));
    await prisma.stockMove.create({
      data: {
        travelerNo: tr,
        moveType: "SELECT",
        qty: 800,
        machineCode: "MAY-01",
        operatorCode: "111",
        shift: "MRNNG",
        sourceStation: "FACTORY",
        createdAt: new Date(`${YEAR}-04-01T09:00:00.000Z`),
      },
    });
    await prisma.stockMove.create({
      data: {
        travelerNo: tr,
        moveType: "SCRAP",
        qty: 200,
        reasonCode: "LOOSE_WASHER_NUT",
        machineCode: "MAY-01",
        operatorCode: "111",
        shift: "MRNNG",
        sourceStation: "FACTORY",
        createdAt: new Date(`${YEAR}-04-01T09:00:01.000Z`),
      },
    });

    const res = await productionGET(getRequest(`?from=${from}&to=${to}&groupBy=day`));
    const body = await res.json();
    expect(body.data.production[0].qty).toBe(800); // SCRAP thường không trừ
    expect(body.data.defects.scrap_qty).toBe(200);
    expect(body.data.defects.by_reason).toContainEqual({ reason: "Loose Washer Nut", qty: 200 });
  });

  it("rework (SCRAP+SELECT CÙNG created_at với RETURN): loại hẳn SELECT rework, trừ SCRAP rework — đúng ca FID-ERP-007 §6", async () => {
    const trFirst = travelerNo();
    const trRework = travelerNo();
    // Ngày 1: lần SELECT đầu, bình thường, cộng +3000
    await createTraveler(trFirst, new Date(`${YEAR}-05-01T08:00:00.000Z`));
    await prisma.stockMove.create({
      data: {
        travelerNo: trFirst,
        moveType: "SELECT",
        qty: 3000,
        machineCode: "MC112",
        operatorCode: "275",
        shift: "MRNNG",
        sourceStation: "FACTORY",
        createdAt: new Date(`${YEAR}-05-01T09:00:00.000Z`),
      },
    });

    // Ngày 2: lựa lại rework — RETURN=3000 + SELECT=2000 + SCRAP=1000,
    // CÙNG created_at (đúng bản chất transaction thật: Postgres now() cố
    // định cho mọi câu lệnh trong 1 transaction, xem FID-ERP-012 §5).
    const sameInstant = new Date(`${YEAR}-05-02T10:00:00.000Z`);
    await createTraveler(trRework, new Date(`${YEAR}-05-02T08:00:00.000Z`));
    await prisma.stockMove.create({
      data: {
        travelerNo: trRework,
        moveType: "RETURN",
        qty: 3000,
        machineCode: "MC112",
        operatorCode: "275",
        shift: "MRNNG",
        sourceStation: "FACTORY",
        createdAt: sameInstant,
      },
    });
    await prisma.stockMove.create({
      data: {
        travelerNo: trRework,
        moveType: "SELECT",
        qty: 2000,
        machineCode: "MC112",
        operatorCode: "275",
        shift: "MRNNG",
        sourceStation: "FACTORY",
        createdAt: sameInstant,
      },
    });
    await prisma.stockMove.create({
      data: {
        travelerNo: trRework,
        moveType: "SCRAP",
        qty: 1000,
        reasonCode: "MIS_FORMED",
        machineCode: "MC112",
        operatorCode: "275",
        shift: "MRNNG",
        sourceStation: "FACTORY",
        createdAt: sameInstant,
      },
    });

    const res = await productionGET(getRequest(`?from=${YEAR}-05-01&to=${YEAR}-05-02&groupBy=day`));
    const body = await res.json();
    const day1 = body.data.production.find((p: { date: string }) => p.date === `${YEAR}-05-01`);
    const day2 = body.data.production.find((p: { date: string }) => p.date === `${YEAR}-05-02`);
    expect(day1.qty).toBe(3000);
    expect(day2.qty).toBe(-1000); // KHÔNG phải +2000-1000=+1000 — SELECT rework bị loại hẳn
    expect(day2.by_machine).toEqual([{ machine_code: "MC112", qty: -1000 }]);

    const totalOverBothDays = day1.qty + day2.qty;
    expect(totalOverBothDays).toBe(2000); // đúng sản lượng thật của lô hàng (FID-ERP-007 §6/§8)
  });

  it("RETURN không bị đếm lẫn SCRAP trong defects", async () => {
    const from = `${YEAR}-06-01`;
    const to = `${YEAR}-06-01`;
    const tr = travelerNo();
    await createTraveler(tr, new Date(`${YEAR}-06-01T08:00:00.000Z`));
    const t = new Date(`${YEAR}-06-01T09:00:00.000Z`);
    await prisma.stockMove.create({
      data: { travelerNo: tr, moveType: "RETURN", qty: 50, sourceStation: "FACTORY", createdAt: t },
    });
    await prisma.stockMove.create({
      data: {
        travelerNo: tr,
        moveType: "SELECT",
        qty: 30,
        machineCode: "MAY-01",
        operatorCode: "111",
        shift: "MRNNG",
        sourceStation: "FACTORY",
        createdAt: t,
      },
    });
    await prisma.stockMove.create({
      data: {
        travelerNo: tr,
        moveType: "SCRAP",
        qty: 20,
        reasonCode: "SLIVERS",
        machineCode: "MAY-01",
        operatorCode: "111",
        shift: "MRNNG",
        sourceStation: "FACTORY",
        createdAt: t,
      },
    });

    const res = await productionGET(getRequest(`?from=${from}&to=${to}&groupBy=day`));
    const body = await res.json();
    expect(body.data.defects.return_qty).toBe(50);
    expect(body.data.defects.scrap_qty).toBe(20);
  });

  it("travelers_open_at_day_start: đếm đúng theo snapshot 00:00 ngày `from`", async () => {
    const boundaryDay = `${YEAR}-07-10`;
    const trOpenBefore = travelerNo();
    const trShippedBefore = travelerNo();
    const trCreatedAfter = travelerNo();

    // Điều kiện gốc là `created_at < boundary` — KHÔNG có cận dưới (xem
    // FID-ERP-012 §5) — nên so tuyệt đối sẽ dính CẢ dữ liệu thật lâu đời
    // của DB test (created_at thật luôn < mốc năm giả định YEAR, xem giải
    // thích đầu file). Đo bằng DELTA (trước/sau khi thêm fixture), giống
    // cách làm với `finished_goods_awaiting_shipment`.
    const before = await productionGET(getRequest(`?from=${boundaryDay}&to=${boundaryDay}&groupBy=day`));
    const beforeBody = await before.json();
    const baseline = beforeBody.data.travelers_open_at_day_start;

    // Tạo trước mốc, chưa SHIP -> tính vào (+1)
    await createTraveler(trOpenBefore, new Date(`${YEAR}-07-05T08:00:00.000Z`));
    // Tạo trước mốc, ĐÃ SHIP trước mốc -> KHÔNG tính
    await createTraveler(trShippedBefore, new Date(`${YEAR}-07-05T08:00:00.000Z`));
    await prisma.stockMove.create({
      data: {
        travelerNo: trShippedBefore,
        moveType: "SHIP",
        qty: 10,
        sourceStation: "OFFICE",
        createdAt: new Date(`${YEAR}-07-06T08:00:00.000Z`),
      },
    });
    // Tạo SAU mốc -> KHÔNG tính
    await createTraveler(trCreatedAfter, new Date(`${YEAR}-07-11T08:00:00.000Z`));

    const after = await productionGET(getRequest(`?from=${boundaryDay}&to=${boundaryDay}&groupBy=day`));
    const afterBody = await after.json();
    expect(afterBody.data.travelers_open_at_day_start).toBe(baseline + 1);
  });

  it("finished_goods_awaiting_shipment: PACK chưa có SHIP theo sau -> được cộng; PACK đã có SHIP -> không cộng", async () => {
    const trAwaiting = travelerNo();
    const trShipped = travelerNo();
    await createTraveler(trAwaiting, new Date(`${YEAR}-08-01T08:00:00.000Z`));
    await createTraveler(trShipped, new Date(`${YEAR}-08-01T08:00:00.000Z`));

    const before = await productionGET(getRequest(`?from=${YEAR}-08-01&to=${YEAR}-08-01&groupBy=day`));
    const beforeBody = await before.json();
    const baseline = beforeBody.data.finished_goods_awaiting_shipment;

    await prisma.stockMove.create({
      data: {
        travelerNo: trAwaiting,
        moveType: "PACK",
        qty: 60,
        machineCode: "MAY-01",
        operatorCode: "111",
        shift: "MRNNG",
        sourceStation: "FACTORY",
        createdAt: new Date(`${YEAR}-08-01T10:00:00.000Z`),
      },
    });
    await prisma.stockMove.create({
      data: {
        travelerNo: trShipped,
        moveType: "PACK",
        qty: 40,
        machineCode: "MAY-01",
        operatorCode: "111",
        shift: "MRNNG",
        sourceStation: "FACTORY",
        createdAt: new Date(`${YEAR}-08-01T10:00:00.000Z`),
      },
    });
    await prisma.stockMove.create({
      data: {
        travelerNo: trShipped,
        moveType: "SHIP",
        qty: 40,
        sourceStation: "OFFICE",
        createdAt: new Date(`${YEAR}-08-01T11:00:00.000Z`),
      },
    });

    const after = await productionGET(getRequest(`?from=${YEAR}-08-01&to=${YEAR}-08-01&groupBy=day`));
    const afterBody = await after.json();
    // Metric này CỐ Ý không lọc theo ngày/traveler (xem FID-ERP-012 §5) —
    // chỉ so bằng DELTA, không so số tuyệt đối (an toàn dù chạy chung DB
    // với dữ liệu PACK/SHIP của các FID khác đã tồn tại từ trước).
    expect(afterBody.data.finished_goods_awaiting_shipment).toBe(baseline + 60);
  });

  it("groupBy=month gộp đúng theo tháng", async () => {
    const tr1 = travelerNo();
    const tr2 = travelerNo();
    await createTraveler(tr1, new Date(`${YEAR}-09-05T08:00:00.000Z`));
    await createTraveler(tr2, new Date(`${YEAR}-09-25T08:00:00.000Z`));
    await prisma.stockMove.create({
      data: {
        travelerNo: tr1,
        moveType: "SELECT",
        qty: 100,
        machineCode: "MAY-01",
        operatorCode: "111",
        shift: "MRNNG",
        sourceStation: "FACTORY",
        createdAt: new Date(`${YEAR}-09-05T09:00:00.000Z`),
      },
    });
    await prisma.stockMove.create({
      data: {
        travelerNo: tr2,
        moveType: "SELECT",
        qty: 200,
        machineCode: "MAY-01",
        operatorCode: "111",
        shift: "MRNNG",
        sourceStation: "FACTORY",
        createdAt: new Date(`${YEAR}-09-25T09:00:00.000Z`),
      },
    });

    const res = await productionGET(getRequest(`?from=${YEAR}-09-01&to=${YEAR}-09-30&groupBy=month`));
    const body = await res.json();
    expect(body.data.production).toHaveLength(1);
    expect(body.data.production[0].date).toBe(`${YEAR}-09-01`);
    expect(body.data.production[0].qty).toBe(300);
  });
});
