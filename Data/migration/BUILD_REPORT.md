# BUILD_REPORT — dữ liệu chạy thử FID-ERP-013 (dựng tự động, KHÔNG sửa tay)
Dựng lúc 2026-09-20 07:30 bằng `webapp/scripts/migrate/xlsx_to_csv.py`. Các số/giả định:

- WORK ORDER gộp theo Traveler#: 6087 Traveler từ 4 file; thêm 560 Traveler chỉ có ở CHECKING SUMMARY/WorkStationArchive/ARCHIVE (dựng dòng từ chính nơi đó).
- Ngày đăng ký Traveler thiếu ở WORK ORDER: 564 Traveler lấy ngày sớm nhất từ bằng chứng khác (CHECKING SUMMARY/WorkStationArchive/ARCHIVE). Còn thiếu -> để trống, migrate sẽ quarantine INVALID_DATE.
- PartControl: 1075 Part# từ PART_CONTROL_MASTER + 2 Part# suy qty/thùng từ TTL/số thùng hoặc Unit Quantity (≥3 dòng, ≥80% cùng 1 giá trị). Part# còn thiếu qty -> quarantine.
- 20 Traveler có ngày WORK ORDER muộn hơn bằng chứng xử lý sớm nhất -> hạ xuống ngày bằng chứng (để RECEIVE không nằm sau SELECT/SHIP).
- Warehouse (RECEIVE) SUY TỪ `PIECES` của WORK ORDER, CHỈ cho Traveler đã có CHECKING SUMMARY/WorkStationArchive/ARCHIVE — AVP_AI (Excel) không có sổ nhận kho riêng. Traveler chưa xử lý: chỉ đăng ký (tương đương đích `po`).
- FinishGood: 2143 dòng CHECKING SUMMARY + 1687 dòng WorkStationArchive của Traveler KHÔNG có trong CHECKING SUMMARY (nguồn này KHÔNG có cột Ca -> ghi `shift=UNKNOWN` (nhãn "chưa rõ", KHÔNG suy ca theo giờ vì dữ liệu thật cho thấy giờ ghi không quyết định ca; server sẽ cảnh báo ca lạ ở các màn hình nhập, còn báo cáo hiện thành nhóm ca riêng)).
- PackingList: bỏ 77 dòng PS trống/0 (chưa xuất). Ngày xuất: 483 dòng có INV DATE riêng, 266 dòng lấy ngày của dòng khác cùng PS, 884 dòng ƯỚC TÍNH theo số PS — nội suy trong khoảng đã biết, ngoại suy tuyến tính ngoài khoảng, chặn trần 2026-09-16 (ghi ở cột notes).
- PackingList bổ sung: 3231 dòng xuất SUY TỪ cờ `Shipped` + số PS trong WORK ORDER (Traveler không có trong ARCHIVE; qty = tổng SELECT hoặc PIECES, ngày ước tính/theo PS) — nếu không, PO-progress báo hàng nghìn Traveler 'tồn đọng' dù đã xuất. 311 Traveler ghi `Shipped` nhưng thiếu số PS thật (`#REF!`/0) -> KHÔNG suy, vẫn hiện chưa xuất.
- Ngày xuất ƯỚC TÍNH bị nâng lên ngày sản xuất cuối của Traveler ở 71 dòng (xuất hàng không thể trước khi đóng thùng); mọi ngày xuất ghi giờ 18:00 (giờ ƯỚC TÍNH) để SHIP luôn sau PACK cùng ngày.
- KHÔNG nạp: Serial từng thùng (chưa có bảng `carton_serials`), Partial Boxes (chưa có FID Partial), ngày/giờ của WorkStationArchive khi Traveler đã có ở CHECKING SUMMARY (tránh nhân đôi sản lượng).

## Đầu ra
- PartControl.csv: 1077 dòng
- RawMaterial.csv: 6647 dòng
- Warehouse.csv: 2941 dòng
- FinishGood.csv: 3830 dòng
- PackingList.csv: 4864 dòng
