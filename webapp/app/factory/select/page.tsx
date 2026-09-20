"use client";

// FID-ERP-003 — nhập tay tại Xưởng sau khi 1 Traveler qua máy lựa xong.
// KHÔNG qua AI/OCR (Xưởng không có quyền add file, chốt 2026-09-17) — ghi
// thẳng 1 SELECT + 0..n SCRAP (defect) + 0..1 REWORK (còn dùng được, tạm
// giữ chờ xử lý lại) trong 1 transaction ở server.
//
// v1.4 (Mục 13) — bố cục GIỐNG TỜ TRAVELER GIẤY: scan Traveler# (scanner
// gõ + Enter = tự Tra) -> ô XÁM tự điền từ DB, ô VÀNG là chỗ còn thiếu, QA
// copy từ giấy vào. Contract API `confirm` KHÔNG đổi.
// v1.5 (FID-ERP-005 Mục 15.9) — scan Part# BẮT BUỘC (đối chiếu chéo với
// Traveler# để tránh nhầm tờ), Part# lệch -> khoá nút Lưu. Cùng quy tắc với
// `/wrapping/check`.
import { useEffect, useRef, useState } from "react";
import PageContainer from "../../../components/PageContainer";
import { tokens } from "../../../lib/ui/tokens";
import { usePickTraveler } from "../../../lib/ui/pickTraveler";
import {
  AUTO_BG,
  FILL_BG,
  blockStyle,
  fieldStyle,
  gridStyle,
  labelStyle,
  legendStyle,
} from "../../../lib/ui/formBlocks";
import { readRecent, writeRecent } from "../../../lib/ui/recentStorage";
import {
  buildDefects,
  computeTotal,
  partMatches,
  sortDefectTypesByPaper,
} from "../../../lib/factoryEntry";

type DefectType = { code: string; label: string };

type ConfirmResult = {
  selectMoveId: number;
  scrapMoveIds: number[];
  totalDefectQty: number;
  reworkMoveId?: number;
  warnings?: string[];
};

// v1.4 — tra qua route riêng `/api/factory/select/lookup` (thay cho
// /api/search ở v1.3) để có đúng `qtyPerBox` + `potNo` của Traveler này.
type TravelerLookup = {
  travelerNo: string;
  partNo: string;
  poNo: string | null;
  potNo: string | null;
  lotNo: string | null;
  qtyPerBox: number;
  shipped: boolean;
  lastMoveType: string | null;
};

const SHIFT_OPTIONS = ["MRNNG", "AFTRN"];
const RECENT_KEY = "avp_factory_recent";

type Recent = { machineCode: string; operatorCode: string };

function isRecent(value: unknown): value is Recent {
  const v = value as Partial<Recent> | null;
  return typeof v === "object" && v !== null && typeof v.machineCode === "string" && typeof v.operatorCode === "string";
}

function toNumberOrNull(value: string): number | null {
  return value === "" ? null : Number(value);
}

export default function FactorySelectPage() {
  const [defectTypes, setDefectTypes] = useState<DefectType[]>([]);
  const [travelerNo, setTravelerNo] = useState("");
  const [scannedPart, setScannedPart] = useState("");
  const [machineCode, setMachineCode] = useState("");
  const [operatorCode, setOperatorCode] = useState("");
  const [shift, setShift] = useState("");
  const [cartons, setCartons] = useState<number | null>(null);
  // null = chưa sửa tay, Total tự tính = số thùng × Pcs/Carton (Mục 13.4).
  const [totalOverride, setTotalOverride] = useState<number | null>(null);
  const [defectQty, setDefectQty] = useState<Record<string, number | null>>({});
  const [reworkEnabled, setReworkEnabled] = useState(false);
  const [reworkQty, setReworkQty] = useState<number | null>(null);
  const [reworkNote, setReworkNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConfirmResult | null>(null);
  const [lookup, setLookup] = useState<TravelerLookup | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [recent, setRecent] = useState<Recent | null>(null);

  const partInputRef = useRef<HTMLInputElement>(null);
  const cartonsInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/factory/defect-types")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) setDefectTypes(sortDefectTypesByPaper(data.types as DefectType[]));
      })
      .catch(() => {});
    // localStorage chỉ có ở trình duyệt (không có lúc render server) — đọc
    // sau khi mount, trong callback bất đồng bộ (không setState đồng bộ
    // trong thân effect, tránh render lồng nhau).
    Promise.resolve().then(() => setRecent(readRecent(RECENT_KEY, isRecent)));
  }, []);

  // Tra xong (form đã render ô Part#) nhảy sang "Part# (scan đối chiếu)" —
  // scanner quét tiếp Part#. Phải chạy SAU khi render (ô này chỉ tồn tại khi
  // đã có `lookup`), nên dùng effect thay vì focus() ngay trong doLookup.
  useEffect(() => {
    if (lookup) partInputRef.current?.focus();
  }, [lookup]);

  function onTravelerNoChange(value: string) {
    setTravelerNo(value);
    setLookup(null);
    setLookupError(null);
    setScannedPart("");
  }

  async function doLookup(target?: string) {
    const tr = (target ?? travelerNo).trim();
    if (tr === "") return;
    setLookingUp(true);
    setLookupError(null);
    setLookup(null);
    try {
      const res = await fetch(`/api/factory/select/lookup?travelerNo=${encodeURIComponent(tr)}`);
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Tra thất bại.");
      setLookup(data.traveler as TravelerLookup);
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : "Đã có lỗi xảy ra.");
    } finally {
      setLookingUp(false);
    }
  }

  // FID-ERP-015 — bấm Traveler trong kết quả ô tìm kiếm chung: điền + tra luôn.
  usePickTraveler((no) => {
    onTravelerNoChange(no);
    void doLookup(no);
  });

  const qtyPerBox = lookup?.qtyPerBox ?? null;
  const computedTotal = computeTotal(cartons, qtyPerBox);
  const selectQty = totalOverride ?? computedTotal;

  const defectRows = defectTypes.map((t) => ({ reasonCode: t.code, qty: defectQty[t.code] ?? null }));
  const defectsToSend = buildDefects(defectRows);
  const defectsValid = defectRows.every((r) => r.qty == null || (Number.isInteger(r.qty) && r.qty > 0));
  const totalDefectQty = defectsToSend.reduce((sum, d) => sum + d.qty, 0);

  const partScanned = scannedPart.trim() !== "";
  const partMismatch = lookup != null && partScanned && !partMatches(scannedPart, lookup.partNo);
  const partOk = lookup != null && partScanned && !partMismatch;

  const canSubmit =
    travelerNo.trim() !== "" &&
    lookup?.travelerNo === travelerNo.trim() &&
    partOk &&
    machineCode.trim() !== "" &&
    operatorCode.trim() !== "" &&
    SHIFT_OPTIONS.includes(shift) &&
    !!selectQty &&
    selectQty > 0 &&
    defectsValid &&
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
          defects: defectsToSend,
          ...(reworkEnabled ? { rework: { qty: reworkQty, note: reworkNote || undefined } } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Lưu thất bại.");
      setResult(data);
      // Ghi nhớ máy/người của lần lưu này làm NÚT GỢI Ý cho Traveler kế
      // tiếp (Mục 13.8 câu 2) — KHÔNG điền sẵn, ô luôn trống mỗi Traveler mới.
      // Server chuẩn hoá TRIM+UPPER khi ghi — nút gợi ý hiện đúng dạng sẽ được lưu.
      const next = { machineCode: machineCode.trim().toUpperCase(), operatorCode: operatorCode.trim().toUpperCase() };
      writeRecent(RECENT_KEY, next);
      setRecent(next);
      setTravelerNo("");
      setScannedPart("");
      setLookup(null);
      setLookupError(null);
      setMachineCode("");
      setOperatorCode("");
      setShift("");
      setCartons(null);
      setTotalOverride(null);
      setDefectQty({});
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
    <PageContainer>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>🏭 Nhập liệu máy lựa — Xưởng</h1>
      <p style={{ fontSize: 13, color: tokens.color.textMuted, marginBottom: 12 }}>
        Scan Traveler# rồi Enter. Ô <span style={{ background: AUTO_BG, padding: "0 4px" }}>xám</span> = tự có từ hệ
        thống. Ô <span style={{ background: FILL_BG, padding: "0 4px" }}>vàng</span> = copy từ tờ giấy vào.
      </p>

      {error && <p style={{ color: tokens.color.danger }}>{error}</p>}
      {result && (
        <>
          <p style={{ color: tokens.color.success }}>
            Đã lưu: SELECT #{result.selectMoveId}
            {result.scrapMoveIds.length > 0 && `, ${result.scrapMoveIds.length} SCRAP (tổng defect ${result.totalDefectQty})`}
            {result.reworkMoveId != null && `, REWORK #${result.reworkMoveId}`}.
          </p>
          {result.warnings != null && result.warnings.length > 0 && (
            <div style={{ marginBottom: 12, color: tokens.color.warning }}>
              {result.warnings.map((w, i) => (
                <div key={i}>⚠️ {w}</div>
              ))}
            </div>
          )}
        </>
      )}

      <label style={{ display: "block", marginBottom: 8 }}>
        <span style={labelStyle}>Traveler#</span>
        <div style={{ display: "flex", gap: 6, maxWidth: 400 }}>
          <input
            autoFocus
            value={travelerNo}
            onChange={(e) => onTravelerNoChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doLookup()}
            style={{ flex: 1, background: FILL_BG, padding: 4 }}
          />
          <button type="button" onClick={() => doLookup()} disabled={lookingUp || travelerNo.trim() === ""}>
            {lookingUp ? "Đang tra..." : "Tra"}
          </button>
        </div>
      </label>

      {lookupError && <p style={{ color: tokens.color.danger, marginBottom: 12 }}>{lookupError}</p>}
      {!lookup && travelerNo.trim() !== "" && !lookupError && (
        <p style={{ fontSize: 13, color: tokens.color.warning, marginBottom: 16 }}>
          ⚠️ Bấm Enter (hoặc &quot;Tra&quot;) để hệ thống điền thông tin Traveler trước khi nhập liệu/lưu.
        </p>
      )}

      {/* Dải đầu tờ giấy — chỉ đọc, tự điền từ DB */}
      {lookup && (
        <fieldset style={blockStyle}>
          <legend style={legendStyle}>Traveler {lookup.travelerNo}</legend>
          <div style={gridStyle}>
            <div>
              <span style={labelStyle}>Part #</span>
              <div style={{ ...fieldStyle, background: AUTO_BG }}>{lookup.partNo}</div>
            </div>
            <div>
              <span style={labelStyle}>Final Lot #</span>
              <div style={{ ...fieldStyle, background: AUTO_BG, minHeight: 24 }}>{lookup.lotNo ?? ""}</div>
            </div>
            <div>
              <span style={labelStyle}>POT #</span>
              <div style={{ ...fieldStyle, background: AUTO_BG, minHeight: 24 }}>{lookup.potNo ?? ""}</div>
            </div>
            <div>
              <span style={labelStyle}>PO</span>
              <div style={{ ...fieldStyle, background: AUTO_BG, minHeight: 24 }}>{lookup.poNo ?? ""}</div>
            </div>
          </div>
          <p style={{ fontSize: 13, color: tokens.color.textMuted, margin: "8px 0" }}>
            {lookup.lastMoveType && `Gần nhất: ${lookup.lastMoveType}`}
            {lookup.shipped && " · ĐÃ XUẤT"}
          </p>
          <label style={{ display: "block", maxWidth: 320 }}>
            <span style={labelStyle}>Part # (scan đối chiếu — bắt buộc)</span>
            <input
              ref={partInputRef}
              value={scannedPart}
              onChange={(e) => setScannedPart(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && cartonsInputRef.current?.focus()}
              style={{ ...fieldStyle, background: FILL_BG }}
            />
          </label>
          {partMismatch && (
            <p style={{ color: tokens.color.danger, fontSize: 13, marginTop: 6 }}>
              ⚠️ Part# vừa scan ({scannedPart.trim()}) KHÁC Part# của Traveler này ({lookup.partNo}) — có thể nhầm tờ,
              KHÔNG cho lưu.
            </p>
          )}
          {partOk && <p style={{ color: tokens.color.success, fontSize: 13, marginTop: 6 }}>✓ Part# khớp.</p>}
          {!partScanned && (
            <p style={{ color: tokens.color.warning, fontSize: 13, marginTop: 6 }}>
              Chưa scan Part# — bắt buộc scan để đối chiếu với Traveler trước khi lưu.
            </p>
          )}
        </fieldset>
      )}

      {/* Khối "Sorting" trên tờ giấy */}
      <fieldset style={blockStyle}>
        <legend style={legendStyle}>Sorting</legend>
        <div style={gridStyle}>
          <label>
            <span style={labelStyle}>Sorting M/C #</span>
            <input
              value={machineCode}
              onChange={(e) => setMachineCode(e.target.value)}
              style={{ ...fieldStyle, background: FILL_BG }}
            />
          </label>
          <label>
            <span style={labelStyle}>Operator Initials</span>
            <input
              value={operatorCode}
              onChange={(e) => setOperatorCode(e.target.value)}
              style={{ ...fieldStyle, background: FILL_BG }}
            />
          </label>
          <div>
            <span style={labelStyle}>Shift</span>
            <div style={{ display: "flex", gap: 6 }}>
              {SHIFT_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setShift(s)}
                  style={{
                    flex: 1,
                    padding: "4px 8px",
                    background: shift === s ? tokens.color.accent : FILL_BG,
                    color: shift === s ? tokens.color.accentText : tokens.color.text,
                    border: `1px solid ${tokens.color.border}`,
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
        {recent && (
          <div style={{ marginTop: 10 }}>
            <button
              type="button"
              onClick={() => {
                setMachineCode(recent.machineCode);
                setOperatorCode(recent.operatorCode);
              }}
            >
              Lần trước: {recent.machineCode} · {recent.operatorCode}
            </button>
          </div>
        )}
      </fieldset>

      {/* Khối "Defect / # of PCS Found" — liệt kê sẵn theo đúng thứ tự tờ giấy */}
      <fieldset style={blockStyle}>
        <legend style={legendStyle}>Defect / # of PCS Found</legend>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 6, alignItems: "center" }}>
          {defectTypes.map((t) => (
            <div key={t.code} style={{ display: "contents" }}>
              <span>{t.label}</span>
              <input
                type="number"
                min={0}
                aria-label={`${t.label} — # of PCS Found`}
                value={defectQty[t.code] ?? ""}
                onChange={(e) => setDefectQty((prev) => ({ ...prev, [t.code]: toNumberOrNull(e.target.value) }))}
                style={{ ...fieldStyle, background: FILL_BG }}
              />
            </div>
          ))}
        </div>
        <p style={{ fontSize: 13, color: tokens.color.textMuted, marginTop: 6 }}>Tổng defect: {totalDefectQty}</p>
      </fieldset>

      {/* Khối "Packaging" trên tờ giấy */}
      <fieldset style={blockStyle}>
        <legend style={legendStyle}>Packaging</legend>
        <div style={gridStyle}>
          <label>
            <span style={labelStyle}># of Cartons</span>
            <input
              ref={cartonsInputRef}
              type="number"
              min={0}
              value={cartons ?? ""}
              onChange={(e) => setCartons(toNumberOrNull(e.target.value))}
              style={{ ...fieldStyle, background: FILL_BG }}
            />
          </label>
          <div>
            <span style={labelStyle}>Pcs / Carton</span>
            <div style={{ ...fieldStyle, background: AUTO_BG, minHeight: 24 }}>{qtyPerBox ?? ""}</div>
          </div>
          <label>
            <span style={labelStyle}>Total Quantity (PASS)</span>
            <input
              type="number"
              min={0}
              value={selectQty ?? ""}
              onChange={(e) => setTotalOverride(toNumberOrNull(e.target.value))}
              style={{ ...fieldStyle, background: totalOverride == null ? AUTO_BG : FILL_BG }}
            />
          </label>
        </div>
        <p style={{ fontSize: 12, color: tokens.color.textMuted, marginTop: 6 }}>
          Total tự tính = số thùng × Pcs/Carton. Sửa tay được nếu thùng cuối thiếu; xoá trống để tự tính lại.
        </p>
      </fieldset>

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
              onChange={(e) => setReworkQty(toNumberOrNull(e.target.value))}
              style={{ width: 100, background: FILL_BG }}
            />
            <input
              placeholder="Ghi chú (vd: lệch ren, chờ kiểm tra lại)"
              value={reworkNote}
              onChange={(e) => setReworkNote(e.target.value)}
              style={{ flex: 1, background: FILL_BG }}
            />
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
