// FID-ERP-003 v1.4 / FID-ERP-005 v1.5 — nhớ giá trị lần lưu trước ở
// `localStorage` để hiện NÚT GỢI Ý (không điền sẵn). localStorage có thể
// bị chặn/trống (cửa sổ ẩn danh, xoá dữ liệu...) — mọi đọc/ghi bọc
// try/catch, form vẫn chạy bình thường khi không có.
export function readRecent<T>(key: string, guard: (value: unknown) => value is T): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return guard(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeRecent(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // không bắt buộc.
  }
}
