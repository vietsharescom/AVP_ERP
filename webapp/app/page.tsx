// FID-ERP-014 §4c — trang chủ: Search là TRỌNG TÂM (khối đầu tiên/to
// nhất), "Việc cần làm" làm phụ bên dưới, danh sách link đầy đủ cuối
// cùng — đúng thứ tự ưu tiên nhu cầu thật của user (luôn cần TÌM trước).
// Server Component — đọc cookie + gọi thẳng lib report (không tự fetch
// API của chính mình), tính "Việc cần làm" chỉ khi station có quyền
// /reports/* (OFFICE/ADMIN).
import { cookies } from "next/headers";
import Link from "next/link";
import PageContainer from "../components/PageContainer";
import { COOKIE_NAME, parseSessionCookieValue } from "../lib/auth";
import { listOpenPoProgress } from "../lib/reports/poProgress";
import { getProductionReport } from "../lib/reports/productionReport";
import { tokens } from "../lib/ui/tokens";
import { filterNavGroups } from "../lib/ui/navLinks";

type TodoStats = { outstandingPos: number; overduePos: number; reworkTravelers: number; awaitingShipment: number };

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

async function loadTodoStats(): Promise<TodoStats> {
  const today = todayIso();
  const [poReports, production] = await Promise.all([
    listOpenPoProgress(),
    getProductionReport({ from: today, to: today, groupBy: "day" }),
  ]);
  return {
    outstandingPos: poReports.length,
    overduePos: poReports.filter((r) => r.isOverdue).length,
    reworkTravelers: poReports.reduce((sum, r) => sum + r.reworkTravelers.length, 0),
    awaitingShipment: production.finished_goods_awaiting_shipment,
  };
}

function TodoTile({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      style={{
        display: "block",
        border: `1px solid ${tokens.color.border}`,
        borderRadius: 6,
        padding: 12,
        minWidth: 140,
        textDecoration: "none",
        color: tokens.color.text,
      }}
    >
      <div style={{ fontSize: 12, color: tokens.color.textMuted }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 600 }}>{value}</div>
    </Link>
  );
}

export default async function HomePage() {
  const cookieStore = await cookies();
  const station = parseSessionCookieValue(cookieStore.get(COOKIE_NAME)?.value);

  const canSeeReports = station === "OFFICE" || station === "ADMIN";
  const [todo, groups] = await Promise.all([
    canSeeReports ? loadTodoStats() : Promise.resolve(null),
    Promise.resolve(station ? filterNavGroups(station) : []),
  ]);

  return (
    <PageContainer>
      {/* Ô search chính đã hiện to sẵn ở đầu trang (SearchBarSlot trong
          layout.tsx, tự phóng to khi ở "/" — KHÔNG lặp lại component ở
          đây, xem FID-ERP-014 §4c/4d, sửa sau khi phát hiện 2 ô chồng
          nhau lúc kiểm tra bằng trình duyệt thật). */}

      {todo && (
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", color: tokens.color.textMuted, marginBottom: 8 }}>
            Việc cần làm
          </h2>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <TodoTile label="PO tồn đọng" value={todo.outstandingPos} href="/reports/po-progress" />
            <TodoTile label="PO trễ hạn" value={todo.overduePos} href="/reports/po-progress" />
            <TodoTile label="Traveler rework" value={todo.reworkTravelers} href="/reports/po-progress" />
            <TodoTile label="Chờ xuất hàng" value={todo.awaitingShipment} href="/reports/production" />
          </div>
        </section>
      )}

      {groups.length > 0 && (
        <section>
          <h2 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", color: tokens.color.textMuted, marginBottom: 8 }}>
            Danh sách trang
          </h2>
          {groups.map((g) => (
            <div key={g.title} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{g.title}</div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {g.links.map((l) => (
                  <Link key={l.path} href={l.path} style={{ color: tokens.color.accent, fontSize: 14 }}>
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </PageContainer>
  );
}
