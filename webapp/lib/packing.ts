// FID-ERP-009 §4/§5 — tra 1 Traveler đủ điều kiện vào Packing Slip chưa.
// Đọc lại dữ liệu đã có (PACK/Skid# từ FID-ERP-005, Good/Hold từ
// FID-ERP-005, Lot placeholder/Concession từ FID-ERP-006,
// isReturnForRework từ FID-ERP-007) — KHÔNG ghi DB.
import { prisma } from "./prisma";
import { isLotPlaceholder } from "./lot";

export type PackingEligibility = {
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
};

type LastQualityCheckRow = { last_status: "GOOD" | "HOLD"; has_concession: boolean };

// PACK và Good/Hold là 2 CỔNG ĐỘC LẬP — availableQty đã PACK KHÔNG có
// nghĩa đủ điều kiện xuất; luôn đọc lần kiểm tra Wrapping GẦN NHẤT, dù
// PACK xảy ra trước hay sau lần kiểm tra đó (xem FID-ERP-009 §5 RULES).
export async function getPackingEligibility(travelerNo: string): Promise<PackingEligibility | null> {
  const traveler = await prisma.traveler.findUnique({ where: { travelerNo } });
  if (!traveler) return null;

  const [packAgg, shipAgg, qcRows] = await Promise.all([
    prisma.stockMove.aggregate({ where: { travelerNo, moveType: "PACK" }, _sum: { qty: true } }),
    prisma.stockMove.aggregate({ where: { travelerNo, moveType: "SHIP" }, _sum: { qty: true } }),
    prisma.$queryRawUnsafe<LastQualityCheckRow[]>(
      `SELECT last_status, has_concession FROM traveler_last_quality_check WHERE traveler_no = $1`,
      travelerNo,
    ),
  ]);

  const availableQty = (packAgg._sum.qty ?? 0) - (shipAgg._sum.qty ?? 0);
  const blockReasons: string[] = [];
  const warnings: string[] = [];

  if (availableQty <= 0) {
    blockReasons.push("Chưa có hàng đã đóng gói (PACK) hoặc đã xuất hết — availableQty=0");
  }

  const qc = qcRows[0];
  if (!qc) {
    blockReasons.push("Chưa kiểm tra Wrapping (Good/Hold) lần nào");
  } else if (qc.last_status === "HOLD" && !qc.has_concession) {
    blockReasons.push("Lần kiểm tra Wrapping gần nhất là HOLD, chưa có Concession");
  }

  if (isLotPlaceholder(traveler.lotNo) && !traveler.lotConcessionBy) {
    blockReasons.push(`Lot còn placeholder (${traveler.lotNo}), chưa có Lot thật hoặc Concession`);
  }

  if (traveler.isReturnForRework) {
    warnings.push("Traveler đang isReturnForRework=true — hàng trả lại xử lý lại, kiểm tra kỹ trước khi xuất");
  }

  return {
    travelerNo: traveler.travelerNo,
    partNo: traveler.partNo,
    lotNo: traveler.lotNo,
    potNo: traveler.potNo,
    skidNo: traveler.skidNo,
    isReturnForRework: traveler.isReturnForRework,
    availableQty,
    eligible: blockReasons.length === 0,
    blockReasons,
    warnings,
  };
}

// Gợi ý (KHÔNG tự thêm) các Traveler# khác cùng Skid# — đúng AVP_AI §5.1(b).
export async function findSameSkidTravelers(skidNo: string, excludeTravelerNos: string[]): Promise<string[]> {
  if (!skidNo) return [];
  const rows = await prisma.traveler.findMany({
    where: { skidNo, travelerNo: { notIn: excludeTravelerNos } },
    select: { travelerNo: true },
  });
  return rows.map((r) => r.travelerNo);
}
