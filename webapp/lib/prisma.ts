// Prisma Client singleton — Prisma 7 yêu cầu driver adapter tường minh
// (khác bản <=6 tự đọc DATABASE_URL từ schema.prisma). Dùng chung 1 nơi
// để mọi route/feature sau này (FID-ERP-002+) không tự viết lại.
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  var __prisma: PrismaClient | undefined;
}

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

// Next.js dev mode hot-reloads modules — tái dùng 1 instance để không mở
// tràn lan connection pool mỗi lần reload.
export const prisma = globalThis.__prisma ?? createClient();
if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
