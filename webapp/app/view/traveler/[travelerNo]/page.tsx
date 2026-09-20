// FID-ERP-015 — trang chi tiết 1 Traveler (chỉ đọc, mọi trạm): thông tin + tổng theo
// loại + lịch sử stock_moves / quality_checks / lot_updates / Packing Slip.
import Link from "next/link";
import { notFound } from "next/navigation";
import PageContainer from "../../../../components/PageContainer";
import { Fact, FactGrid, Section, fmtDateTime, fmtNum, tableStyle, tdStyle, thStyle } from "../../../../components/DetailBits";
import { getTravelerDetail } from "../../../../lib/detail";
import { tokens } from "../../../../lib/ui/tokens";

export default async function TravelerDetailPage({ params }: { params: Promise<{ travelerNo: string }> }) {
  const { travelerNo: raw } = await params;
  const travelerNo = decodeURIComponent(raw);
  const d = await getTravelerDetail(travelerNo);
  if (!d) notFound();

  const shipped = d.totals.SHIP > 0;

  return (
    <PageContainer>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>
        🧾 Traveler {d.travelerNo}{" "}
        <span style={{ fontSize: 13, fontWeight: 600, color: shipped ? tokens.color.textMuted : tokens.color.success }}>
          {shipped ? "Đã xuất" : "Chưa xuất"}
          {d.isReturnForRework && " · Rework"}
        </span>
      </h1>
      <p style={{ fontSize: 13, color: tokens.color.textMuted, marginBottom: 14 }}>
        Chỉ xem — không sửa được ở đây. Tạo lúc {fmtDateTime(d.createdAt)}.
      </p>

      <FactGrid>
        <Fact
          label="Part #"
          value={<Link href={`/view/part/${encodeURIComponent(d.partNo)}`}>{d.partNo}</Link>}
        />
        <Fact label="PO" value={d.poNo} />
        <Fact label="Pot #" value={d.potNo} />
        <Fact label="Lot #" value={d.lotNo} />
        <Fact label="Skid #" value={d.skidNo} />
        <Fact label="Pcs / Carton" value={fmtNum(d.qtyPerBox)} />
        <Fact label="Khách" value={d.client} />
      </FactGrid>

      <Section title="Số lượng theo loại">
        <FactGrid>
          <Fact label="Nhận (RECEIVE)" value={fmtNum(d.totals.RECEIVE)} />
          <Fact label="Đã lựa (SELECT)" value={fmtNum(d.totals.SELECT)} />
          <Fact label="Đã đóng (PACK)" value={fmtNum(d.totals.PACK)} />
          <Fact label="Hỏng (SCRAP)" value={fmtNum(d.totals.SCRAP)} />
          <Fact label="Giữ xử lý lại (REWORK)" value={fmtNum(d.totals.REWORK)} />
          <Fact label="Trả lại (RETURN)" value={fmtNum(d.totals.RETURN)} />
          <Fact label="Đã xuất (SHIP)" value={fmtNum(d.totals.SHIP)} />
          <Fact label="Còn có thể đóng" value={fmtNum(d.availableToPack)} />
          <Fact label="Chờ xuất" value={fmtNum(d.awaitingShipment)} />
        </FactGrid>
      </Section>

      <Section title={`Lịch sử (${d.moves.length})`}>
        {d.moves.length === 0 ? (
          <p style={{ fontSize: 13, color: tokens.color.textMuted }}>Chưa có chuyển động nào (mới đăng ký).</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                {["Thời điểm", "Loại", "Số lượng", "Máy", "Người", "Ca", "Lý do / thùng", "Ghi chú", "Trạm"].map((h) => (
                  <th key={h} style={thStyle}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.moves.map((m) => (
                <tr key={m.id}>
                  <td style={tdStyle}>{fmtDateTime(m.createdAt)}</td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{m.moveType}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{fmtNum(m.qty)}</td>
                  <td style={tdStyle}>{m.machineCode}</td>
                  <td style={tdStyle}>{m.operatorCode}</td>
                  <td style={tdStyle}>{m.shift}</td>
                  <td style={tdStyle}>
                    {m.reasonCode}
                    {m.boxCount != null && `${m.boxCount} thùng`}
                  </td>
                  <td style={tdStyle}>{m.note}</td>
                  <td style={tdStyle}>{m.sourceStation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title={`Kiểm tra Wrapping (${d.qualityChecks.length})`}>
        {d.qualityChecks.length === 0 ? (
          <p style={{ fontSize: 13, color: tokens.color.textMuted }}>Chưa có lần kiểm tra Good/Hold nào.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                {["Thời điểm", "Kết quả", "Người kiểm tra", "Ghi chú", "Concession"].map((h) => (
                  <th key={h} style={thStyle}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.qualityChecks.map((q) => (
                <tr key={q.id}>
                  <td style={tdStyle}>{fmtDateTime(q.createdAt)}</td>
                  <td style={{ ...tdStyle, fontWeight: 600, color: q.status === "GOOD" ? tokens.color.success : tokens.color.danger }}>
                    {q.status}
                  </td>
                  <td style={tdStyle}>{q.checkedBy}</td>
                  <td style={tdStyle}>{q.note}</td>
                  <td style={tdStyle}>{q.concessionBy && `${q.concessionBy}${q.concessionReason ? ` — ${q.concessionReason}` : ""}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {d.lotUpdates.length > 0 && (
        <Section title={`Đổi Lot (${d.lotUpdates.length})`}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {["Thời điểm", "Lot cũ", "Lot mới", "Người cập nhật"].map((h) => (
                  <th key={h} style={thStyle}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.lotUpdates.map((l) => (
                <tr key={l.id}>
                  <td style={tdStyle}>{fmtDateTime(l.createdAt)}</td>
                  <td style={tdStyle}>{l.oldLotNo}</td>
                  <td style={tdStyle}>{l.newLotNo}</td>
                  <td style={tdStyle}>{l.updatedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      <Section title={`Packing Slip (${d.packingLines.length})`}>
        {d.packingLines.length === 0 ? (
          <p style={{ fontSize: 13, color: tokens.color.textMuted }}>Chưa nằm trong Packing Slip nào.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                {["PS#", "Ngày", "Số lượng", "Lot", "Skid"].map((h) => (
                  <th key={h} style={thStyle}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.packingLines.map((l, i) => (
                <tr key={`${l.psNo}-${i}`}>
                  <td style={tdStyle}>
                    <Link href={`/view/ps/${encodeURIComponent(l.psNo)}`}>{l.psNo}</Link>
                  </td>
                  <td style={tdStyle}>{fmtDateTime(l.createdAt)}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{fmtNum(l.qty)}</td>
                  <td style={tdStyle}>{l.lotNoSnap}</td>
                  <td style={tdStyle}>{l.skidNoSnap}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </PageContainer>
  );
}
