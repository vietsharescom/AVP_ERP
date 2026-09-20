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

async function makeTravelerBare(suffix: string) {
  const tr = travelerNo(suffix);
  await prisma.traveler.create({ data: { travelerNo: tr, partNo: PART_NO } });
  return tr;
}

// v1.2 — Kiểm tra Wrapping bắt buộc Traveler đã qua SELECT (Xưởng) —
// mọi fixture traveler dùng chung ở test file này phải có sẵn 1 dòng
// SELECT, giống đúng luồng thật (Traveler qua máy lựa TRƯỚC khi tới
// Wrapping), xem docs/features/FID-ERP-005_20260918.md §10. Riêng
// nhóm test "pack" tự quản lý SELECT qty chính xác qua `selectFor()`
// (dùng `makeTravelerBare` để tránh cộng dồn 2 lần SELECT).
async function makeTraveler(suffix: string) {
  const tr = await makeTravelerBare(suffix);
  await prisma.stockMove.create({
    data: { travelerNo: tr, moveType: "SELECT", qty: 1000, machineCode: "MC1", operatorCode: "111", shift: "DAY" },
  });
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

  // v1.2 — phát hiện qua test thật 2026-09-19 (Andy lưu Good được cho
  // Traveler chưa hề qua máy lựa): Wrapping kiểm tra hàng ĐÃ sản xuất,
  // Traveler chưa từng SELECT thì chưa có gì để kiểm tra.
  it("Traveler chưa từng có SELECT -> 400, không ghi quality_checks", async () => {
    const tr = await makeTravelerBare("NOSELECT");
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
    const count = await prisma.stockMove.count({ where: { travelerNo: tr, moveType: "SCRAP" } });
    expect(count).toBe(0);
  });
});

// v1.4 — cảnh báo (KHÔNG chặn) khi Traveler đã có 1 lần kiểm tra Wrapping
// trước đó, vẫn cho ghi thêm (giống pattern `skippedDuplicates` ở
// FID-ERP-002). Andy phát hiện qua test thật: bấm lại nhiều lần cùng
// Traveler tạo nhiều dòng `quality_checks` trùng, im lặng không cảnh báo.
describe("FID-ERP-005 v1.4 — cảnh báo kiểm tra Wrapping trùng lặp", () => {
  it("lần đầu kiểm tra -> không có warning trùng lặp", async () => {
    const tr = await makeTraveler("DUP-FIRST");
    const res = await checkPOST(makeRequest({ travelerNo: tr, status: "GOOD", checkedBy: "290" }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.warnings.some((w: string) => w.includes("đã có 1 lần kiểm tra"))).toBe(false);
  });

  it("lần 2 kiểm tra cùng Traveler -> có warning, vẫn ghi thêm dòng mới", async () => {
    const tr = await makeTraveler("DUP-SECOND");
    await checkPOST(makeRequest({ travelerNo: tr, status: "GOOD", checkedBy: "290" }));
    const res2 = await checkPOST(makeRequest({ travelerNo: tr, status: "HOLD", note: "kiểm tra lại", checkedBy: "290" }));
    const data2 = await res2.json();
    expect(res2.status).toBe(200);
    expect(data2.warnings.some((w: string) => w.includes("đã có 1 lần kiểm tra"))).toBe(true);

    const count = await prisma.qualityCheck.count({ where: { travelerNo: tr } });
    expect(count).toBe(2);
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

    const moves = await prisma.stockMove.count({ where: { travelerNo: tr, moveType: "SCRAP" } });
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

describe("FID-ERP-005 v1.1 — pack (đóng thùng + Skid#)", () => {
  async function selectFor(tr: string, qty: number) {
    await prisma.stockMove.create({
      data: { travelerNo: tr, moveType: "SELECT", qty, machineCode: "MC1", operatorCode: "1", shift: "MRNNG", sourceStation: "FACTORY" },
    });
  }

  it("pack thiếu boxCount/qty/skidNo/machineCode/shift -> 400", async () => {
    const tr = await makeTravelerBare("PACK-MISSING");
    await selectFor(tr, 1000);
    const res = await checkPOST(
      makeRequest({ travelerNo: tr, status: "GOOD", checkedBy: "290", pack: { boxCount: 5 } }),
    );
    expect(res.status).toBe(400);
  });

  it("pack.qty vượt số đã lựa còn có thể đóng gói -> 400, không ghi gì", async () => {
    const tr = await makeTravelerBare("PACK-OVER");
    await selectFor(tr, 100);
    const res = await checkPOST(
      makeRequest({
        travelerNo: tr,
        status: "GOOD",
        checkedBy: "290",
        pack: { boxCount: 1, qty: 200, skidNo: "77", machineCode: "TBL", shift: "AFTRN" },
      }),
    );
    expect(res.status).toBe(400);
    const count = await prisma.stockMove.count({ where: { travelerNo: tr, moveType: "PACK" } });
    expect(count).toBe(0);
  });

  it("pack hợp lệ -> ghi 1 PACK (kèm boxCount) + cập nhật travelers.skidNo, cùng transaction với quality_checks", async () => {
    const tr = await makeTravelerBare("PACK-OK");
    await selectFor(tr, 4800);
    const res = await checkPOST(
      makeRequest({
        travelerNo: tr,
        status: "GOOD",
        checkedBy: "290",
        pack: { boxCount: 32, qty: 4800, skidNo: " skid# 77 ", machineCode: " tbl ", shift: "aftrn" },
      }),
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.packMoveId).toBeDefined();

    const pack = await prisma.stockMove.findFirst({ where: { travelerNo: tr, moveType: "PACK" } });
    expect(pack?.qty).toBe(4800);
    expect(pack?.boxCount).toBe(32);
    expect(pack?.machineCode).toBe("TBL");
    expect(pack?.shift).toBe("AFTRN");
    expect(pack?.operatorCode).toBe("290");

    const traveler = await prisma.traveler.findUnique({ where: { travelerNo: tr } });
    expect(traveler?.skidNo).toBe("skid# 77");
  });

  // v1.3 — cảnh báo (KHÔNG chặn) boxCount/qty phi lý so với
  // part_control.qtyPerBox. Tái hiện đúng ca thật Andy gặp 2026-09-19:
  // boxCount=700 cho qty=1000 (PART_NO fixture qtyPerBox=100) — trung
  // bình 1.4 pcs/thùng, quá thấp so với chuẩn.
  it("boxCount quá nhiều so với qty (trung bình pcs/thùng quá thấp) -> vẫn 200, có warning", async () => {
    const tr = await makeTravelerBare("PACK-WARN-LOW");
    await selectFor(tr, 1000);
    const res = await checkPOST(
      makeRequest({
        travelerNo: tr,
        status: "GOOD",
        checkedBy: "290",
        pack: { boxCount: 700, qty: 1000, skidNo: "1", machineCode: "TBL", shift: "MRNNG" },
      }),
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.warnings.some((w: string) => w.includes("thấp bất thường"))).toBe(true);
  });

  it("qty vượt sức chứa boxCount*qtyPerBox -> vẫn 200 (đủ available), có warning", async () => {
    const tr = await makeTravelerBare("PACK-WARN-OVERCAP");
    await selectFor(tr, 1000);
    const res = await checkPOST(
      makeRequest({
        travelerNo: tr,
        status: "GOOD",
        checkedBy: "290",
        pack: { boxCount: 2, qty: 500, skidNo: "1", machineCode: "TBL", shift: "MRNNG" },
      }),
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.warnings.some((w: string) => w.includes("VƯỢT mức này"))).toBe(true);
  });

  it("pack.shift không khớp quy ước MRNNG/AFTRN -> vẫn 200, có warning", async () => {
    const tr = await makeTravelerBare("PACK-SHIFTWARN");
    await selectFor(tr, 1000);
    const res = await checkPOST(
      makeRequest({
        travelerNo: tr,
        status: "GOOD",
        checkedBy: "290",
        pack: { boxCount: 10, qty: 1000, skidNo: "1", machineCode: "TBL", shift: "MONING" },
      }),
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.warnings.some((w: string) => w.includes("MONING"))).toBe(true);
  });

  it("2 lần pack cộng dồn vẫn không vượt SELECT — lần 2 vượt phần còn lại -> 400", async () => {
    const tr = await makeTravelerBare("PACK-TWICE");
    await selectFor(tr, 1000);
    await checkPOST(
      makeRequest({
        travelerNo: tr,
        status: "GOOD",
        checkedBy: "290",
        pack: { boxCount: 5, qty: 700, skidNo: "1", machineCode: "TBL", shift: "MRNNG" },
      }),
    );
    const res2 = await checkPOST(
      makeRequest({
        travelerNo: tr,
        status: "GOOD",
        checkedBy: "290",
        pack: { boxCount: 5, qty: 400, skidNo: "2", machineCode: "TBL", shift: "MRNNG" },
      }),
    );
    expect(res2.status).toBe(400); // còn lại 300, gửi 400 -> vượt
  });

  it("không gửi pack -> hành vi y hệt trước (no regression), không có PACK nào", async () => {
    const tr = await makeTraveler("PACK-NONE");
    const res = await checkPOST(makeRequest({ travelerNo: tr, status: "GOOD", checkedBy: "290" }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.packMoveId).toBeUndefined();
    const count = await prisma.stockMove.count({ where: { travelerNo: tr, moveType: "PACK" } });
    expect(count).toBe(0);
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
