"use client";

// FID-ERP-005 — kiểm tra thực tế skid ở khâu Wrapping: Good/Hold (kèm lý
// do nếu Hold, Concession có thể đè lên Hold) + reject (lỗi phát hiện
// THÊM ở đây, khác lần lựa FID-ERP-003).
// v1.1 — thêm PACK (đóng thùng): số thùng + tổng qty + Skid# + máy/ca —
// dữ liệu thật (CHECKING SUMMARY) ghi cùng lúc với Good/Hold.
import { useState } from "react";
import PageContainer from "../../../components/PageContainer";
import { tokens } from "../../../lib/ui/tokens";

type Status = "GOOD" | "HOLD";
type RejectRow = { reasonCode: string; qty: number | null };

type CheckResult = {
  qualityCheckId: number;
  scrapMoveIds: number[];
  totalRejectQty: number;
  packMoveId?: number;
};

export default function WrappingCheckPage() {
  const [travelerNo, setTravelerNo] = useState("");
  const [status, setStatus] = useState<Status>("GOOD");
  const [note, setNote] = useState("");
  const [checkedBy, setCheckedBy] = useState("");
  const [rejects, setRejects] = useState<RejectRow[]>([]);
  const [concessionEnabled, setConcessionEnabled] = useState(false);
  const [concessionBy, setConcessionBy] = useState("");
  const [concessionReason, setConcessionReason] = useState("");
  const [packEnabled, setPackEnabled] = useState(false);
  const [packBoxCount, setPackBoxCount] = useState<number | null>(null);
  const [packQty, setPackQty] = useState<number | null>(null);
  const [packSkidNo, setPackSkidNo] = useState("");
  const [packMachineCode, setPackMachineCode] = useState("");
  const [packShift, setPackShift] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckResult | null>(null);

  function addRejectRow() {
    setRejects((prev) => [...prev, { reasonCode: "", qty: null }]);
  }

  function updateRejectRow(idx: number, patch: Partial<RejectRow>) {
    setRejects((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function removeRejectRow(idx: number) {
    setRejects((prev) => prev.filter((_, i) => i !== idx));
  }

  const canSubmit =
    travelerNo.trim() !== "" &&
    checkedBy.trim() !== "" &&
    (status !== "HOLD" || note.trim() !== "") &&
    rejects.every((r) => r.reasonCode.trim() !== "" && r.qty != null && r.qty > 0) &&
    (!concessionEnabled || (status === "HOLD" && concessionBy.trim() !== "" && concessionReason.trim() !== "")) &&
    (!packEnabled ||
      (packBoxCount != null &&
        packBoxCount > 0 &&
        packQty != null &&
        packQty > 0 &&
        packSkidNo.trim() !== "" &&
        packMachineCode.trim() !== "" &&
        packShift.trim() !== "")) &&
    !saving;

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/quality/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          travelerNo,
          status,
          note: note || undefined,
          checkedBy,
          reject: rejects.map((r) => ({ reasonCode: r.reasonCode, qty: r.qty })),
          ...(concessionEnabled ? { concession: { by: concessionBy, reason: concessionReason } } : {}),
          ...(packEnabled
            ? {
                pack: {
                  boxCount: packBoxCount,
                  qty: packQty,
                  skidNo: packSkidNo,
                  machineCode: packMachineCode,
                  shift: packShift,
                },
              }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Lưu thất bại.");
      setResult(data);
      setTravelerNo("");
      setStatus("GOOD");
      setNote("");
      setRejects([]);
      setConcessionEnabled(false);
      setConcessionBy("");
      setConcessionReason("");
      setPackEnabled(false);
      setPackBoxCount(null);
      setPackQty(null);
      setPackSkidNo("");
      setPackMachineCode("");
      setPackShift("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageContainer>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>📦 Kiểm tra Wrapping</h1>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>
        Kiểm tra skid trước khi cho phép tạo Packing Slip — Good/Hold + lỗi phát hiện thêm (nếu có).
      </p>

      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
      {result && (
        <p style={{ color: "#166534" }}>
          Đã lưu kiểm tra #{result.qualityCheckId}
          {result.scrapMoveIds.length > 0 && ` — ${result.scrapMoveIds.length} reject (tổng ${result.totalRejectQty})`}
          {result.packMoveId != null && ` — đã đóng gói (PACK #${result.packMoveId})`}.
        </p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <label>
          Traveler#
          <input value={travelerNo} onChange={(e) => setTravelerNo(e.target.value)} style={{ display: "block", width: "100%" }} />
        </label>
        <label>
          Người kiểm tra
          <input value={checkedBy} onChange={(e) => setCheckedBy(e.target.value)} style={{ display: "block", width: "100%" }} />
        </label>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {(["GOOD", "HOLD"] as Status[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              border: "1px solid #333",
              background: status === s ? "#111" : "#fff",
              color: status === s ? "#fff" : "#111",
            }}
          >
            {s === "GOOD" ? "Good" : "Hold"}
          </button>
        ))}
      </div>

      {status === "HOLD" && (
        <label style={{ display: "block", marginBottom: 16 }}>
          Lý do Hold
          <input value={note} onChange={(e) => setNote(e.target.value)} style={{ display: "block", width: "100%" }} />
        </label>
      )}

      <section style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600 }}>Lỗi phát hiện thêm ở Wrapping (reject)</h2>
        {rejects.map((r, idx) => (
          <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
            <input
              placeholder="Mã defect (vd LOOSE_WASHER_NUT)"
              value={r.reasonCode}
              onChange={(e) => updateRejectRow(idx, { reasonCode: e.target.value })}
              style={{ flex: 1 }}
            />
            <input
              type="number"
              placeholder="Qty"
              value={r.qty ?? ""}
              onChange={(e) => updateRejectRow(idx, { qty: e.target.value ? Number(e.target.value) : null })}
              style={{ width: 100 }}
            />
            <button onClick={() => removeRejectRow(idx)}>Xóa</button>
          </div>
        ))}
        <button onClick={addRejectRow} type="button">
          + Thêm reject
        </button>
      </section>

      {status === "HOLD" && (
        <section style={{ marginBottom: 16 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" checked={concessionEnabled} onChange={(e) => setConcessionEnabled(e.target.checked)} />
            <span style={{ fontWeight: 600 }}>Concession — vẫn cho xuất dù Hold</span>
          </label>
          {concessionEnabled && (
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <input
                placeholder="Người nhượng bộ"
                value={concessionBy}
                onChange={(e) => setConcessionBy(e.target.value)}
                style={{ width: 160 }}
              />
              <input
                placeholder="Lý do nhượng bộ"
                value={concessionReason}
                onChange={(e) => setConcessionReason(e.target.value)}
                style={{ flex: 1 }}
              />
            </div>
          )}
        </section>
      )}

      <section style={{ marginBottom: 16 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input type="checkbox" checked={packEnabled} onChange={(e) => setPackEnabled(e.target.checked)} />
          <span style={{ fontWeight: 600 }}>Đã đóng thùng (PACK) — số thùng + Skid#</span>
        </label>
        {packEnabled && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
            <input
              type="number"
              placeholder="Số thùng (No. of boxes)"
              value={packBoxCount ?? ""}
              onChange={(e) => setPackBoxCount(e.target.value ? Number(e.target.value) : null)}
            />
            <input
              type="number"
              placeholder="Tổng qty đóng gói (TTL QNT)"
              value={packQty ?? ""}
              onChange={(e) => setPackQty(e.target.value ? Number(e.target.value) : null)}
            />
            <input placeholder="Skid#" value={packSkidNo} onChange={(e) => setPackSkidNo(e.target.value)} />
            <input
              placeholder="Máy (vd TBL-1)"
              value={packMachineCode}
              onChange={(e) => setPackMachineCode(e.target.value)}
            />
            <input placeholder="Ca (vd MRNNG)" value={packShift} onChange={(e) => setPackShift(e.target.value)} />
          </div>
        )}
      </section>

      <button
        onClick={submit}
        disabled={!canSubmit}
        style={{
          padding: "8px 16px",
          background: canSubmit ? tokens.color.accent : "#9ca3af",
          color: tokens.color.accentText,
          border: "none",
          borderRadius: 6,
          cursor: canSubmit ? "pointer" : "not-allowed",
        }}
      >
        {saving ? "Đang lưu..." : "Xác nhận & Lưu"}
      </button>
    </PageContainer>
  );
}
