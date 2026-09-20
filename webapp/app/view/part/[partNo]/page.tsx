// FID-ERP-015 — trang chi tiết 1 Part# (chỉ đọc, mọi trạm): part_control + 100 Traveler mới nhất.
import Link from "next/link";
import { notFound } from "next/navigation";
import PageContainer from "../../../../components/PageContainer";
import { Fact, FactGrid, Section, fmtNum, tableStyle, tdStyle, thStyle } from "../../../../components/DetailBits";
import { getPartDetail } from "../../../../lib/detail";
import { tokens } from "../../../../lib/ui/tokens";

export default async function PartDetailPage({ params }: { params: Promise<{ partNo: string }> }) {
  const { partNo: raw } = await params;
  const partNo = decodeURIComponent(raw);
  const d = await getPartDetail(partNo);
  if (!d) notFound();

  return (
    <PageContainer>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>🔩 Part# {d.partNo}</h1>
      <p style={{ fontSize: 13, color: tokens.color.textMuted, marginBottom: 14 }}>Chỉ xem.</p>

      <FactGrid>
        <Fact label="Pcs / Carton" value={fmtNum(d.qtyPerBox)} />
        <Fact label="Khách" value={d.client} />
        <Fact label="Tổng Traveler" value={fmtNum(d.travelerCount)} />
        <Fact label="Chưa xuất" value={fmtNum(d.openCount)} />
      </FactGrid>

      <Section title={`Traveler mới nhất (${d.travelers.length}${d.travelerCount > d.travelers.length ? ` / ${fmtNum(d.travelerCount)}` : ""})`}>
        {d.travelers.length === 0 ? (
          <p style={{ fontSize: 13, color: tokens.color.textMuted }}>Chưa có Traveler nào cho Part# này.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                {["Traveler#", "PO", "Pot", "Lot", "Gần nhất", "Trạng thái"].map((h) => (
                  <th key={h} style={thStyle}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.travelers.map((t) => (
                <tr key={t.travelerNo}>
                  <td style={tdStyle}>
                    <Link href={`/view/traveler/${encodeURIComponent(t.travelerNo)}`}>{t.travelerNo}</Link>
                  </td>
                  <td style={tdStyle}>{t.poNo}</td>
                  <td style={tdStyle}>{t.potNo}</td>
                  <td style={tdStyle}>{t.lotNo}</td>
                  <td style={tdStyle}>{t.lastMoveType}</td>
                  <td style={{ ...tdStyle, color: t.shipped ? tokens.color.textMuted : tokens.color.success }}>
                    {t.shipped ? "Đã xuất" : "Chưa xuất"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </PageContainer>
  );
}
