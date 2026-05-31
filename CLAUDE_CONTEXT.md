# CLAUDE_CONTEXT.md
# KOSAF 여비를 부탁해 — AI 작업 컨텍스트 파일
# 마지막 업데이트: 2026-05-31 (데이터 안정성·테스트·GA4 반영)

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
| Google Analytics | GA4 측정 ID: `G-6E2LVC7XLJ` (index.html에 설치) |

---

## 파일 구조

```
/
├── index.html              ← Noto Sans KR 폰트 + GA4(G-6E2LVC7XLJ) 스크립트
├── package.json
├── vite.config.js
├── tailwind.config.js
├── vercel.json
├── CLAUDE_CONTEXT.md       ← 이 파일
├── CHANGELOG.md            ← 변경 이력
├── test/
│   └── calc.test.mjs       ← 계산 로직 단위 테스트 (node test/calc.test.mjs)
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
localStorage 키: b_step1, b_step2, b_step3, b_step4, b_step4_raw
```

**자동저장 (B1~B4 전 단계, 2026-05-31~)**: 각 단계에서 입력 0.5초 후 localStorage 자동저장 + 진입 시 복원
- B1: `init()`에서 b_step1 복원 / useEffect로 자동저장
- B2: `ts` 초기값 b_step2.transport 복원 / useEffect 자동저장
- B3: `st` 초기값 b_step3.accom 구조 검증 후 복원 / useEffect 자동저장
- B4: raw 상태(dayData·extSupport)를 **별도 키 `b_step4_raw`**에 자동저장·복원 (정식 b_step4는 "다음" 버튼에서 가공 저장)
- 효과: 입력 중 새로고침해도 데이터 유지

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

**보고서 출력 (ReportOverlay, A·B·C 공통, 2026-05-31~)**: `iframe srcDoc`으로 미리보기 + 🖨️ 인쇄/PDF 저장 버튼(window.print) + 💾 HTML 저장 버튼 병행. `React.useRef`로 iframe 제어 (import React 필요)

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
- `segTransport(t)`: 교통편 1건의 {corp, personal} 운임 산출 — 연료비(calcFuel)·통행료(tollCard)·주차료(parkingCard)·운임 모두 카드구분별 합산. **calcAmounts·보고서 trs 모두 이 함수 사용**
- `FUEL_TYPES`: 연비표 (휘발유 11.97 / 경유 12.52 / LPG 8.83 / 하이브리드 15.37 / 플러그인 10.61 / 전기 2.84 / 수소 94.9)
- `buildDynCats()`: group = "route"/"proof"/"receipt"
- 이미지: rI(route) + pI(proof) + rR(receipt) + xI(extra) → 모두 `.base64` 방어
- `imgPages()`: 4장씩 2×2 그리드
- 보고서 연료비 산출근거 표시: `거리km × 단가원 ÷ 연비 = 금액`
- JSON: v:"B" + steps 포함
- sessionStorage 자동 로드 (B4→B5 진입 or JSON 업로드)

### C경로 (RouteC.jsx)
- `iS()`: dept:"", origin:"", name:"", grade:"", ...
- 교통: inbound/outbound 각 1회, `segT(t)` 헬퍼로 운임 산출 (B5 segTransport와 동일 로직, 필드명 toll/park)
- `segDesc(t)`: 보고서 수단 설명 + 연료비 산출근거 표시
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
9. **교통비 계산**: B5는 `segTransport(t)`, C는 `segT(t)` 사용 — 연료비·통행료·주차료·운임 카드구분별 합산. 직접 `t.fare`만 읽으면 연료비/통행료/주차료 누락됨 (2026-05-30 버그)
10. **genHTML 스코프**: `genHTML()` 안에서 `I()`·`calcFuel()` 등 사용 시 해당 함수가 그 스코프에 정의돼 있는지 확인 (calcAmounts 스코프 함수 사용 시 ReferenceError)
11. **자동저장**: B1~B4 수정 시 useState 초기값 복원 + useEffect 자동저장 로직 유지. B4는 `b_step4_raw` 키 사용
12. **계산 로직 수정 후**: 반드시 `node test/calc.test.mjs` 실행해 20개 케이스 통과 확인. 로직 변경 시 테스트 파일도 함께 갱신
13. **ReportOverlay 수정**: A·B5·C 3곳에 동일 컴포넌트 복제됨 — 한 곳 고치면 3곳 모두 반영. `import React` 필요 (useRef 사용)

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
  "CHANGELOG 정리해줘"
  → ① CHANGELOG.md 업데이트
  → ② [필수] CONTEXT.md 영향 점검 (아래 체크리스트)
  → ③ 변경된 파일 다운로드 → 프로젝트 지식 재업로드
```

**★ CHANGELOG ↔ CONTEXT 동반 갱신 규칙 (중요)**
CHANGELOG를 갱신할 때마다 Claude는 아래를 자동 점검하고, 해당되면 CONTEXT.md도 함께 업데이트해 양쪽 파일을 같이 제공한다.

CONTEXT 갱신이 필요한 변경 유형 (체크리스트):
- [ ] 파일/폴더 신규 추가·삭제 → "파일 구조" 갱신
- [ ] localStorage/sessionStorage 키 추가·변경 → "데이터 흐름" 갱신
- [ ] 핵심 계산 함수·헬퍼 추가·로직 변경 → "기능별 상세" + "주의사항" 갱신
- [ ] 규정 해석 변경 → "확정된 여비규칙 해석" 갱신
- [ ] 보고서 구조·출력 방식 변경 → "보고서 구조" 갱신
- [ ] 새 외부 연동(GA 등) → "시스템 개요" 갱신
- [ ] 반복 주의가 필요한 버그 패턴 발견 → "수정 시 절대 주의사항" 추가

위 중 하나라도 해당하면 → CHANGELOG + CONTEXT 둘 다 갱신 후 함께 다운로드 제공.
단순 UX 문구·색상 등 구조 영향 없는 변경은 CHANGELOG만 갱신 (CONTEXT 생략 가능).
CONTEXT 갱신 시 헤더의 "마지막 업데이트" 날짜도 함께 변경.
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
| `test/calc.test.mjs` | 여비 계산 로직 단위 테스트 (20개 케이스) |
| `deploy_update/src/pages/` | 최신 배포용 파일 모음 |

