// OCR Gemini cho FID-ERP-002 — CHỈ đọc file, KHÔNG bao giờ ghi DB (route
// extract gọi hàm này; route confirm không đụng tới file này).
// Tham khảo THAM KHẢO (đọc, không sửa — CLAUDE.md nguyên tắc #5):
// D:\AVP_AI\webapp\src\lib\extract.ts (cùng SDK @google/genai, cùng cách gọi
// generateContent + responseJsonSchema) — viết lại schema theo field
// travelerNo/partNo/poNo/potNo/qty của Postgres, không copy tên cột Sheet.
import { GoogleGenAI } from "@google/genai";

// "po_receive" (v1.2) — nút tắt: scan LẠI CHÍNH file PO, đọc cột Pieces
// làm luôn qty RECEIVE (bypass yêu cầu phiếu Traveler vật lý riêng) —
// Andy xác nhận 2026-09-19, xem docs/features/FID-ERP-002_20260918.md.
export type CaptureDestination = "po" | "warehouse" | "po_receive";

export type CaptureRow = {
  travelerNo: string | null;
  partNo: string | null;
  poNo: string | null;
  potNo: string | null;
  qty: number | null;
  confidence: number;
  lowConfidenceFields: string[];
};

export type CaptureExtraction = {
  rows: CaptureRow[];
  warnings: string[];
};

const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (client) return client;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing GEMINI_API_KEY env var — xem PROJECT_INFO_FORM.md Section 1 (model cụ thể [TO BE CONFIRMED]).",
    );
  }
  client = new GoogleGenAI({ apiKey });
  return client;
}

const CAPTURE_ROW_SCHEMA = {
  type: "object",
  properties: {
    travelerNo: { type: ["string", "null"], description: "Traveler# barcode number" },
    partNo: { type: ["string", "null"], description: "Part # column" },
    poNo: { type: ["string", "null"], description: "PO Number (chỉ có ý nghĩa ở đích 'po')" },
    potNo: { type: ["string", "null"], description: "Pot # / GAYLORD (chỉ có ý nghĩa ở đích 'warehouse')" },
    qty: { type: ["number", "null"], description: "Số lượng nhận (chỉ có ý nghĩa ở đích 'warehouse')" },
    confidence: { type: "number", description: "0-1, độ tin cậy tổng thể của dòng này" },
    lowConfidenceFields: {
      type: "array",
      items: { type: "string" },
      description:
        "Tên field (travelerNo/partNo/poNo/potNo/qty) mà model KHÔNG chắc — field đó PHẢI để null, không tự đoán",
    },
  },
  required: ["travelerNo", "partNo", "poNo", "potNo", "qty", "confidence", "lowConfidenceFields"],
};

const CAPTURE_SCHEMA = {
  type: "object",
  properties: {
    rows: { type: "array", items: CAPTURE_ROW_SCHEMA },
    warnings: { type: "array", items: { type: "string" } },
  },
  required: ["rows", "warnings"],
};

function instructionsFor(destination: CaptureDestination): string {
  switch (destination) {
    case "po":
      return (
        "This is an Infasco PO email/document (raw material forecast — goods have NOT physically " +
        "arrived yet). Read travelerNo (Traveler# barcode number), partNo (Part #), and poNo " +
        "(PO Number) for every row. Do not invent values for cells that are blank or illegible — " +
        "set that field to null and list its name in lowConfidenceFields instead of guessing."
      );
    case "po_receive":
      return (
        "This is an Infasco PO email/document, being used as a management-approved shortcut to ALSO " +
        "confirm the raw material has physically arrived (skips scanning a separate physical traveler " +
        "tag). Read travelerNo (Traveler# barcode number), partNo (Part #), poNo (PO Number), potNo " +
        "(Pot #/GAYLORD), and qty (read from the 'Pieces' column — this is the quantity being " +
        "received) for every row. Do not invent values for cells that are blank or illegible — set " +
        "that field to null and list its name in lowConfidenceFields instead of guessing."
      );
    case "warehouse":
      return (
        "This is an AVP traveler form for raw material that has physically arrived at the warehouse. " +
        "Read travelerNo (Traveler# barcode number), partNo (Part #), potNo (Pot #/GAYLORD), and qty " +
        "(quantity received) for every row. Do not invent values for cells that are blank or illegible " +
        "— set that field to null and list its name in lowConfidenceFields instead of guessing."
      );
  }
}

export async function extractCaptureRows(
  buffer: Buffer,
  mimeType: string,
  destination: CaptureDestination,
): Promise<CaptureExtraction> {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { text: instructionsFor(destination) },
          { inlineData: { mimeType, data: buffer.toString("base64") } },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: CAPTURE_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini không trả về dữ liệu có cấu trúc cho file này.");
  }
  return JSON.parse(text) as CaptureExtraction;
}
