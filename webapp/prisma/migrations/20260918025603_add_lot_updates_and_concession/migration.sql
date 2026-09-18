-- AlterTable
ALTER TABLE "travelers" ADD COLUMN     "lot_concession_at" TIMESTAMP(3),
ADD COLUMN     "lot_concession_by" TEXT,
ADD COLUMN     "lot_concession_reason" TEXT;

-- CreateTable
CREATE TABLE "lot_updates" (
    "id" SERIAL NOT NULL,
    "traveler_no" TEXT NOT NULL,
    "old_lot_no" TEXT,
    "new_lot_no" TEXT NOT NULL,
    "updated_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lot_updates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lot_updates_traveler_no_created_at_idx" ON "lot_updates"("traveler_no", "created_at");

-- AddForeignKey
ALTER TABLE "lot_updates" ADD CONSTRAINT "lot_updates_traveler_no_fkey" FOREIGN KEY ("traveler_no") REFERENCES "travelers"("traveler_no") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =====================================================================
-- Manual additions — không phải Prisma sinh tự động, xem
-- docs/features/FID-ERP-001_20260917.md Mục 13 (v1.7) cho lý do đầy đủ.
-- KHÔNG chạy `prisma db push` sau khi migration này apply.
-- =====================================================================

-- Trigger: lot_updates bất biến ở TẦNG DATABASE — Andy xác nhận
-- 2026-09-18 "không sửa đè, ghi audit trail đầy đủ" cho lịch sử đổi Lot.
CREATE OR REPLACE FUNCTION prevent_lot_updates_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'lot_updates is append-only: % not allowed', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lot_updates_no_update
  BEFORE UPDATE OR DELETE ON lot_updates
  FOR EACH ROW EXECUTE FUNCTION prevent_lot_updates_mutation();
