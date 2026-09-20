// FID-ERP-011 — đăng nhập theo TRẠM (Office/Factory/Admin), KHÔNG phải
// tài khoản cá nhân (xem docs/features/FID-ERP-011_20260919.md §2 WHY).
// Mật khẩu chung mỗi trạm trong .env, cookie ký bằng HMAC (không cần
// bảng users/session trong DB — quy mô nhỏ, LAN nội bộ).
import { createHmac, timingSafeEqual } from "crypto";

export type Station = "OFFICE" | "FACTORY" | "ADMIN";
const STATIONS: Station[] = ["OFFICE", "FACTORY", "ADMIN"];

export const COOKIE_NAME = "avp_station";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12; // 12 giờ — tạm, xem FID-ERP-011 §8

export function isStation(value: unknown): value is Station {
  return typeof value === "string" && (STATIONS as string[]).includes(value);
}

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET chưa cấu hình trong .env.");
  return secret;
}

function sign(station: Station): string {
  return createHmac("sha256", sessionSecret()).update(station).digest("hex");
}

// Mật khẩu TRẠM dùng chung (không phải mật khẩu người dùng cá nhân) —
// so sánh trực tiếp với giá trị trong .env, KHÔNG hash (không có bảng
// users để lưu hash, xem FID-ERP-011 §5 RULES).
export function verifyStationPassword(station: Station, password: string): boolean {
  const expected = process.env[`STATION_${station}_PASSWORD`];
  if (!expected) return false;
  return password === expected;
}

export function createSessionCookieValue(station: Station): string {
  return `${station}.${sign(station)}`;
}

// Xác minh cookie ký đúng — KHÔNG tin giá trị station trong cookie nếu
// chữ ký sai (tránh giả mạo `avp_station=ADMIN.xxx` tuỳ tiện).
export function parseSessionCookieValue(value: string | undefined | null): Station | null {
  if (!value) return null;
  const dotIndex = value.indexOf(".");
  if (dotIndex < 0) return null;
  const station = value.slice(0, dotIndex);
  const signature = value.slice(dotIndex + 1);
  if (!isStation(station) || signature === "") return null;

  const expected = sign(station);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  return timingSafeEqual(a, b) ? station : null;
}

// Đọc trực tiếp header `Cookie` (không dùng `NextRequest.cookies` để hàm
// này dùng được với CẢ `NextRequest` thật LẪN `Request` thuần trong test
// — tests dựng `new Request(...)` rồi cast sang `NextRequest`, không có
// `.cookies`).
export function getStationFromRequest(req: { headers: Headers }): Station | null {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;
  const prefix = `${COOKIE_NAME}=`;
  const raw = cookieHeader
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(prefix));
  if (!raw) return null;
  return parseSessionCookieValue(decodeURIComponent(raw.slice(prefix.length)));
}

type RouteRule = { prefix: string; stations: Station[] };

// Bảng phân quyền theo trạm — đúng SOFTWARE_ARCHITECTURE.md §2.1. ADMIN
// = ĐÚNG BẰNG bộ quyền OFFICE (đã xác nhận 2026-09-19: Admin KHÔNG tự
// nhập liệu Xưởng, chỉ xem/báo cáo) — KHÔNG phải superset tuyệt đối.
const OFFICE_ADMIN_PREFIXES = ["/capture", "/lot", "/packing", "/reports"];
const OFFICE_ADMIN_API_PREFIXES = ["/api/capture", "/api/lot", "/api/packing", "/api/reports"];
const FACTORY_PREFIXES = ["/factory", "/wrapping"];
const FACTORY_API_PREFIXES = ["/api/factory", "/api/quality"];

const ROUTE_RULES: RouteRule[] = [
  ...OFFICE_ADMIN_PREFIXES.map((prefix) => ({ prefix, stations: ["OFFICE", "ADMIN"] as Station[] })),
  ...OFFICE_ADMIN_API_PREFIXES.map((prefix) => ({ prefix, stations: ["OFFICE", "ADMIN"] as Station[] })),
  ...FACTORY_PREFIXES.map((prefix) => ({ prefix, stations: ["FACTORY"] as Station[] })),
  ...FACTORY_API_PREFIXES.map((prefix) => ({ prefix, stations: ["FACTORY"] as Station[] })),
  { prefix: "/search", stations: ["OFFICE", "FACTORY", "ADMIN"] },
  { prefix: "/api/search", stations: ["OFFICE", "FACTORY", "ADMIN"] },
  // FID-ERP-015 — trang chi tiết chỉ đọc (Traveler/PS/Part#), đối xứng như ô search.
  { prefix: "/view", stations: ["OFFICE", "FACTORY", "ADMIN"] },
];

export const PUBLIC_PATH_PREFIXES = ["/login", "/api/auth/login", "/_next", "/favicon.ico"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function findRouteRule(pathname: string): RouteRule | null {
  return ROUTE_RULES.find((rule) => matchesPrefix(pathname, rule.prefix)) ?? null;
}

// `true` khi route KHÔNG nằm trong bảng quản lý (vd "/", trang chủ) —
// không chặn những gì chưa được liệt kê rõ ràng.
export function isStationAllowed(station: Station, pathname: string): boolean {
  const rule = findRouteRule(pathname);
  if (!rule) return true;
  return rule.stations.includes(station);
}
