"use client";

// FID-ERP-004 — ô search DUY NHẤT, gắn ở webapp/app/layout.tsx nên hiện
// ở MỌI trang, đối xứng cả 3 điểm truy cập (Office/Xưởng/Admin thấy y
// hệt nhau — không phân quyền như add-file/OCR).
// FID-ERP-015 — mọi dòng kết quả BẤM ĐƯỢC: Traveler -> điền vào ô Traveler# của trang
// đang mở (nếu có, xem lib/ui/pickTraveler.ts) hoặc mở /view/traveler/<no>; link "Chi
// tiết" luôn mở trang chi tiết; Packing Slip -> /view/ps; Part# -> /view/part.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { requestPickTraveler } from "../lib/ui/pickTraveler";
import styles from "./GlobalSearchBar.module.css";

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

// FID-ERP-014 §4d — `size="large"` dùng ở trang chủ (Search là trọng
// tâm, xem §4c) — KHÔNG đổi logic tìm kiếm/API, chỉ đổi CSS kích thước.
type GlobalSearchBarProps = { size?: "default" | "large" };

export default function GlobalSearchBar({ size = "default" }: GlobalSearchBarProps) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function closeResults() {
    setQuery("");
    setResult(null);
  }

  // Trang nào có ô Traveler# sẽ nhận sự kiện và tự điền + tra; không ai nhận -> mở trang chi tiết.
  function pickTraveler(travelerNo: string) {
    if (requestPickTraveler(travelerNo)) {
      closeResults();
    } else {
      router.push(`/view/traveler/${encodeURIComponent(travelerNo)}`);
      closeResults();
    }
  }

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

  const isLarge = size === "large";

  return (
    <div
      style={{
        position: "relative",
        border: "2px solid #111",
        borderRadius: 8,
        padding: isLarge ? 16 : 10,
        background: "#fff",
      }}
    >
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={loading ? "Đang tìm..." : "🔍 Tìm Traveler#, Part#, PO#, Pot#, Lot#, PS#..."}
        style={{
          width: "100%",
          padding: isLarge ? "14px 16px" : "8px 10px",
          fontSize: isLarge ? 20 : 15,
          boxSizing: "border-box",
        }}
        autoFocus={isLarge}
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
                <div key={t.travelerNo} className={styles.row}>
                  <button type="button" className={styles.pick} onClick={() => pickTraveler(t.travelerNo)}>
                    <span>
                      Traveler <b>{t.travelerNo}</b> · Part# {t.partNo}
                      {t.poNo && ` · PO ${t.poNo}`}
                      {t.potNo && ` · Pot# ${t.potNo}`}
                      {t.lotNo && ` · Lot ${t.lotNo}`}
                      {t.lastMoveType && ` · ${t.lastMoveType}`}
                    </span>
                    <span style={{ color: t.shipped ? "#999" : "#166534" }}>{t.shipped ? "Đã xuất" : "Chưa xuất"}</span>
                  </button>
                  <Link
                    href={`/view/traveler/${encodeURIComponent(t.travelerNo)}`}
                    className={styles.detail}
                    onClick={closeResults}
                  >
                    Chi tiết
                  </Link>
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
                <Link
                  key={ps.psNo}
                  href={`/view/ps/${encodeURIComponent(ps.psNo)}`}
                  className={styles.linkRow}
                  onClick={closeResults}
                >
                  PS <b>{ps.psNo}</b> · {ps.lineCount} dòng · Pallets {ps.totalPallets} · Empty {ps.totalEmpty}
                </Link>
              ))}
            </div>
          )}
          {result.partControls.length > 0 && (
            <div>
              <p style={{ padding: "8px 12px 4px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "#666" }}>
                Part Control
              </p>
              {result.partControls.map((pc) => (
                <Link
                  key={pc.partNo}
                  href={`/view/part/${encodeURIComponent(pc.partNo)}`}
                  className={styles.linkRow}
                  onClick={closeResults}
                >
                  Part# <b>{pc.partNo}</b> · Qty/box {pc.qtyPerBox} · {pc.client}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
