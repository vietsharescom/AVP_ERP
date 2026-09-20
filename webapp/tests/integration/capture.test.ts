// Test criteria cho FID-ERP-002 (CaptureGate tương đương) — xem
// docs/features/FID-ERP-002_20260918.md §7 TEST CRITERIA.
// Chạy trên database avp_erp_test riêng (xem tests/db/setup.ts).
// Gemini OCR được MOCK (chưa có GEMINI_API_KEY thật) — test chỉ xác nhận
// hành vi route/DB, không gọi Gemini thật.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("../../lib/ocr/gemini", () => ({
  extractCaptureRows: vi.fn(),
}));

import { extractCaptureRows } from "../../lib/ocr/gemini";
import { POST as extractPOST } from "../../app/api/capture/extract/route";
import { POST as confirmPOST } from "../../app/api/capture/confirm/route";
import { isCaptureRowIncomplete } from "../../app/capture/page";
import { prisma } from "../../lib/prisma";
import { COOKIE_NAME, createSessionCookieValue, type Station } from "../../lib/auth";
import { stripPartSuffix } from "../../lib/part";

const RUN = Date.now().toString();
const PART_NO = `TESTPART-CAP-${RUN}`;

beforeAll(async () => {
  await prisma.partControl.create({ data: { partNo: PART_NO, qtyPerBox: 100, client: "Infasco" } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

function travelerNo(suffix: string) {
  return `TESTTR-CAP-${RUN}-${suffix}`;
}

function asNextRequest(req: Request): NextRequest {
  return req as unknown as NextRequest;
}

function makeExtractRequest(destination: string | null, file: File | null) {
  const formData = new FormData();
  if (destination) formData.append("destination", destination);
  if (file) formData.append("file", file);
  return asNextRequest(new Request("http://localhost/api/capture/extract", { method: "POST", body: formData }));
}

// FID-ERP-011 — `sourceStation` giờ đọc từ session (cookie), không còn
// nhận từ body. `station` mặc định "OFFICE" (đủ cho hầu hết test).
function makeConfirmRequest(body: unknown, station: Station = "OFFICE") {
  return asNextRequest(
    new Request("http://localhost/api/capture/confirm", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `${COOKIE_NAME}=${createSessionCookieValue(station)}`,
      },
      body: JSON.stringify(body),
    }),
  );
}

describe("FID-ERP-002 — /api/capture/extract KHÔNG BAO GIỜ ghi DB", () => {
  it("destination='po' — không gọi traveler.upsert / stockMove.create nào", async () => {
    vi.mocked(extractCaptureRows).mockResolvedValueOnce({
      rows: [
        { travelerNo: "718039", partNo: PART_NO, poNo: "PO-1", potNo: null, qty: null, confidence: 0.9, lowConfidenceFields: [] },
      ],
      warnings: [],
    });
    const upsertSpy = vi.spyOn(prisma.traveler, "upsert");
    const createSpy = vi.spyOn(prisma.stockMove, "create");

    const file = new File(["fake"], "po.pdf", { type: "application/pdf" });
    const res = await extractPOST(makeExtractRequest("po", file));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(upsertSpy).not.toHaveBeenCalled();
    expect(createSpy).not.toHaveBeenCalled();
    upsertSpy.mockRestore();
    createSpy.mockRestore();
  });

  it("trả lowConfidenceFields khi OCR không chắc — field đó null, không bịa giá trị", async () => {
    vi.mocked(extractCaptureRows).mockResolvedValueOnce({
      rows: [
        { travelerNo: "718039", partNo: null, poNo: null, potNo: "693", qty: 45000, confidence: 0.4, lowConfidenceFields: ["partNo"] },
      ],
      warnings: [],
    });
    const file = new File(["fake"], "warehouse.pdf", { type: "application/pdf" });
    const res = await extractPOST(makeExtractRequest("warehouse", file));
    const data = await res.json();
    expect(data.rows[0].partNo).toBeNull();
    expect(data.rows[0].lowConfidenceFields).toEqual(["partNo"]);
  });

  it("chặn destination không hợp lệ (400)", async () => {
    const file = new File(["fake"], "x.pdf", { type: "application/pdf" });
    const res = await extractPOST(makeExtractRequest("finishgood", file));
    expect(res.status).toBe(400);
  });

  it("chặn file Excel — chưa hỗ trợ ở FID này (400)", async () => {
    const file = new File(["fake"], "x.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const res = await extractPOST(makeExtractRequest("warehouse", file));
    expect(res.status).toBe(400);
  });
});

describe("FID-ERP-002 — /api/capture/confirm destination='po'", () => {
  it("chỉ travelers thay đổi, KHÔNG có stock_moves mới", async () => {
    const tr = travelerNo("PO1");
    const res = await confirmPOST(
      makeConfirmRequest({
        destination: "po",
        rows: [{ travelerNo: tr, partNo: PART_NO, poNo: "PO-XYZ" }],
        confirmedBy: "111",
      }),
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.saved).toBe(1);
    expect(data.skippedDuplicates).toEqual([]);

    const traveler = await prisma.traveler.findUnique({ where: { travelerNo: tr } });
    expect(traveler?.poNo).toBe("PO-XYZ");
    const moves = await prisma.stockMove.count({ where: { travelerNo: tr } });
    expect(moves).toBe(0);
  });

  // Xác nhận 2026-09-19 bằng chứng từ thật `TRAVELER SHEETS SEP 9.pdf` —
  // "Part#" (có hậu tố, vd "-T") và "Finished Part Number" (mã gốc) là
  // CÙNG 1 sản phẩm cho mục đích part_control. OCR đọc "Part#" (có hậu
  // tố) nhưng phải khớp part_control theo mã gốc, xem lib/part.ts.
  it("Part# OCR có hậu tố (vd '-A') khớp part_control theo mã gốc (Finished Part Number)", async () => {
    const tr = travelerNo("PO-SUFFIX");
    const res = await confirmPOST(
      makeConfirmRequest({
        destination: "po",
        rows: [{ travelerNo: tr, partNo: `${PART_NO}-A`, poNo: "PO-SUFFIX" }],
        confirmedBy: "111",
      }),
    );
    expect(res.status).toBe(200);
    const traveler = await prisma.traveler.findUnique({ where: { travelerNo: tr } });
    expect(traveler?.partNo).toBe(PART_NO);
  });
});

describe("FID-ERP-002 — stripPartSuffix (Finished Part Number)", () => {
  it("cắt hậu tố biết trước (kể cả nhiều hậu tố cộng dồn)", () => {
    expect(stripPartSuffix("11546389-T")).toBe("11546389");
    expect(stripPartSuffix("11549168-CA-IN-B")).toBe("11549168");
    expect(stripPartSuffix("11561645-HT")).toBe("11561645");
  });

  it("KHÔNG cắt dấu '-' là một phần mã gốc thật (không khớp hậu tố biết trước)", () => {
    expect(stripPartSuffix("1015463X-03")).toBe("1015463X-03");
    expect(stripPartSuffix("100-5829")).toBe("100-5829");
    expect(stripPartSuffix("1454548-00-A")).toBe("1454548-00");
  });

  it("Part# không có hậu tố -> giữ nguyên", () => {
    expect(stripPartSuffix("40073474")).toBe("40073474");
  });
});

describe("FID-ERP-002 — /api/capture/confirm destination='warehouse'", () => {
  it("ghi đúng 1 dòng stock_moves RECEIVE + travelers upsert trong 1 transaction", async () => {
    const tr = travelerNo("WH1");
    const res = await confirmPOST(
      makeConfirmRequest({
        destination: "warehouse",
        rows: [{ travelerNo: tr, partNo: PART_NO, potNo: "693", qty: 45000 }],
        confirmedBy: "111",
      }),
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.saved).toBe(1);
    expect(data.moveIds).toHaveLength(1);

    const traveler = await prisma.traveler.findUnique({ where: { travelerNo: tr } });
    expect(traveler?.potNo).toBe("693");
    const moves = await prisma.stockMove.findMany({ where: { travelerNo: tr, moveType: "RECEIVE" } });
    expect(moves).toHaveLength(1);
    expect(moves[0].qty).toBe(45000);
    expect(moves[0].sourceStation).toBe("OFFICE");
  });

  it("rollback nếu 1 trong 2 ghi fail — partNo không tồn tại trong part_control", async () => {
    const tr = travelerNo("WH-FAIL");
    const res = await confirmPOST(
      makeConfirmRequest({
        destination: "warehouse",
        rows: [{ travelerNo: tr, partNo: `KHONG-TON-TAI-${RUN}`, potNo: "1", qty: 10 }],
        confirmedBy: "111",
      }),
    );
    expect(res.status).toBe(500);
    const traveler = await prisma.traveler.findUnique({ where: { travelerNo: tr } });
    expect(traveler).toBeNull();
    const moves = await prisma.stockMove.count({ where: { travelerNo: tr } });
    expect(moves).toBe(0);
  });

  it("đăng nhập trạm FACTORY -> 400, không tới DB (Xưởng không có cổng này, FID-ERP-011)", async () => {
    const tr = travelerNo("WH-FACTORY");
    const res = await confirmPOST(
      makeConfirmRequest(
        {
          destination: "warehouse",
          rows: [{ travelerNo: tr, partNo: PART_NO, potNo: "1", qty: 10 }],
          confirmedBy: "111",
        },
        "FACTORY",
      ),
    );
    expect(res.status).toBe(400);
    const traveler = await prisma.traveler.findUnique({ where: { travelerNo: tr } });
    expect(traveler).toBeNull();
  });

  it("chặn qty <= 0 ở API trước khi chạm CHECK constraint", async () => {
    const tr = travelerNo("WH-QTY0");
    const res = await confirmPOST(
      makeConfirmRequest({
        destination: "warehouse",
        rows: [{ travelerNo: tr, partNo: PART_NO, potNo: "1", qty: 0 }],
        confirmedBy: "111",
      }),
    );
    expect(res.status).toBe(400);
    const traveler = await prisma.traveler.findUnique({ where: { travelerNo: tr } });
    expect(traveler).toBeNull();
  });

  it("Traveler đã có RECEIVE trước đó — cảnh báo trong skippedDuplicates, vẫn ghi thêm dòng mới", async () => {
    const tr = travelerNo("WH-DUP");
    await confirmPOST(
      makeConfirmRequest({
        destination: "warehouse",
        rows: [{ travelerNo: tr, partNo: PART_NO, potNo: "1", qty: 100 }],
        confirmedBy: "111",
      }),
    );

    const res2 = await confirmPOST(
      makeConfirmRequest({
        destination: "warehouse",
        rows: [{ travelerNo: tr, partNo: PART_NO, potNo: "1", qty: 50 }],
        confirmedBy: "111",
      }),
    );
    const data2 = await res2.json();
    expect(data2.skippedDuplicates).toEqual([tr]);
    expect(data2.saved).toBe(1);

    const moves = await prisma.stockMove.findMany({ where: { travelerNo: tr, moveType: "RECEIVE" } });
    expect(moves).toHaveLength(2);
  });
});

// v1.2 (2026-09-19) — nút tắt "PO + Nhận nguyên liệu luôn (bypass)": scan
// lại chính file PO, đọc Pieces làm qty RECEIVE luôn, dùng chung code path
// với "warehouse" nhưng upsert Traveler CÓ THÊM poNo. Andy xác nhận cả
// OFFICE lẫn ADMIN dùng được, không cần đánh dấu audit riêng.
describe("FID-ERP-002 v1.2 — /api/capture/confirm destination='po_receive'", () => {
  it("ghi RECEIVE + poNo trong 1 transaction (khác 'warehouse' — có thêm poNo)", async () => {
    const tr = travelerNo("POR1");
    const res = await confirmPOST(
      makeConfirmRequest({
        destination: "po_receive",
        rows: [{ travelerNo: tr, partNo: PART_NO, poNo: "PO-BYPASS-1", potNo: "693", qty: 45000 }],
        confirmedBy: "111",
      }),
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.saved).toBe(1);
    expect(data.moveIds).toHaveLength(1);

    const traveler = await prisma.traveler.findUnique({ where: { travelerNo: tr } });
    expect(traveler?.poNo).toBe("PO-BYPASS-1");
    expect(traveler?.potNo).toBe("693");
    const moves = await prisma.stockMove.findMany({ where: { travelerNo: tr, moveType: "RECEIVE" } });
    expect(moves).toHaveLength(1);
    expect(moves[0].qty).toBe(45000);
  });

  it("đăng nhập trạm FACTORY -> 400 (giống 'warehouse', Xưởng không có cổng này)", async () => {
    const tr = travelerNo("POR-FACTORY");
    const res = await confirmPOST(
      makeConfirmRequest(
        {
          destination: "po_receive",
          rows: [{ travelerNo: tr, partNo: PART_NO, poNo: "PO-X", potNo: "1", qty: 10 }],
          confirmedBy: "111",
        },
        "FACTORY",
      ),
    );
    expect(res.status).toBe(400);
    const traveler = await prisma.traveler.findUnique({ where: { travelerNo: tr } });
    expect(traveler).toBeNull();
  });

  it("chặn qty <= 0 ở API trước khi chạm CHECK constraint", async () => {
    const tr = travelerNo("POR-QTY0");
    const res = await confirmPOST(
      makeConfirmRequest({
        destination: "po_receive",
        rows: [{ travelerNo: tr, partNo: PART_NO, poNo: "PO-X", potNo: "1", qty: 0 }],
        confirmedBy: "111",
      }),
    );
    expect(res.status).toBe(400);
    const traveler = await prisma.traveler.findUnique({ where: { travelerNo: tr } });
    expect(traveler).toBeNull();
  });

  it("không gửi poNo (rỗng) -> KHÔNG xoá poNo đã có từ trước (chỉ set khi thật sự có giá trị)", async () => {
    const tr = travelerNo("POR-KEEP-PO");
    await confirmPOST(
      makeConfirmRequest({
        destination: "po",
        rows: [{ travelerNo: tr, partNo: PART_NO, poNo: "PO-GIU-LAI" }],
        confirmedBy: "111",
      }),
    );
    const res2 = await confirmPOST(
      makeConfirmRequest({
        destination: "warehouse",
        rows: [{ travelerNo: tr, partNo: PART_NO, potNo: "1", qty: 100 }],
        confirmedBy: "111",
      }),
    );
    expect(res2.status).toBe(200);
    const traveler = await prisma.traveler.findUnique({ where: { travelerNo: tr } });
    expect(traveler?.poNo).toBe("PO-GIU-LAI");
  });
});

describe("FID-ERP-002 — UI: nút Xác nhận & Lưu disable khi field bắt buộc trống", () => {
  it("warehouse: thiếu travelerNo/partNo/qty -> incomplete", () => {
    expect(isCaptureRowIncomplete({ travelerNo: "", partNo: "P", poNo: null, potNo: null, qty: 1, confidence: 1, lowConfidenceFields: [] }, "warehouse")).toBe(true);
    expect(isCaptureRowIncomplete({ travelerNo: "T", partNo: "", poNo: null, potNo: null, qty: 1, confidence: 1, lowConfidenceFields: [] }, "warehouse")).toBe(true);
    expect(isCaptureRowIncomplete({ travelerNo: "T", partNo: "P", poNo: null, potNo: null, qty: null, confidence: 1, lowConfidenceFields: [] }, "warehouse")).toBe(true);
    expect(isCaptureRowIncomplete({ travelerNo: "T", partNo: "P", poNo: null, potNo: null, qty: 0, confidence: 1, lowConfidenceFields: [] }, "warehouse")).toBe(true);
  });

  it("warehouse: đủ travelerNo/partNo/qty > 0 -> complete", () => {
    expect(isCaptureRowIncomplete({ travelerNo: "T", partNo: "P", poNo: null, potNo: "693", qty: 45000, confidence: 1, lowConfidenceFields: [] }, "warehouse")).toBe(false);
  });

  it("po: chỉ cần travelerNo/partNo (không cần qty)", () => {
    expect(isCaptureRowIncomplete({ travelerNo: "T", partNo: "P", poNo: "PO-1", potNo: null, qty: null, confidence: 1, lowConfidenceFields: [] }, "po")).toBe(false);
    expect(isCaptureRowIncomplete({ travelerNo: "", partNo: "P", poNo: "PO-1", potNo: null, qty: null, confidence: 1, lowConfidenceFields: [] }, "po")).toBe(true);
  });

  it("po_receive (v1.2): giống warehouse — cần qty > 0 dù có poNo", () => {
    expect(isCaptureRowIncomplete({ travelerNo: "T", partNo: "P", poNo: "PO-1", potNo: "693", qty: null, confidence: 1, lowConfidenceFields: [] }, "po_receive")).toBe(true);
    expect(isCaptureRowIncomplete({ travelerNo: "T", partNo: "P", poNo: "PO-1", potNo: "693", qty: 45000, confidence: 1, lowConfidenceFields: [] }, "po_receive")).toBe(false);
  });
});
