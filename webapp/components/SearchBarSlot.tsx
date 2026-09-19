"use client";

// FID-ERP-014 §4c/4d — CHỈ 1 instance <GlobalSearchBar> cho toàn app
// (tránh 2 ô search chồng nhau khi trang chủ cũng muốn hiện to) — layout.tsx
// dùng component này thay vì render GlobalSearchBar trực tiếp; tự phóng to
// khi đang ở "/" (trang chủ, Search là trọng tâm), nhỏ lại ở mọi trang khác.
import { usePathname } from "next/navigation";
import GlobalSearchBar from "./GlobalSearchBar";

export default function SearchBarSlot() {
  const pathname = usePathname();
  return <GlobalSearchBar size={pathname === "/" ? "large" : "default"} />;
}
