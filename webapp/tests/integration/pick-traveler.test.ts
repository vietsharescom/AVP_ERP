// Test FID-ERP-015 — sự kiện chọn Traveler từ ô tìm kiếm chung (không cần DOM:
// dùng EventTarget của Node làm `window` giả).
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PICK_TRAVELER_EVENT, requestPickTraveler } from "../../lib/ui/pickTraveler";

let fakeWindow: EventTarget;

beforeEach(() => {
  fakeWindow = new EventTarget();
  (globalThis as unknown as { window: EventTarget }).window = fakeWindow;
});

afterEach(() => {
  delete (globalThis as unknown as { window?: EventTarget }).window;
});

describe("FID-ERP-015 — requestPickTraveler", () => {
  it("không có trang nào lắng nghe -> false (ô tìm kiếm sẽ mở trang chi tiết)", () => {
    expect(requestPickTraveler("718612")).toBe(false);
  });

  it("có trang xử lý (preventDefault) -> true và nhận đúng travelerNo", () => {
    const received: string[] = [];
    fakeWindow.addEventListener(PICK_TRAVELER_EVENT, (e) => {
      received.push((e as CustomEvent<{ travelerNo: string }>).detail.travelerNo);
      e.preventDefault();
    });
    expect(requestPickTraveler("718612")).toBe(true);
    expect(received).toEqual(["718612"]);
  });

  it("listener KHÔNG gọi preventDefault -> vẫn false (coi như chưa xử lý)", () => {
    fakeWindow.addEventListener(PICK_TRAVELER_EVENT, () => {});
    expect(requestPickTraveler("718612")).toBe(false);
  });
});
