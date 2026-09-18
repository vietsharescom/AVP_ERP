Dưới đây là phản biện chi tiết, thực tế, theo từng câu hỏi trong tài liệu, kèm khuyến nghị cụ thể cho quy mô 1 xưởng nội bộ B2B (on-premise, vài nghìn dòng/tháng, 1–4 máy LAN, không cloud).

Câu hỏi 1 — CHECK constraint điều kiện qua raw SQL sau Prisma migration
Đánh giá: Pattern bạn đang dùng là chuẩn và an toàn với Prisma hiện tại. Prisma schema không hỗ trợ conditional CHECK (phụ thuộc giá trị cột khác). Cách phổ biến nhất trong production là:

prisma migrate dev --create-only
Sửa file migration SQL, thêm ALTER TABLE ... ADD CONSTRAINT ... CHECK (...)
prisma migrate deploy (hoặc dev)

Rủi ro drift: Có, nhưng kiểm soát được.

Prisma migrate diff / db pull không tự xóa CHECK constraint bạn thêm tay (trừ khi bạn chạy prisma db push hoặc tạo migration mới mà vô tình drop).
Best practice để tránh drift lâu dài:
Đặt tất cả CHECK constraint vào một migration riêng (ví dụ YYYYMMDDHHMMSS_add_stock_moves_checks.sql) và không để Prisma regenerate lại file đó.
Trong CI hoặc trước mỗi migrate dev, chạy:Bashprisma migrate diff --from-migrations --to-schema-datamodel prisma/schema.prisma --exit-codeđể phát hiện nếu Prisma muốn drop constraint.
Hoặc dùng extension prisma-dbml-generator / comment trong schema để ghi nhớ.


Khuyến nghị bổ sung:

Viết test integration (vitest + testcontainers hoặc pg) kiểm tra constraint thật sự fire (INSERT SELECT thiếu machine_code phải fail).
Nếu sau này Prisma hỗ trợ CHECK (đã có discussion), migrate dần sang schema.prisma.

Kết luận: Giữ nguyên pattern raw-SQL. An toàn nếu bạn discipline với migration files.

Câu hỏi 2 — Cardinality Lot ↔ Traveler + hỗ trợ Split Lot
Phân tích dữ liệu thật:

Traveler có field “Split from: 6-251-15” → Lot 6-251-15-A là child của Lot gốc. Đây là quan hệ cây (genealogy), không phải 1-nhiều phẳng.
Mô hình đề xuất (khuyến nghị mạnh):
prismamodel Lot {
  lotNo        String   @id @map("lot_no")
  parentLotNo  String?  @map("parent_lot_no")
  createdAt    DateTime @default(now()) @map("created_at")

  parent       Lot?     @relation("LotHierarchy", fields: [parentLotNo], references: [lotNo])
  children     Lot[]    @relation("LotHierarchy")
  travelers    Traveler[]

  @@map("lots")
}

Traveler.lotNo → Lot vẫn là N:1 (nhiều Traveler cùng 1 Lot).
Thêm parentLotNo nullable tự tham chiếu → hỗ trợ split/rework/genealogy 2 chiều.
Query truy vết: recursive CTE hoặc Prisma $queryRaw với WITH RECURSIVE.

Có cần bảng trung gian không?

Không. Với volume nhỏ và nghiệp vụ hiện tại (chỉ split, chưa merge phức tạp), self-reference đủ. Nếu sau này có “merge lot” thì mới cân nhắc lot_lineage junction.
Owner cần xác nhận:

1 Lot có thể gắn nhiều Traveler không? (dữ liệu mẫu gợi ý có). Nếu Owner khẳng định 1-1 thì đơn giản hóa, bỏ quan hệ N:1.
Kết luận: Thêm parent_lot_no ngay từ FID-ERP-001. Đây là thay đổi rẻ nhất lúc này, đắt nhất nếu làm sau.

Câu hỏi 3 — 2 cổng AI (Office + Laptop admin)
Đánh giá rủi ro: Với quy mô 1 xưởng nội bộ, 2 điểm cố định (không mở rộng) là đủ an toàn. Không cần rate-limit hay anomaly detection phức tạp.
Tuy nhiên, cần bổ sung audit tối thiểu:

Thêm cột triggered_from (enum: OFFICE | ADMIN_LAPTOP | SYSTEM) vào bảng liên quan đến OCR (hoặc vào stock_moves nếu OCR tạo move).
Log thiết bị (hostname hoặc fixed machine_id) vào PrintLog / bảng OCR confirmation.
Mọi lần “Xác nhận OCR” phải ghi operator_code + triggered_from + created_at.

Không cần:

Rate limit (số lượng PO/ngày rất thấp).
Cảnh báo bất thường real-time (overkill).

Nguyên tắc giữ:

Vẫn chỉ có 2 điểm được phép kích hoạt OCR. Không bao giờ mở OCR ở trạm Xưởng. Điều này giữ surface attack nhỏ và audit dễ.
Kết luận: 2 cổng OK. Chỉ cần thêm triggered_from (hoặc tương đương) để query “ai/máy nào kích hoạt”.

Câu hỏi 4 — machine_code / operator_code / shift để TEXT tự do
Phân tích rủi ro thật từ dữ liệu mẫu:

Đã thấy BF116 vs chữ hoa/thường lẫn lộn, Tbl + 1 tách cột, Mrnng. Đây là nguồn lỗi báo cáo sau này.
Khuyến nghị giai đoạn hiện tại (pragmatism > perfection):

Giữ TEXT trong FID-ERP-001 (không chặn tiến độ).
Thêm normalization layer ngay:
Trigger hoặc application-level: UPPER(TRIM(machine_code)) trước khi insert.
Index trên LOWER(machine_code) nếu cần search case-insensitive.

Tạo bảng lookup optional ngay từ đầu (không bắt buộc FK):

prismamodel Machine {
  code        String   @id
  label       String?
  active      Boolean  @default(true)
  @@map("machines")
}

Application vẫn cho phép insert machine_code mới (auto-create nếu chưa có).
Báo cáo ưu tiên join bảng machines.
Khi danh sách ổn định → migrate sang FK cứng + CHECK.

Tương tự cho operator_code và shift.

Shift có thể chuẩn hóa sớm hơn (chỉ vài giá trị: MORNING, AFTERNOON, NIGHT).
Kết luận: Giữ TEXT + normalize + bảng lookup mềm. Không ép ENUM cứng lúc này.

Câu hỏi 5 — Volume & “đọc thẳng stock_moves, không cache”
Ước lượng: vài nghìn dòng/tháng → sau 5 năm ≈ 100–200k dòng. Với Postgres trên server nhỏ (4–8 GB RAM) hoàn toàn ổn.
Khuyến nghị:

Giữ nguyên “không materialized view” (YAGNI đúng).
Bắt buộc index ngay từ FID-ERP-001:

SQLCREATE INDEX idx_stock_moves_type_created ON stock_moves (move_type, created_at);
CREATE INDEX idx_stock_moves_machine_created ON stock_moves (machine_code, created_at);
CREATE INDEX idx_stock_moves_traveler ON stock_moves (traveler_no);
CREATE INDEX idx_stock_moves_operator ON stock_moves (operator_code);

Báo cáo FID-ERP-012 dùng GROUP BY trực tiếp + index trên → query < 50 ms ngay cả khi 500k dòng.
Chỉ cân nhắc materialized view / partition theo năm khi:
Báo cáo chạy chậm > 1–2 giây, hoặc
Cần real-time dashboard phức tạp.


Kết luận: Không cache là đúng. Index là bắt buộc, không phải “tối ưu sớm”.

Câu hỏi 6 — Chiến lược migrate 1 lần từ Google Sheets “bẩn”
Pattern chuẩn cho dữ liệu bẩn + CHECK constraint chặt:

Phase 0 – Audit script độc lập (chạy trước mọi migration):
Đọc 5 sheet → xuất CSV/JSON.
Kiểm tra toàn bộ rule CHECK + FK + uniqueness.
Xuất báo cáo: “dòng nào vi phạm gì”, kèm đề xuất sửa.

Phase 1 – Quarantine table:SQLCREATE TABLE migration_quarantine (
  id SERIAL PRIMARY KEY,
  source_sheet TEXT,
  source_row INT,
  raw_data JSONB,
  error_codes TEXT[],
  resolved BOOLEAN DEFAULT FALSE
);
Dòng sạch → insert thẳng vào schema chính.
Dòng lỗi → quarantine + Owner quyết định (sửa tay / bỏ / force).

Phase 2 – Migration script idempotent:
Dùng transaction lớn hoặc batch nhỏ.
Không bao giờ để CHECK constraint làm fail toàn bộ migration.
Log mọi quyết định vào migration_log.

Phase 3 – Reconciliation report:
So sánh count + tổng qty giữa Sheets cũ và Postgres mới.
Owner ký xác nhận trước khi tắt AVP_AI.


Không nên: Chạy migration thẳng vào schema có CHECK và để nó fail hàng loạt.
Kết luận: Script quét lỗi trước + quarantine là pattern đúng và chuyên nghiệp cho dữ liệu đã biết bẩn.

Câu hỏi 7 — Backup / Recovery Postgres on-premise
Khuyến nghị cụ thể cho quy mô này (không downtime dài được):













































Thành phầnKhuyến nghịLý doFull backuppg_dump (custom format) hàng ngày lúc 02:00Đơn giản, restore nhanhWAL archivingBật archive_mode = on + archive vào ổ cứng thứ 2RPO ≈ vài phútRetention7–14 ngày local + 1 bản/tháng off-siteĐủ cho quy mô nhỏLưu trữỔ cứng rời (USB 3.0 / external SSD) tại chỗ + 1 bản copy sang máy khác trong LANĐủ an toàn nếu không có cloudOff-site tối thiểuCopy hàng tuần sang laptop admin hoặc ổ cứng mang về nhà OwnerBảo vệ khỏi cháy/trộmRPO mục tiêu≤ 24h (chấp nhận mất tối đa 1 ngày)Thực tế với giao hàng hàng ngàyRTO mục tiêu≤ 2–4 giờ (restore từ pg_dump + replay WAL)Server nhỏ, restore nhanh
Cấu hình tối thiểu nên ghi vào FACILITIES_SETUP.md:
Bash# crontab
0 2 * * * /usr/local/bin/backup_avp_erp.sh

# backup_avp_erp.sh
pg_dump -Fc -f /backup/avp_erp_$(date +%Y%m%d).dump avp_erp
# + rsync sang ổ cứng thứ 2
Test restore bắt buộc: Ít nhất 1 lần/quý restore thử trên máy test.
Kết luận: pg_dump hàng ngày + WAL + 1 bản off-site (ổ cứng/laptop) là đủ và rẻ. Không cần cloud lúc này.

Tổng hợp khuyến nghị ưu tiên (theo thứ tự nên làm ngay)

Lot hierarchy → thêm parent_lot_no ngay.
Index trên stock_moves → thêm trong FID-ERP-001.
Normalize TEXT (UPPER/TRIM) + bảng lookup mềm cho machine/operator.
Migration strategy → audit script + quarantine trước khi có CHECK.
Backup → Owner quyết định ngân sách ổ cứng + viết script pg_dump + test restore.
2 cổng AI → thêm triggered_from, không cần phức tạp hơn.
CHECK constraint → giữ pattern raw SQL, discipline migration files.

Các đề xuất của Claude trong Mục 8 đều hợp lý và thực tế. Chỉ cần siết thêm ở Lot hierarchy và backup là đủ để FID-ERP-001 sẵn sàng APPROVED.