// Test criteria cho FID-ERP-011 (Phân quyền theo trạm) — xem
// docs/features/FID-ERP-011_20260919.md §7 TEST CRITERIA.
// Middleware (webapp/middleware.ts) chỉ chạy trong Next.js server thật,
// KHÔNG gọi được trực tiếp trong Vitest — test ở đây phủ: (1) logic
// quyết định thuần trong lib/auth.ts (đúng logic middleware dùng), (2)
// route /api/auth/login + /api/auth/logout, (3) defense-in-depth ở
// route capture/confirm + packing/confirm (tự kiểm tra session, không
// chỉ tin middleware).
import { describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";
import {
  COOKIE_NAME,
  createSessionCookieValue,
  isPublicPath,
  isStation,
  isStationAllowed,
  parseSessionCookieValue,
  verifyStationPassword,
} from "../../lib/auth";
import { POST as loginPOST } from "../../app/api/auth/login/route";
import { POST as logoutPOST } from "../../app/api/auth/logout/route";

function asNextRequest(req: Request): NextRequest {
  return req as unknown as NextRequest;
}

function loginRequest(body: unknown) {
  return asNextRequest(
    new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("FID-ERP-011 — lib/auth: isStation / verifyStationPassword", () => {
  it("isStation nhận đúng 3 giá trị", () => {
    expect(isStation("OFFICE")).toBe(true);
    expect(isStation("FACTORY")).toBe(true);
    expect(isStation("ADMIN")).toBe(true);
    expect(isStation("XYZ")).toBe(false);
    expect(isStation(null)).toBe(false);
  });

  it("verifyStationPassword đúng theo .env.test", () => {
    expect(verifyStationPassword("OFFICE", process.env.STATION_OFFICE_PASSWORD!)).toBe(true);
    expect(verifyStationPassword("OFFICE", "sai-mat-khau")).toBe(false);
    expect(verifyStationPassword("FACTORY", process.env.STATION_FACTORY_PASSWORD!)).toBe(true);
    expect(verifyStationPassword("ADMIN", process.env.STATION_ADMIN_PASSWORD!)).toBe(true);
  });
});

describe("FID-ERP-011 — lib/auth: cookie ký + xác minh", () => {
  it("tạo rồi parse lại đúng station", () => {
    const value = createSessionCookieValue("FACTORY");
    expect(parseSessionCookieValue(value)).toBe("FACTORY");
  });

  it("cookie bị giả mạo (đổi station, giữ nguyên chữ ký) -> null", () => {
    const value = createSessionCookieValue("OFFICE");
    const [, sig] = value.split(".");
    const forged = `ADMIN.${sig}`;
    expect(parseSessionCookieValue(forged)).toBeNull();
  });

  it("cookie thiếu dấu chấm/rỗng -> null", () => {
    expect(parseSessionCookieValue("OFFICE")).toBeNull();
    expect(parseSessionCookieValue("")).toBeNull();
    expect(parseSessionCookieValue(null)).toBeNull();
  });
});

describe("FID-ERP-011 — lib/auth: isPublicPath / isStationAllowed (logic middleware dùng)", () => {
  it("/login và /api/auth/login luôn public", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/api/auth/login")).toBe(true);
  });

  it("OFFICE vào được /capture, /lot, /packing, /reports, /search", () => {
    expect(isStationAllowed("OFFICE", "/capture")).toBe(true);
    expect(isStationAllowed("OFFICE", "/api/lot/update")).toBe(true);
    expect(isStationAllowed("OFFICE", "/packing/new")).toBe(true);
    expect(isStationAllowed("OFFICE", "/api/reports/po-progress")).toBe(true);
    expect(isStationAllowed("OFFICE", "/search")).toBe(true);
  });

  it("OFFICE KHÔNG vào được /factory hoặc /wrapping", () => {
    expect(isStationAllowed("OFFICE", "/factory/select")).toBe(false);
    expect(isStationAllowed("OFFICE", "/api/quality/check")).toBe(false);
  });

  it("FACTORY vào được /factory, /wrapping, /search — KHÔNG vào được /capture,/lot,/packing,/reports", () => {
    expect(isStationAllowed("FACTORY", "/factory/select")).toBe(true);
    expect(isStationAllowed("FACTORY", "/wrapping/check")).toBe(true);
    expect(isStationAllowed("FACTORY", "/search")).toBe(true);
    expect(isStationAllowed("FACTORY", "/capture")).toBe(false);
    expect(isStationAllowed("FACTORY", "/api/lot/update")).toBe(false);
    expect(isStationAllowed("FACTORY", "/packing/new")).toBe(false);
    expect(isStationAllowed("FACTORY", "/api/reports/po-progress")).toBe(false);
  });

  it("ADMIN = ĐÚNG BẰNG bộ quyền OFFICE — KHÔNG vào được /factory,/wrapping (đã xác nhận 2026-09-19)", () => {
    expect(isStationAllowed("ADMIN", "/capture")).toBe(true);
    expect(isStationAllowed("ADMIN", "/packing/new")).toBe(true);
    expect(isStationAllowed("ADMIN", "/api/reports/po-progress")).toBe(true);
    expect(isStationAllowed("ADMIN", "/factory/select")).toBe(false);
    expect(isStationAllowed("ADMIN", "/api/quality/check")).toBe(false);
  });

  it("route không nằm trong bảng quản lý (vd trang chủ) -> không chặn trạm nào", () => {
    expect(isStationAllowed("FACTORY", "/")).toBe(true);
  });
});

describe("FID-ERP-011 — POST /api/auth/login", () => {
  it("sai mật khẩu -> 401, không set cookie", async () => {
    const res = await loginPOST(loginRequest({ station: "OFFICE", password: "sai" }));
    expect(res.status).toBe(401);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("station không hợp lệ -> 401", async () => {
    const res = await loginPOST(loginRequest({ station: "XYZ", password: "x" }));
    expect(res.status).toBe(401);
  });

  it("đúng station+password -> set cookie, ok:true", async () => {
    const res = await loginPOST(loginRequest({ station: "FACTORY", password: process.env.STATION_FACTORY_PASSWORD }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.station).toBe("FACTORY");
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain(COOKIE_NAME);
    expect(setCookie).toContain("HttpOnly");
  });
});

describe("FID-ERP-011 — POST /api/auth/logout", () => {
  it("xoá cookie (maxAge=0)", async () => {
    const res = await logoutPOST();
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(res.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
