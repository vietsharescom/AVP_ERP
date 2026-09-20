// Quy ước Ca làm việc — chỉ CẢNH BÁO (không chặn, `shift` vẫn là TEXT tự
// do theo FID-ERP-001 §5). Nguồn: chứng từ thật `WRAPPING SUMMARY`
// (`D:\AVP_AI\Data\4.WRAPPING\WRAPPING SUMMARY-SEP 4.jpeg`, cột SHIFT) —
// chỉ quan sát được đúng 2 giá trị, Andy xác nhận 2026-09-19 thống nhất
// dùng "MRNNG" (sáng) và "AFTRN" (chiều). Khác mã máy/mã nhân viên
// (`3_Ma_May`/`4_Ma_Nhan_Vien` — tự ghi "chưa xác nhận", KHÔNG dùng làm
// rule) — đây là quy ước ĐÃ CHỐT, dùng được ngay.
export const KNOWN_SHIFTS = ["MRNNG", "AFTRN"];

// `normalizedShift` phải đã TRIM+UPPER trước khi gọi (cùng chuẩn hoá đã
// áp dụng cho machine_code/operator_code, xem FID-ERP-003/FID-ERP-005).
export function shiftWarning(normalizedShift: string): string | null {
  if (KNOWN_SHIFTS.includes(normalizedShift)) return null;
  return `Ca "${normalizedShift}" không khớp quy ước đã biết (${KNOWN_SHIFTS.join("/")}) — kiểm tra lại có gõ sai không.`;
}
