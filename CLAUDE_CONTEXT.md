# CLAUDE_CONTEXT.md
# KOSAF 여비를 부탁해 — AI 작업 컨텍스트 파일
# 마지막 업데이트: 2026-04-13 (전체 세션 반영 최종본)

---

## 시스템 개요

| 항목 | 내용 |
|------|------|
| 서비스명 | KOSAF 여비를 부탁해 (스마트 여비정산 시스템) |
| 운영기관 | 한국장학재단 대구센터 창업지원팀 |
| 배포 URL | https://kosaf-yeobi.vercel.app |
| GitHub | https://github.com/commax1581-hub/kosaf-yeobi (Public) |
| 기술스택 | React + Vite + Tailwind CSS + Vercel (무료 Hobby 플랜) |
| 폰트 | Noto Sans KR (앱 전체 + 보고서) |
| 규정 기준 | 한국장학재단 여비규칙 (2023.7.21 개정) |

---

## 파일 구조

```
/
├── index.html              ← Noto Sans KR Google Fonts 링크 포함
├── package.json
├── vite.config.js
├── tailwind.config.js
├── vercel.json
├── CLAUDE_CONTEXT.md       ← 이 파일
├── CHANGELOG.md            ← 변경 이력
└── src/
    ├── index.css           ← body,*{ font-family:'Noto Sans KR',sans-serif }
    ├── main.jsx
    └── pages/
        ├── Home.jsx        ← 첫 화면 (JSON 업로드→자동이동)
        ├── RouteA.jsx      ← A경로 (근무지 내 출장)
        ├── RouteB1.jsx     ← B경로 1단계 (기본정보)
        ├── RouteB2.jsx     ← B경로 2단계 (교통수단)
        ├── RouteB3.jsx     ← B경로 3단계 (숙박비)
        ├── RouteB4.jsx     ← B경로 4단계 (일비·식비)
        ├── RouteB5.jsx     ← B경로 5단계 (검증·보고서)
        └── RouteC.jsx      ← C경로 (국내 연수)
```

---

## 경로별 색상 시스템 (그라디언트)

| 경로 | 그라디언트 | 적용 위치 |
|------|-----------|----------|
| A | `linear-gradient(135deg,#922b21,#e74c3c)` | Home 카드, 헤더 배너, 보고서 배지 |
| B | `linear-gradient(135deg,#1a5c38,#27ae60)` | Home 카드, 헤더 배너, 보고서 배지 |
| C | `linear-gradient(135deg,#1a3a6e,#2980b9)` | Home 카드, 헤더 배너, 보고서 배지 |

헤더 서브텍스트 색상: A=text-red-200 / B=text-green-200 / C=text-blue-200

---

## 경로별 JSON 저장 구조

```json
A경로: { "v": "A", "t": "ISO날짜", "d": { ...state } }

B경로: {
  "v": "B", "version": "1.0",
  "savedAt": "ISO날짜", "type": "국내출장",
  "data": { dept, origin, name, grade, startDate, endDate, ... },
  "amounts": { corpTransport, personalTransport, ... },
  "adjustments": [],
  "steps": {
    "b_step1": { dept, origin, name, grade, startDate, endDate, routes, companions },
    "b_step2": { transport: [...] },
    "b_step3": { accom: [...] },
    "b_step4": { dayBasis: [...], extSupport: {...} }
  }
}

C경로: { "v": "C", "t": "ISO날짜", "d": { ...state }, "adjustments": [] }
```

**파일명 규칙**: `YYYYMMDD_HHMM_경로_성명.json`

---

## Home.jsx JSON 업로드 자동 이동 로직

```
v="A"               → /a   (sessionStorage → RouteA useEffect 자동 로드)
v="B" + steps 있음  → /b/1 (B1 useEffect → localStorage 복원 + setS)
v="B" + steps 없음  → /b/5 (B5 기존 handleLoad 방식)
v="C"               → /c   (sessionStorage → RouteC useEffect 자동 로드)
판별 불가           → 오류 메시지

sessionStorage 키: "kosaf_json_load" (1회성, 읽은 후 즉시 삭제)
localStorage 키: b_step1, b_step2, b_step3, b_step4
```

---

## 확정된 여비규칙 해석 (임의 변경 금지)

| 항목 | 확정 해석 | 근거 |
|------|----------|------|
| 일비 | 25,000원/일 (전 직급 동일) | 별표1 |
| 식비 | 25,000원/일, 식사 제공 시 8,333원/식 차감 | 별표1 |
| 합숙 일비 | 12,500원/일 | C경로 합숙연수 |
| 숙박 상한 | 서울 100,000 / 광역시 80,000 / 기타 70,000 | 별표1 |
| 자가용 일비 감액 | **미적용** (제14조는 관용차만 명시) | 제14조 |
| 관용차 운임 | 미지급 | 제13조 |
| 관용차 일비 | 해당 일 1/2 감액 | 제14조 |
| 차량운행지원 | 편도 5,000원 / 왕복 10,000원 차감 | 제15조⑤ |
| 친지집 숙박비 | 20,000원 정액 | 별표1 |
| 정산 마감 문구 | **보고서에서 제거** (실무상 다음달 집행) | 실무 결정 |

---

## 보고서 구조 (A·B·C 공통)

```
제목: ○○ 여비 정산 보고서  [A경로] ← 그라디언트 배지

가. 기본정보
    소속부서 / 신청자(직급) / 출장기간 / 출장지 / 동행자

나. 비용항목 정산
    나-1. 교통비  (여비규칙 제11조) — 구간·수단·법인카드·개인지급·소계
    나-2. 숙박비  (제12조) — B·C만, 지역·형태·소계
    나-3. 일비·식비  (제14조, 별표1) — 기준 명시 + 일차별 + 소계
    나-4. 감액조정 — 있을 때만

다. 최종 정산 금액
    항목별 소계
    ◆ 최종 개인 지급 청구액 (굵게 강조)
    법인카드 집행액

[다음 장] 첨부 증빙자료 — 2×2 그리드 (4장/페이지)
```

**보고서 스타일**: 흑백 (검정·회색), Noto Sans KR, @import Google Fonts 포함, 컬러 없음

---

## 기능별 상세

### A경로 (RouteA.jsx)
- 소속부서(팀) + 출발지 (소속부서 입력 시 출발지 자동 동일, 수정 가능)
- 관용차 / 차량운행지원(svcT) 선택
- 일비: 4시간 이상 20,000원 / 미만 10,000원
- sessionStorage 자동 로드 useEffect 포함
- JSON: v:"A"

### B경로

**B1**: dept/origin/name/grade/startDate~endDate/routes(복수)/companions
- 저장: `{ dept, origin, name, grade, startDate, startTime, endDate, endTime, hasComp, companions, routes }`

**B2**: `function buildSegs(routes, origin)` — origin 파라미터 필수
- 교통수단: ktx/bus/air/ship/car(fuel/public)/gov

**B3**: hotel/relative(20,000정액)/provided/none

**B4**: DayRow 컴포넌트, 관용차 1/2감액 체크
- 화면: "관용차 이용 구간 없음" (자가용 문구 제거됨)

**B5**:
- `loadFromStorage()`: b_step1~4 통합, dept/origin 포함
- `buildDynCats()`: group = "route"/"proof"/"receipt"
- 이미지: rI(route) + pI(proof) + rR(receipt) + xI(extra) → 모두 `.base64` 방어
- `imgPages()`: 4장씩 2×2 그리드
- JSON: v:"B" + steps 포함
- sessionStorage 자동 로드 (B4→B5 진입 or JSON 업로드)

### C경로 (RouteC.jsx)
- `iS()`: dept:"", origin:"", name:"", grade:"", ...
- 교통: inbound/outbound 각 1회, carMode별 계산, cFuel()
- 일비: bdAmt() (합숙 여부 반영)
- 이미지: {confirm, transport, accom, etc} → v&&v.base64 방어
- sessionStorage 자동 로드 useEffect 포함
- JSON: v:"C"

---

## 이미지 처리

```javascript
compressImage(file)  // max 1200px, JPEG 80%, {base64, name} 반환

// B5 buildDynCats group 분류
"route"   → 자가용 이동경로 캡처
"proof"   → 오피넷 유가, 대중교통 요금표
"receipt" → 탑승권, 통행료, 주차료 영수증

// 보고서 이미지 레이아웃
page-break-before: always (첫 이미지 페이지)
display: grid; grid-template-columns: 1fr 1fr; gap: 12px
max-height: 320px per image
```

---

## 수정 시 절대 주의사항

1. **buildSegs (B2)**: `buildSegs(routes, origin)` 파라미터 방식 — PREV 직접 참조 시 ReferenceError
2. **B5 accom**: `Array.isArray(data.accom)` 방어 로직 3곳 유지
3. **companions 연산자**: `((companions||[]).map().join(",")||"없음")` — 괄호 필수
4. **B5 이미지 group**: "route"/"proof"/"receipt" — "p"/"r" 아님
5. **C경로 gHTML**: 함수 닫는 `}` — imgSection 이후
6. **useEffect import**: 추가 시 import 확인
7. **빌드 확인**: `npm run build` 성공 후 배포
8. **보고서 CSS**: `@import url('https://fonts.googleapis.com/...')` 필수

---

## GitHub 업데이트 방법

```
src/pages/ 파일: GitHub → kosaf-yeobi → src/pages/ → Upload files → Commit
루트 파일 (index.html, index.css): 루트 경로에 업로드
→ Vercel 자동 재배포 (약 30초~1분)
```

---

## 프로젝트 관리 방식

```
Claude 프로젝트: "KOSAF 여비 시스템"
지식 파일: CLAUDE_CONTEXT.md + CHANGELOG.md
지침: CLAUDE_PROJECT_INSTRUCTIONS.md 내용 등록

작업 완료 후 루틴:
  "오늘 변경사항 CHANGELOG에 추가해줘"
  → 업데이트 파일 다운로드 → 프로젝트 지식 재업로드
```

---

## 산출물 목록

| 파일명 | 설명 |
|--------|------|
| `KOSAF_여비시스템_사용자설명서.docx` | 직원용 설명서 (7장, Word) |
| `kosaf_yeobi_qr.png` | 접속 QR코드 |
| `CLAUDE_CONTEXT.md` | 이 파일 (AI 작업 컨텍스트) |
| `CHANGELOG.md` | 날짜별 변경 이력 |
| `CLAUDE_PROJECT_INSTRUCTIONS.md` | Claude 프로젝트 지침 문구 |
| `deploy_update/src/pages/` | 최신 배포용 파일 모음 |
