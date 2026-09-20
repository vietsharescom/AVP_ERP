// FID-ERP-003 v1.4 / FID-ERP-005 v1.5 — kiểu dáng dùng CHUNG cho 2 trang
// nhập liệu Xưởng (`/factory/select`, `/wrapping/check`), bố cục giống tờ
// giấy: khối có tiêu đề (fieldset), ô XÁM = tự có từ DB (không gõ), ô VÀNG
// = còn thiếu, copy từ giấy vào.
import type { CSSProperties } from "react";
import { tokens } from "./tokens";

export const AUTO_BG = "#f3f4f6";
export const FILL_BG = "#fef9c3";

export const labelStyle: CSSProperties = { display: "block", fontSize: 13, fontWeight: 600 };
export const fieldStyle: CSSProperties = { display: "block", width: "100%", boxSizing: "border-box", padding: 4 };
export const blockStyle: CSSProperties = {
  border: `1px solid ${tokens.color.border}`,
  borderRadius: 6,
  padding: 12,
  marginBottom: 16,
};
export const legendStyle: CSSProperties = { fontSize: 14, fontWeight: 700, padding: "0 6px" };
export const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: 12,
};
