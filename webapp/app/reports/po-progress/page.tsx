"use client";

// FID-ERP-008 — Báo cáo đối chiếu PO. Xem 1 PO cụ thể hoặc danh sách PO
// còn tồn đọng; form set/sửa ngày bắt đầu-kết thúc theo dõi (nhân viên
// tự nhập, không OCR/không tự suy đoán).
import { useEffect, useState } from "react";
import PageContainer from "../../../components/PageContainer";

type ReworkTraveler = { travelerNo: string; reworkOfPsNo: string | null; reworkOfLotNo: string | null };

type PoReport = {
  poNo: string;
  startDate: string | null;
  endDate: string | null;
  isOverdue: boolean;
  daysOpen: number;
  totalTravelers: number;
  completed: number;
  outstanding: number;
  reworkTravelers: ReworkTraveler[];
};

function fmt(d: string | null) {
  return d ? new Date(d).toLocaleDateString("vi-VN") : "—";
}

function ReportCard({ report }: { report: PoReport }) {
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 6, padding: 12, marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <strong>PO {report.poNo}</strong>
        {report.isOverdue && <span style={{ color: "#b91c1c", fontWeight: 600 }}>⚠ Trễ hạn</span>}
      </div>
      <p style={{ fontSize: 13, color: "#555", margin: "4px 0" }}>
        Bắt đầu: {fmt(report.startDate)} · Hạn: {fmt(report.endDate)} · Mở {report.daysOpen} ngày
      </p>
      <p style={{ fontSize: 13 }}>
        Tổng {report.totalTravelers} traveler — đã xong {report.completed} — còn tồn đọng{" "}
        <strong>{report.outstanding}</strong>
      </p>
      {report.reworkTravelers.length > 0 && (
        <p style={{ fontSize: 13, color: "#92400e" }}>
          Rework: {report.reworkTravelers.map((r) => r.travelerNo).join(", ")}
        </p>
      )}
    </div>
  );
}

export default function PoProgressPage() {
  const [reports, setReports] = useState<PoReport[]>([]);
  const [poQuery, setPoQuery] = useState("");
  const [singleReport, setSingleReport] = useState<PoReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [trackPoNo, setTrackPoNo] = useState("");
  const [trackStart, setTrackStart] = useState("");
  const [trackEnd, setTrackEnd] = useState("");
  const [trackSetBy, setTrackSetBy] = useState("");
  const [trackResult, setTrackResult] = useState<string | null>(null);

  async function loadList() {
    const res = await fetch("/api/reports/po-progress");
    const data = await res.json();
    if (data.ok) setReports(data.reports);
  }

  useEffect(() => {
    fetch("/api/reports/po-progress")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) setReports(data.reports);
      })
      .catch(() => {});
  }, []);

  async function searchPo() {
    setError(null);
    setSingleReport(null);
    if (poQuery.trim() === "") return;
    const res = await fetch(`/api/reports/po-progress?po=${encodeURIComponent(poQuery.trim())}`);
    const data = await res.json();
    if (!res.ok || !data.ok) {
      setError(data.error || "Không tìm thấy.");
      return;
    }
    setSingleReport(data);
  }

  async function saveTracking() {
    setTrackResult(null);
    setError(null);
    try {
      const res = await fetch("/api/reports/po-progress/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poNo: trackPoNo,
          startDate: trackStart || null,
          endDate: trackEnd || null,
          setBy: trackSetBy || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Lưu thất bại.");
      setTrackResult(`Đã lưu ngày theo dõi cho PO ${data.poNo}.`);
      await loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra.");
    }
  }

  return (
    <PageContainer>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>📋 Báo cáo đối chiếu PO</h1>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>
        Theo từng PO — bao nhiêu Traveler đã xong (SHIP), còn tồn đọng, và Traveler nào đang rework.
      </p>

      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}

      <section style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input placeholder="Tra 1 PO cụ thể" value={poQuery} onChange={(e) => setPoQuery(e.target.value)} />
          <button onClick={searchPo}>Xem</button>
        </div>
        {singleReport && <div style={{ marginTop: 8 }}>{<ReportCard report={singleReport} />}</div>}
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600 }}>PO còn tồn đọng (mở lâu nhất trước)</h2>
        {reports.length === 0 ? <p style={{ fontSize: 13, color: "#666" }}>Không có PO nào còn tồn đọng.</p> : null}
        {reports.map((r) => (
          <ReportCard key={r.poNo} report={r} />
        ))}
      </section>

      <section style={{ borderTop: "1px solid #ddd", paddingTop: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600 }}>Set/sửa ngày theo dõi PO</h2>
        {trackResult && <p style={{ color: "#166534" }}>{trackResult}</p>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input placeholder="PO#" value={trackPoNo} onChange={(e) => setTrackPoNo(e.target.value)} style={{ width: 140 }} />
          <label>
            Bắt đầu <input type="date" value={trackStart} onChange={(e) => setTrackStart(e.target.value)} />
          </label>
          <label>
            Hạn <input type="date" value={trackEnd} onChange={(e) => setTrackEnd(e.target.value)} />
          </label>
          <input placeholder="Người set" value={trackSetBy} onChange={(e) => setTrackSetBy(e.target.value)} style={{ width: 120 }} />
          <button onClick={saveTracking} disabled={trackPoNo.trim() === ""}>
            Lưu
          </button>
        </div>
      </section>
    </PageContainer>
  );
}
