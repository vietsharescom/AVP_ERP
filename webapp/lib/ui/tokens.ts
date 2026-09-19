// FID-ERP-014 — design tokens dùng CHUNG cho mọi trang (thay vì mỗi
// trang tự chọn maxWidth/màu riêng — bằng chứng lệch nhau thật đã kiểm
// tra lúc viết FID: /capture=960px, /login=360px, /factory/select=720px).
// Đây là 1 lớp hằng số nhỏ, KHÔNG phải design system — giữ đúng cách làm
// hiện tại (inline style + CSS module thuần, không thêm Tailwind/MUI).
export const tokens = {
  color: {
    bg: "#ffffff",
    bgAlt: "#fafafa",
    border: "#ddd",
    text: "#111",
    textMuted: "#666",
    danger: "#b91c1c",
    success: "#166534",
    warning: "#92400e",
    // 1 MÀU NHẤN DUY NHẤT cho nút hành động chính — đổi giá trị ở ĐÚNG 1
    // chỗ này nếu Andy muốn đổi màu sau này, không sửa từng trang.
    accent: "#0f766e",
    accentText: "#ffffff",
  },
  space: { xs: 4, sm: 8, md: 16, lg: 24 },
  maxWidth: 960,
  breakpointMobile: 640, // px — dưới ngưỡng này áp responsive di động
} as const;
