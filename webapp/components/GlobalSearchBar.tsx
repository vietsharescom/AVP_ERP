"use client";

// FID-ERP-004 — ô search DUY NHẤT, gắn ở webapp/app/layout.tsx nên hiện
// ở MỌI trang, đối xứng cả 3 điểm truy cập (Office/Xưởng/Admin thấy y
// hệt nhau — không phân quyền như add-file/OCR).
import { useEffect, useState } from "react";

type TravelerResult = {
  travelerNo: string;
  partNo: string;
  poNo: string | null;
  potNo: string | null;
  lotNo: string | null;
  shipped: boolean;
  lastMoveType: string | null;
  lastMoveAt: string | null;
};

type PackingSlipResult = {
  psNo: string;
  totalPallets: number;
  totalEmpty: number;
  lineCount: number;
  createdAt: string;
};

type PartControlResult = { partNo: string; qtyPerBox: number; client: string };

type SearchResponse = {
  ok: boolean;
  travelers: TravelerResult[];
  packingSlips: PackingSlipResult[];
  partControls: PartControlResult[];
};

const DEBOUNCE_MS = 300;

export default function GlobalSearchBar() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q === "") {
      return;
    }
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then((res) => res.json())
        .then((data) => setResult(data))
        .finally(() => setLoading(false));
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const totalMatches =
    (result?.travelers.length ?? 0) + (result?.packingSlips.length ?? 0) + (result?.partControls.length ?? 0);

  return (
    <div style={{ position: "relative", border: "2px solid #111", borderRadius: 8, padding: 10, background: "#fff" }}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={loading ? "Đang tìm..." : "🔍 Tìm Traveler#, Part#, PO#, Pot#, Lot#, PS#..."}
        style={{ width: "100%", padding: "8px 10px", fontSize: 15, boxSizing: "border-box" }}
      />
      {query.trim() !== "" && result && (
        <div style={{ marginTop: 8, maxHeight: 384, overflowY: "auto", border: "1px solid #ddd", borderRadius: 6, background: "#fafafa" }}>
          {totalMatches === 0 && (
            <p style={{ padding: "8px 12px", fontSize: 13, color: "#666" }}>Không tìm thấy &quot;{query}&quot;.</p>
          )}
          {result.travelers.length > 0 && (
            <div>
              <p style={{ padding: "8px 12px 4px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "#666" }}>
                Traveler
              </p>
              {result.travelers.map((t) => (
                <div key={t.travelerNo} style={{ padding: "6px 12px", fontSize: 13, display: "flex", justifyContent: "space-between" }}>
                  <span>
                    Traveler <b>{t.travelerNo}</b> · Part# {t.partNo}
                    {t.poNo && ` · PO ${t.poNo}`}
                    {t.potNo && ` · Pot# ${t.potNo}`}
                    {t.lotNo && ` · Lot ${t.lotNo}`}
                    {t.lastMoveType && ` · ${t.lastMoveType}`}
                  </span>
                  <span style={{ color: t.shipped ? "#999" : "#166534" }}>{t.shipped ? "Đã xuất" : "Chưa xuất"}</span>
                </div>
              ))}
            </div>
          )}
          {result.packingSlips.length > 0 && (
            <div>
              <p style={{ padding: "8px 12px 4px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "#666" }}>
                Packing Slip
              </p>
              {result.packingSlips.map((ps) => (
                <div key={ps.psNo} style={{ padding: "6px 12px", fontSize: 13 }}>
                  PS <b>{ps.psNo}</b> · {ps.lineCount} dòng · Pallets {ps.totalPallets} · Empty {ps.totalEmpty}
                </div>
              ))}
            </div>
          )}
          {result.partControls.length > 0 && (
            <div>
              <p style={{ padding: "8px 12px 4px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "#666" }}>
                Part Control
              </p>
              {result.partControls.map((pc) => (
                <div key={pc.partNo} style={{ padding: "6px 12px", fontSize: 13 }}>
                  Part# <b>{pc.partNo}</b> · Qty/box {pc.qtyPerBox} · {pc.client}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
