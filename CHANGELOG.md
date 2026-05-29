# CHANGELOG.md
# KOSAF 여비를 부탁해 — 변경 이력
# 최신 항목이 위에 위치

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
