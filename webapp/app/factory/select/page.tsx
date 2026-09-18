"use client";

// FID-ERP-003 — nhập tay tại Xưởng sau khi 1 Traveler qua máy lựa xong.
// KHÔNG qua AI/OCR (Xưởng không có quyền add file, chốt 2026-09-17) — ghi
// thẳng 1 SELECT + 0..n SCRAP (defect) + 0..1 REWORK (còn dùng được, tạm
// giữ chờ xử lý lại) trong 1 transaction ở server.
import { useEffect, useState } from "react";

type DefectType = { code: string; label: string };
type DefectRow = { reasonCode: string; qty: number | null };

type ConfirmResult = {
  selectMoveId: number;
  scrapMoveIds: number[];
  totalDefectQty: number;
  reworkMoveId?: number;
};

export default function FactorySelectPage() {
  const [defectTypes, setDefectTypes] = useState<DefectType[]>([]);
  const [travelerNo, setTravelerNo] = useState("");
  const [machineCode, setMachineCode] = useState("");
  const [operatorCode, setOperatorCode] = useState("");
  const [shift, setShift] = useState("");
  const [selectQty, setSelectQty] = useState<number | null>(null);
  const [defects, setDefects] = useState<DefectRow[]>([]);
  const [reworkEnabled, setReworkEnabled] = useState(false);
  const [reworkQty, setReworkQty] = useState<number | null>(null);
  const [reworkNote, setReworkNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConfirmResult | null>(null);

  useEffect(() => {
    fetch("/api/factory/defect-types")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) setDefectTypes(data.types);
      })
      .catch(() => {});
  }, []);

  const totalDefectQty = defects.reduce((sum, d) => sum + (d.qty ?? 0), 0);

  function addDefectRow() {
    setDefects((prev) => [...prev, { reasonCode: defectTypes[0]?.code ?? "", qty: null }]);
  }

  function updateDefectRow(idx: number, patch: Partial<DefectRow>) {
    setDefects((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  }

  function removeDefectRow(idx: number) {
    setDefects((prev) => prev.filter((_, i) => i !== idx));
  }

  const canSubmit =
    travelerNo.trim() !== "" &&
    machineCode.trim() !== "" &&
    operatorCode.trim() !== "" &&
    shift.trim() !== "" &&
    !!selectQty &&
    selectQty > 0 &&
    defects.every((d) => d.reasonCode && d.qty != null && d.qty > 0) &&
    (!reworkEnabled || (reworkQty != null && reworkQty > 0)) &&
    !saving;

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/factory/select/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          travelerNo,
          machineCode,
          operatorCode,
          shift,
          selectQty,
          defects: defects.map((d) => ({ reasonCode: d.reasonCode, qty: d.qty })),
          ...(reworkEnabled ? { rework: { qty: reworkQty, note: reworkNote || undefined } } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Lưu thất bại.");
      setResult(data);
      setTravelerNo("");
      setSelectQty(null);
      setDefects([]);
      setReworkEnabled(false);
      setReworkQty(null);
      setReworkNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>🏭 Nhập liệu máy lựa — Xưởng</h1>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>
        Chỉ dùng tại Xưởng — không có bước quét file/OCR ở trang này.
      </p>

      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
      {result && (
        <p style={{ color: "#166534" }}>
          Đã lưu: SELECT #{result.selectMoveId}
          {result.scrapMoveIds.length > 0 && `, ${result.scrapMoveIds.length} SCRAP (tổng defect ${result.totalDefectQty})`}
          {result.reworkMoveId != null && `, REWORK #${result.reworkMoveId}`}.
        </p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <label>
          Traveler#
          <input value={travelerNo} onChange={(e) => setTravelerNo(e.target.value)} style={{ display: "block", width: "100%" }} />
        </label>
        <label>
          Số lượng lựa được (PASS)
          <input
            type="number"
            value={selectQty ?? ""}
            onChange={(e) => setSelectQty(e.target.value ? Number(e.target.value) : null)}
            style={{ display: "block", width: "100%" }}
          />
        </label>
        <label>
          Mã máy
          <input value={machineCode} onChange={(e) => setMachineCode(e.target.value)} style={{ display: "block", width: "100%" }} />
        </label>
        <label>
          Mã người vận hành
          <input value={operatorCode} onChange={(e) => setOperatorCode(e.target.value)} style={{ display: "block", width: "100%" }} />
        </label>
        <label>
          Ca
          <input value={shift} onChange={(e) => setShift(e.target.value)} style={{ display: "block", width: "100%" }} />
        </label>
      </div>

      <section style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600 }}>Hàng lỗi bị loại bỏ (defect)</h2>
        {defects.map((d, idx) => (
          <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center" }}>
            <select value={d.reasonCode} onChange={(e) => updateDefectRow(idx, { reasonCode: e.target.value })}>
              {defectTypes.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Qty"
              value={d.qty ?? ""}
              onChange={(e) => updateDefectRow(idx, { qty: e.target.value ? Number(e.target.value) : null })}
              style={{ width: 100 }}
            />
            <button onClick={() => removeDefectRow(idx)}>Xóa</button>
          </div>
        ))}
        <button onClick={addDefectRow} type="button">
          + Thêm loại defect
        </button>
        <p style={{ fontSize: 13, color: "#666", marginTop: 6 }}>Tổng defect: {totalDefectQty}</p>
      </section>

      <section style={{ marginBottom: 16 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input type="checkbox" checked={reworkEnabled} onChange={(e) => setReworkEnabled(e.target.checked)} />
          <span style={{ fontWeight: 600 }}>Có hàng lỗi còn dùng được, tạm giữ chờ xử lý lại (rework)</span>
        </label>
        {reworkEnabled && (
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input
              type="number"
              placeholder="Qty"
              value={reworkQty ?? ""}
              onChange={(e) => setReworkQty(e.target.value ? Number(e.target.value) : null)}
              style={{ width: 100 }}
            />
            <input
              placeholder="Ghi chú (vd: lệch ren, chờ kiểm tra lại)"
              value={reworkNote}
              onChange={(e) => setReworkNote(e.target.value)}
              style={{ flex: 1 }}
            />
          </div>
        )}
      </section>

      <button
        onClick={submit}
        disabled={!canSubmit}
        style={{
          padding: "8px 16px",
          background: canSubmit ? "#15803d" : "#9ca3af",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          cursor: canSubmit ? "pointer" : "not-allowed",
        }}
      >
        {saving ? "Đang lưu..." : "Xác nhận & Lưu"}
      </button>
    </main>
  );
}
