-- AlterTable
ALTER TABLE "travelers" ADD COLUMN     "is_return_for_rework" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rework_of_lot_no" TEXT,
ADD COLUMN     "rework_of_ps_no" TEXT;

-- CreateTable
CREATE TABLE "po_tracking" (
    "po_no" TEXT NOT NULL,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "set_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "po_tracking_pkey" PRIMARY KEY ("po_no")
);
