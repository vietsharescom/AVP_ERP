"use client";

// FID-ERP-006 — dán nguyên văn email Infasco, tách cặp Traveler#+Lot#
// bằng regex (KHÔNG AI), xem lại rồi xác nhận cập nhật hàng loạt.
import { useState } from "react";
import PageContainer from "../../../components/PageContainer";

type Match = { travelerNo: string; lotNo: string };

type RowState = Match & { saved: boolean; error: string | null };

export default function LotUpdatePage() {
  const [emailText, setEmailText] = useState("");
  const [rows, setRows] = useState<RowState[]>([]);
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [updatedBy, setUpdatedBy] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [concessionTraveler, setConcessionTraveler] = useState("");
  const [concessionBy, setConcessionBy] = useState("");
  const [concessionReason, setConcessionReason] = useState("");
  const [concessionResult, setConcessionResult] = useState<string | null>(null);

  async function parseEmail() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/lot/parse-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailText }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Tách email thất bại.");
      setRows(data.matches.map((m: Match) => ({ ...m, saved: false, error: null })));
      setUnmatched(data.unmatched);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra.");
    } finally {
      setLoading(false);
    }
  }

  function updateRow(idx: number, patch: Partial<Match>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch, saved: false, error: null } : r)));
  }

  async function confirmAll() {
    if (updatedBy.trim() === "") {
      setError("Cần điền 'Người xác nhận' trước khi lưu.");
      return;
    }
    setSaving(true);
    setError(null);
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.saved) continue;
      try {
        const res = await fetch("/api/lot/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ travelerNo: row.travelerNo, newLotNo: row.lotNo, updatedBy }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || "Lưu thất bại.");
        setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, saved: true, error: null } : r)));
      } catch (err) {
        setRows((prev) =>
          prev.map((r, idx) => (idx === i ? { ...r, error: err instanceof Error ? err.message : "Lỗi" } : r)),
        );
      }
    }
    setSaving(false);
  }

  async function submitConcession() {
    setConcessionResult(null);
    setError(null);
    try {
      const res = await fetch("/api/lot/concession", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ travelerNo: concessionTraveler, by: concessionBy, reason: concessionReason }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Lưu thất bại.");
      setConcessionResult(`Đã ghi Concession cho Traveler ${concessionTraveler}.`);
      setConcessionTraveler("");
      setConcessionBy("");
      setConcessionReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra.");
    }
  }

  return (
    <PageContainer>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>📧 Cập nhật Lot thật từ email</h1>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>
        Dán nguyên văn email Infasco — hệ thống tự tách cặp Traveler#+Lot# (không dùng AI).
      </p>

      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}

      <textarea
        value={emailText}
        onChange={(e) => setEmailText(e.target.value)}
        rows={8}
        style={{ width: "100%", marginBottom: 8 }}
        placeholder="Dán nội dung email vào đây..."
      />
      <button onClick={parseEmail} disabled={loading || emailText.trim() === ""}>
        {loading ? "Đang tách..." : "Tách email"}
      </button>

      {rows.length > 0 && (
        <section style={{ marginTop: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>Kết quả tách được — xem lại trước khi lưu</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Traveler#</th>
                <th style={{ textAlign: "left" }}>Lot# thật</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx} style={{ background: r.error ? "#fef2f2" : r.saved ? "#f0fdf4" : undefined }}>
                  <td>
                    <input value={r.travelerNo} onChange={(e) => updateRow(idx, { travelerNo: e.target.value })} />
                  </td>
                  <td>
                    <input value={r.lotNo} onChange={(e) => updateRow(idx, { lotNo: e.target.value })} />
                  </td>
                  <td style={{ fontSize: 12, color: r.error ? "#b91c1c" : "#166534" }}>
                    {r.error ?? (r.saved ? "Đã lưu" : "")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <label style={{ display: "block", marginBottom: 8 }}>
            Người xác nhận
            <input value={updatedBy} onChange={(e) => setUpdatedBy(e.target.value)} style={{ display: "block" }} />
          </label>
          <button onClick={confirmAll} disabled={saving}>
            {saving ? "Đang lưu..." : `Xác nhận & Lưu ${rows.filter((r) => !r.saved).length} dòng`}
          </button>
        </section>
      )}

      {unmatched.length > 0 && (
        <section style={{ marginTop: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "#92400e" }}>
            Không tách được ({unmatched.length}) — tự kiểm tra/nhập tay
          </h2>
          <ul>
            {unmatched.map((line, i) => (
              <li key={i} style={{ fontSize: 13 }}>
                {line}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section style={{ marginTop: 32, borderTop: "1px solid #ddd", paddingTop: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600 }}>Concession — cho xuất dù Lot còn placeholder</h2>
        {concessionResult && <p style={{ color: "#166534" }}>{concessionResult}</p>}
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input
            placeholder="Traveler#"
            value={concessionTraveler}
            onChange={(e) => setConcessionTraveler(e.target.value)}
            style={{ width: 140 }}
          />
          <input
            placeholder="Người nhượng bộ"
            value={concessionBy}
            onChange={(e) => setConcessionBy(e.target.value)}
            style={{ width: 140 }}
          />
          <input
            placeholder="Lý do"
            value={concessionReason}
            onChange={(e) => setConcessionReason(e.target.value)}
            style={{ flex: 1 }}
          />
          <button onClick={submitConcession}>Lưu</button>
        </div>
      </section>
    </PageContainer>
  );
}
