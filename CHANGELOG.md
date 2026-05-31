# CHANGELOG.md
# KOSAF 여비를 부탁해 — 변경 이력
# 최신 항목이 위에 위치

---

## [2026-05-31] 보고서 출발지 출력 + 날짜 검증 확인

### 보고서 기본정보에 출발지 행 추가 (A·B·C 전체)
- 기존: 소속부서만 출력, 출발지(origin) 데이터는 입력받았으나 보고서에 누락
- 변경: 소속부서 다음에 "출발지" 행 추가 → `origin || dept` 값 출력
- 수정 파일: `src/pages/RouteA.jsx`, `RouteB5.jsx`, `RouteC.jsx`

### 날짜 역전 검증 (점검 결과 — 이미 구현됨)
- B1 일정 단계에서 복귀일 < 출발일이면 "복귀일이 출발일보다 빠릅니다" 경고 + 다음 버튼 비활성화(canStep2) 이미 존재
- 별도 수정 불필요 확인

---

## [2026-05-31] 추가 개선 — 데이터 안정성 & 테스트

### B경로 전 단계 자동저장 (데이터 유실 방지)
- **문제**: B1만 자동저장이었고 B2·B3·B4는 "다음 단계" 버튼 클릭 시에만 저장 → 입력 중 새로고침하면 해당 단계 데이터 유실
- **수정**: B1~B4 전 단계에 입력 0.5초 후 자동저장 + 새로고침 시 localStorage 복원 적용
  - B1: `init()`에서 b_step1 복원 + 자동저장
  - B2: `ts` 초기값 b_step2 복원 + 자동저장
  - B3: `st` 초기값 b_step3 구조 검증 후 복원 + 자동저장
  - B4: raw 상태 별도 키(`b_step4_raw`) 자동저장 + 복원
- 효과: B경로 전 단계에서 새로고침해도 입력 데이터 유지

### 금액 입력 콤마 미리보기 (UX)
- 금액 입력란 아래에 `= 1,500,000원` 형식으로 콤마 표시 (안전 방식, 입력값 자체는 숫자 유지)
- 적용: B2(운임·대중교통요금), B3(숙박비), C(운임·대중교통·숙박·감액)

### B1 진행률 + 임시저장 안내 (UX)
- 진행바 위에 "기본정보 입력 N/5 · 단계명" 위치 표시
- 입력 시 "💾 자동 저장됨" 안내 표시

### 계산 로직 단위 테스트 추가
- `test/calc.test.mjs` 신규 — 20개 케이스 전부 통과
- 검증 범위: 연료비(유종별), 통행료·주차료 법인/개인 분리, 대중교통준용, 일반 교통수단, 관용차, 일비·식비 차감
- 실행: `node test/calc.test.mjs` → 계산 로직 수정 후 회귀 버그 즉시 감지

### 수정 파일
- `src/pages/RouteB1.jsx` ~ `RouteB4.jsx`, `RouteC.jsx`
- `test/calc.test.mjs` (신규)

---

## [2026-05-31] PENDING 항목 3가지 완료

### ① Google Analytics GA4 설치
- `index.html`에 GA4 스크립트 추가 (측정 ID: `G-6E2LVC7XLJ`)
- Noto Sans KR 폰트 링크도 함께 추가 (기존 누락 확인 및 복구)
- 수정 파일: `index.html`

### ② B경로 JSON 불러오기 후 단계 안내 UX 개선
- JSON 파일 업로드 → B1 이동 시 **초록색 안내 배너** 자동 표시
  - 내용: "✅ 저장된 정산 파일을 불러왔습니다 / 내용을 확인·수정 후 단계별로 진행하거나, 5단계(보고서)에서 바로 출력할 수 있습니다."
  - 8초 후 자동 닫힘 / ✕ 버튼으로 즉시 닫기 가능
- 수정 파일: `src/pages/RouteB1.jsx`

### ③ 보고서 출력 미리보기 개선 (A·B·C 전체)
- **변경 전**: dangerouslySetInnerHTML → 스타일 깨짐 / HTML 파일 저장 후 Ctrl+P 2단계 필요
- **변경 후**:
  - `iframe`으로 실제 인쇄와 동일한 모습 미리보기
  - **🖨️ 인쇄 / PDF 저장** 버튼 신규 추가 → 클릭 한 번으로 바로 인쇄 창 열림
  - 💾 HTML 저장 버튼 유지 (기존 방식 병행)
  - 안내 문구 간결하게 개선 (파란색 배경)
  - React import 정리 (`import React, { useState, ... }` 통합)
- 수정 파일: `src/pages/RouteA.jsx`, `RouteB5.jsx`, `RouteC.jsx`

---


## [2026-05-30] 자가용 교통비 합산 오류 수정 (B·C)

### 버그 수정 (중요)
- **B5 보고서 출력 오류 (ReferenceError: I is not defined)**: `genHTML()` 함수 내에서 `I()` 사용했으나 정의가 `calcAmounts()` 스코프에만 있어 보고서 출력·저장 전체 작동 불가 → `genHTML()`에 `const I=n=>parseInt(n)||0;` 추가
- **B경로 자가용 연료비·통행료·주차료 개인지급 누락**: `calcAmounts()`가 `t.fare`/`t.pubFare`만 참조 → 연료비(fuel)·통행료(toll)·주차료(parking) 전부 합계에서 누락
- **C경로(연수) 통행료·주차료 개인지급 누락**: `iF`/`oF` 계산이 연료비(cFuel)만 반영, 통행료·주차료는 미합산

### 핵심 수정 — 교통편 운임 산출 헬퍼 추가
- B5: `segTransport(t)` 함수 신규 — 교통편 1건의 {corp, personal} 운임 정확 산출
- C: `segT(t)` 함수 신규 — 동일 로직 (필드명 toll/park 대응)
- 합산 규칙:
  - 연료비 → 항상 개인지급 (`calcFuel`: 거리×유가÷연비)
  - 통행료 → `tollCard==="corp"`면 법인카드, 아니면 개인지급
  - 주차료 → `parkCard/parkingCard==="corp"`면 법인카드, 아니면 개인지급
  - 대중교통준용 → `pubFare` 개인지급 (통행료·주차료 별도 미지급, 별표1 비고6)
  - 관용차(gov) → 운임 미지급, 주차료만 반영
- 연비표(FUEL_TYPES) B2와 동일 기준 적용 (휘발유 11.97 / 경유 12.52 / LPG 8.83 / 하이브리드 15.37 / 플러그인 10.61 / 전기 2.84 / 수소 94.9)

### 보고서 표시 개선
- B5 교통비 테이블: 운임·연료비·통행료·주차료를 **항목별 개별 행**으로 분리 표시 + 법인/개인 구분
- C 교통비 테이블: `segDesc()` 추가 → carMode 코드(fuel/public) 대신 "자가용 연료비(휘발유) + 통행료" 등 가독성 있는 설명 표시
- **연료비 산출근거 표시 (B·C 추가)**: 보고서 자가용 연료비 항목에 계산식 명시
  - 형식: `124km × 1,704원 ÷ 11.97(연비) = 17,652원` (작은 회색 글씨)
  - B5: 연료비 행 하단, C: segDesc 내 연료비 설명 + 통행료·주차료 금액 병기

### UX 개선 — 경로 선택 화면 이동 버튼 강조 (전 경로)
- 기존: 작은 회색 글씨 "← 처음으로" (눈에 잘 안 띔)
- 변경: 파란 배경 버튼 "← 경로 선택 화면으로 (A · B · C)"
- 적용: RouteA / B1 / B2 / B3(2곳) / B4 / B5(시작·메인) / C 전체
- 효과: 다른 경로로 전환하는 동선이 명확해짐

### 검증
- esbuild 빌드 통과 (B5·C)
- 4개 시나리오 계산 검증 (연료비+통행료+주차료 합산, 법인/개인 혼합, 대중교통준용, 일반 교통수단)

### 수정 파일
- `src/pages/RouteB5.jsx`, `src/pages/RouteC.jsx` (교통비 합산·연료비 산출근거)
- `src/pages/RouteA.jsx`, `RouteB1~B4.jsx` (경로 선택 버튼 강조)

---


## [2026-05-29] 버그 수정 및 보고서 개선

### 버그 수정
- **B5 개인차량 대중교통요금 합산 누락**: `calcAmounts()`의 `personalTransport` 계산 시 `car/public` 모드에서 `t.pubFare`를 참조하지 않던 문제 수정
  - 수정 전: `t.fare`만 읽음 → `pubFare` 누락되어 개인지급 합계 0원 처리
  - 수정 후: `t.type==="car"&&t.carMode==="public"` 분기 추가 → `t.pubFare` 정상 합산

### 보고서 개선 (B5)
- **교통비 테이블 수단명 개선**
  - `car/public`: "car" → "자가용(대중교통준용)"
  - `car/fuel`: "car" → "자가용(연료비)"
  - 보고서 개인지급 열에도 `pubFare` 값 정상 표시
- **기본정보에 출장지 장소명 추가**: 지역명만 표시되던 출장지에 기관명·장소명 병기
  - 예: `서울특별시` → `서울특별시 (OO기관)`
- **기본정보에 출장 사유 행 신규 추가**: B1에서 입력한 목적지별 방문 사유를 보고서에 출력
  - 목적지 1개: 단독 표시
  - 목적지 복수: `목적지1: ○○ / 목적지2: ○○` 형식

### 수정 파일
- `src/pages/RouteB5.jsx`

---

## [2026-04-13] 대규모 업데이트 (전체 세션)

### 버그 수정
- **B5 flatMap 오류**: `Array.isArray(data.accom)` 방어 로직 3곳 추가 (loadFromStorage + genHTML 2곳)
- **B5 companions 연산자**: `((||[]).map().join()||"없음")` 괄호 수정 → 보고서 운임·숙박·일비 누락 해결
- **B2 PREV is not defined**: `buildSegs(routes, origin)` 파라미터 방식으로 변경 → B1→B2 화면 전환 오류 해결
- **B5 이미지 group명 불일치**: `"p"→"proof"`, `"r"→"receipt"` 수정 → 4개 중 2개만 출력되던 문제 해결
- **B5·C 이미지 방어**: `imgs[c.key]?.base64`, `v&&v.base64` 조건 추가
- **C경로 gHTML 닫힘**: 함수 닫는 `}` 누락 수정

### 소속부서·출발지 기능 추가 (A·B·C 전체)
- 기본정보에 소속부서(팀) + 출발지 입력란 추가
- 소속부서 입력 시 출발지 자동 동일 설정 (개별 수정 가능)
- B2 buildSegs 구간 출발점에 origin 동적 반영
- B1 저장 데이터에 dept/origin 포함
- B5 loadFromStorage에 dept/origin 포함
- 보고서 기본정보에 소속부서 항목 추가
- 대구센터 하드코딩 → 동적 origin으로 교체 (B1·B2)

### JSON 업로드 자동 이동 기능
- Home.jsx: JSON 업로드 시 v 필드 판별 → 해당 경로 자동 이동
  - v="A" → /a, v="B"(steps) → /b/1, v="B" → /b/5, v="C" → /c
- sessionStorage "kosaf_json_load" 키 사용 (1회성)
- A·C경로: useEffect로 sessionStorage 자동 로드
- B5: sessionStorage 우선 확인 후 loadFromStorage 진행

### B경로 완전 수정 지원
- B5 saveJSON: steps 필드 추가 (b_step1~4 원본 데이터)
- B1 useEffect: sessionStorage → localStorage 복원 + setS 자동 채우기
- JSON 업로드 시 B1부터 수정 가능

### JSON v 필드 통일
- A: `v:"1a"` → `v:"A"`
- B: `v:"B"` 신규 추가 (기존: version 필드만 있었음)
- C: `v:"1c"` → `v:"C"`

### 디자인 — 경로별 그라디언트 색상 적용
- A: `linear-gradient(135deg,#922b21,#e74c3c)` (빨강)
- B: `linear-gradient(135deg,#1a5c38,#27ae60)` (녹색)
- C: `linear-gradient(135deg,#1a3a6e,#2980b9)` (파랑)
- 적용: Home 카드 / 각 경로 헤더 배너 (B1~B5 포함) / 보고서 h1 경로 배지
- 헤더 서브텍스트: A=red-200 / B=green-200 / C=blue-200

### 보고서 전면 개편 (A·B·C 모두)
- 구조: 가(기본정보) / 나(비용항목 나-1~나-4) / 다(최종정산)
- CSS: 흑백 (파란색·보라색 → 검정·회색 완전 제거)
- 폰트: @import Noto Sans KR 적용
- 정산 마감 문구 제거 (A·B·C 모두)
- 규정 근거 조항 명시 (나-1 제11조, 나-2 제12조, 나-3 제14조)
- 보고서 h1 우측에 경로 배지 (그라디언트)

### 이미지 4분할 레이아웃 (B5·C 모두)
- 기존: 이미지 1개당 1페이지
- 변경: 1페이지에 2×2 그리드 (4장), max-height 320px
- B5: imgPages() 함수로 구현, 4장씩 페이지 분할
- C: imgSection 2×2 그리드

### 앱 전체 폰트 적용
- index.html: Google Fonts Noto Sans KR 링크 추가
- index.css: body, * { font-family: 'Noto Sans KR', sans-serif }

### B4 자가용 문구 수정
- "차량(관용차·자가용) 이용 구간 없음" → "관용차 이용 구간 없음"

### 산출물 생성
- KOSAF_여비시스템_사용자설명서.docx (7장 구성, Word)
- kosaf_yeobi_qr.png (QR코드)
- CLAUDE_CONTEXT.md (AI 컨텍스트 파일)
- CHANGELOG.md (이 파일)
- CLAUDE_PROJECT_INSTRUCTIONS.md (Claude 프로젝트 지침)

---

## [2026-04-12] 초기 개발 및 배포

### 완료
- React + Vite + Tailwind 프로젝트 구성
- GitHub 저장소 생성: commax1581-hub/kosaf-yeobi
- Vercel 배포 연동: kosaf-yeobi.vercel.app
- A/B/C 경로 전체 개발
  - A: 근무지 내 출장 (일비 정액)
  - B: 국내 일반 출장 5단계 (B1~B5)
  - C: 국내 연수
- 보고서 HTML 생성 + Ctrl+P PDF 저장 안내
- JSON 저장·불러오기 기본 구현
- 이미지 첨부 기능 (compressImage, max 1200px, JPEG 80%)
- window.beforeunload 세션 경고
- QR코드 생성
- 사용자 설명서 Word 문서 최초 생성

---

## PENDING (향후 작업 예정)

- Google Analytics 설치 (접속 현황 파악)
- B경로 JSON 불러오기 후 현재 단계 안내 UX 개선
- 보고서 출력 미리보기 개선






