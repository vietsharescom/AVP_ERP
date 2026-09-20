// FID-ERP-015 — trang chi tiết 1 Packing Slip (chỉ đọc, mọi trạm).
import Link from "next/link";
import { notFound } from "next/navigation";
import PageContainer from "../../../../components/PageContainer";
import { Fact, FactGrid, Section, fmtDateTime, fmtNum, tableStyle, tdStyle, thStyle } from "../../../../components/DetailBits";
import { getPackingSlipDetail } from "../../../../lib/detail";
import { tokens } from "../../../../lib/ui/tokens";

export default async function PackingSlipDetailPage({ params }: { params: Promise<{ psNo: string }> }) {
  const { psNo: raw } = await params;
  const psNo = decodeURIComponent(raw);
  const d = await getPackingSlipDetail(psNo);
  if (!d) notFound();

  return (
    <PageContainer>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>🚚 Packing Slip {d.psNo}</h1>
      <p style={{ fontSize: 13, color: tokens.color.textMuted, marginBottom: 14 }}>
        Chỉ xem — chứng từ xuất hàng, số liệu là ảnh chụp lúc duyệt.
      </p>

      <FactGrid>
        <Fact label="Ngày lập" value={fmtDateTime(d.createdAt)} />
        <Fact label="Số dòng" value={fmtNum(d.lines.length)} />
        <Fact label="Tổng số lượng" value={fmtNum(d.totalQty)} />
        <Fact label="Total Pallets" value={fmtNum(d.totalPallets)} />
        <Fact label="Total Empty" value={fmtNum(d.totalEmpty)} />
      </FactGrid>

      <Section title={`Các dòng (${d.lines.length})`}>
        <table style={tableStyle}>
          <thead>
            <tr>
              {["Traveler#", "Part#", "Lot", "Pot", "Skid", "Số lượng"].map((h) => (
                <th key={h} style={thStyle}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {d.lines.map((l, i) => (
              <tr key={`${l.travelerNo}-${i}`}>
                <td style={tdStyle}>
                  <Link href={`/view/traveler/${encodeURIComponent(l.travelerNo)}`}>{l.travelerNo}</Link>
                </td>
                <td style={tdStyle}>
                  <Link href={`/view/part/${encodeURIComponent(l.partNoSnap)}`}>{l.partNoSnap}</Link>
                </td>
                <td style={tdStyle}>{l.lotNoSnap}</td>
                <td style={tdStyle}>{l.potNoSnap}</td>
                <td style={tdStyle}>{l.skidNoSnap}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{fmtNum(l.qty)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </PageContainer>
  );
}
