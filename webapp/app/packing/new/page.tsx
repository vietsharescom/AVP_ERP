"use client";

// FID-ERP-009 — Office lập Packing Slip: gõ Traveler# → tra điều kiện
// (lookup, không ghi DB) → xem lại nháp (client-side) → Duyệt PS (confirm,
// ghi PS+lines+SHIP trong 1 transaction).
import { useState } from "react";
import PageContainer from "../../../components/PageContainer";
import { tokens } from "../../../lib/ui/tokens";
import { usePickTraveler } from "../../../lib/ui/pickTraveler";

type LookupResult = {
  travelerNo: string;
  partNo: string;
  lotNo: string | null;
  potNo: string | null;
  skidNo: string | null;
  isReturnForRework: boolean;
  availableQty: number;
  eligible: boolean;
  blockReasons: string[];
  warnings: string[];
  sameSkidTravelers: string[];
};

type DraftLine = { travelerNo: string; qty: number; skidNo: string | null; warnings: string[] };

type ConfirmResult = { psId: number; psNo: string; shipMoveIds: number[]; linesSaved: number };

export default function NewPackingSlipPage() {
  const [travelerNoInput, setTravelerNoInput] = useState("");
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);

  const [lines, setLines] = useState<DraftLine[]>([]);
  const [psNo, setPsNo] = useState("");
  const [totalPallets, setTotalPallets] = useState<number | null>(null);
  const [totalEmpty, setTotalEmpty] = useState<number | null>(null);
  const [confirmedBy, setConfirmedBy] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConfirmResult | null>(null);

  const suggestedPallets = new Set(lines.map((l) => l.skidNo).filter((s): s is string => s != null)).size;

  async function lookup(target?: string) {
    const tr = (target ?? travelerNoInput).trim();
    if (tr === "") return;
    setLooking(true);
    setLookupError(null);
    setLookupResult(null);
    try {
      const exclude = lines.map((l) => l.travelerNo).join(",");
      const res = await fetch(`/api/packing/lookup?travelerNo=${encodeURIComponent(tr)}&excludeTravelerNos=${encodeURIComponent(exclude)}`);
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Tra cứu thất bại.");
      setLookupResult(data);
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : "Đã có lỗi xảy ra.");
    } finally {
      setLooking(false);
    }
  }

  // FID-ERP-015 — bấm Traveler trong kết quả ô tìm kiếm chung: điền + tra luôn.
  usePickTraveler((no) => {
    setTravelerNoInput(no);
    void lookup(no);
  });

  function addLine() {
    if (!lookupResult || !lookupResult.eligible) return;
    setLines((prev) => [
      ...prev,
      { travelerNo: lookupResult.travelerNo, qty: lookupResult.availableQty, skidNo: lookupResult.skidNo, warnings: lookupResult.warnings },
    ]);
    setLookupResult(null);
    setTravelerNoInput("");
  }

  function updateLineQty(idx: number, qty: number) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, qty } : l)));
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  const canConfirm = psNo.trim() !== "" && confirmedBy.trim() !== "" && lines.length > 0 && !saving;

  async function confirm() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/packing/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          psNo,
          totalPallets: totalPallets ?? undefined,
          totalEmpty: totalEmpty ?? undefined,
          lines: lines.map((l) => ({ travelerNo: l.travelerNo, qty: l.qty })),
          confirmedBy,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Duyệt PS thất bại.");
      setResult(data);
      setLines([]);
      setPsNo("");
      setTotalPallets(null);
      setTotalEmpty(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageContainer>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>🚚 Lập Packing Slip</h1>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>
        Chỉ thêm được Traveler đã đóng gói (PACK) + đủ điều kiện xuất (Good/Concession, Lot thật/Concession).
      </p>

      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
      {result && (
        <p style={{ color: "#166534" }}>
          Đã duyệt PS {result.psNo} — {result.linesSaved} dòng, {result.shipMoveIds.length} SHIP đã ghi.
        </p>
      )}

      <section style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            placeholder="Traveler#"
            value={travelerNoInput}
            onChange={(e) => setTravelerNoInput(e.target.value)}
            style={{ flex: 1 }}
          />
          <button onClick={() => lookup()} disabled={looking || travelerNoInput.trim() === ""}>
            {looking ? "Đang tra..." : "Tra"}
          </button>
        </div>
        {lookupError && <p style={{ color: "#b91c1c", fontSize: 13 }}>{lookupError}</p>}
        {lookupResult && (
          <div style={{ marginTop: 8, padding: 8, border: "1px solid #ddd", borderRadius: 6 }}>
            <p style={{ fontSize: 13 }}>
              Traveler {lookupResult.travelerNo} — còn {lookupResult.availableQty} pcs, Skid# {lookupResult.skidNo ?? "—"}
            </p>
            {lookupResult.eligible ? (
              <button onClick={addLine}>+ Thêm vào PS</button>
            ) : (
              <ul style={{ color: "#b91c1c", fontSize: 13, margin: 0 }}>
                {lookupResult.blockReasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            )}
            {lookupResult.warnings.length > 0 && (
              <ul style={{ color: "#92400e", fontSize: 13, margin: 0 }}>
                {lookupResult.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}
            {lookupResult.sameSkidTravelers.length > 0 && (
              <p style={{ fontSize: 12, color: "#666" }}>
                Cùng Skid# còn: {lookupResult.sameSkidTravelers.join(", ")} — kiểm tra thêm nếu cần.
              </p>
            )}
          </div>
        )}
      </section>

      {lines.length > 0 && (
        <section style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>Nháp Packing Slip</h2>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Traveler#</th>
                <th style={{ textAlign: "left" }}>Skid#</th>
                <th style={{ textAlign: "left" }}>Qty</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lines.map((l, idx) => (
                <tr key={idx}>
                  <td>{l.travelerNo}</td>
                  <td>{l.skidNo ?? "—"}</td>
                  <td>
                    <input type="number" value={l.qty} onChange={(e) => updateLineQty(idx, Number(e.target.value))} style={{ width: 90 }} />
                  </td>
                  <td>
                    <button onClick={() => removeLine(idx)}>Xóa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section style={{ marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <label>
            PS#
            <input value={psNo} onChange={(e) => setPsNo(e.target.value)} style={{ display: "block", width: "100%" }} />
          </label>
          <label>
            Người duyệt
            <input value={confirmedBy} onChange={(e) => setConfirmedBy(e.target.value)} style={{ display: "block", width: "100%" }} />
          </label>
          <label>
            Total Pallets {lines.length > 0 && <span style={{ color: "#666", fontWeight: 400 }}>(gợi ý: {suggestedPallets})</span>}
            <input
              type="number"
              value={totalPallets ?? ""}
              onChange={(e) => setTotalPallets(e.target.value ? Number(e.target.value) : null)}
              placeholder={String(suggestedPallets)}
              style={{ display: "block", width: "100%" }}
            />
          </label>
          <label>
            Total Empty
            <input
              type="number"
              value={totalEmpty ?? ""}
              onChange={(e) => setTotalEmpty(e.target.value ? Number(e.target.value) : null)}
              style={{ display: "block", width: "100%" }}
            />
          </label>
        </div>
      </section>

      <button
        onClick={confirm}
        disabled={!canConfirm}
        style={{
          padding: "8px 16px",
          background: canConfirm ? tokens.color.accent : "#9ca3af",
          color: tokens.color.accentText,
          border: "none",
          borderRadius: 6,
          cursor: canConfirm ? "pointer" : "not-allowed",
        }}
      >
        {saving ? "Đang duyệt..." : "Duyệt PS"}
      </button>
    </PageContainer>
  );
}
