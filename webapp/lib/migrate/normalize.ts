// FID-ERP-013 v0.2 — chuẩn hoá giá trị khi migrate (dữ liệu AVP_AI viết lẫn
// hoa/thường, nhiều dạng cho cùng 1 giá trị — không chuẩn hoá thì cùng 1 Lot/Skid
// bị tách thành nhiều bản ghi khác nhau và Packing Slip không gom được theo Skid).

// Lot: TRIM + IN HOA (vd `6-258-40-a` -> `6-258-40-A`, đúng dạng thật `6-251-15-A`).
export function normalizeLotNo(raw: string | undefined): string {
  return (raw ?? "").trim().toUpperCase();
}

// Skid: nguồn có `skid# 30`, `SKID #240`, `Skid # 12` -> `SKID# <số>` (dạng dùng ở
// `/wrapping/check` và dữ liệu demo). Dạng khác -> chỉ TRIM + IN HOA, không đoán.
export function normalizeSkid(raw: string | undefined): string {
  const v = (raw ?? "").trim();
  if (!v) return "";
  const m = /^skid\s*#?\s*(\d+)$/i.exec(v);
  return m ? `SKID# ${m[1]}` : v.toUpperCase();
}
