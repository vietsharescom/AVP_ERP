// FID-ERP-007 — Rework/Return linkage (Traveler ĐÃ XUẤT bị Infasco trả
// lại toàn bộ, tín hiệu Pot#="GAYLORD"). Xem
// docs/features/FID-ERP-007_20260918.md §4d/§5.
import { prisma } from "./prisma";

// Chuẩn hoá TRIM+UPPER trước khi so — không phân biệt hoa/thường/khoảng
// trắng thừa (giống pattern machine_code ở FID-ERP-003).
export function isGaylordReturn(potNo: string | null | undefined): boolean {
  if (!potNo) return false;
  return potNo.trim().toUpperCase() === "GAYLORD";
}

export type ReworkOrigin = { reworkOfPsNo: string | null; reworkOfLotNo: string | null };

// Tra PS gốc + Lot gốc bằng FK THẬT (stock_moves SHIP + packing_slip_lines)
// — không so khớp text/AI. Có thể để trống nếu Traveler xuất lần đầu
// trước khi AVP_ERP có dữ liệu (trước FID-ERP-013 migrate lịch sử) —
// KHÔNG coi là lỗi (§5 RULES).
export async function findReworkOrigin(travelerNo: string): Promise<ReworkOrigin> {
  const lastShip = await prisma.stockMove.findFirst({
    where: { travelerNo, moveType: "SHIP" },
    orderBy: { createdAt: "desc" },
  });
  if (!lastShip) return { reworkOfPsNo: null, reworkOfLotNo: null };

  const psLine = await prisma.packingSlipLine.findFirst({
    where: { travelerNo },
    orderBy: { id: "desc" },
    include: { packingSlip: true },
  });
  if (!psLine) return { reworkOfPsNo: null, reworkOfLotNo: null };

  return { reworkOfPsNo: psLine.packingSlip.psNo, reworkOfLotNo: psLine.lotNoSnap };
}

// Traveler đã từng có dòng RETURN nào chưa — dùng để chỉ ghi RETURN ĐÚNG
// 1 LẦN cho mỗi đợt rework (FID-ERP-003 confirm không ghi trùng khi lựa
// lại nhiều lần trong cùng đợt). Xem FID-ERP-007 §8 — chưa phân biệt
// nhiều đợt rework tách biệt trong đời 1 Traveler (để dành).
export async function hasReturnMove(travelerNo: string): Promise<boolean> {
  const existing = await prisma.stockMove.findFirst({
    where: { travelerNo, moveType: "RETURN" },
    select: { id: true },
  });
  return existing != null;
}
