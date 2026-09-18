"use client";

// FID-ERP-002 — cổng quét/chụp/nhập file DUY NHẤT cho Office + Máy admin
// (Xưởng KHÔNG có quyền dùng trang này, chốt 2026-09-17 — chặn thật ở
// FID-ERP-011, trang này chỉ tạm chọn sourceStation qua UI).
// UX tương đương CaptureGate.tsx + TravelerSection.tsx (AVP_AI, đọc THAM
// KHẢO) — 2 đích đến, draft OCR để xem lại trước khi Xác nhận & Lưu.
import { useState } from "react";

type Destination = "po" | "warehouse";

type CaptureRow = {
  travelerNo: string | null;
  partNo: string | null;
  poNo: string | null;
  potNo: string | null;
  qty: number | null;
  confidence: number;
  lowConfidenceFields: string[];
};

type ConfirmResult = {
  saved: number;
  skippedDuplicates: string[];
  moveIds: number[];
};

const DESTINATIONS: { value: Destination; label: string }[] = [
  { value: "po", label: "1. PO tham khảo — dự báo" },
  { value: "warehouse", label: "2. Kho nguyên liệu — đã nhận thật" },
];

// Field nào bắt buộc phải điền trước khi bấm "Xác nhận & Lưu" — tách riêng
// thành hàm thuần để test được logic disable nút mà không cần render DOM
// (xem tests/integration/capture.test.ts, Test Criteria FID-ERP-002 §7).
export function isCaptureRowIncomplete(row: CaptureRow, destination: Destination): boolean {
  if (!row.travelerNo?.trim() || !row.partNo?.trim()) return true;
  if (destination === "warehouse" && (row.qty == null || row.qty <= 0)) return true;
  return false;
}

export default function CapturePage() {
  const [destination, setDestination] = useState<Destination | null>(null);
  const [sourceStation, setSourceStation] = useState<"OFFICE" | "ADMIN">("OFFICE");
  const [confirmedBy, setConfirmedBy] = useState("");
  const [rows, setRows] = useState<CaptureRow[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConfirmResult | null>(null);

  function selectDestination(d: Destination) {
    setDestination(d);
    setRows([]);
    setWarnings([]);
    setError(null);
    setResult(null);
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !destination) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("destination", destination);
      const res = await fetch("/api/capture/extract", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Đọc file thất bại.");
      setRows(data.rows);
      setWarnings(data.warnings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra.");
    } finally {
      setLoading(false);
    }
  }

  function updateRow(idx: number, patch: Partial<CaptureRow>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  function addManualRow() {
    setRows((prev) => [
      ...prev,
      { travelerNo: "", partNo: "", poNo: null, potNo: null, qty: null, confidence: 1, lowConfidenceFields: [] },
    ]);
  }

  const hasIncompleteRow = destination ? rows.some((r) => isCaptureRowIncomplete(r, destination)) : true;
  const canConfirm =
    !!destination && rows.length > 0 && !hasIncompleteRow && confirmedBy.trim() !== "" && !saving;

  async function confirmSave() {
    if (!destination) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/capture/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination,
          rows: rows.map((r) => ({
            travelerNo: r.travelerNo,
            partNo: r.partNo,
            poNo: r.poNo,
            potNo: r.potNo,
            qty: r.qty,
          })),
          confirmedBy,
          sourceStation,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Lưu thất bại.");
      setResult({ saved: data.saved, skippedDuplicates: data.skippedDuplicates || [], moveIds: data.moveIds || [] });
      setRows([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>📷 Quét/chụp — lưu vào đâu?</h1>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>
        Chỉ dùng cho Office / Máy admin — Xưởng không có quyền dùng trang này.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {DESTINATIONS.map((d) => (
          <button
            key={d.value}
            onClick={() => selectDestination(d.value)}
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              border: "1px solid #333",
              background: destination === d.value ? "#111" : "#fff",
              color: destination === d.value ? "#fff" : "#111",
              cursor: "pointer",
            }}
          >
            {d.label}
          </button>
        ))}
      </div>

      {destination && (
        <div style={{ display: "flex", gap: 16, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ display: "block" }}>
            Chụp / chọn file
            <input
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              onChange={onFileChange}
              style={{ display: "block", marginTop: 4 }}
            />
          </label>
          <label style={{ display: "block" }}>
            Trạm
            <select
              value={sourceStation}
              onChange={(e) => setSourceStation(e.target.value as "OFFICE" | "ADMIN")}
              style={{ display: "block", marginTop: 4 }}
            >
              <option value="OFFICE">Office</option>
              <option value="ADMIN">Admin (Máy 4)</option>
            </select>
          </label>
          <label style={{ display: "block" }}>
            Người xác nhận
            <input
              value={confirmedBy}
              onChange={(e) => setConfirmedBy(e.target.value)}
              placeholder="mã/tên người xác nhận"
              style={{ display: "block", marginTop: 4 }}
            />
          </label>
        </div>
      )}

      {loading && <p>Đang đọc file, vui lòng đợi...</p>}
      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
      {result && (
        <p style={{ color: "#166534" }}>
          Đã lưu {result.saved} dòng.
          {result.skippedDuplicates.length > 0 &&
            ` ⚠️ ${result.skippedDuplicates.length} traveler đã có RECEIVE trước đó (vẫn ghi thêm): ${result.skippedDuplicates.join(", ")}.`}
        </p>
      )}

      {destination && (
        <div style={{ marginBottom: 12 }}>
          <button onClick={addManualRow} style={{ padding: "6px 12px" }}>
            + Nhập tay 1 dòng
          </button>
        </div>
      )}

      {warnings.length > 0 && (
        <div style={{ marginBottom: 12, color: "#92400e" }}>
          {warnings.map((w, i) => (
            <div key={i}>⚠️ {w}</div>
          ))}
        </div>
      )}

      {rows.length > 0 && destination && (
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Traveler#</th>
              <th style={{ textAlign: "left" }}>Part#</th>
              {destination === "po" && <th style={{ textAlign: "left" }}>PO#</th>}
              {destination === "warehouse" && (
                <>
                  <th style={{ textAlign: "left" }}>Pot#</th>
                  <th style={{ textAlign: "left" }}>Qty</th>
                </>
              )}
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const incomplete = isCaptureRowIncomplete(row, destination);
              return (
                <tr key={idx} style={{ background: incomplete ? "#fef2f2" : undefined }}>
                  <td>
                    <input
                      value={row.travelerNo ?? ""}
                      onChange={(e) => updateRow(idx, { travelerNo: e.target.value })}
                      style={{ borderColor: row.lowConfidenceFields.includes("travelerNo") ? "#dc2626" : undefined }}
                    />
                  </td>
                  <td>
                    <input
                      value={row.partNo ?? ""}
                      onChange={(e) => updateRow(idx, { partNo: e.target.value })}
                      style={{ borderColor: row.lowConfidenceFields.includes("partNo") ? "#dc2626" : undefined }}
                    />
                  </td>
                  {destination === "po" && (
                    <td>
                      <input value={row.poNo ?? ""} onChange={(e) => updateRow(idx, { poNo: e.target.value })} />
                    </td>
                  )}
                  {destination === "warehouse" && (
                    <>
                      <td>
                        <input value={row.potNo ?? ""} onChange={(e) => updateRow(idx, { potNo: e.target.value })} />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={row.qty ?? ""}
                          onChange={(e) => updateRow(idx, { qty: e.target.value ? Number(e.target.value) : null })}
                          style={{ borderColor: row.lowConfidenceFields.includes("qty") ? "#dc2626" : undefined }}
                        />
                      </td>
                    </>
                  )}
                  <td>
                    <button onClick={() => removeRow(idx)}>Xóa</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {rows.length > 0 && (
        <button
          onClick={confirmSave}
          disabled={!canConfirm}
          style={{
            padding: "8px 16px",
            background: canConfirm ? "#15803d" : "#9ca3af",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: canConfirm ? "pointer" : "not-allowed",
          }}
        >
          {saving ? "Đang lưu..." : `Xác nhận & Lưu ${rows.length} dòng`}
        </button>
      )}
    </main>
  );
}
