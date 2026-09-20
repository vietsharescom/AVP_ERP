# FID-ERP-013 — dựng 5 file CSV (đúng định dạng `scripts/migrate/run.ts` đọc) từ các
# file Excel THẬT đang có, để CHẠY THỬ migration bằng bộ dữ liệu đầy đủ nhất (Andy
# 2026-09-20: "lấy data toàn bộ tôi đang có từ avp_ai và avp_erp ... chuẩn bị bộ data đầy
# đủ cho tôi test và demo"). Đây là dữ liệu Excel cũ của AVP_AI (không phải export
# Google Sheets sống) — MỌI suy diễn đều ghi lại ở BUILD_REPORT.md, KHÔNG bịa dữ liệu
# thiếu: thiếu thì để trống cho migrate tự quarantine.
#
# Nguồn (chỉ ĐỌC — CLAUDE.md nguyên tắc #5, Andy yêu cầu rõ):
#   RawMaterial   <- WORK ORDER (Wrapping_final.xlsm, PACKING SLIPS N.xlsm, WORK_ORDER_final.xlsx,
#                    FINISHED PALLET REPORT_final.xlsm/WorkOrder) — gộp theo Traveler#
#   Warehouse     <- suy từ PIECES của WORK ORDER, CHỈ cho Traveler đã có bằng chứng xử lý/xuất
#   FinishGood    <- CHECKING SUMMARY (Wrapping_final.xlsm) + WorkStationArchive (FINISHED PALLET,
#                    chỉ Traveler KHÔNG có trong CHECKING SUMMARY; thiếu ca -> migrate quarantine)
#   PackingList   <- ARCHIVE (PACKING SLIPS N.xlsm), bỏ PS = 0 (chưa xuất)
#   PartControl   <- PART_CONTROL_MASTER_2026-09-19.xlsx + suy qty/thùng từ TTL/số thùng
#
# Chạy:  python webapp/scripts/migrate/xlsx_to_csv.py   (từ D:\AVP_ERP)
import csv
import datetime as dt
import collections
import os
import re
import statistics
import warnings

import openpyxl

warnings.filterwarnings("ignore")

ROOT_ERP = r"D:\AVP_ERP"
ROOT_AI = r"D:\AVP_AI"
OUT = os.path.join(ROOT_ERP, "Data", "migration")

# Danh sách hậu tố — GIỮ ĐÚNG như webapp/lib/part.ts (KNOWN_SUFFIXES).
SUFFIXES = sorted(["-MY-AK", "-CA-IN", "-IN-PN", "-TH-TC", "-BR-HA", "-HT", "-L", "-A", "-T", "-B", "-X"], key=len, reverse=True)


def strip_part(raw):
    cur = str(raw).strip()
    again = True
    while again:
        again = False
        for s in SUFFIXES:
            if len(cur) > len(s) and cur.upper().endswith(s):
                cur = cur[: len(cur) - len(s)]
                again = True
                break
    return cur.upper()


def sheet_rows(path, sheet):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    return [r for r in wb[sheet].iter_rows(values_only=True)]


def s(v):
    return "" if v is None else str(v).strip()


def num(v):
    try:
        f = float(str(v).replace(",", "").strip())
        return int(f) if f == int(f) else f
    except Exception:
        return None


def fmt_dt(v):
    return v.strftime("%Y-%m-%d %H:%M:%S") if isinstance(v, dt.datetime) else ""


def fmt_d(v):
    return v.strftime("%Y-%m-%d") if isinstance(v, (dt.datetime, dt.date)) else ""


report = []


def note(msg):
    report.append(msg)
    print(msg)


# ── Đọc nguồn ─────────────────────────────────────────────────────────────
WR = os.path.join(ROOT_ERP, "Data", "4.WRAPPING", "Wrapping_final.xlsm")
PS = os.path.join(ROOT_AI, "Data", "5.Parking slip", "PACKING SLIPS N.xlsm")
WO_AI = os.path.join(ROOT_AI, "Data", "1.PO", "WORK_ORDER_final.xlsx")
FP = os.path.join(ROOT_AI, "Data", "3.FINISHED PALLET", "FINISHED PALLET REPORT_final.xlsm")
MASTER = os.path.join(ROOT_ERP, "Data", "PART_CONTROL_MASTER_2026-09-19.xlsx")

wo_sources = [
    ("FINISHED PALLET/WorkOrder", sheet_rows(FP, "WorkOrder")),
    ("WORK_ORDER_final.xlsx", sheet_rows(WO_AI, "WORK ORDER")),
    ("PACKING SLIPS N/WORK ORDER", sheet_rows(PS, "WORK ORDER")),
    ("Wrapping_final/WORK ORDER", sheet_rows(WR, "WORK ORDER")),
]
cs_rows = [r for r in sheet_rows(WR, "CHECKING SUMMARY")[4:] if r and r[3]]
wsa_rows = [r for r in sheet_rows(FP, "WorkStationArchive")[4:] if r and r[0] is not None and isinstance(r[11], dt.datetime)]
arch_rows = [r for r in sheet_rows(PS, "ARCHIVE")[2:] if r and r[2]]

# ── Bằng chứng theo Traveler ──────────────────────────────────────────────
cs_by_tr = collections.defaultdict(list)
for r in cs_rows:
    cs_by_tr[s(r[3])].append(r)
wsa_by_tr = collections.defaultdict(list)
for r in wsa_rows:
    wsa_by_tr[s(r[0])].append(r)
arch_by_tr = collections.defaultdict(list)
for r in arch_rows:
    arch_by_tr[s(r[2])].append(r)

# ── RawMaterial: gộp WORK ORDER theo Traveler# (nguồn sau/dòng sau ghi đè trường không rỗng) ──
FIELDS = ["partNo", "pot", "weight", "pieces", "po", "date", "finalLot", "note", "shipped", "ps"]
merged = {}
for name, rows in wo_sources:
    for r in rows[1:]:
        if not r or r[0] in (None, ""):
            continue
        tr = s(r[0])
        cur = merged.setdefault(tr, {})
        vals = {
            "partNo": s(r[1]), "pot": s(r[2]), "weight": s(r[4]), "pieces": s(num(r[5]) if num(r[5]) is not None else r[5]),
            "po": s(num(r[6]) if num(r[6]) is not None else r[6]),
            "date": fmt_d(r[7]), "finalLot": s(r[8]), "note": s(r[9]), "shipped": s(r[10]), "ps": s(r[11]),
        }
        for k, v in vals.items():
            if v not in ("", "0") or k in ("shipped", "ps"):
                if v not in ("",):
                    cur[k] = v
wo_count_before = len(merged)

# Traveler có ở nơi khác mà không có trong WORK ORDER -> dựng dòng từ chính nơi đó.
added_from_other = 0
for tr, rows in cs_by_tr.items():
    if tr not in merged:
        r = rows[-1]
        merged[tr] = {"partNo": s(r[4]), "pot": s(r[5]), "finalLot": s(r[6])}
        added_from_other += 1
for tr, rows in wsa_by_tr.items():
    if tr not in merged:
        r = rows[-1]
        merged[tr] = {"partNo": s(r[1]), "pot": s(r[2]), "finalLot": s(r[4])}
        added_from_other += 1
for tr, rows in arch_by_tr.items():
    if tr not in merged:
        r = rows[-1]
        merged[tr] = {"partNo": s(r[1]), "pot": s(r[3]), "po": s(r[0])}
        added_from_other += 1


def evidence_dates(tr):
    ds = [r[0] for r in cs_by_tr.get(tr, []) if isinstance(r[0], dt.datetime)]
    ds += [r[11] for r in wsa_by_tr.get(tr, [])]
    ds += [r[7] for r in arch_by_tr.get(tr, []) if isinstance(r[7], dt.datetime)]
    return ds


date_fallback = 0
for tr, m in merged.items():
    if not m.get("date"):
        ds = evidence_dates(tr)
        if ds:
            m["date"] = fmt_d(min(ds))
            date_fallback += 1

# Ngày đăng ký Traveler (= ngày RECEIVE suy) KHÔNG được muộn hơn bằng chứng xử lý sớm nhất (WORK ORDER có
# Traveler bị đổi ngày về sau) — nếu không thì lịch sử hiện "nhận kho" SAU khi đã lựa/đóng/xuất.
date_lowered = 0
for tr, m in merged.items():
    ds = evidence_dates(tr)
    if ds and m.get("date") and m["date"] > fmt_d(min(ds)):
        m["date"] = fmt_d(min(ds))
        date_lowered += 1

# ── PartControl ───────────────────────────────────────────────────────────
part_qty = {}
part_client = {}
for i, r in enumerate(sheet_rows(MASTER, "PART_CONTROL_MASTER")):
    if i == 0 or not r[0] or not r[1]:
        continue
    part_qty[s(r[0]).upper()] = int(r[1])
    part_client[s(r[0]).upper()] = s(r[2])
n_master = len(part_qty)

# suy qty/thùng cho Part# CHƯA có: TTL/số thùng (CHECKING SUMMARY) hoặc Unit Quantity (WorkStationArchive) — chỉ khi ≥ 3 dòng và ≥ 80% cùng 1 giá trị
cand = collections.defaultdict(list)
for r in cs_rows:
    b, t = num(r[13]), num(r[15])
    if b and t and b > 0 and t % b == 0:
        cand[strip_part(r[4])].append(int(t // b))
for r in wsa_rows:
    u = num(r[9])
    if u and u > 0:
        cand[strip_part(r[1])].append(int(u))
derived = 0
for p, vals in cand.items():
    if p in part_qty or not p:
        continue
    mode, cnt = collections.Counter(vals).most_common(1)[0]
    if len(vals) >= 3 and cnt / len(vals) >= 0.8:
        part_qty[p] = mode
        part_client[p] = ""
        derived += 1

# ── Ghi CSV ───────────────────────────────────────────────────────────────
os.makedirs(OUT, exist_ok=True)


def write_csv(name, header, rows):
    with open(os.path.join(OUT, name), "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, quoting=csv.QUOTE_MINIMAL)
        w.writerow(header)
        w.writerows(rows)
    note(f"- {name}: {len(rows)} dòng")


write_csv("PartControl.csv", ["part", "qtyPerBox", "client", "machine", "labelFormat"],
          [[p, q, part_client.get(p, ""), "", ""] for p, q in sorted(part_qty.items())])

write_csv("RawMaterial.csv", ["traveler", "partNo", "pot", "weight", "pieces", "po", "date", "labelFormat", "finalLot", "note", "shipped", "ps"],
          [[tr, m.get("partNo", ""), m.get("pot", ""), m.get("weight", ""), m.get("pieces", ""), m.get("po", ""), m.get("date", ""), "",
            m.get("finalLot", ""), m.get("note", ""), m.get("shipped", ""), m.get("ps", "")] for tr, m in sorted(merged.items())])

# Warehouse: chỉ Traveler có bằng chứng đã xử lý/xuất VÀ có PIECES
wh_rows = []
for tr, m in sorted(merged.items()):
    processed = tr in cs_by_tr or tr in wsa_by_tr or tr in arch_by_tr
    pieces = num(m.get("pieces"))
    if processed and pieces and pieces > 0 and m.get("date"):
        wh_rows.append([tr, m.get("partNo", ""), m.get("pot", ""), int(pieces), int(pieces), "", "", m["date"], "",
                        "Suy từ PIECES của WORK ORDER (AVP_AI không có sổ nhận kho riêng) — dữ liệu chạy thử", ""])
write_csv("Warehouse.csv", ["traveler", "partNo", "pot", "forecastPieces", "receivedPieces", "receivedBoxQty", "receivedWeight", "receiveDate", "receivedBy", "note", "createdAt"], wh_rows)

# FinishGood: CHECKING SUMMARY + WorkStationArchive (Traveler không có trong CHECKING SUMMARY)
fg_rows = []
for r in cs_rows:
    fg_rows.append([fmt_dt(r[0]), s(r[1]), s(r[2]), s(r[3]), s(r[4]), s(r[5]), s(r[6]), s(r[7]), s(r[8]), s(r[9]), s(r[10]), s(r[11]),
                    s(r[12]), s(num(r[13]) if num(r[13]) is not None else r[13]), s(num(r[15]) if num(r[15]) is not None else r[15]),
                    s(r[17]) if s(r[17]) not in ("0",) else "", s(r[18]).upper(), s(r[19]), s(r[27]), s(r[24]), fmt_dt(r[0]), "", "", "", ""])
wsa_only = 0
for tr, rows in wsa_by_tr.items():
    if tr in cs_by_tr:
        continue
    for r in rows:
        wsa_only += 1
        fg_rows.append([fmt_dt(r[11]), "UNKNOWN", s(r[7]), s(r[0]), s(r[1]), s(r[2]), s(r[4]), "", "", s(r[6]), "", "", s(r[13]),
                        s(num(r[8]) if num(r[8]) is not None else r[8]), s(num(r[10]) if num(r[10]) is not None else r[10]),
                        s(r[5]) if s(r[5]) not in ("0",) else "", "F", "", "", "", fmt_dt(r[11]), "", "", "", ""])
write_csv("FinishGood.csv",
          ["date", "shift", "operator", "traveler", "partNo", "pot", "lotNo", "type", "oc", "machine", "mcNo", "sp", "specialNotes", "boxes", "qty", "skid",
           "location", "reject", "shipped", "ps", "createdAt", "qcStatus", "concessionBy", "concessionReason", "concessionAt"], fg_rows)

# Ngày sản xuất CUỐI của từng Traveler (từ FinishGood) — ngày xuất ƯỚC TÍNH không được sớm hơn ngày đã đóng thùng.
last_prod = {}
for row in fg_rows:
    if row[0]:
        last_prod[row[3]] = max(last_prod.get(row[3], ""), row[0][:10])


def not_before_production(tr, d):
    """Ngày ƯỚC TÍNH: chặn dưới bằng ngày sản xuất cuối (xuất hàng không thể trước khi đóng thùng)."""
    lp = last_prod.get(tr)
    if d and lp and d.strftime("%Y-%m-%d") < lp:
        return dt.datetime.strptime(lp, "%Y-%m-%d").date(), True
    return d, False


ship_clamped = 0
SHIP_TIME = " 18:00:00"  # giờ xuất ƯỚC TÍNH (cuối ngày làm việc) — để SHIP luôn sau PACK cùng ngày

# PackingList: bỏ PS trống/0; ngày xuất = INV DATE của dòng -> ngày (mode) của cả PS -> nội suy theo số PS
ps_dates = collections.defaultdict(list)
for r in arch_rows:
    if isinstance(r[7], dt.datetime):
        ps_dates[s(r[8])].append(r[7].date())
ps_known = {}
for p, ds in ps_dates.items():
    if p.isdigit() and p != "0":
        ps_known[int(p)] = collections.Counter(ds).most_common(1)[0][0]
known_sorted = sorted(ps_known.items())


def interpolate(psn):
    lo = [(k, d) for k, d in known_sorted if k <= psn]
    hi = [(k, d) for k, d in known_sorted if k >= psn]
    if lo and hi:
        (k1, d1), (k2, d2) = lo[-1], hi[0]
        if k1 == k2:
            return d1
        frac = (psn - k1) / (k2 - k1)
        return d1 + dt.timedelta(days=round((d2 - d1).days * frac))
    if known_sorted:
        # NGOÀI khoảng đã biết -> ngoại suy tuyến tính theo tốc độ PS/ngày của khoảng đã biết
        # (không kẹp cứng về ngày biên — sẽ dồn hàng trăm PS vào 1 ngày), chặn trần ở ngày
        # cuối cùng có trong dữ liệu (2026-09-16).
        (k0, d0), (k1, d1) = known_sorted[0], known_sorted[-1]
        days_per_ps = (d1 - d0).days / (k1 - k0) if k1 > k0 else 0
        if psn > k1:
            d = d1 + dt.timedelta(days=round((psn - k1) * days_per_ps))
        else:
            d = d0 - dt.timedelta(days=round((k0 - psn) * days_per_ps))
        return min(d, dt.date(2026, 9, 16))
    return None


pl_rows = []
skipped_ps0 = 0
est_own = est_group = est_interp = 0
for r in arch_rows:
    ps = s(r[8])
    if ps in ("", "0"):
        skipped_ps0 += 1
        continue
    if isinstance(r[7], dt.datetime):
        inv, tag = r[7].strftime("%Y-%m-%d"), ""
        est_own += 1
    elif s(ps) in ps_dates:
        inv, tag = collections.Counter(ps_dates[ps]).most_common(1)[0][0].strftime("%Y-%m-%d"), "ngày lấy từ dòng khác cùng PS"
        est_group += 1
    elif ps.isdigit() and known_sorted:
        d = interpolate(int(ps))
        d, clamped = not_before_production(s(r[2]), d)
        ship_clamped += 1 if clamped else 0
        inv, tag = (d.strftime("%Y-%m-%d") if d else ""), "ngày ƯỚC TÍNH (theo số PS)" + ("; nâng lên ngày sản xuất cuối" if clamped else "")
        est_interp += 1
    else:
        inv, tag = "", ""
    pl_rows.append([s(num(r[0]) if num(r[0]) is not None else r[0]), s(r[1]), s(r[2]), s(r[3]), s(r[4]), s(num(r[5]) if num(r[5]) is not None else r[5]),
                    s(num(r[6]) if num(r[6]) is not None else r[6]), inv, ps, tag])
# Traveler WORK ORDER ghi `Shipped` + có số PS nhưng KHÔNG có trong ARCHIVE (ARCHIVE chỉ là 1 lát cắt
# gần đây) -> suy 1 dòng xuất: qty = tổng SELECT đã nạp nếu có, không thì PIECES; ngày = ngày của
# PS nếu biết, không thì ƯỚC TÍNH theo số PS. Thiếu số PS thật (`#REF!`, 0) -> KHÔNG suy, để nguyên chưa xuất.
arch_trs = {s(r[2]) for r in arch_rows if s(r[8]) not in ("", "0")}
fg_sum = collections.defaultdict(int)
for row in fg_rows:
    fg_sum[row[3]] += int(num(row[14]) or 0)
derived_ship = 0
skipped_no_ps = 0
for tr, m in sorted(merged.items()):
    if m.get("shipped") != "Shipped" or tr in arch_trs:
        continue
    ps = m.get("ps", "")
    if not (ps.isdigit() and int(ps) > 1000):
        skipped_no_ps += 1
        continue
    qty = fg_sum.get(tr) or int(num(m.get("pieces")) or 0)
    if qty <= 0:
        continue
    if ps in ps_dates:
        d, how = collections.Counter(ps_dates[ps]).most_common(1)[0][0], "ngày lấy từ dòng khác cùng PS"
    else:
        d, how = interpolate(int(ps)), "ngày ƯỚC TÍNH (theo số PS)"
        if d:
            d, clamped = not_before_production(tr, d)
            if clamped:
                ship_clamped += 1
                how += "; nâng lên ngày sản xuất cuối"
    if not d:
        continue
    pl_rows.append([m.get("po", ""), m.get("partNo", ""), tr, m.get("pot", ""), "", "", qty, d.strftime("%Y-%m-%d"), ps,
                    f"SHIP suy từ cờ Shipped + PS# của WORK ORDER; qty={'tổng SELECT' if fg_sum.get(tr) else 'PIECES'}; {how}"])
    derived_ship += 1
for row in pl_rows:
    if row[7]:
        row[7] = row[7] + SHIP_TIME
write_csv("PackingList.csv", ["po", "partNo", "traveler", "pot", "description", "box", "quantity", "invDate", "ps", "notes"], pl_rows)

# ── Báo cáo dựng ──────────────────────────────────────────────────────────
lines = [
    "# BUILD_REPORT — dữ liệu chạy thử FID-ERP-013 (dựng tự động, KHÔNG sửa tay)",
    f"Dựng lúc {dt.datetime.now():%Y-%m-%d %H:%M} bằng `webapp/scripts/migrate/xlsx_to_csv.py`. Các số/giả định:",
    "",
    f"- WORK ORDER gộp theo Traveler#: {wo_count_before} Traveler từ 4 file; thêm {added_from_other} Traveler chỉ có ở CHECKING SUMMARY/WorkStationArchive/ARCHIVE (dựng dòng từ chính nơi đó).",
    f"- Ngày đăng ký Traveler thiếu ở WORK ORDER: {date_fallback} Traveler lấy ngày sớm nhất từ bằng chứng khác (CHECKING SUMMARY/WorkStationArchive/ARCHIVE). Còn thiếu -> để trống, migrate sẽ quarantine INVALID_DATE.",
    f"- PartControl: {n_master} Part# từ PART_CONTROL_MASTER + {derived} Part# suy qty/thùng từ TTL/số thùng hoặc Unit Quantity (≥3 dòng, ≥80% cùng 1 giá trị). Part# còn thiếu qty -> quarantine.",
    f"- {date_lowered} Traveler có ngày WORK ORDER muộn hơn bằng chứng xử lý sớm nhất -> hạ xuống ngày bằng chứng (để RECEIVE không nằm sau SELECT/SHIP).",
    "- Warehouse (RECEIVE) SUY TỪ `PIECES` của WORK ORDER, CHỈ cho Traveler đã có CHECKING SUMMARY/WorkStationArchive/ARCHIVE — AVP_AI (Excel) không có sổ nhận kho riêng. Traveler chưa xử lý: chỉ đăng ký (tương đương đích `po`).",
    f"- FinishGood: {len(cs_rows)} dòng CHECKING SUMMARY + {wsa_only} dòng WorkStationArchive của Traveler KHÔNG có trong CHECKING SUMMARY (nguồn này KHÔNG có cột Ca -> ghi `shift=UNKNOWN` (nhãn \"chưa rõ\", KHÔNG suy ca theo giờ vì dữ liệu thật cho thấy giờ ghi không quyết định ca; server sẽ cảnh báo ca lạ ở các màn hình nhập, còn báo cáo hiện thành nhóm ca riêng)).",
    f"- PackingList: bỏ {skipped_ps0} dòng PS trống/0 (chưa xuất). Ngày xuất: {est_own} dòng có INV DATE riêng, {est_group} dòng lấy ngày của dòng khác cùng PS, {est_interp} dòng ƯỚC TÍNH theo số PS — nội suy trong khoảng đã biết, ngoại suy tuyến tính ngoài khoảng, chặn trần 2026-09-16 (ghi ở cột notes).",
    f"- PackingList bổ sung: {derived_ship} dòng xuất SUY TỪ cờ `Shipped` + số PS trong WORK ORDER (Traveler không có trong ARCHIVE; qty = tổng SELECT hoặc PIECES, ngày ước tính/theo PS) — nếu không, PO-progress báo hàng nghìn Traveler 'tồn đọng' dù đã xuất. {skipped_no_ps} Traveler ghi `Shipped` nhưng thiếu số PS thật (`#REF!`/0) -> KHÔNG suy, vẫn hiện chưa xuất.",
    f"- Ngày xuất ƯỚC TÍNH bị nâng lên ngày sản xuất cuối của Traveler ở {ship_clamped} dòng (xuất hàng không thể trước khi đóng thùng); mọi ngày xuất ghi giờ 18:00 (giờ ƯỚC TÍNH) để SHIP luôn sau PACK cùng ngày.",
    "- KHÔNG nạp: Serial từng thùng (chưa có bảng `carton_serials`), Partial Boxes (chưa có FID Partial), ngày/giờ của WorkStationArchive khi Traveler đã có ở CHECKING SUMMARY (tránh nhân đôi sản lượng).",
]
with open(os.path.join(OUT, "BUILD_REPORT.md"), "w", encoding="utf-8") as f:
    f.write("\n".join(lines) + "\n\n## Đầu ra\n" + "\n".join(report) + "\n")
print("\n".join(lines))
