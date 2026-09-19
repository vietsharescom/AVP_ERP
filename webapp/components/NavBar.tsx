// FID-ERP-014 §4a — menu điều hướng. Server Component — đọc cookie
// session qua `next/headers`, lọc link ĐÚNG bảng phân quyền đã có (xem
// lib/ui/navLinks.ts -> isStationAllowed, FID-ERP-011), KHÔNG viết bảng
// phân quyền riêng lần 2.
import { cookies } from "next/headers";
import { COOKIE_NAME, parseSessionCookieValue } from "../lib/auth";
import { filterNavGroups } from "../lib/ui/navLinks";
import NavBarClient from "./NavBarClient";

export default async function NavBar() {
  const cookieStore = await cookies();
  const station = parseSessionCookieValue(cookieStore.get(COOKIE_NAME)?.value);

  if (!station) return null;

  return <NavBarClient station={station} groups={filterNavGroups(station)} />;
}
