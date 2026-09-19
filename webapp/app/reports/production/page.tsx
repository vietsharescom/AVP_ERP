"use client";

// FID-ERP-012 — Báo cáo sản xuất Xưởng. Bảng số liệu trước (biểu đồ cụ
// thể quyết định sau, xem FID-ERP-012 §8 NOT IN SCOPE).
import { useEffect, useState } from "react";
import PageContainer from "../../../components/PageContainer";

type MachineQty = { machine_code: string; qty: number };
type ProductionBucket = { date: string; qty: number; by_machine: MachineQty[] };
type DefectReason = { reason: string; qty: number };

type ProductionData = {
  production: ProductionBucket[];
  defects: { scrap_qty: number; return_qty: number; by_reason: DefectReason[] };
  travelers_open_at_day_start: number;
  finished_goods_awaiting_shipment: number;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoIso(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default function ProductionReportPage() {
  const [from, setFrom] = useState(daysAgoIso(30));
  const [to, setTo] = useState(todayIso());
  const [groupBy, setGroupBy] = useState<"day" | "month" | "year">("day");
  const [data, setData] = useState<ProductionData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    const res = await fetch(`/api/reports/production?from=${from}&to=${to}&groupBy=${groupBy}`);
    const json = await res.json();
    if (!res.ok || !json.ok) {
      setError(json.error || "Không tải được báo cáo.");
      setData(null);
      return;
    }
    setData(json.data);
  }

  useEffect(() => {
    fetch(`/api/reports/production?from=${from}&to=${to}&groupBy=${groupBy}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.ok) setData(json.data);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PageContainer>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>🏭 Báo cáo sản xuất Xưởng</h1>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>
        Sản lượng theo ngày/máy, hàng lỗi/hỏng/trả lại, Traveler tồn đọng, thành phẩm chờ xuất.
      </p>

      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <label>
          Từ <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          Đến <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <label>
          Nhóm theo{" "}
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as "day" | "month" | "year")}>
            <option value="day">Ngày</option>
            <option value="month">Tháng</option>
            <option value="year">Năm</option>
          </select>
        </label>
        <button onClick={load}>Xem</button>
      </div>

      {data && (
        <>
          <section style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
            <div style={{ border: "1px solid #ddd", borderRadius: 6, padding: 12, minWidth: 160 }}>
              <div style={{ fontSize: 12, color: "#666" }}>Hàng lỗi/hỏng (SCRAP)</div>
              <div style={{ fontSize: 22, fontWeight: 600 }}>{data.defects.scrap_qty}</div>
            </div>
            <div style={{ border: "1px solid #ddd", borderRadius: 6, padding: 12, minWidth: 160 }}>
              <div style={{ fontSize: 12, color: "#666" }}>Hàng trả lại (RETURN)</div>
              <div style={{ fontSize: 22, fontWeight: 600 }}>{data.defects.return_qty}</div>
            </div>
            <div style={{ border: "1px solid #ddd", borderRadius: 6, padding: 12, minWidth: 160 }}>
              <div style={{ fontSize: 12, color: "#666" }}>Traveler tồn đầu kỳ</div>
              <div style={{ fontSize: 22, fontWeight: 600 }}>{data.travelers_open_at_day_start}</div>
            </div>
            <div style={{ border: "1px solid #ddd", borderRadius: 6, padding: 12, minWidth: 160 }}>
              <div style={{ fontSize: 12, color: "#666" }}>Thành phẩm chờ xuất</div>
              <div style={{ fontSize: 22, fontWeight: 600 }}>{data.finished_goods_awaiting_shipment}</div>
            </div>
          </section>

          <section style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Sản lượng theo {groupBy === "day" ? "ngày" : groupBy === "month" ? "tháng" : "năm"}</h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
                    <th style={{ padding: 4 }}>Ngày</th>
                    <th style={{ padding: 4 }}>Tổng</th>
                    <th style={{ padding: 4 }}>Theo máy</th>
                  </tr>
                </thead>
                <tbody>
                  {data.production.map((p) => (
                    <tr key={p.date} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: 4 }}>{p.date}</td>
                      <td style={{ padding: 4, fontWeight: 600 }}>{p.qty}</td>
                      <td style={{ padding: 4, color: "#555" }}>
                        {p.by_machine.length === 0
                          ? "—"
                          : p.by_machine.map((m) => `${m.machine_code}: ${m.qty}`).join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {data.defects.by_reason.length > 0 && (
            <section>
              <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Lỗi/hỏng theo lý do</h2>
              <ul style={{ fontSize: 13 }}>
                {data.defects.by_reason.map((r) => (
                  <li key={r.reason}>
                    {r.reason}: {r.qty}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </PageContainer>
  );
}
