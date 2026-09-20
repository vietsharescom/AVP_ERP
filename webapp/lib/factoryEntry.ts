// FID-ERP-003 v1.4 (Mục 13) — hàm thuần cho trang nhập liệu Xưởng
// `/factory/select`: tự tính Total, đối chiếu Part# scan, dựng defects[]
// từ bảng liệt kê sẵn theo tờ giấy, cảnh báo Total không chia hết.
import { stripPartSuffix } from "./part";

function isPositiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

// Total = số thùng × Pcs/Carton. Đầu vào rỗng/âm/không nguyên -> null (form
// để trống ô Total thay vì hiện số vô nghĩa).
export function computeTotal(cartons: number | null, qtyPerBox: number | null): number | null {
  if (!isPositiveInt(cartons) || !isPositiveInt(qtyPerBox)) return null;
  return cartons * qtyPerBox;
}

// Part# in trên tờ có thể kèm hậu tố ("11546456-A"), DB lưu mã gốc
// ("11546456") — so sánh sau khi cắt hậu tố cả 2 phía (FID-ERP-002 v1.1).
export function partMatches(scannedPartNo: string, partNo: string): boolean {
  return stripPartSuffix(scannedPartNo).toUpperCase() === stripPartSuffix(partNo).toUpperCase();
}

// FID-ERP-005 v1.5 — Wrapping: gợi ý "đóng hết" số còn có thể đóng gói
// (SUM SELECT − SUM PACK) thành số thùng tròn. Không chia hết -> null (không
// gợi ý số thùng lẻ, QA tự nhập).
export function suggestPackAll(
  available: number | null,
  qtyPerBox: number | null,
): { boxes: number; qty: number } | null {
  if (!isPositiveInt(available) || !isPositiveInt(qtyPerBox)) return null;
  if (available % qtyPerBox !== 0) return null;
  return { boxes: available / qtyPerBox, qty: available };
}

// Thứ tự dòng defect TRÊN TỜ GIẤY (mục "Defect / # of PCS Found") — form
// liệt kê đúng thứ tự này để operator nhìn giấy gõ đúng dòng. Mã lạ (thêm
// vào defect_types sau này) đứng cuối, không bị mất.
export const PAPER_DEFECT_ORDER = [
  "LOOSE_WASHER_NUT",
  "DAMAGED_PILOT",
  "UPSIDE_DOWN_WASHER",
  "MIXED",
  "MIS_FORMED",
  "REAMED",
  "UN_TAPPED",
  "EXCESS_PLATING",
  "SLIVERS",
  "STUCK_TOGETHER",
  "OTHERS",
];

export function sortDefectTypesByPaper<T extends { code: string }>(types: T[]): T[] {
  const rank = (code: string) => {
    const idx = PAPER_DEFECT_ORDER.indexOf(code);
    return idx === -1 ? PAPER_DEFECT_ORDER.length : idx;
  };
  return [...types].sort((a, b) => rank(a.code) - rank(b.code));
}

export type DefectInputRow ={ reasonCode: string; qty: number | null | undefined };

// Bảng defect liệt kê sẵn mọi loại — chỉ gửi API các dòng có qty > 0
// (dòng để trống = không có defect loại đó).
export function buildDefects(rows: DefectInputRow[]): { reasonCode: string; qty: number }[] {
  return rows.filter((r): r is { reasonCode: string; qty: number } => isPositiveInt(r.qty)).map((r) => ({
    reasonCode: r.reasonCode,
    qty: r.qty,
  }));
}

// CHỈ CẢNH BÁO (không chặn): Total không chia hết Pcs/Carton -> nhắc kiểm
// tra lại số thùng; hợp lệ nếu thùng cuối thiếu.
export function notDivisibleWarning(selectQty: number, qtyPerBox: number): string | null {
  if (!isPositiveInt(selectQty) || !isPositiveInt(qtyPerBox)) return null;
  if (selectQty % qtyPerBox === 0) return null;
  return (
    `selectQty ${selectQty} không chia hết cho Pcs/Carton ${qtyPerBox} — ` +
    `kiểm tra lại số thùng (hợp lệ nếu thùng cuối thiếu).`
  );
}
