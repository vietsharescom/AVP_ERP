// FID-ERP-013 v0.2 (Mục 0 #3) — tách cột `Reject` + `Special Notes` của
// AVP_AI (CHECKING SUMMARY / FinishGood) thành các dòng SCRAP.
//
// Dữ liệu thật (Wrapping_final.xlsm, 2143 dòng, kiểm chứng 2026-09-20): 836
// dòng có Reject; 99% có DANH SÁCH số khớp thứ tự với DANH SÁCH tên lỗi, vd
// `Reject="3, 100, 1, 7"` ↔ `Special Notes="MIXED, SILVERS, DAMAGED LOCKING,
// DAMAGED FIANGE"`. Tên lỗi thật có viết tắt/sai chính tả (`STUCK TGT`,
// `SILVERS`, `DAMAGED FIANGE`...) không khớp 11 `defect_types`.
//
// Quy tắc (theo cách Andy đã chốt cho Wrapping — FID-ERP-005 v1.5 Mục 15.8
// câu 4: tên lỗi ngoài danh sách -> `Others` + ghi chú, KHÔNG bỏ dòng):
//   - Số lượng khớp số tên lỗi -> ghép từng cặp, 1 dòng SCRAP mỗi tên lỗi.
//   - Tên lỗi khớp `defect_types` (đúng nhãn, hoặc bí danh đã biết) -> dùng mã đó.
//   - Tên lỗi KHÔNG khớp -> `OTHERS`, `note` giữ NGUYÊN tên gốc (không mất thông tin).
//   - Số lượng KHÔNG khớp số tên lỗi (không biết cách chia) -> 1 dòng `OTHERS`
//     = TỔNG số lượng, `note` giữ nguyên Special Notes + Reject gốc — KHÔNG đoán cách chia.
import { parsePositiveInt } from "./dates";

export type RejectLine = { qty: number; reasonCode: string; note: string | null };
export type DefectTypeRef = { code: string; label: string };
export type RejectParse = { lines: RejectLine[] } | { error: "INVALID_REJECT_QTY" };

// Bí danh quan sát được trong dữ liệu thật (chỉ viết tắt/số ít-số nhiều của
// ĐÚNG loại lỗi đã có, không suy diễn loại lỗi mới).
const ALIASES: Record<string, string> = {
  "STUCK TGT": "STUCK_TOGETHER",
  "STUCK TOGETHER": "STUCK_TOGETHER",
  SILVERS: "SLIVERS",
  SLIVER: "SLIVERS",
};

function splitList(value: string | undefined): string[] {
  return (value ?? "")
    .split(/[,;/]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function resolveName(name: string, types: DefectTypeRef[]): string | null {
  const n = name.trim().toUpperCase();
  if (ALIASES[n]) return ALIASES[n];
  const byLabel = types.find((t) => t.label.toUpperCase() === n);
  if (byLabel) return byLabel.code;
  const byContain = types.find((t) => n.includes(t.label.toUpperCase()));
  return byContain?.code ?? null;
}

export function parseRejectLines(
  reject: string | undefined,
  specialNotes: string | undefined,
  types: DefectTypeRef[],
): RejectParse {
  const rawNums = (reject ?? "")
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const nums = rawNums.map((s) => parsePositiveInt(s));
  if (nums.length === 0 || nums.some((n) => n === null)) return { error: "INVALID_REJECT_QTY" };
  const qtys = nums as number[];

  const names = splitList(specialNotes);

  if (names.length === qtys.length) {
    return {
      lines: qtys.map((qty, i) => {
        const code = resolveName(names[i], types);
        return code ? { qty, reasonCode: code, note: null } : { qty, reasonCode: "OTHERS", note: names[i] };
      }),
    };
  }

  const total = qtys.reduce((s, n) => s + n, 0);
  const noteParts = [(specialNotes ?? "").trim(), `(reject gốc: ${(reject ?? "").trim()})`].filter((s) => s.length > 0);
  return { lines: [{ qty: total, reasonCode: "OTHERS", note: noteParts.join(" ") }] };
}
