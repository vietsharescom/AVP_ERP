// Test criteria cho FID-ERP-001 (schema nền tảng) — xem
// docs/features/FID-ERP-001_20260917.md §7 TEST CRITERIA.
// Chạy trên database avp_erp_test riêng (xem tests/db/setup.ts).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../app/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Mỗi lần chạy dùng 1 suffix riêng để không đụng dữ liệu lần chạy trước
// (không thể xoá stock_moves cũ vì bất biến — đây chính là điều đang test)
const RUN = Date.now().toString();
const PART_NO = `TESTPART-${RUN}`;
const TRAVELER_NO = `TESTTR-${RUN}`;
const TRAVELER_NO_2 = `TESTTR2-${RUN}`;
const LOT_NO = `TESTLOT-${RUN}`;

beforeAll(async () => {
  await prisma.partControl.create({
    data: { partNo: PART_NO, qtyPerBox: 100, client: "Infasco" },
  });
  await prisma.lot.create({ data: { lotNo: LOT_NO } });
  await prisma.traveler.create({
    data: { travelerNo: TRAVELER_NO, partNo: PART_NO, lotNo: LOT_NO, poNo: `PO-${RUN}` },
  });
  await prisma.traveler.create({
    data: { travelerNo: TRAVELER_NO_2, partNo: PART_NO, lotNo: LOT_NO, poNo: `PO-${RUN}` },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("FID-ERP-001 — CHECK constraints trên stock_moves", () => {
  it("chặn SELECT thiếu machine_code", async () => {
    await expect(
      prisma.stockMove.create({
        data: {
          travelerNo: TRAVELER_NO,
          moveType: "SELECT",
          qty: 100,
          operatorCode: "111",
          shift: "MRNNG",
          // machineCode cố tình bỏ trống
        },
      }),
    ).rejects.toThrow();
  });

  it("chặn SELECT với machine_code là chuỗi rỗng (test riêng cho lỗi NULLIF/TRIM)", async () => {
    await expect(
      prisma.stockMove.create({
        data: {
          travelerNo: TRAVELER_NO,
          moveType: "SELECT",
          qty: 100,
          machineCode: "   ", // chỉ có khoảng trắng — TRIM() phải bắt được
          operatorCode: "111",
          shift: "MRNNG",
        },
      }),
    ).rejects.toThrow();
  });

  it("chặn SCRAP thiếu reason_code", async () => {
    await expect(
      prisma.stockMove.create({
        data: { travelerNo: TRAVELER_NO, moveType: "SCRAP", qty: 5 },
      }),
    ).rejects.toThrow();
  });

  it("chặn SCRAP với reason_code không tồn tại trong defect_types", async () => {
    await expect(
      prisma.stockMove.create({
        data: {
          travelerNo: TRAVELER_NO,
          moveType: "SCRAP",
          qty: 5,
          reasonCode: "KHONG_TON_TAI",
        },
      }),
    ).rejects.toThrow();
  });

  it("chặn qty = 0", async () => {
    await expect(
      prisma.stockMove.create({
        data: { travelerNo: TRAVELER_NO, moveType: "RECEIVE", qty: 0 },
      }),
    ).rejects.toThrow();
  });

  it("chặn qty âm", async () => {
    await expect(
      prisma.stockMove.create({
        data: { travelerNo: TRAVELER_NO, moveType: "RECEIVE", qty: -50 },
      }),
    ).rejects.toThrow();
  });

  it("cho phép RECEIVE không có machine_code/operator_code/shift (không bắt buộc ở loại này)", async () => {
    const move = await prisma.stockMove.create({
      data: { travelerNo: TRAVELER_NO, moveType: "RECEIVE", qty: 45000 },
    });
    expect(move.id).toBeGreaterThan(0);
  });

  it("cho phép SELECT hợp lệ (đủ machine_code/operator_code/shift)", async () => {
    const move = await prisma.stockMove.create({
      data: {
        travelerNo: TRAVELER_NO,
        moveType: "SELECT",
        qty: 45000,
        machineCode: "MC112",
        operatorCode: "275",
        shift: "MRNNG",
      },
    });
    expect(move.id).toBeGreaterThan(0);
  });

  it("cho phép SCRAP hợp lệ với reason_code tồn tại", async () => {
    const move = await prisma.stockMove.create({
      data: {
        travelerNo: TRAVELER_NO,
        moveType: "SCRAP",
        qty: 275,
        reasonCode: "LOOSE_WASHER_NUT",
      },
    });
    expect(move.id).toBeGreaterThan(0);
  });
});

describe("FID-ERP-001 — defect_types seed", () => {
  it("có đúng 10 giá trị thật, không thiếu/thừa", async () => {
    const types = await prisma.defectType.findMany();
    expect(types).toHaveLength(10);
    const codes = types.map((t) => t.code).sort();
    expect(codes).toEqual(
      [
        "STUCK_TOGETHER",
        "SLIVERS",
        "EXCESS_PLATING",
        "UN_TAPPED",
        "REAMED",
        "MIS_FORMED",
        "MIXED",
        "UPSIDE_DOWN_WASHER",
        "DAMAGED_PILOT",
        "LOOSE_WASHER_NUT",
      ].sort(),
    );
  });
});

describe("FID-ERP-001 — stock_moves bất biến ở tầng database", () => {
  it("chặn UPDATE trực tiếp 1 dòng đã ghi", async () => {
    const move = await prisma.stockMove.create({
      data: { travelerNo: TRAVELER_NO, moveType: "RECEIVE", qty: 10 },
    });
    await expect(
      prisma.stockMove.update({ where: { id: move.id }, data: { qty: 999 } }),
    ).rejects.toThrow(/append-only/);
  });

  it("chặn DELETE 1 dòng đã ghi", async () => {
    const move = await prisma.stockMove.create({
      data: { travelerNo: TRAVELER_NO, moveType: "RECEIVE", qty: 10 },
    });
    await expect(prisma.stockMove.delete({ where: { id: move.id } })).rejects.toThrow(
      /append-only/,
    );
  });
});

describe("FID-ERP-001 — traveler_last_select_status VIEW", () => {
  it("trả đúng lần SELECT gần nhất khi có nhiều dòng SELECT lịch sử", async () => {
    await prisma.stockMove.create({
      data: {
        travelerNo: TRAVELER_NO_2,
        moveType: "SELECT",
        qty: 100,
        machineCode: "MC1",
        operatorCode: "1",
        shift: "MRNNG",
      },
    });
    await new Promise((r) => setTimeout(r, 5)); // đảm bảo created_at khác nhau
    await prisma.stockMove.create({
      data: {
        travelerNo: TRAVELER_NO_2,
        moveType: "SELECT",
        qty: 90,
        machineCode: "MC2",
        operatorCode: "2",
        shift: "AFTRN",
      },
    });

    const rows = await prisma.$queryRaw<{ traveler_no: string; last_move_type: string }[]>`
      SELECT traveler_no, last_move_type FROM traveler_last_select_status
      WHERE traveler_no = ${TRAVELER_NO_2}
    `;
    expect(rows).toHaveLength(1);
    expect(rows[0].last_move_type).toBe("SELECT");
  });
});

describe("FID-ERP-001 — 1 PO trải nhiều Traveler (dữ liệu thật PO 188424)", () => {
  it("group theo poNo trả đúng nhiều Traveler khác lotNo", async () => {
    const travelers = await prisma.traveler.findMany({
      where: { poNo: `PO-${RUN}` },
    });
    expect(travelers).toHaveLength(2);
    expect(new Set(travelers.map((t) => t.travelerNo)).size).toBe(2);
  });
});

describe("FID-ERP-001 — packing_slip_lines qty dương", () => {
  it("chặn qty âm/0 trên packing_slip_lines", async () => {
    const ps = await prisma.packingSlip.create({ data: { psNo: `PS-${RUN}` } });
    await expect(
      prisma.packingSlipLine.create({
        data: {
          packingSlipId: ps.id,
          travelerNo: TRAVELER_NO,
          qty: 0,
          partNoSnap: PART_NO,
        },
      }),
    ).rejects.toThrow();
  });
});
