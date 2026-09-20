// Test hàm thuần lib/factoryEntry.ts — FID-ERP-003 v1.4 Mục 13.5.
import { describe, expect, it } from "vitest";
import {
  buildDefects,
  computeTotal,
  notDivisibleWarning,
  partMatches,
  sortDefectTypesByPaper,
  suggestPackAll,
} from "../../lib/factoryEntry";

describe("FID-ERP-003 v1.4 — computeTotal", () => {
  it("11 thùng × 2700 = 29700 (tờ Traveler 718960 thật)", () => {
    expect(computeTotal(11, 2700)).toBe(29700);
  });
  it("27 thùng × 4500 = 121500 (tem tờ 718039 thật)", () => {
    expect(computeTotal(27, 4500)).toBe(121500);
  });
  it("đầu vào rỗng/không hợp lệ -> null", () => {
    expect(computeTotal(null, 2700)).toBeNull();
    expect(computeTotal(11, null)).toBeNull();
    expect(computeTotal(0, 2700)).toBeNull();
    expect(computeTotal(-3, 2700)).toBeNull();
    expect(computeTotal(2.5, 2700)).toBeNull();
  });
});

describe("FID-ERP-003 v1.4 — partMatches (Part# scan đối chiếu)", () => {
  it("Part# in trên tờ có hậu tố khớp mã gốc trong DB", () => {
    expect(partMatches("11546456-A", "11546456")).toBe(true);
    expect(partMatches("11546389-T", "11546389")).toBe(true);
  });
  it("không phân biệt hoa/thường", () => {
    expect(partMatches("11546456-a", "11546456")).toBe(true);
  });
  it("khác mã gốc -> sai", () => {
    expect(partMatches("11546457-A", "11546456")).toBe(false);
  });
});

describe("FID-ERP-003 v1.4 — buildDefects (bảng liệt kê sẵn theo tờ giấy)", () => {
  it("chỉ giữ dòng có qty > 0, đúng dòng Stuck Together", () => {
    const rows = [
      { reasonCode: "LOOSE_WASHER_NUT", qty: null },
      { reasonCode: "DAMAGED_PILOT", qty: undefined },
      { reasonCode: "STUCK_TOGETHER", qty: 2000 },
      { reasonCode: "OTHERS", qty: 0 },
    ];
    expect(buildDefects(rows)).toEqual([{ reasonCode: "STUCK_TOGETHER", qty: 2000 }]);
  });
  it("không có dòng nào -> mảng rỗng", () => {
    expect(buildDefects([{ reasonCode: "MIXED", qty: null }])).toEqual([]);
  });
});

describe("FID-ERP-003 v1.4 — sortDefectTypesByPaper", () => {
  it("xếp đúng thứ tự tờ giấy, mã lạ đứng cuối", () => {
    const sorted = sortDefectTypesByPaper([
      { code: "OTHERS" },
      { code: "NEW_ONE" },
      { code: "STUCK_TOGETHER" },
      { code: "LOOSE_WASHER_NUT" },
    ]);
    expect(sorted.map((t) => t.code)).toEqual(["LOOSE_WASHER_NUT", "STUCK_TOGETHER", "OTHERS", "NEW_ONE"]);
  });
});

describe("FID-ERP-003 v1.4 — notDivisibleWarning", () => {
  it("chia hết -> null; không chia hết -> có nội dung", () => {
    expect(notDivisibleWarning(29700, 2700)).toBeNull();
    expect(notDivisibleWarning(29000, 2700)).toContain("không chia hết");
  });
});

describe("FID-ERP-005 v1.5 — suggestPackAll (gợi ý 'Đóng hết')", () => {
  it("còn 4800, 150/thùng -> 32 thùng · 4800 (Traveler demo 718779)", () => {
    expect(suggestPackAll(4800, 150)).toEqual({ boxes: 32, qty: 4800 });
  });
  it("không chia hết -> null (không gợi ý thùng lẻ)", () => {
    expect(suggestPackAll(4850, 150)).toBeNull();
  });
  it("đầu vào rỗng/không hợp lệ -> null", () => {
    expect(suggestPackAll(0, 150)).toBeNull();
    expect(suggestPackAll(-5, 150)).toBeNull();
    expect(suggestPackAll(4800, null)).toBeNull();
    expect(suggestPackAll(null, 150)).toBeNull();
  });
});
