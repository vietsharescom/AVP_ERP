-- AlterEnum
ALTER TYPE "MoveType" ADD VALUE 'REWORK';

-- AlterTable
ALTER TABLE "stock_moves" ADD COLUMN     "note" TEXT;
