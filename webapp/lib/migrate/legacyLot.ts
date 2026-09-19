// Placeholder LOT NO. THẬT của AVP_AI (khác placeholder AVP_ERP tự sinh ở
// `lib/lot.ts`, dạng `LOT-{travelerNo}-{date}`) — xem `D:\AVP_AI\BRS_TRS.md`
// §3b + `webapp/src/app/api/finish-good/confirm/route.ts` (`isLotPlaceholder`,
// đọc THAM KHẢO, CLAUDE.md nguyên tắc #5). 3 giá trị này là CHỮ TRẠNG THÁI,
// không phải mã lot thật — không migrate vào `travelers.lotNo`.
export function isLegacyLotPlaceholder(lotNo: string | null | undefined): boolean {
  const v = (lotNo ?? "").trim().toUpperCase();
  if (!v) return false;
  return v === "TRAVELERRECEIVED" || v === "SORT&RETURN" || v.startsWith("SPLIT FROM TR#");
}
