-- CreateEnum
CREATE TYPE "MoveType" AS ENUM ('RECEIVE', 'SELECT', 'PACK', 'SHIP', 'SCRAP', 'RETURN');

-- CreateTable
CREATE TABLE "lots" (
    "lot_no" TEXT NOT NULL,
    "parent_lot_no" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lots_pkey" PRIMARY KEY ("lot_no")
);

-- CreateTable
CREATE TABLE "defect_types" (
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "defect_types_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "travelers" (
    "traveler_no" TEXT NOT NULL,
    "part_no" TEXT NOT NULL,
    "po_no" TEXT,
    "pot_no" TEXT,
    "lot_no" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "travelers_pkey" PRIMARY KEY ("traveler_no")
);

-- CreateTable
CREATE TABLE "stock_moves" (
    "id" SERIAL NOT NULL,
    "traveler_no" TEXT NOT NULL,
    "move_type" "MoveType" NOT NULL,
    "qty" INTEGER NOT NULL,
    "machine_code" TEXT,
    "operator_code" TEXT,
    "shift" TEXT,
    "reason_code" TEXT,
    "pot_no" TEXT,
    "source_station" TEXT,
    "device_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_moves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_control" (
    "part_no" TEXT NOT NULL,
    "qty_per_box" INTEGER NOT NULL,
    "client" TEXT NOT NULL,

    CONSTRAINT "part_control_pkey" PRIMARY KEY ("part_no")
);

-- CreateTable
CREATE TABLE "packing_slips" (
    "id" SERIAL NOT NULL,
    "ps_no" TEXT NOT NULL,
    "total_pallets" INTEGER NOT NULL DEFAULT 0,
    "total_empty" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "packing_slips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packing_slip_lines" (
    "id" SERIAL NOT NULL,
    "packing_slip_id" INTEGER NOT NULL,
    "traveler_no" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "part_no_snap" TEXT NOT NULL,
    "lot_no_snap" TEXT,
    "pot_no_snap" TEXT,

    CONSTRAINT "packing_slip_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "print_log" (
    "id" SERIAL NOT NULL,
    "traveler_no" TEXT NOT NULL,
    "part_no" TEXT NOT NULL,
    "printed_by" TEXT NOT NULL,
    "printed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "print_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lots_parent_lot_no_idx" ON "lots"("parent_lot_no");

-- CreateIndex
CREATE UNIQUE INDEX "defect_types_label_key" ON "defect_types"("label");

-- CreateIndex
CREATE INDEX "stock_moves_traveler_no_idx" ON "stock_moves"("traveler_no");

-- CreateIndex
CREATE INDEX "stock_moves_move_type_created_at_idx" ON "stock_moves"("move_type", "created_at");

-- CreateIndex
CREATE INDEX "stock_moves_machine_code_created_at_idx" ON "stock_moves"("machine_code", "created_at");

-- CreateIndex
CREATE INDEX "stock_moves_created_at_idx" ON "stock_moves"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "packing_slips_ps_no_key" ON "packing_slips"("ps_no");

-- AddForeignKey
ALTER TABLE "lots" ADD CONSTRAINT "lots_parent_lot_no_fkey" FOREIGN KEY ("parent_lot_no") REFERENCES "lots"("lot_no") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travelers" ADD CONSTRAINT "travelers_part_no_fkey" FOREIGN KEY ("part_no") REFERENCES "part_control"("part_no") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travelers" ADD CONSTRAINT "travelers_lot_no_fkey" FOREIGN KEY ("lot_no") REFERENCES "lots"("lot_no") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_moves" ADD CONSTRAINT "stock_moves_traveler_no_fkey" FOREIGN KEY ("traveler_no") REFERENCES "travelers"("traveler_no") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_moves" ADD CONSTRAINT "stock_moves_reason_code_fkey" FOREIGN KEY ("reason_code") REFERENCES "defect_types"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packing_slip_lines" ADD CONSTRAINT "packing_slip_lines_packing_slip_id_fkey" FOREIGN KEY ("packing_slip_id") REFERENCES "packing_slips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packing_slip_lines" ADD CONSTRAINT "packing_slip_lines_traveler_no_fkey" FOREIGN KEY ("traveler_no") REFERENCES "travelers"("traveler_no") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_log" ADD CONSTRAINT "print_log_traveler_no_fkey" FOREIGN KEY ("traveler_no") REFERENCES "travelers"("traveler_no") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =====================================================================
-- Manual additions — không phải Prisma sinh tự động, xem
-- docs/features/FID-ERP-001_20260917.md §5 RULES (v1.4) cho lý do đầy đủ.
-- KHÔNG chạy `prisma db push` sau khi migration này apply — db push có
-- thể xoá các đối tượng dưới đây vì chúng không khai báo trong schema.prisma.
-- =====================================================================

-- CHECK constraints (Prisma schema thuần không hỗ trợ CHECK điều kiện
-- phụ thuộc cột khác)
ALTER TABLE "stock_moves" ADD CONSTRAINT "chk_select_pack_requires_context"
  CHECK (move_type NOT IN ('SELECT', 'PACK') OR (
    NULLIF(TRIM(machine_code), '') IS NOT NULL AND
    NULLIF(TRIM(operator_code), '') IS NOT NULL AND
    NULLIF(TRIM(shift), '') IS NOT NULL
  ));

ALTER TABLE "stock_moves" ADD CONSTRAINT "chk_scrap_requires_reason"
  CHECK (move_type != 'SCRAP' OR reason_code IS NOT NULL);

ALTER TABLE "stock_moves" ADD CONSTRAINT "chk_qty_positive"
  CHECK (qty > 0);

ALTER TABLE "packing_slip_lines" ADD CONSTRAINT "chk_ps_line_qty_positive"
  CHECK (qty > 0);

-- View: chỉ trả lời "lần SELECT gần nhất nói gì" — KHÔNG phải "Traveler
-- đang ở đâu trong vòng đời" (2 câu hỏi khác nhau, xem FID-ERP-001 §5)
CREATE VIEW "traveler_last_select_status" AS
  SELECT DISTINCT ON (traveler_no) traveler_no, move_type AS last_move_type, created_at
  FROM stock_moves
  WHERE move_type = 'SELECT'
  ORDER BY traveler_no, created_at DESC;

-- Trigger: stock_moves bất biến ở TẦNG DATABASE, không chỉ tầng ứng dụng
-- (lý do: lỗi AVP_AI xảy ra vì có đường tắt bỏ qua route chuẩn — chặn ở
-- code không đủ, xem FID-ERP-001 §5)
CREATE OR REPLACE FUNCTION prevent_stock_moves_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'stock_moves is append-only: % not allowed', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stock_moves_no_update
  BEFORE UPDATE OR DELETE ON stock_moves
  FOR EACH ROW EXECUTE FUNCTION prevent_stock_moves_mutation();

-- Seed: 10 loại Defect thật từ phiếu Traveler giấy mẫu (Data/2. Traveler/
-- TRAVELER SHEETS SEP 9.pdf, mục SORT AND PACK) — KHÔNG bịa thêm giá trị
INSERT INTO "defect_types" ("code", "label") VALUES
  ('STUCK_TOGETHER', 'Stuck Together'),
  ('SLIVERS', 'Slivers'),
  ('EXCESS_PLATING', 'Excess Plating'),
  ('UN_TAPPED', 'Un-Tapped'),
  ('REAMED', 'Reamed'),
  ('MIS_FORMED', 'Mis-Formed'),
  ('MIXED', 'Mixed'),
  ('UPSIDE_DOWN_WASHER', 'Upside Down Washer'),
  ('DAMAGED_PILOT', 'Damaged Pilot'),
  ('LOOSE_WASHER_NUT', 'Loose Washer Nut');
