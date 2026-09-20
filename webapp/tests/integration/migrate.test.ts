// Test criteria cho FID-ERP-013 (Migration từ AVP_AI) — xem
// docs/features/FID-ERP-013_20260919.md §7 TEST CRITERIA. Dùng dữ liệu
// MẪU/GIẢ LẬP nhỏ (Andy: "trước mắt lấy data mới làm thử") — KHÔNG phải
// export CSV thật từ AVP_AI (mốc migrate lịch sử thật vẫn chờ Andy trả
// lời Mục 0 của FID trước khi APPROVED).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  migrateFinishGood,
  migratePackingList,
  migratePartControl,
  migrateRawMaterial,
  migrateWarehouse,
} from "../../lib/migrate/migrate";
import { prisma } from "../../lib/prisma";
import type { FinishGoodRow, PackingListRow, WarehouseRow } from "../../lib/migrate/types";

const RUN = Date.now().toString();
const PART = `MIGTEST-${RUN}`;

let seq = 0;
function tr() {
  seq += 1;
  return `MIGTR-${RUN}-${seq}`;
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe("FID-ERP-013 — migratePartControl", () => {
  it("dòng hợp lệ -> insert vào part_control", async () => {
    const part = `${PART}-OK`;
    const summary = await migratePartControl([{ part, qtyPerBox: "100", client: "Infasco" }]);
    expect(summary.inserted).toBe(1);
    expect(summary.quarantined).toBe(0);
    const row = await prisma.partControl.findUnique({ where: { partNo: part } });
    expect(row?.qtyPerBox).toBe(100);
  });

  it("thiếu qtyPerBox -> quarantine, không insert", async () => {
    const part = `${PART}-BAD`;
    const summary = await migratePartControl([{ part, qtyPerBox: "" }]);
    expect(summary.quarantined).toBe(1);
    const row = await prisma.partControl.findUnique({ where: { partNo: part } });
    expect(row).toBeNull();
    const q = await prisma.migrationQuarantine.findFirst({ where: { sourceSheet: "PartControl", rawData: { path: ["part"], equals: part } } });
    expect(q?.errorCodes).toContain("INVALID_QTY_PER_BOX");
  });
});

describe("FID-ERP-013 — migrateRawMaterial", () => {
  const part = `${PART}-RM`;
  beforeAll(async () => {
    await migratePartControl([{ part, qtyPerBox: "50", client: "Infasco" }]);
  });

  it("traveler hợp lệ, Part# đã có trong part_control -> insert traveler", async () => {
    const travelerNo = tr();
    const summary = await migrateRawMaterial([
      { traveler: travelerNo, partNo: part, pot: "693", po: "193853", date: "2026-07-09" },
    ]);
    expect(summary.inserted).toBe(1);
    const traveler = await prisma.traveler.findUnique({ where: { travelerNo } });
    expect(traveler?.poNo).toBe("193853");
    expect(traveler?.potNo).toBe("693");
  });

  it("Part# KHÔNG có trong part_control -> quarantine", async () => {
    const travelerNo = tr();
    const summary = await migrateRawMaterial([
      { traveler: travelerNo, partNo: `${PART}-KHONGCO`, date: "2026-07-09" },
    ]);
    expect(summary.quarantined).toBe(1);
    const traveler = await prisma.traveler.findUnique({ where: { travelerNo } });
    expect(traveler).toBeNull();
  });

  it("date rỗng/không hợp lệ -> quarantine, KHÔNG tự đoán ngày", async () => {
    const travelerNo = tr();
    const summary = await migrateRawMaterial([{ traveler: travelerNo, partNo: part, date: "" }]);
    expect(summary.quarantined).toBe(1);
  });

  it("potNo=GAYLORD -> traveler.isReturnForRework=true", async () => {
    const travelerNo = tr();
    await migrateRawMaterial([{ traveler: travelerNo, partNo: part, pot: "GAYLORD", date: "2026-07-09" }]);
    const traveler = await prisma.traveler.findUnique({ where: { travelerNo } });
    expect(traveler?.isReturnForRework).toBe(true);
  });
});

describe("FID-ERP-013 — migrateWarehouse", () => {
  const part = `${PART}-WH`;
  beforeAll(async () => {
    await migratePartControl([{ part, qtyPerBox: "50" }]);
  });

  it("traveler đã có (từ RawMaterial) -> ghi RECEIVE đúng qty", async () => {
    const travelerNo = tr();
    await migrateRawMaterial([{ traveler: travelerNo, partNo: part, date: "2026-07-09" }]);
    const summary = await migrateWarehouse([
      { traveler: travelerNo, receivedPieces: "3000", receiveDate: "2026-07-10", receivedBy: "111" },
    ]);
    expect(summary.inserted).toBe(1);
    const move = await prisma.stockMove.findFirst({ where: { travelerNo, moveType: "RECEIVE" } });
    expect(move?.qty).toBe(3000);
    expect(move?.operatorCode).toBe("111");
  });

  it("traveler KHÔNG tồn tại -> quarantine", async () => {
    const summary = await migrateWarehouse([
      { traveler: tr(), receivedPieces: "100", receiveDate: "2026-07-10" },
    ]);
    expect(summary.quarantined).toBe(1);
  });

  it("chạy lại 2 lần cùng dữ liệu -> idempotent, không tạo RECEIVE trùng", async () => {
    const travelerNo = tr();
    await migrateRawMaterial([{ traveler: travelerNo, partNo: part, date: "2026-07-09" }]);
    const row: WarehouseRow = { traveler: travelerNo, receivedPieces: "500", receiveDate: "2026-07-10" };
    const first = await migrateWarehouse([row]);
    const second = await migrateWarehouse([row]);
    expect(first.inserted).toBe(1);
    expect(second.inserted).toBe(0);
    expect(second.skipped).toBe(1);
    const moves = await prisma.stockMove.findMany({ where: { travelerNo, moveType: "RECEIVE" } });
    expect(moves).toHaveLength(1);
  });
});

describe("FID-ERP-013 — migrateFinishGood", () => {
  const part = `${PART}-FG`;
  beforeAll(async () => {
    await migratePartControl([{ part, qtyPerBox: "50" }]);
  });

  async function seedTraveler(potNo?: string) {
    const travelerNo = tr();
    await migrateRawMaterial([{ traveler: travelerNo, partNo: part, pot: potNo, date: "2026-07-09" }]);
    return travelerNo;
  }

  it("reject khớp specialNotes với defect_types -> SELECT + SCRAP đúng reasonCode", async () => {
    const travelerNo = await seedTraveler();
    const summary = await migrateFinishGood([
      {
        date: "2026-07-12",
        shift: "MRNNG",
        operator: "275",
        traveler: travelerNo,
        machine: "BF",
        mcNo: "103",
        lotNo: "6-247-03-B",
        qty: "2900",
        reject: "100",
        specialNotes: "LOOSE WASHER NUT",
        qcStatus: "PASS",
      },
    ]);
    expect(summary.inserted).toBe(1);
    const select = await prisma.stockMove.findFirst({ where: { travelerNo, moveType: "SELECT" } });
    expect(select?.qty).toBe(2900);
    expect(select?.machineCode).toBe("BF103");
    const scrap = await prisma.stockMove.findFirst({ where: { travelerNo, moveType: "SCRAP" } });
    expect(scrap?.qty).toBe(100);
    expect(scrap?.reasonCode).toBe("LOOSE_WASHER_NUT");
    const traveler = await prisma.traveler.findUnique({ where: { travelerNo } });
    expect(traveler?.lotNo).toBe("6-247-03-B");
    const qc = await prisma.qualityCheck.findFirst({ where: { travelerNo } });
    expect(qc?.status).toBe("GOOD");
  });

  // v0.2 (Mục 0 #3) — thay quy tắc v0.1 "không khớp -> quarantine CẢ dòng":
  // tên lỗi lạ giờ vào `OTHERS` + ghi chú (giống cách Andy chốt cho Wrapping,
  // FID-ERP-005 v1.5), không mất cả dòng SELECT vì 1 tên lỗi lạ.
  it("reject KHÔNG khớp mã lỗi nào -> vẫn ghi SELECT + SCRAP `OTHERS` giữ nguyên tên gốc ở note", async () => {
    const travelerNo = await seedTraveler();
    const summary = await migrateFinishGood([
      {
        date: "2026-07-12",
        shift: "MRNNG",
        operator: "275",
        traveler: travelerNo,
        machine: "BF",
        mcNo: "103",
        qty: "100",
        reject: "50",
        specialNotes: "ĐỌC KHÔNG RA",
      },
    ]);
    expect(summary.quarantined).toBe(0);
    const select = await prisma.stockMove.findFirst({ where: { travelerNo, moveType: "SELECT" } });
    expect(select?.qty).toBe(100);
    const scrap = await prisma.stockMove.findFirst({ where: { travelerNo, moveType: "SCRAP" } });
    expect(scrap?.reasonCode).toBe("OTHERS");
    expect(scrap?.qty).toBe(50);
    expect(scrap?.note).toBe("ĐỌC KHÔNG RA");
  });

  it("lotNo là placeholder AVP_AI (TRAVELERRECEIVED) -> KHÔNG ghi vào travelers.lotNo", async () => {
    const travelerNo = await seedTraveler();
    await migrateFinishGood([
      {
        date: "2026-07-12",
        shift: "MRNNG",
        operator: "275",
        traveler: travelerNo,
        machine: "BF",
        mcNo: "103",
        lotNo: "TRAVELERRECEIVED",
        qty: "100",
      },
    ]);
    const traveler = await prisma.traveler.findUnique({ where: { travelerNo } });
    expect(traveler?.lotNo).toBeNull();
  });

  it("pot=GAYLORD (từ FinishGood, traveler ban đầu không GAYLORD) -> set isReturnForRework=true", async () => {
    const travelerNo = await seedTraveler();
    await migrateFinishGood([
      {
        date: "2026-07-12",
        shift: "MRNNG",
        operator: "275",
        traveler: travelerNo,
        pot: "GAYLORD",
        machine: "BF",
        mcNo: "103",
        qty: "100",
      },
    ]);
    const traveler = await prisma.traveler.findUnique({ where: { travelerNo } });
    expect(traveler?.isReturnForRework).toBe(true);
  });

  it("có concessionBy -> ghi THÊM 1 dòng quality_checks thứ 2 (không sửa dòng đầu)", async () => {
    const travelerNo = await seedTraveler();
    await migrateFinishGood([
      {
        date: "2026-07-12",
        shift: "MRNNG",
        operator: "275",
        traveler: travelerNo,
        machine: "BF",
        mcNo: "103",
        qty: "100",
        qcStatus: "HOLD",
        concessionBy: "GIAMDOC",
        concessionReason: "Khách hàng đồng ý nhận dù lỗi nhẹ",
      },
    ]);
    const checks = await prisma.qualityCheck.findMany({ where: { travelerNo }, orderBy: { id: "asc" } });
    expect(checks).toHaveLength(2);
    expect(checks[0].concessionBy).toBeNull();
    expect(checks[1].concessionBy).toBe("GIAMDOC");
    expect(checks[1].status).toBe("HOLD");
  });

  it("traveler KHÔNG tồn tại -> quarantine", async () => {
    const summary = await migrateFinishGood([
      { date: "2026-07-12", shift: "MRNNG", operator: "275", traveler: tr(), machine: "BF", mcNo: "1", qty: "10" },
    ]);
    expect(summary.quarantined).toBe(1);
  });

  it("chạy lại 2 lần cùng dữ liệu -> idempotent, không tạo SELECT trùng", async () => {
    const travelerNo = await seedTraveler();
    const row: FinishGoodRow = {
      date: "2026-07-12",
      shift: "MRNNG",
      operator: "275",
      traveler: travelerNo,
      machine: "BF",
      mcNo: "103",
      qty: "100",
    };
    const first = await migrateFinishGood([row]);
    const second = await migrateFinishGood([row]);
    expect(first.inserted).toBe(1);
    expect(second.skipped).toBe(1);
    const moves = await prisma.stockMove.findMany({ where: { travelerNo, moveType: "SELECT" } });
    expect(moves).toHaveLength(1);
  });
});

describe("FID-ERP-013 — migratePackingList", () => {
  const part = `${PART}-PL`;
  beforeAll(async () => {
    await migratePartControl([{ part, qtyPerBox: "50" }]);
  });

  it("tạo packing_slip + line + SHIP, lotNoSnap tra đúng qua FinishGood cùng (traveler, ps)", async () => {
    const travelerNo = tr();
    const ps = `PS-${RUN}`;
    await migrateRawMaterial([{ traveler: travelerNo, partNo: part, date: "2026-07-09" }]);
    const finishGoodRows: FinishGoodRow[] = [
      {
        date: "2026-07-12",
        shift: "MRNNG",
        operator: "275",
        traveler: travelerNo,
        machine: "BF",
        mcNo: "103",
        lotNo: "6-247-03-B",
        qty: "100",
        ps,
      },
    ];
    await migrateFinishGood(finishGoodRows);

    const summary = await migratePackingList(
      [{ ps, traveler: travelerNo, partNo: part, pot: "693", quantity: "100" }],
      finishGoodRows,
    );
    expect(summary.inserted).toBe(1);

    const slip = await prisma.packingSlip.findUnique({ where: { psNo: ps }, include: { lines: true } });
    expect(slip?.lines).toHaveLength(1);
    expect(slip?.lines[0].lotNoSnap).toBe("6-247-03-B");
    const ship = await prisma.stockMove.findFirst({ where: { travelerNo, moveType: "SHIP" } });
    expect(ship?.qty).toBe(100);
  });

  it("traveler KHÔNG tồn tại -> quarantine", async () => {
    const summary = await migratePackingList([
      { ps: `PS-${RUN}-BAD`, traveler: tr(), partNo: part, quantity: "10" },
    ]);
    expect(summary.quarantined).toBe(1);
  });

  it("chạy lại 2 lần cùng dữ liệu -> idempotent, không tạo line/SHIP trùng", async () => {
    const travelerNo = tr();
    const ps = `PS-${RUN}-DUP`;
    await migrateRawMaterial([{ traveler: travelerNo, partNo: part, date: "2026-07-09" }]);
    const row: PackingListRow = { ps, traveler: travelerNo, partNo: part, quantity: "20" };
    const first = await migratePackingList([row]);
    const second = await migratePackingList([row]);
    expect(first.inserted).toBe(1);
    expect(second.skipped).toBe(1);
    const lines = await prisma.packingSlipLine.findMany({ where: { travelerNo } });
    expect(lines).toHaveLength(1);
  });
});
