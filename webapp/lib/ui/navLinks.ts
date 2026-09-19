// FID-ERP-014 §4a — danh sách link điều hướng DÙNG CHUNG cho NavBar và
// trang chủ (không viết 2 lần). Nhóm theo mô hình Odoo Operations/
// Reporting — xem docs/features/FID-ERP-014_20260919.md §2b.
// CHỈ dùng ở Server Component (import `../auth` có `crypto`, không bundle
// được cho client) — nếu cần ở client component, truyền kết quả đã lọc
// xuống qua props, đừng import file này trực tiếp từ "use client".
import { isStationAllowed, type Station } from "../auth";

export type NavGroup = { title: string; links: { path: string; label: string }[] };

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Nhập liệu",
    links: [
      { path: "/capture", label: "Quét/Nhập PO+Kho" },
      { path: "/factory/select", label: "Trạm Xưởng" },
      { path: "/wrapping/check", label: "Wrapping" },
      { path: "/lot/update", label: "Cập nhật Lot" },
      { path: "/packing/new", label: "Packing Slip" },
    ],
  },
  {
    title: "Báo cáo",
    links: [
      { path: "/reports/po-progress", label: "Báo cáo PO" },
      { path: "/reports/production", label: "Báo cáo sản xuất" },
    ],
  },
];

// Nhóm không còn link nào sau khi lọc quyền -> loại luôn cả nhóm, không
// hiện tiêu đề nhóm rỗng (xem FID-ERP-014 §4a).
export function filterNavGroups(station: Station): NavGroup[] {
  return NAV_GROUPS.map((g) => ({ title: g.title, links: g.links.filter((l) => isStationAllowed(station, l.path)) })).filter(
    (g) => g.links.length > 0,
  );
}
