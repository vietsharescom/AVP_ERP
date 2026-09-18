// FID-ERP-006 — Lot placeholder + tách cặp Traveler#+Lot# từ email, KHÔNG
// AI (đúng nguyên tắc "1 điểm AI duy nhất" của cả dự án — Gemini OCR chỉ
// dùng cho ảnh/PDF ở FID-ERP-002).

const LOT_PATTERN = /\d-\d{3}-\d{2}-[A-Za-z]/;
const TRAVELER_PATTERN = /\d{6}/g;
// `.+` chứ không `\d+` cho phần travelerNo — travelerNo là String tự do
// trong schema (không ép numeric-only), dù dữ liệu thật luôn là số.
const PLACEHOLDER_PATTERN = /^LOT-.+-\d{6}$/;

export function isLotPlaceholder(lotNo: string | null | undefined): boolean {
  if (!lotNo) return false;
  return PLACEHOLDER_PATTERN.test(lotNo);
}

export function generateLotPlaceholder(travelerNo: string, date: Date = new Date()): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `LOT-${travelerNo}-${yy}${mm}${dd}`;
}

export type LotEmailMatch = { travelerNo: string; lotNo: string };
export type LotEmailParseResult = { matches: LotEmailMatch[]; unmatched: string[] };

// Bắt CẶP, không quét rời từng mã (FID-ERP-006 §5) — tìm Lot# theo mẫu
// đặc thù trước (khó trùng ngẫu nhiên trong chữ ký/banner email), rồi từ
// vị trí đó tìm Traveler# (6 chữ số) gần nhất TRÊN CÙNG DÒNG. Dòng không
// có mẫu Lot# nào bị bỏ qua im lặng (banner/chữ ký) — dòng CÓ mẫu Lot#
// nhưng không ghép được Traveler# thì vào `unmatched`.
export function parseLotEmail(emailText: string): LotEmailParseResult {
  const matches: LotEmailMatch[] = [];
  const unmatched: string[] = [];

  for (const rawLine of emailText.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "") continue;

    const lotMatch = line.match(LOT_PATTERN);
    if (!lotMatch || lotMatch.index == null) continue;

    const lotNo = lotMatch[0];
    const before = line.slice(0, lotMatch.index);
    const after = line.slice(lotMatch.index + lotNo.length);

    const beforeMatches = [...before.matchAll(TRAVELER_PATTERN)];
    const travelerBefore = beforeMatches[beforeMatches.length - 1]?.[0];
    const travelerAfter = after.match(TRAVELER_PATTERN)?.[0];
    const travelerNo = travelerBefore ?? travelerAfter;

    if (travelerNo) {
      matches.push({ travelerNo, lotNo });
    } else {
      unmatched.push(line);
    }
  }

  return { matches, unmatched };
}
