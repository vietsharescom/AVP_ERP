-- CreateEnum
CREATE TYPE "QualityStatus" AS ENUM ('GOOD', 'HOLD');

-- CreateTable
CREATE TABLE "quality_checks" (
    "id" SERIAL NOT NULL,
    "traveler_no" TEXT NOT NULL,
    "status" "QualityStatus" NOT NULL,
    "note" TEXT,
    "checked_by" TEXT NOT NULL,
    "concession_by" TEXT,
    "concession_reason" TEXT,
    "concession_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quality_checks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quality_checks_traveler_no_created_at_idx" ON "quality_checks"("traveler_no", "created_at");

-- AddForeignKey
ALTER TABLE "quality_checks" ADD CONSTRAINT "quality_checks_traveler_no_fkey" FOREIGN KEY ("traveler_no") REFERENCES "travelers"("traveler_no") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =====================================================================
-- Manual additions — không phải Prisma sinh tự động, xem
-- docs/features/FID-ERP-001_20260917.md Mục 11 (v1.6) cho lý do đầy đủ.
-- KHÔNG chạy `prisma db push` sau khi migration này apply.
-- =====================================================================

-- Trigger: quality_checks bất biến ở TẦNG DATABASE, cùng lý do với
-- stock_moves (chặn ở code không đủ) — hàm riêng (không dùng lại
-- prevent_stock_moves_mutation() vì message hardcode "stock_moves",
-- dùng chung sẽ báo lỗi sai tên bảng).
CREATE OR REPLACE FUNCTION prevent_quality_checks_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'quality_checks is append-only: % not allowed', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_quality_checks_no_update
  BEFORE UPDATE OR DELETE ON quality_checks
  FOR EACH ROW EXECUTE FUNCTION prevent_quality_checks_mutation();

-- View: "lần kiểm tra QC gần nhất nói gì" — cùng phạm vi hẹp như
-- traveler_last_select_status (KHÔNG phải "đang ở đâu trong vòng đời").
CREATE VIEW "traveler_last_quality_check" AS
  SELECT DISTINCT ON (traveler_no)
    traveler_no, status AS last_status, concession_by IS NOT NULL AS has_concession, created_at
  FROM quality_checks
  ORDER BY traveler_no, created_at DESC;
