// FID-ERP-002 §4a — CHỈ đọc file qua Gemini, KHÔNG BAO GIỜ ghi DB.
// Người xem lại draft trả về ở đây trước khi gọi /api/capture/confirm
// (CCP-1 — không có đường tắt nào gọi thẳng confirm mà bỏ qua bước này).
import { NextRequest, NextResponse } from "next/server";
import { extractCaptureRows, type CaptureDestination } from "../../../../lib/ocr/gemini";

const ALLOWED_DESTINATIONS = new Set<CaptureDestination>(["po", "warehouse"]);
// Gemini vision chỉ nhận ảnh/PDF (inlineData) — Excel (.xlsx/.xlsm) cần
// đường đọc khác (đọc cell trực tiếp, không phải OCR), CHƯA làm ở FID này.
const ALLOWED_MIME_PREFIXES = ["image/"];
const ALLOWED_MIME_EXACT = new Set(["application/pdf"]);

function isSupportedMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_EXACT.has(mimeType) || ALLOWED_MIME_PREFIXES.some((p) => mimeType.startsWith(p));
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const destination = formData.get("destination");
    const file = formData.get("file");

    if (typeof destination !== "string" || !ALLOWED_DESTINATIONS.has(destination as CaptureDestination)) {
      return NextResponse.json(
        { ok: false, error: "destination phải là 'po' hoặc 'warehouse'." },
        { status: 400 },
      );
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Thiếu file." }, { status: 400 });
    }

    const mimeType = file.type || "application/octet-stream";
    if (!isSupportedMimeType(mimeType)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Chỉ hỗ trợ ảnh/PDF ở FID-ERP-002 (Excel .xlsx/.xlsm chưa hỗ trợ — cần đường đọc riêng, để dành FID sau).",
        },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { rows, warnings } = await extractCaptureRows(
      buffer,
      mimeType,
      destination as CaptureDestination,
    );

    return NextResponse.json({ ok: true, destination, rows, warnings });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Extraction failed." },
      { status: 500 },
    );
  }
}
