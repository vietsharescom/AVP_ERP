# PROJECT_INFO_FORM_EXAMPLE.md  v2.0 -- DA DIEN HOAN CHINH
# Vi du: DentaScribe -- AI assistant ghi chep kham nha khoa
# Chi doc de hieu cach dien -- DIEN VAO PROJECT_INFO_FORM.md
# ============================================================================

##############################################################################
## PART A -- FOUNDATION (5W1H)
##############################################################################

Project Code:         DS
Project Name:         DentaScribe
Owner / Lead Dev:     Viet
Organization:         Ca nhan (Solo)
Project Type:         Startup
Team Size:            1 dev solo
Local Path:           D:\DentaScribe
GitHub URL:           N/A
Start Date:           2026-05-23
Target Launch:        MVP trong 4 tuan (2026-06-20)

Output Type:          Web App + API/Backend
Platform / OS:        Web (Chrome/Edge tren Windows 10+)
AI Component:         Speech-to-Text, NLP/Text Generation
Tech Stack:           Python 3.10, FastAPI, React, Claude API claude-sonnet-4-6, Whisper large-v3
Deployment:           Local only (chay tren may chu phong kham)

Market / Geography:   Viet Nam
Language (UI/UX):     Tieng Viet
Operating Env:        Phong kham nha khoa tu, co internet on dinh, Windows laptop
Data Location:        SQLite local, khong luu tren cloud

Phase 1 (MVP):        2026-06-20 -- ghi am + transcribe + SOAP note + approve
Phase 2:              2026-07-20 -- export PDF + lich su kham theo benh nhan
Phase 3:              2026-08-20 -- bao cao tuan + multi-user (2-3 bac si)
Review Cadence:       Hang tuan tu review voi checklist

Core Problem:
  Bac si nha khoa tai phong kham tu mat 20-30 phut sau moi ca kham de ghi chep
  thu cong vao ho so benh nhan. Ghi chep thu cong dan den sai sot ten thuoc, thieu
  chi tiet phac do, khong dong nhat giua cac bac si trong cung phong kham.

Root Cause:
  Khong co cong cu ho tro dac thu cho nha khoa Viet Nam. Phan mem quan ly phong
  kham hien tai chi luu lich hen, khong ho tro ghi chep lam sang.

Cost of Inaction:
  Bac si lam them 1-2 tieng/ngay chi de ghi chep. Tich luy sai sot co the gay
  tranh chap phap ly. Benh nhan cho lau hon giua cac ca, giam so ca co the kham.

Strategic Fit:
  Buoc dau de mo rong thanh phan mem SaaS ban cho chuoi phong kham sau nay.

AI Approach:          Speech-to-Text (Whisper) + LLM structured output (Claude)
Human-AI Interaction: AI de xuat SOAP note, bac si bat buoc review va approve truoc khi luu
Key Innovation:       Ghi am trong luc kham, khong lam gian doan, AI hieu thuat ngu nha khoa VN


##############################################################################
## PART B -- DESIGN THINKING
##############################################################################

Persona Name:         Bac si Minh, 38 tuoi, nha khoa, phong kham tu quan 7 TPHCM
Role / Job:           Bac si chinh, 8 ca/ngay (6h sáng - 8h toi), 6 ngay/tuan
Tech Savvy:           Basic
Primary Goal:         Kham nhieu benh nhan hon ma khong lam them gio
Current Tools:        Giay viet tay trong khi kham, sau do danh may vao Excel
Frustration:          Phai ngoi lai sau 8h toi de hoan thanh ho so, thieu thoi gian gia dinh
Motivation:           Tranh sai sot phap ly, chuan hoa ho so de mo rong nhuong quyen sau nay

Think & Feel:         Lo sot sang vi co qua nhieu ho so chua hoan thanh. Muon ve nha som.
                      Quan tam den chat luong kham hon la giay to hanh chinh.

See:                  Phong kham busy 8 ca/ngay. Dong nghiep (1 bac si khac) cung gap tinh trang tuong tu.
                      Tap chi y khoa dang noi ve AI trong nha khoa nhung chua ai ap dung o VN.

Hear:                 Benh nhan hoi "sao kham xong roi van chua ra"? Ke toan noi ho so thieu thong tin bao hiem.
                      Vo noi "anh ve muon qua, con ngu het roi".

Say & Do:             Noi "toi biet can cong nghe nhung khong co thoi gian tim hieu".
                      Thuc te: viet tat trong khi kham, toi muon noi nghi ra ho so day du.

Pain:                 30 phut ghi chep thu cong sau moi ca. Sai sot ten thuoc. Mat 3-4 ho so/thang vi quen.
Gain:                 Hoan thanh ho so ngay trong phong kham truoc khi benh nhan ra. Zero sai sot.

AS-IS:
Step 1: Benh nhan vao phong. Bac si Minh chao hoi, hoi benh su.
Step 2: Trong luc kham (20 phut), Minh viet tat bang tay tren to giay nhap.
Step 3: Benh nhan ra, Minh viet nhanh them vai chu truoc khi goi benh nhan tiep theo.
Step 4: Cuoi ngay (sau 8h toi), Minh ngoi danh may toan bo ho so -- mat 1.5-2 tieng.
Step 5: Luu vao Excel. Khong the search. Khong backup. Neu mat file la mat het.
Pain Points: Step 4-5 chiem 25% tong thoi gian lam viec. Hay quen chi tiet sau 8 ca.

TO-BE:
Step 1: Benh nhan vao phong. Minh mo app, nhan "Bat dau ca kham".
Step 2: App ghi am toan bo. Minh kham binh thuong, noi chuyyen voi benh nhan tu nhien.
Step 3: Kham xong, AI da co SOAP note nhap tren man hinh. Minh doc 2 phut, chinh sua neu can.
Step 4: Nhan "Approve" -- ho so luu tu dong, export PDF, san sang cho ke toan va bao hiem.
Step 5: Benh nhan tiep theo vao phong. Minh khong can o lai sau gio.
Delta: 30 phut -> 2 phut. Zero sai sot chinh ta. Co backup. Ho so searchable.

Hill 1: Bac si Minh co the hoan thanh ho so kham ngay trong phong ma khong phai o lai sau gio lam.
Hill 2: Ke toan co the xuat bao cao bao hiem hang thang ma khong can tong hop tay tu Excel.
Hill 3: Bac si moi vao phong kham co the xem lich su kham truoc cua benh nhan trong 30 giay.

HMW 1: Lam the nao de ghi am khong lam benh nhan cam thay bi giam sat?
HMW 2: Lam the nao de Minh tin tuong output AI khi bat dau su dung lan dau?
HMW 3: Lam the nao de app van dung duoc khi internet cham trong phong kham?

MVP Scope:            1 man hinh: nut ghi am -> progress bar -> hien thi SOAP note -> Approve/Edit/Reject
Prototype Format:     Figma wireframe 3 man hinh
Prototype Link:       N/A (chua co)
User Test Plan:       Thu nghiem voi chinh Bac si Minh, 5 ca kham that, feedback sau 3 ngay


##############################################################################
## PART C -- DATA & AI
##############################################################################

Primary Input Type:   Audio (giong noi tieng Viet trong phong kham)
Input Source:         Microphone laptop/tablet, ghi am truc tiep trong phong kham
Input Language:       Tieng Viet (co the pha tieng Anh cho thuat ngu y khoa)
Input Volume:         ~50 request/ngay (8 ca x 2 phong kham)
Input Quality:        Tap am may khoan, may hut -- can xu ly truoc

Existing Dataset:     500 ho so kham cu da danh may vao Excel (chua co audio)
Dataset Link / Path:  D:\data\dental_records_sample.xlsx
Public Dataset:       PhoWhisper (Whisper fine-tune tieng Viet), VietMed corpus
Data Collection Plan: Ghi am 20 ca kham mau voi su dong y bang van ban cua benh nhan
Data Labeling:        Can label SOAP note tuong ung voi transcript

Model Type Needed:    Speech-to-Text + LLM structured output
Domain Knowledge:     Nha khoa: danh so rang 11-48 (he FDI), SOAP note format, ten thuoc nha khoa VN,
                      thu thuat: tram rang, lay tuy, nho rang, rang su, nieng rang, can rang
Language Model:       Claude claude-sonnet-4-6 (structured JSON output cho SOAP note)
Speech Model:         Whisper large-v3 hoac PhoWhisper (tieng Viet tot hon)
Embedding / RAG:      N/A cho MVP. Phase 2: RAG voi co so du lieu thuoc nha khoa
Domain Vocabulary:    Rang so 11, 12...48 (FDI); Tram composite, tram amalgam; Lay tuy song/chet;
                      Nho rang don gian/phuc tap; SOAP: S=Subjective O=Objective A=Assessment P=Plan
Fine-tuning Needed:   No -- Claude du manh voi system prompt + examples
Hallucination Risk:   HIGH -- y te, lien quan den chan doan. Kiem soat: L2_ENFORCER validate schema,
                      human review bat buoc 100%, AI khong duoc tu dong luu


##############################################################################
## PART D -- PRODUCT & UX
##############################################################################

Primary Interface:    Web App (chay tren Chrome/Edge)
Key Screens:          1-Dashboard (danh sach ca kham hom nay)
                      2-Ghi am + live transcript
                      3-Review SOAP note (edit inline)
                      4-Lich su kham theo benh nhan
UX Priority:          Speed + Simplicity (bac si khong co thoi gian hoc app phuc tap)
Accessibility:        Basic (font lon, contrast cao vi phong kham sang)
Mobile Responsive:    Nice to have (Phase 2)

Existing Systems:     Phong kham dang dung Excel + Google Calendar -- khong tich hop
API Integration:      Claude API, Whisper API (hoac OpenAI Whisper)
Export Formats:       PDF (in cho benh nhan), JSON (luu he thong)
Auth / Login:         Email/password don gian -- 2-3 bac si trong cung phong kham


##############################################################################
## PART E -- DOMAIN & INDUSTRY
##############################################################################

Industry:             Healthcare
Sub-sector:           Nha khoa (Dental)
Industry Standards:   SOAP note format (y khoa chuan), FDI tooth numbering system,
                      ICD-10-CM cho ma benh (neu can bao hiem)

Academic / Student:   No
Commercial Product:   Yes -- pilot noi bo truoc, ban SaaS sau
Startup / Pilot:      Yes -- co paying user (chinh phong kham cua owner)
Safety-critical:      Yes -- sai sot co the anh huong den phac do dieu tri
High-risk Domain:     Yes -- healthcare


##############################################################################
## PART F -- REGULATORY & COMPLIANCE
##############################################################################

EU AI Act Tier:       High Risk (ung dung y te, tac dong den chan doan lam sang)
Justification:        AI de xuat SOAP note dua vao chan doan -- thuoc nhom y te theo Annex III

GDPR Applicable:      No (thi truong Viet Nam, khong co EU user)
HIPAA Applicable:     No (khong phai US)
PDPA (VN):            Yes -- Nghi dinh 13/2023/ND-CP
PII Handled:          Yes -- ten benh nhan, ngay sinh, so dien thoai, ho so benh an
PII Storage:          Local SQLite encrypted, khong sync cloud
Data Retention:       Giu vinh vien (theo quy dinh ho so y te VN -- toi thieu 10 nam)

Regulation 1:         Luat Kham Benh Chua Benh 2023 -- VN (ho so benh an)
Regulation 2:         Nghi dinh 13/2023/ND-CP -- bao ve du lieu ca nhan
Regulation 3:         N/A
Audit Required:       No (phong kham tu, chua co yeu cau kiem toan ben ngoai)
Certification Needed: None cho MVP

Human-in-the-loop:    Bat buoc -- bac si phai approve truoc khi luu bat ky SOAP note nao
Explainability:       Partial -- AI hien thi transcript goc de bac si kiem tra nguon
Bias Assessment:      Best effort -- theo doi sai sot theo loai rang, bac si
Model Audit Trail:    Every inference logged (transcript + SOAP note + decision)


##############################################################################
## PART G -- TECHNICAL
##############################################################################

Infrastructure:       Local server tai phong kham (Windows PC cu, 16GB RAM)
Scalability:          2-5 users dong thoi (2-3 bac si + 1 le tan)
Availability:         8h-20h Mon-Sat, downtime ban dem OK
Performance:          Transcribe + SOAP note < 15 giay sau khi ghi am xong
Security:             HTTPS (local network), API key luu trong .env, khong log PII
Offline Mode:         Nice to have Phase 2 (hien tai can internet cho API)
Hardware Constraint:  Windows PC 16GB RAM, khong GPU, internet 50Mbps


##############################################################################
## PART H -- CONSTRAINTS & RISKS
##############################################################################

Legal:                Khong luu audio goc sau khi transcribe xong. Khong gui PII ra ngoai mang LAN.
Technical:            Khong GPU. Chi API. Windows 10. Internet co the cham luc cao diem.
Budget:               API budget < 100 USD/thang. Khong chi phi server (dung may cu phong kham).
Timeline:             MVP phai demo duoc cho Bac si Minh truoc 2026-06-20.
Team:                 1 dev (owner), part-time 4h/ngay buoi toi.

Risk 1:               Audio co tap am may khoan cao -> transcript sai chat luong
  Impact:             High
  Control:            L2_ENFORCER reject neu Whisper confidence < 0.75, yeu cau ghi am lai

Risk 2:               Bac si Minh khong tin AI -> khong adopt sau pilot
  Impact:             High
  Control:            Human review 100% bat buoc, hien thi transcript goc, khong bao gio tu dong luu

Risk 3:               Claude API hoac Whisper API outage -> workflow ngung
  Impact:             Medium
  Control:            L8_RECOVERY retry 3x exponential backoff, fallback: hien thi transcript thuan de tu dien

##############################################################################
## PART I -- ATTACHED FILES
##############################################################################

File 1: dental_records_sample.xlsx (500 ho so mau de AI hieu format)
File 2: soap_note_format_VN.pdf (chuan SOAP note nha khoa VN)
File 3: N/A
