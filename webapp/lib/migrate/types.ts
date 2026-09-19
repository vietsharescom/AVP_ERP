// FID-ERP-013 — Migration 1 lần từ AVP_AI. Tên field ĐÚNG NGUYÊN theo code
// thật AVP_AI (`D:\AVP_AI\webapp\src\app\api\**\route.ts`, đọc THAM KHẢO —
// CLAUDE.md nguyên tắc #5), KHÔNG đổi tên. Xem
// docs/features/FID-ERP-013_20260919.md §2a.

export type RawMaterialRow = {
  traveler: string;
  partNo: string;
  pot?: string;
  weight?: string;
  pieces?: string;
  po?: string;
  date?: string;
  labelFormat?: string;
  finalLot?: string;
  note?: string;
  shipped?: string;
  ps?: string;
};

export type WarehouseRow = {
  traveler: string;
  partNo?: string;
  pot?: string;
  forecastPieces?: string;
  receivedPieces: string;
  receivedBoxQty?: string;
  receivedWeight?: string;
  receiveDate?: string;
  receivedBy?: string;
  note?: string;
  createdAt?: string;
};

export type FinishGoodRow = {
  date?: string;
  shift?: string;
  operator?: string;
  traveler: string;
  partNo?: string;
  pot?: string;
  lotNo?: string;
  type?: string;
  oc?: string;
  machine?: string;
  mcNo?: string;
  sp?: string;
  specialNotes?: string;
  boxes?: string;
  qty?: string;
  skid?: string;
  location?: string;
  reject?: string;
  shipped?: string;
  ps?: string;
  createdAt?: string;
  qcStatus?: string;
  concessionBy?: string;
  concessionReason?: string;
  concessionAt?: string;
};

export type PartControlRow = {
  part: string;
  qtyPerBox: string;
  client?: string;
  machine?: string;
  labelFormat?: string;
};

export type PackingListRow = {
  po?: string;
  partNo?: string;
  traveler: string;
  pot?: string;
  description?: string;
  box?: string;
  quantity?: string;
  invDate?: string;
  ps: string;
  notes?: string;
};

export type MigrateSummary = { inserted: number; skipped: number; quarantined: number };
