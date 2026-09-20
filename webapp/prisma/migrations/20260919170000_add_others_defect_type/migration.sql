-- FID-ERP-003 v1.4 (Mục 13.2b/13.8 câu 5) — thêm dòng "Others" mà tờ Traveler
-- giấy thật có (11 dòng defect: Data/2. Traveler/TRAVELER SHEETS SEP 9.pdf,
-- mục Defect / # of PCS Found) nhưng seed ban đầu (FID-ERP-001) thiếu, chỉ 10.
-- Chỉ THÊM 1 dòng dữ liệu — không đổi cấu trúc bảng. Andy xác nhận 2026-09-19.
INSERT INTO "defect_types" ("code", "label") VALUES ('OTHERS', 'Others')
ON CONFLICT ("code") DO NOTHING;
