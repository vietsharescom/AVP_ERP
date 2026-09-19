-- CreateTable
CREATE TABLE "migration_quarantine" (
    "id" SERIAL NOT NULL,
    "source_sheet" TEXT NOT NULL,
    "source_row" INTEGER NOT NULL,
    "raw_data" JSONB NOT NULL,
    "error_codes" TEXT[],
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "migration_quarantine_pkey" PRIMARY KEY ("id")
);
