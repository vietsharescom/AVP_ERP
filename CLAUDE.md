# CLAUDE.md -- AVP_ERP AI Execution Context
# ISO/IEC 42001:2023 (khung ISO_CA, D:\16.ISO_CA) | v0.1 DRAFT

## IDENTITY
Project: AVP_ERP | Owner: Andy Phan (Viet) | Maple Leaf Group
Path: D:\AVP_ERP | GitHub: [TO BE CONFIRMED] | Stack: Next.js + TypeScript + PostgreSQL

## QUAN HỆ VỚI D:\AVP_AI
Dự án KẾ TIẾP, greenfield — KHÔNG fork/copy code. AVP_AI (Google Sheets)
tiếp tục chạy độc lập, giao hàng thật cho Infasco, trong lúc AVP_ERP được
thiết kế + build song song. Chi tiết: xem
[`docs/cl08_operation/SOFTWARE_ARCHITECTURE.md`](docs/cl08_operation/SOFTWARE_ARCHITECTURE.md) Mục 0.

## STRUCTURE
docs/cl04_context/    ISO 42001 Clause 4 — Context/Scope
docs/cl05_leadership/ ISO 42001 Clause 5 — AI Policy, Constitution
docs/cl06_planning/   ISO 42001 Clause 6 — Risk Register
docs/cl07_support/    ISO 42001 Clause 7 — Document control
docs/cl08_operation/  ISO 42001 Clause 8 — SOFTWARE_ARCHITECTURE.md, FACILITIES_SETUP.md, BRS
docs/cl09_evaluation/ ISO 42001 Clause 9 — KPI, test plan
docs/cl10_improvement/ISO 42001 Clause 10 — Corrective action
docs/features/        FID documents (viết trước khi code, giống AVP_AI)
docs/records/         LATEST_SESSION.md + session logs (đọc đầu mỗi phiên)
                       `AVP_ERP Infrastructure.pdf` — Andy dùng để BÁM
                       THEO DÕI TIẾN ĐỘ CODE (sơ đồ hạ tầng + bảng 13 FID +
                       trạng thái từng FID). Nguồn sống là artifact
                       https://claude.ai/artifact/F6or9LJ6Ef3h17TdX1BAwq —
                       Claude cập nhật artifact mỗi khi trạng thái FID đổi
                       (viết/APPROVED/code xong), Andy tự export lại PDF
                       đè lên file này khi cần bản tĩnh mới nhất.

*Không có `src/`/`config/`/`tests/` Python — đã gỡ 2026-09-17 vì AVP_ERP
dùng TypeScript, không dùng bộ khung Orchestrator Python của ISO_CA gốc
(khác Ops_Ai). Code thật (Next.js) sẽ tạo `webapp/` khi bắt đầu code,
theo đúng cấu trúc `D:\AVP_AI\webapp` đã chứng minh hoạt động.*

## SESSION START -- LUÔN LÀM ĐẦU TIÊN
1. Đọc file này (tự động).
2. Đọc `docs/records/LATEST_SESSION.md` — tóm tắt đã làm gì / còn gì mở.
3. Nếu có "Việc đang mở (chưa quyết định)" — hỏi lại Owner trước khi tự
   suy diễn và làm tiếp (đúng nguyên tắc toàn cục).

## SESSION END -- TRƯỚC KHI KẾT THÚC 1 HẠNG MỤC LỚN
1. Cập nhật lại `docs/records/LATEST_SESSION.md`: hoàn thành gì / còn mở
   gì / ưu tiên phiên sau.
2. KHÔNG tự commit/push git khi Owner chưa xác nhận (quy tắc toàn cục).

## NGUYÊN TẮC TUYỆT ĐỐI
1. Mỗi feature cần 1 FID (`docs/features/`, khuôn 9 mục ở
   [`FID_LIST.md`](docs/features/FID_LIST.md) đầu file — KHÔNG dùng field
   `LAYER` của `FID_TEMPLATE.md` gốc, không áp dụng cho AVP_ERP) —
   Status = APPROVED trước khi code (giống AVP_AI).
2. AI không được ghi thẳng vào database — mọi output AI phải qua người
   xem lại + xác nhận (chi tiết: `docs/cl05_leadership/AI_POLICY.md`).
3. Có bộ test tự động, chạy PASS trước khi commit (vitest/jest — thay
   `pytest` của khung gốc vì đổi sang TypeScript).
4. Mỗi thay đổi cần ghi `CHANGELOG.md`.
5. Ở YÊN trong `D:\AVP_ERP` — không tự ý đọc/ghi qua project khác (vd
   `D:\AVP_AI`, `D:\Ops_Ai`) trừ khi Owner yêu cầu rõ (đọc THAM KHẢO qua
   link tương đối trong docs thì được, không sửa).

## FEATURE WORKFLOW
1. Tạo `docs/features/FID-ERP-[NNN]_[YYYYMMDD].md` theo khuôn 9 mục ở
   `FID_LIST.md`, Status = APPROVED.
2. Implement trong `webapp/` (khi bắt đầu code).
3. Viết test tương ứng, chạy PASS 100%.
4. Cập nhật `CHANGELOG.md`.
5. Commit: `feat: mô tả [FID-ERP-NNN]`.

---
*Trạng thái 2026-09-17: FID-ERP-001 (schema nền tảng) DONE — `webapp/` đã
scaffold (Next.js + TypeScript + Prisma 7 + PostgreSQL 18 local), 15/15
test PASS, lint sạch, build thành công. 12 FID còn lại CHƯA VIẾT/CHƯA CODE.
Xem `docs/records/LATEST_SESSION.md` cho tiến độ mới nhất.*
