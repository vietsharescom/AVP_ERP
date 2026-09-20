"use client";

// FID-ERP-005 — kiểm tra thực tế skid ở khâu Wrapping: Good/Hold (kèm lý
// do nếu Hold, Concession có thể đè lên Hold) + reject (lỗi phát hiện
// THÊM ở đây, khác lần lựa FID-ERP-003).
// v1.1 — thêm PACK (đóng thùng): số thùng + tổng qty + Skid# + máy/ca —
// dữ liệu thật (CHECKING SUMMARY) ghi cùng lúc với Good/Hold.
//
// v1.5 (Mục 15) — nhập nhanh, giống `/factory/select` (FID-ERP-003 v1.4):
// scan Traveler# + Enter (tự Tra) -> scan Part# (BẮT BUỘC, đối chiếu chéo,
// lệch thì khoá nút Lưu) -> ô XÁM tự điền từ DB, ô VÀNG copy từ giấy; TTL
// tự tính; nút gợi ý (không điền sẵn) cho số thùng/máy/người kiểm tra.
// Contract `POST /api/quality/check` KHÔNG đổi.
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
  suggestPackAll,
} from "../../../lib/factoryEntry";

type Status = "GOOD" | "HOLD";
type DefectType = { code: string; label: string };

type CheckResult = {
  qualityCheckId: number;
  scrapMoveIds: number[];
  totalRejectQty: number;
  packMoveId?: number;
  warnings?: string[];
};

// v1.5 — tra qua route riêng `/api/quality/lookup` (thay `/api/search` ở
// v1.4) để có `qtyPerBox`, số đã lựa/đã đóng/còn có thể đóng, máy của lần
// lựa gần nhất, lần kiểm tra gần nhất.
type TravelerLookup = {
  travelerNo: string;
  partNo: string;
  poNo: string | null;
  potNo: string | null;
  lotNo: string | null;
  qtyPerBox: number;
  selectedQty: number;
  packedQty: number;
  availableToPack: number;
  lastSelect: { machineCode: string | null; operatorCode: string | null; shift: string | null } | null;
  lastQualityCheck: { status: string; createdAt: string } | null;
  shipped: boolean;
  lastMoveType: string | null;
};

const SHIFT_OPTIONS = ["MRNNG", "AFTRN"];
const RECENT_KEY = "avp_wrapping_recent";

function isRecentChecker(value: unknown): value is { checkedBy: string } {
  return typeof value === "object" && value !== null && typeof (value as { checkedBy?: unknown }).checkedBy === "string";
}

function toNumberOrNull(value: string): number | null {
  return value === "" ? null : Number(value);
}

export default function WrappingCheckPage() {
  const [defectTypes, setDefectTypes] = useState<DefectType[]>([]);
  const [travelerNo, setTravelerNo] = useState("");
  const [scannedPart, setScannedPart] = useState("");
  const [status, setStatus] = useState<Status>("GOOD");
  const [note, setNote] = useState("");
  const [checkedBy, setCheckedBy] = useState("");
  const [defectQty, setDefectQty] = useState<Record<string, number | null>>({});
  const [concessionEnabled, setConcessionEnabled] = useState(false);
  const [concessionBy, setConcessionBy] = useState("");
  const [concessionReason, setConcessionReason] = useState("");
  // null = theo mặc định (BẬT khi còn hàng chưa đóng, TẮT khi đã đóng hết) —
  // QA bấm checkbox thì thành true/false tường minh (Mục 15.3).
  const [packOverride, setPackOverride] = useState<boolean | null>(null);
  const [boxCount, setBoxCount] = useState<number | null>(null);
  // null = chưa sửa tay, TTL tự tính = số thùng × Pcs/Carton.
  const [totalOverride, setTotalOverride] = useState<number | null>(null);
  const [skidNo, setSkidNo] = useState("");
  const [machineCode, setMachineCode] = useState("");
  const [shift, setShift] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [lookup, setLookup] = useState<TravelerLookup | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [recentChecker, setRecentChecker] = useState<string | null>(null);

  const partInputRef = useRef<HTMLInputElement>(null);
  const boxesInputRef = useRef<HTMLInputElement>(null);
  const checkerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/factory/defect-types")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) setDefectTypes(sortDefectTypesByPaper(data.types as DefectType[]));
      })
      .catch(() => {});
    // localStorage chỉ có ở trình duyệt — đọc sau khi mount, trong callback
    // bất đồng bộ (không setState đồng bộ trong thân effect).
    Promise.resolve().then(() => setRecentChecker(readRecent(RECENT_KEY, isRecentChecker)?.checkedBy ?? null));
  }, []);

  // Tra xong (form đã render ô Part#) nhảy sang "Part# (scan đối chiếu)".
  useEffect(() => {
    if (lookup) partInputRef.current?.focus();
  }, [lookup]);

  function onTravelerNoChange(value: string) {
    setTravelerNo(value);
    // Đổi Traveler# thì lookup + Part# scan cũ hết hiệu lực — bắt tra/scan
    // lại, tránh xác nhận nhầm thông tin của 1 Traveler khác.
    setLookup(null);
    setLookupError(null);
    setScannedPart("");
    setPackOverride(null);
    setBoxCount(null);
    setTotalOverride(null);
  }

  async function doLookup(target?: string) {
    const tr = (target ?? travelerNo).trim();
    if (tr === "") return;
    setLookingUp(true);
    setLookupError(null);
    setLookup(null);
    try {
      const res = await fetch(`/api/quality/lookup?travelerNo=${encodeURIComponent(tr)}`);
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
  const available = lookup?.availableToPack ?? 0;
  const packEnabled = available > 0 ? (packOverride ?? true) : false;
  const computedTotal = computeTotal(boxCount, qtyPerBox);
  const packQty = totalOverride ?? computedTotal;
  const packAllSuggestion = suggestPackAll(available, qtyPerBox);

  const defectRows = defectTypes.map((t) => ({ reasonCode: t.code, qty: defectQty[t.code] ?? null }));
  const rejectsToSend = buildDefects(defectRows);
  const defectsValid = defectRows.every((r) => r.qty == null || (Number.isInteger(r.qty) && r.qty > 0));
  const totalRejectQty = rejectsToSend.reduce((sum, d) => sum + d.qty, 0);

  const partScanned = scannedPart.trim() !== "";
  const partMismatch = lookup != null && partScanned && !partMatches(scannedPart, lookup.partNo);
  const partOk = lookup != null && partScanned && !partMismatch;
  const notSelected = lookup != null && lookup.selectedQty <= 0;

  const packValid =
    !packEnabled ||
    (boxCount != null &&
      boxCount > 0 &&
      packQty != null &&
      packQty > 0 &&
      packQty <= available &&
      skidNo.trim() !== "" &&
      machineCode.trim() !== "" &&
      SHIFT_OPTIONS.includes(shift));

  const canSubmit =
    travelerNo.trim() !== "" &&
    lookup?.travelerNo === travelerNo.trim() &&
    !notSelected &&
    partOk &&
    checkedBy.trim() !== "" &&
    (status !== "HOLD" || note.trim() !== "") &&
    defectsValid &&
    (!concessionEnabled || (status === "HOLD" && concessionBy.trim() !== "" && concessionReason.trim() !== "")) &&
    packValid &&
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
          reject: rejectsToSend,
          ...(concessionEnabled ? { concession: { by: concessionBy, reason: concessionReason } } : {}),
          ...(packEnabled
            ? {
                pack: {
                  boxCount,
                  qty: packQty,
                  skidNo,
                  machineCode,
                  shift,
                },
              }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Lưu thất bại.");
      setResult(data);
      // Nhớ người kiểm tra lần này làm NÚT GỢI Ý cho Traveler kế tiếp —
      // KHÔNG điền sẵn (Mục 15.5, cùng lý do FID-ERP-003 §13.8 câu 2).
      writeRecent(RECENT_KEY, { checkedBy: checkedBy.trim().toUpperCase() });
      setRecentChecker(checkedBy.trim().toUpperCase());
      setTravelerNo("");
      setScannedPart("");
      setLookup(null);
      setLookupError(null);
      setStatus("GOOD");
      setNote("");
      setCheckedBy("");
      setDefectQty({});
      setConcessionEnabled(false);
      setConcessionBy("");
      setConcessionReason("");
      setPackOverride(null);
      setBoxCount(null);
      setTotalOverride(null);
      setSkidNo("");
      setMachineCode("");
      setShift("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageContainer>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>📦 Kiểm tra Wrapping</h1>
      <p style={{ fontSize: 13, color: tokens.color.textMuted, marginBottom: 12 }}>
        Scan Traveler# rồi Enter, scan tiếp Part# để đối chiếu. Ô{" "}
        <span style={{ background: AUTO_BG, padding: "0 4px" }}>xám</span> = tự có từ hệ thống. Ô{" "}
        <span style={{ background: FILL_BG, padding: "0 4px" }}>vàng</span> = copy từ tờ giấy vào.
      </p>

      {error && <p style={{ color: tokens.color.danger }}>{error}</p>}
      {result && (
        <>
          <p style={{ color: tokens.color.success }}>
            Đã lưu kiểm tra #{result.qualityCheckId}
            {result.scrapMoveIds.length > 0 && ` — ${result.scrapMoveIds.length} reject (tổng ${result.totalRejectQty})`}
            {result.packMoveId != null && ` — đã đóng gói (PACK #${result.packMoveId})`}.
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
          ⚠️ Bấm Enter (hoặc &quot;Tra&quot;) để hệ thống điền thông tin Traveler trước khi kiểm tra/lưu.
        </p>
      )}

      {/* Dải đầu — chỉ đọc, tự điền từ DB */}
      {lookup && (
        <fieldset style={blockStyle}>
          <legend style={legendStyle}>Traveler {lookup.travelerNo}</legend>
          <div style={gridStyle}>
            <div>
              <span style={labelStyle}>Part #</span>
              <div style={{ ...fieldStyle, background: AUTO_BG }}>{lookup.partNo}</div>
            </div>
            <div>
              <span style={labelStyle}>LOT #</span>
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
          <div style={{ ...gridStyle, marginTop: 10 }}>
            <div>
              <span style={labelStyle}>Đã lựa</span>
              <div style={{ ...fieldStyle, background: AUTO_BG }}>{lookup.selectedQty}</div>
            </div>
            <div>
              <span style={labelStyle}>Đã đóng gói</span>
              <div style={{ ...fieldStyle, background: AUTO_BG }}>{lookup.packedQty}</div>
            </div>
            <div>
              <span style={labelStyle}>Còn có thể đóng</span>
              <div style={{ ...fieldStyle, background: AUTO_BG }}>{lookup.availableToPack}</div>
            </div>
          </div>
          <p style={{ fontSize: 13, color: tokens.color.textMuted, margin: "8px 0" }}>
            {lookup.lastMoveType && `Gần nhất: ${lookup.lastMoveType}`}
            {lookup.shipped && " · ĐÃ XUẤT"}
            {lookup.lastQualityCheck &&
              ` · Kiểm tra Wrapping trước: ${lookup.lastQualityCheck.status} (${new Date(lookup.lastQualityCheck.createdAt).toLocaleString()})`}
          </p>
          {notSelected && (
            <p style={{ color: tokens.color.danger, fontSize: 13, marginBottom: 8 }}>
              ⚠️ Traveler này chưa qua máy lựa (chưa có SELECT) — chưa có gì để kiểm tra Wrapping.
            </p>
          )}
          <label style={{ display: "block", maxWidth: 320 }}>
            <span style={labelStyle}>Part # (scan đối chiếu — bắt buộc)</span>
            <input
              ref={partInputRef}
              value={scannedPart}
              onChange={(e) => setScannedPart(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (boxesInputRef.current ?? checkerInputRef.current)?.focus()}
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

      {/* Khối "Wrapping" — máy, ca, người kiểm tra */}
      <fieldset style={blockStyle}>
        <legend style={legendStyle}>Wrapping</legend>
        <div style={gridStyle}>
          <label>
            <span style={labelStyle}>Machine / MC #</span>
            <input
              value={machineCode}
              onChange={(e) => setMachineCode(e.target.value)}
              style={{ ...fieldStyle, background: FILL_BG }}
            />
          </label>
          <label>
            <span style={labelStyle}>CHECKER (người kiểm tra)</span>
            <input
              ref={checkerInputRef}
              value={checkedBy}
              onChange={(e) => setCheckedBy(e.target.value)}
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
        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {lookup?.lastSelect?.machineCode && (
            <button type="button" onClick={() => setMachineCode(lookup.lastSelect?.machineCode ?? "")}>
              Theo lần lựa: {lookup.lastSelect.machineCode}
            </button>
          )}
          {recentChecker && (
            <button type="button" onClick={() => setCheckedBy(recentChecker)}>
              Lần trước: {recentChecker}
            </button>
          )}
        </div>
      </fieldset>

      {/* Good / Hold */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {(["GOOD", "HOLD"] as Status[]).map((s) => (
          <button
            key={s}
            type="button"
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

      <label style={{ display: "block", marginBottom: 16 }}>
        <span style={labelStyle}>{status === "HOLD" ? "Lý do Hold (bắt buộc)" : "Special Notes (tuỳ chọn)"}</span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          style={{ ...fieldStyle, background: FILL_BG }}
        />
      </label>

      {/* Khối "Packaging" */}
      <fieldset style={blockStyle}>
        <legend style={legendStyle}>Packaging</legend>
        <label style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <input
            type="checkbox"
            checked={packEnabled}
            disabled={available <= 0}
            onChange={(e) => setPackOverride(e.target.checked)}
          />
          <span style={{ fontWeight: 600 }}>
            Đã đóng thùng (PACK) — số thùng + Skid#
            {lookup && available <= 0 && " — đã đóng gói hết, không còn gì để đóng"}
          </span>
        </label>
        {packEnabled && (
          <>
            <div style={gridStyle}>
              <label>
                <span style={labelStyle}>No. of boxes</span>
                <input
                  ref={boxesInputRef}
                  type="number"
                  min={0}
                  value={boxCount ?? ""}
                  onChange={(e) => setBoxCount(toNumberOrNull(e.target.value))}
                  style={{ ...fieldStyle, background: FILL_BG }}
                />
              </label>
              <div>
                <span style={labelStyle}>Pcs / Carton</span>
                <div style={{ ...fieldStyle, background: AUTO_BG, minHeight: 24 }}>{qtyPerBox ?? ""}</div>
              </div>
              <label>
                <span style={labelStyle}>TTL QNT</span>
                <input
                  type="number"
                  min={0}
                  value={packQty ?? ""}
                  onChange={(e) => setTotalOverride(toNumberOrNull(e.target.value))}
                  style={{ ...fieldStyle, background: totalOverride == null ? AUTO_BG : FILL_BG }}
                />
              </label>
              <label>
                <span style={labelStyle}>SKID#</span>
                <input value={skidNo} onChange={(e) => setSkidNo(e.target.value)} style={{ ...fieldStyle, background: FILL_BG }} />
              </label>
            </div>
            {packAllSuggestion && (
              <div style={{ marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    setBoxCount(packAllSuggestion.boxes);
                    setTotalOverride(null);
                  }}
                >
                  Đóng hết: {packAllSuggestion.boxes} thùng · {packAllSuggestion.qty}
                </button>
              </div>
            )}
            <p style={{ fontSize: 12, color: tokens.color.textMuted, marginTop: 6 }}>
              TTL tự tính = số thùng × Pcs/Carton. Sửa tay được nếu thùng cuối thiếu; xoá trống để tự tính lại. Không
              được vượt số còn có thể đóng ({available}).
            </p>
            {packQty != null && packQty > available && (
              <p style={{ color: tokens.color.danger, fontSize: 13 }}>
                ⚠️ TTL {packQty} vượt số còn có thể đóng gói ({available}).
              </p>
            )}
          </>
        )}
      </fieldset>

      {/* Reject — liệt kê sẵn theo đúng thứ tự tờ giấy Traveler */}
      <fieldset style={blockStyle}>
        <legend style={legendStyle}>Reject — lỗi phát hiện thêm ở Wrapping</legend>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 6, alignItems: "center" }}>
          {defectTypes.map((t) => (
            <div key={t.code} style={{ display: "contents" }}>
              <span>{t.label}</span>
              <input
                type="number"
                min={0}
                aria-label={`${t.label} — Reject qty`}
                value={defectQty[t.code] ?? ""}
                onChange={(e) => setDefectQty((prev) => ({ ...prev, [t.code]: toNumberOrNull(e.target.value) }))}
                style={{ ...fieldStyle, background: FILL_BG }}
              />
            </div>
          ))}
        </div>
        <p style={{ fontSize: 13, color: tokens.color.textMuted, marginTop: 6 }}>
          Tổng reject: {totalRejectQty}. Lỗi không có trong danh sách: ghi số vào &quot;Others&quot; và mô tả ở ô Special
          Notes.
        </p>
      </fieldset>

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
                style={{ width: 160, background: FILL_BG }}
              />
              <input
                placeholder="Lý do nhượng bộ"
                value={concessionReason}
                onChange={(e) => setConcessionReason(e.target.value)}
                style={{ flex: 1, background: FILL_BG }}
              />
            </div>
          )}
        </section>
      )}

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
