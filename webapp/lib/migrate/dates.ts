// Parse ngày từ CSV — rỗng/không hợp lệ trả `null` (KHÔNG tự đoán, đúng
// AI_POLICY.md domain rule), gọi nơi dùng phải tự quarantine dòng đó.
export function parseSourceDate(value: string | null | undefined): Date | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function parsePositiveInt(value: string | null | undefined): number | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}
