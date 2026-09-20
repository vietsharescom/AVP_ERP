// Test criteria cho FID-ERP-003 (Trạm nhập liệu Xưởng) — xem
// docs/features/FID-ERP-003_20260918.md §7 TEST CRITERIA.
// Chạy trên database avp_erp_test riêng (xem tests/db/setup.ts).
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { GET as defectTypesGET } from "../../app/api/factory/defect-types/route";
import { POST as confirmPOST } from "../../app/api/factory/select/confirm/route";
import { prisma } from "../../lib/prisma";

const RUN = Date.now().toString();
const PART_NO = `TESTPART-FAC-${RUN}`;

beforeAll(async () => {
  await prisma.partControl.create({ data: { partNo: PART_NO, qtyPerBox: 100, client: "Infasco" } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

function travelerNo(suffix: string) {
  return `TESTTR-FAC-${RUN}-${suffix}`;
}

async function makeTraveler(suffix: string) {
  const tr = travelerNo(suffix);
  await prisma.traveler.create({ data: { travelerNo: tr, partNo: PART_NO } });
  return tr;
}

function asNextRequest(req: Request): NextRequest {
  return req as unknown as NextRequest;
}

function makeConfirmRequest(body: unknown) {
  return asNextRequest(
    new Request("http://localhost/api/factory/select/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("FID-ERP-003 — GET /api/factory/defect-types", () => {
  it("trả đúng 10 giá trị khớp seed FID-ERP-001", async () => {
    const res = await defectTypesGET();
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.types).toHaveLength(10);
  });
});

describe("FID-ERP-003 — /api/factory/select/confirm validate trước khi ghi DB", () => {
  it("travelerNo không tồn tại -> 400, không ghi gì", async () => {
    const tr = travelerNo("NOTFOUND");
    const res = await confirmPOST(
      makeConfirmRequest({
        travelerNo: tr,
        machineCode: "MC112",
        operatorCode: "275",
        shift: "MRNNG",
        selectQty: 100,
      }),
    );
    expect(res.status).toBe(400);
    const count = await prisma.stockMove.count({ where: { travelerNo: tr } });
    expect(count).toBe(0);
  });

  it("thiếu machineCode -> 400", async () => {
    const tr = await makeTraveler("NOMACHINE");
    const res = await confirmPOST(
      makeConfirmRequest({ travelerNo: tr, machineCode: "", operatorCode: "275", shift: "MRNNG", selectQty: 100 }),
    );
    expect(res.status).toBe(400);
  });

  it("selectQty <= 0 -> 400", async () => {
    const tr = await makeTraveler("QTY0");
    const res = await confirmPOST(
      makeConfirmRequest({ travelerNo: tr, machineCode: "MC112", operatorCode: "275", shift: "MRNNG", selectQty: 0 }),
    );
    expect(res.status).toBe(400);
  });

  it("defect qty <= 0 hoặc reasonCode không tồn tại -> 400 trước khi chạm DB", async () => {
    const tr = await makeTraveler("BADDEFECT");
    const res = await confirmPOST(
      makeConfirmRequest({
        travelerNo: tr,
        machineCode: "MC112",
        operatorCode: "275",
        shift: "MRNNG",
        selectQty: 100,
        defects: [{ reasonCode: "KHONG_TON_TAI", qty: 5 }],
      }),
    );
    expect(res.status).toBe(400);
    const count = await prisma.stockMove.count({ where: { travelerNo: tr } });
    expect(count).toBe(0);
  });

  it("rework.qty <= 0 -> 400", async () => {
    const tr = await makeTraveler("REWORK0");
    const res = await confirmPOST(
      makeConfirmRequest({
        travelerNo: tr,
        machineCode: "MC112",
        operatorCode: "275",
        shift: "MRNNG",
        selectQty: 100,
        rework: { qty: 0 },
      }),
    );
    expect(res.status).toBe(400);
  });
});

describe("FID-ERP-003 — ghi đúng SELECT + SCRAP + REWORK", () => {
  it("có 1 defect + 1 rework -> 1 SELECT + 1 SCRAP + 1 REWORK cùng machine/operator/shift, sourceStation=FACTORY", async () => {
    const tr = await makeTraveler("FULL");
    const res = await confirmPOST(
      makeConfirmRequest({
        travelerNo: tr,
        machineCode: " mc112 ",
        operatorCode: "275",
        shift: "mrnng",
        selectQty: 45000,
        defects: [{ reasonCode: "LOOSE_WASHER_NUT", qty: 275 }],
        rework: { qty: 40, note: "lệch ren, chờ kiểm tra lại" },
        sourceStation: "OFFICE", // cố tình gửi sai — route phải bỏ qua, luôn ghi FACTORY
      }),
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.totalDefectQty).toBe(275);
    expect(data.reworkMoveId).toBeDefined();

    const moves = await prisma.stockMove.findMany({ where: { travelerNo: tr }, orderBy: { id: "asc" } });
    expect(moves).toHaveLength(3);

    const select = moves.find((m) => m.moveType === "SELECT")!;
    expect(select.qty).toBe(45000);
    expect(select.machineCode).toBe("MC112"); // TRIM+UPPER
    expect(select.sourceStation).toBe("FACTORY");

    const scrap = moves.find((m) => m.moveType === "SCRAP")!;
    expect(scrap.qty).toBe(275);
    expect(scrap.reasonCode).toBe("LOOSE_WASHER_NUT");
    expect(scrap.machineCode).toBe("MC112");

    const rework = moves.find((m) => m.moveType === "REWORK")!;
    expect(rework.qty).toBe(40);
    expect(rework.note).toBe("lệch ren, chờ kiểm tra lại");
    expect(rework.machineCode).toBe("MC112");
  });

  it("không có defect/rework -> chỉ ghi 1 SELECT", async () => {
    const tr = await makeTraveler("CLEAN");
    await confirmPOST(
      makeConfirmRequest({
        travelerNo: tr,
        machineCode: "MC112",
        operatorCode: "275",
        shift: "MRNNG",
        selectQty: 1000,
      }),
    );
    const moves = await prisma.stockMove.findMany({ where: { travelerNo: tr } });
    expect(moves).toHaveLength(1);
    expect(moves[0].moveType).toBe("SELECT");
  });

  it("không ghi gì (rollback) nếu 1 lệnh ghi fail giữa chừng", async () => {
    const tr = await makeTraveler("ROLLBACK");
    const spy = vi.spyOn(prisma.stockMove, "create").mockImplementationOnce(() => {
      throw new Error("simulated failure");
    }) as unknown as typeof prisma.stockMove.create;
    void spy;

    const res = await confirmPOST(
      makeConfirmRequest({
        travelerNo: tr,
        machineCode: "MC112",
        operatorCode: "275",
        shift: "MRNNG",
        selectQty: 100,
      }),
    );
    expect(res.status).toBe(500);
    vi.mocked(prisma.stockMove.create).mockRestore();

    const count = await prisma.stockMove.count({ where: { travelerNo: tr } });
    expect(count).toBe(0);
  });

  // v1.1 (2026-09-19) — cảnh báo (KHÔNG chặn) ca không khớp quy ước đã
  // chốt MRNNG/AFTRN (nguồn WRAPPING SUMMARY thật) — phát hiện qua test
  // thật Andy gõ nhầm "MONING".
  it("shift không khớp quy ước MRNNG/AFTRN -> vẫn 200, có warning", async () => {
    const tr = await makeTraveler("SHIFTWARN");
    const res = await confirmPOST(
      makeConfirmRequest({
        travelerNo: tr,
        machineCode: "MC112",
        operatorCode: "275",
        shift: "MONING",
        selectQty: 1000,
      }),
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.warnings.some((w: string) => w.includes("MONING"))).toBe(true);
  });

  it("shift khớp quy ước (MRNNG/AFTRN) -> không có warning", async () => {
    const tr = await makeTraveler("SHIFTOK");
    const res = await confirmPOST(
      makeConfirmRequest({
        travelerNo: tr,
        machineCode: "MC112",
        operatorCode: "275",
        shift: "AFTRN",
        selectQty: 1000,
      }),
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.warnings).toEqual([]);
  });
});
