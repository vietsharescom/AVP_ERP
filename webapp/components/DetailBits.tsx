// FID-ERP-015 — mảnh giao diện dùng chung cho 3 trang chi tiết chỉ đọc
// (Server Component, không state). Style inline theo tokens như các trang khác.
import type { CSSProperties, ReactNode } from "react";
import { tokens } from "../lib/ui/tokens";

export function fmtDateTime(d: Date): string {
  return d.toLocaleString("sv-SE").slice(0, 16); // YYYY-MM-DD HH:mm, giờ máy chủ
}

export function fmtNum(n: number): string {
  return n.toLocaleString("en-US");
}

export const tableStyle: CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 13 };
export const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "6px 8px",
  borderBottom: `2px solid ${tokens.color.border}`,
  fontSize: 12,
  color: tokens.color.textMuted,
  whiteSpace: "nowrap",
};
export const tdStyle: CSSProperties = { padding: "5px 8px", borderBottom: `1px solid ${tokens.color.border}`, verticalAlign: "top" };

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{title}</h2>
      <div style={{ overflowX: "auto" }}>{children}</div>
    </section>
  );
}

export function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ minWidth: 130 }}>
      <div style={{ fontSize: 12, color: tokens.color.textMuted }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 600, minHeight: 20 }}>{value ?? ""}</div>
    </div>
  );
}

export function FactGrid({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: 12,
        border: `1px solid ${tokens.color.border}`,
        borderRadius: 6,
        padding: 12,
        marginBottom: 20,
      }}
    >
      {children}
    </div>
  );
}
