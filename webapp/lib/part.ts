// FID-ERP-002 — cắt hậu tố khỏi Part# OCR đọc được để khớp part_control
// theo Finished Part Number (mã gốc). Xác nhận bằng chứng từ thật
// `Data/2. Traveler/TRAVELER SHEETS SEP 9.pdf` (Part# "11546389-T" và
// Finished Part Number "11546389" là CÙNG 1 sản phẩm cho mục đích
// đóng gói) — Andy xác nhận 2026-09-19.
//
// Danh sách hậu tố nguồn `Data/BANG_MA_THAM_CHIEU_AVP_2026-09-17.xlsx`
// sheet `2_Hau_To_Part` (ý nghĩa từng mã vẫn CHƯA xác nhận — chỉ dùng
// để tách khỏi mã gốc, không suy diễn thêm gì khác). Ưu tiên khớp hậu
// tố 2 đoạn trước 1 đoạn (vd "-CA-IN" trước "-B") vì 1 Part# có thể
// cộng dồn nhiều hậu tố (vd "11549168-CA-IN-B").
const KNOWN_SUFFIXES = ["-MY-AK", "-CA-IN", "-IN-PN", "-TH-TC", "-BR-HA", "-HT", "-L", "-A", "-T", "-B", "-X"];

const SUFFIXES_BY_LENGTH_DESC = [...KNOWN_SUFFIXES].sort((a, b) => b.length - a.length);

// Bóc lặp từng hậu tố khớp ở cuối chuỗi cho tới khi không còn khớp nữa
// — KHÔNG cắt bừa theo dấu "-" đầu tiên vì nhiều Part# thật có "-" là
// một phần mã gốc (vd "1015463X-03", "100-5829" — đã kiểm chứng trong
// `1_Part_Control`, không nằm trong danh sách hậu tố biết trước).
export function stripPartSuffix(rawPartNo: string): string {
  let current = rawPartNo.trim();
  let strippedAny = true;
  while (strippedAny) {
    strippedAny = false;
    for (const suffix of SUFFIXES_BY_LENGTH_DESC) {
      if (current.length > suffix.length && current.toUpperCase().endsWith(suffix)) {
        current = current.slice(0, current.length - suffix.length);
        strippedAny = true;
        break;
      }
    }
  }
  return current;
}
