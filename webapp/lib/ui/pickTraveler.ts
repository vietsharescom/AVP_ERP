// FID-ERP-015 §4 — chọn Traveler từ ô tìm kiếm chung. Ô tìm kiếm phát 1 sự kiện
// HUỶ ĐƯỢC (cancelable); trang nào có ô Traveler# thì lắng nghe, tự điền + tra rồi
// `preventDefault()` = "tôi đã xử lý". Không ai xử lý -> ô tìm kiếm mở trang chi tiết.
// Tách rời (không context/provider) để ô tìm kiếm ở layout không phụ thuộc từng trang.
import { useEffect, useRef } from "react";

export const PICK_TRAVELER_EVENT = "avp:pick-traveler";

// Trả `true` nếu có trang đã xử lý (điền vào form), `false` nếu không ai xử lý.
export function requestPickTraveler(travelerNo: string): boolean {
  const event = new CustomEvent(PICK_TRAVELER_EVENT, { detail: { travelerNo }, cancelable: true });
  // dispatchEvent trả false khi có listener gọi preventDefault().
  return !window.dispatchEvent(event);
}

export function usePickTraveler(onPick: (travelerNo: string) => void): void {
  const latest = useRef(onPick);
  useEffect(() => {
    latest.current = onPick;
  });
  useEffect(() => {
    function listener(e: Event) {
      const travelerNo = (e as CustomEvent<{ travelerNo?: unknown }>).detail?.travelerNo;
      if (typeof travelerNo !== "string" || travelerNo === "") return;
      e.preventDefault();
      latest.current(travelerNo);
    }
    window.addEventListener(PICK_TRAVELER_EVENT, listener);
    return () => window.removeEventListener(PICK_TRAVELER_EVENT, listener);
  }, []);
}
