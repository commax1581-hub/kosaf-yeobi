import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

/* ── 상수 ── */
const GRADES = ["임원", "본부장", "부서장·팀장", "팀원"];
const GRADE_ORDER = ["임원", "본부장", "부서장·팀장", "팀원"];

const FUEL_TYPES = [
  { key: "gasoline", label: "휘발유",      rate: 11.97, unit: "L",   opinet: "보통휘발유" },
  { key: "diesel",   label: "경유",        rate: 12.52, unit: "L",   opinet: "자동차용경유" },
  { key: "lpg",      label: "LPG",         rate: 8.83,  unit: "L",   opinet: "부탄(LPG)" },
  { key: "hybrid",   label: "하이브리드",  rate: 15.37, unit: "L",   opinet: "보통휘발유" },
  { key: "plugin",   label: "플러그인",    rate: 10.61, unit: "L",   opinet: "보통휘발유" },
  { key: "ev",       label: "전기",        rate: 2.84,  unit: "kWh", opinet: null },
  { key: "hydrogen", label: "수소",        rate: 94.9,  unit: "kg",  opinet: null },
];

const CAR_REASONS = [
  "대중교통 없는 산간오지·도서벽지",
  "출장경로 복잡, 대중교통 대비 편도 1시간 이상 차이",
  "심야 이동 또는 긴급 사유",
  "중량 수하물 운송",
];

/* ── 스타일 ── */
const card = "bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5";
const ct   = "text-xs font-medium text-gray-500 uppercase tracking-wider mb-3";
const inp  = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white text-gray-900";
const lbl  = "block text-sm text-gray-500 mb-1 mt-3";
const lbl0 = "block text-sm text-gray-500 mb-1";
const ibox = "bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800 leading-relaxed";
const ebox = "bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800 leading-relaxed";
const obox = "bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800 leading-relaxed";
const wbox = "bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 leading-relaxed";

const Btn = ({primary,disabled,onClick,children,small}) => (
  <button
    className={"rounded-xl font-semibold transition-all "+(small?"px-3 py-1.5 text-xs":"px-5 py-2.5 text-sm")+" "+(primary?"bg-blue-600 text-white hover:bg-blue-700 shadow-sm":"bg-white border border-gray-200 text-gray-700 hover:bg-gray-50")+" "+(disabled?"opacity-40 cursor-not-allowed":"cursor-pointer")}
    onClick={disabled?undefined:onClick}
  >{children}</button>
);

const TBtn = ({sel,onClick,children,small}) => (
  <button
    className={"rounded-xl font-medium transition-all "+(small?"px-3 py-1.5 text-xs":"px-4 py-2 text-sm")+" "+(sel?"bg-blue-600 text-white shadow-sm":"bg-white border border-gray-200 text-gray-600 hover:bg-gray-50")+" cursor-pointer"}
    onClick={onClick}
  >{children}</button>
);

const Link = ({ href, children }) => (
  <a href={href} target="_blank" rel="noreferrer"
    className="text-blue-600 underline hover:text-blue-800">{children}</a>
);

const fmtW = n => Math.round(n || 0).toLocaleString("ko-KR") + "원";

/* ── App 밖에 정의 → 재렌더링 시 재생성 없음 → input 타이핑 정상 ── */
const CardSelect = ({ value, onChange }) => (
  <div className="flex gap-2 mt-1">
    <TBtn small sel={value === "corp"}     onClick={() => onChange("corp")}>법인카드</TBtn>
    <TBtn small sel={value === "personal"} onClick={() => onChange("personal")}>개인카드·현금</TBtn>
  </div>
);

const TollParkUI = ({ label, hasKey, amtKey, cardKey, reasonKey, si, t, updT }) => (
  <div className="mt-4">
    <div className={lbl0}>{label} 발생 여부</div>
    <div className="flex gap-2 mt-1">
      <TBtn small sel={t[hasKey] === false} onClick={() => updT(si, { [hasKey]: false })}>없음</TBtn>
      <TBtn small sel={t[hasKey] === true}  onClick={() => updT(si, { [hasKey]: true })}>있음</TBtn>
    </div>
    {t[hasKey] === true && <>
      <div className={lbl}>금액 (원)</div>
      <input className={inp} type="text" inputMode="numeric" pattern="[0-9]*"
        value={t[amtKey]} placeholder="영수증 금액 입력 (예: 12300)"
        onChange={e => {
          const v = e.target.value.replace(/[^0-9]/g, "");
          updT(si, { [amtKey]: v });
        }} />
      <div className={lbl}>결제 수단</div>
      <CardSelect value={t[cardKey]} onChange={v => updT(si, { [cardKey]: v })} />
      {t[cardKey] === "personal" && <>
        <div className={lbl}>소명 사유</div>
        <input className={inp} type="text" value={t[reasonKey]}
          placeholder="예: 법인카드 미소지, 현금 결제 불가피"
          onChange={e => updT(si, { [reasonKey]: e.target.value })} />
      </>}
      {t[amtKey] && t[cardKey] && (
        <div className="mt-2 text-sm">
          <span className={t[cardKey] === "corp" ? "text-gray-500" : "text-blue-600 font-medium"}>
            {t[cardKey] === "corp"
              ? "법인카드 집행 — 개인지급 0원"
              : `개인지급: ${fmtW(parseInt(t[amtKey]) || 0)}`}
          </span>
        </div>
      )}
    </>}
  </div>
);

/* ── 샘플 이전 데이터 (1단계에서 전달) ── */
/* ── 구간 목록 생성 ── */
function buildSegs(routes, origin) {
  const o = origin || "출발지";
  const pts = [o, ...routes.map(r => `${r.region} ${r.place}`), o];
  return pts.slice(0, -1).map((from, i) => ({ from, to: pts[i + 1], idx: i }));
}

/* ── 유효 직급 (동도출장) ── */
function effGrade(grade, hasComp, companions) {
  if (!hasComp) return grade;
  return companions.reduce((best, c) => {
    if (!c.grade) return best;
    return GRADE_ORDER.indexOf(c.grade) < GRADE_ORDER.indexOf(best) ? c.grade : best;
  }, grade);
}

/* ── 빈 교통 데이터 ── */
const emptyT = () => ({
  type: "",
  /* 대중교통 공통 */
  fare: "", cardType: "", personalReason: "",
  /* 자가용 */
  carMode: "", carReasons: [], passengers: [],
  /* 자가용 - 대중교통준용 */
  pubFare: "", pubFareImg: false,
  /* 자가용 - 연료비 */
  fuelType: "",
  distance: "", distanceImg: false,
  fuelPrice: "", fuelPriceImg: false,
  /* 관용차 */
  govPassengers: [],
  /* 통행료·주차료 (연료비 정산 + 관용차만) */
  hasToll: null, toll: "", tollCard: "", tollReason: "",
  hasParking: null, parking: "", parkingCard: "", parkingReason: "",
  /* 사전확인 완료 플래그 (연료비) */
  preChecked: false,
});

/* ── 연료비 계산 ── */
function calcFuel(t) {
  const ft = FUEL_TYPES.find(f => f.key === t.fuelType);
  if (!ft || !t.distance || !t.fuelPrice) return 0;
  return Math.round(parseFloat(t.distance) * parseFloat(t.fuelPrice) / ft.rate);
}

/* ── 유효성 검사 ── */
function isValid(t) {
  if (!t.type) return false;
  if (t.type === "gov") return true;
  if (t.type === "car") {
    if (!t.carMode) return false;
    if (t.carMode === "public") return !!t.pubFare;
    if (t.carMode === "fuel") {
      if (!t.preChecked) return false;
      if (t.carReasons.length === 0) return false;
      if (!t.fuelType || !t.distance || !t.fuelPrice) return false;
      if (t.hasToll === null || t.hasParking === null) return false;
      if (t.hasToll && !t.toll) return false;
      if (t.hasParking && !t.parking) return false;
      return true;
    }
    return false;
  }
  /* 대중교통 */
  if (!t.fare || !t.cardType) return false;
  if (t.cardType === "personal" && !t.personalReason.trim()) return false;
  return true;
}

/* ── 일비 감액 여부 ── */
function isDayDeduct(t, idx, allT) {
  if (t.type === "gov") return true;
  if (t.type === "car") {
    /* 운전자 항상 감액 */
    return true;
  }
  /* 동승자 여부 확인 */
  return false;
}

/* ── 메인 ── */
export default function RouteB2() {
  const navigate = useNavigate();
  /* ── 1단계 데이터 불러오기 (컴포넌트 내부) ── */
  const _raw1 = (() => {
    try { return JSON.parse(localStorage.getItem("b_step1") || "null"); } catch { return null; }
  })();
  const PREV = _raw1 || {
    grade: "팀원",
    startDate: "2026-04-09", startTime: "09:00",
    endDate:   "2026-04-13", endTime:   "18:00",
    hasComp: true,
    companions: [{ name: "김팀장", grade: "부서장·팀장" }],
    routes: [
      { region: "서울특별시", place: "서울 OO기관", reason: "업무협의",  nights: 2 },
      { region: "대전광역시", place: "대전 OO기관", reason: "계약체결", nights: 2 },
    ],
  };
  const _isFromStorage1 = !!_raw1;

  const [ts, setTs] = useState(buildSegs(PREV.routes, PREV.origin || PREV.dept).map(() => emptyT()));
  const [cur, setCur] = useState(0);
  const [showSummary, setShowSummary] = useState(false);

  const segs = buildSegs(PREV.routes, PREV.origin || PREV.dept);
  const eg = effGrade(PREV.grade, PREV.hasComp, PREV.companions);
  const companions = PREV.companions;

  const updT = useCallback((si, patch) =>
    setTs(prev => prev.map((t, i) => i === si ? { ...t, ...patch } : t)), []);

  /* ── 브라우저 닫기 경고 ── */
  useEffect(() => {
    const fn = e => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', fn);
    return () => window.removeEventListener('beforeunload', fn);
  }, []);

  const toggle = (arr, v) => arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];

  const allDone = ts.every(isValid);

  /* ── 구간 요약 계산 ── */
  function segSummary(t, si) {
    const rows = [];
    if (t.type === "gov") {
      rows.push({ label: "운임", corp: 0, personal: 0, note: "업무용차량 — 미지급 (제13조)" });
      rows.push({ label: "일비", corp: 0, personal: 0, note: "1/2 감액 (제14조)", deduct: true });
      if (t.hasParking && t.parking) {
        if (t.parkingCard === "corp") rows.push({ label: "주차료", corp: parseInt(t.parking), personal: 0, note: "법인카드" });
        else rows.push({ label: "주차료", corp: 0, personal: parseInt(t.parking), note: "개인/현금"+(t.parkingReason?" ("+t.parkingReason+")":"") });
      }
    } else if (t.type === "car") {
      if (t.carMode === "public") {
        rows.push({ label: "운임(대중교통준용)", corp: 0, personal: parseInt(t.pubFare) || 0, note: "자가용→대중교통준용" });
      } else {
        const fuel = calcFuel(t);
        rows.push({ label: "연료비", corp: 0, personal: fuel, note: ""+t.distance+"km × "+t.fuelPrice+"원 ÷ "+(FUEL_TYPES.find(f=>f.key===t.fuelType)?FUEL_TYPES.find(f=>f.key===t.fuelType).rate:"?") });
        if (t.hasToll && t.toll) {
          if (t.tollCard === "corp") rows.push({ label: "통행료", corp: parseInt(t.toll), personal: 0, note: "법인카드" });
          else rows.push({ label: "통행료", corp: 0, personal: parseInt(t.toll), note: "개인/현금" });
        }
        if (t.hasParking && t.parking) {
          if (t.parkingCard === "corp") rows.push({ label: "주차료", corp: parseInt(t.parking), personal: 0, note: "법인카드" });
          else rows.push({ label: "주차료", corp: 0, personal: parseInt(t.parking), note: "개인/현금" });
        }
      }
      rows.push({ label: "일비", corp: 0, personal: 0, note: "", deduct: false });
    } else {
      const fare = parseInt(t.fare) || 0;
      if (t.cardType === "corp") rows.push({ label: "운임", corp: fare, personal: 0, note: "법인카드" });
      else rows.push({ label: "운임", corp: 0, personal: fare, note: "개인카드 — "+t.personalReason });
    }
    return rows;
  }

  const t = ts[cur];
  const ft = FUEL_TYPES.find(f => f.key === t.fuelType);



  return (
    <div className="max-w-2xl mx-auto p-4 pb-12" style={{background:"#f0f4ff",minHeight:"100vh"}}>
      {/* 뒤로가기 */}
      <button onClick={()=>navigate('/')} className="flex items-center gap-1 text-sm text-gray-400 hover:text-blue-600 mb-3 cursor-pointer">
        ← 처음으로
      </button>
      {/* ── 상단 헤더 배너 ── */}
      <div className="rounded-2xl mb-5 overflow-hidden shadow-sm">
        <div style={{background:"linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 100%)"}} className="px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-blue-200 uppercase tracking-widest mb-1">KOSAF 여비를 부탁해....</div>
              <div className="text-white font-bold text-lg">스마트 여비정산 시스템</div>
            </div>
            <div className="text-right">
              <div className="bg-white/20 rounded-xl px-3 py-1.5 text-xs font-bold text-white">🅱 국내 일반 출장 — 2/5</div>
            </div>
          </div>
        </div>
      </div>
      {_isFromStorage1
        ? <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-xs text-green-700 mb-3">✅ 1단계 데이터 불러옴 — {PREV.grade} / {PREV.startDate} ~ {PREV.endDate}</div>
        : <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-xs text-amber-700 mb-3">⚠️ 샘플 데이터 사용 중 — 1단계를 먼저 완료하고 저장하세요</div>
      }


      {/* 헤더 */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="bg-blue-500 text-white text-xs px-2.5 py-1 rounded-full font-medium">2단계</span>
          <span className="text-lg font-medium">교통수단 입력</span>
        </div>
        {allDone && (
          <Btn small primary onClick={() => setShowSummary(!showSummary)}>
            {showSummary ? "입력으로" : "요약 보기"}
          </Btn>
        )}
      </div>

      {/* 출장 정보 요약 */}
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 mb-4 text-xs text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
        <span>직급: <strong>{PREV.grade}</strong></span>
        <span>운임기준: <strong className="text-blue-600">{eg}</strong></span>
        <span>{(PREV.startDate?PREV.startDate.replace(/-/g,"."):"(미입력)")} ~ {(PREV.endDate?PREV.endDate.replace(/-/g,"."):"(미입력)")}</span>
        {PREV.hasComp && <span>동행: {companions.map(c=>c.name).join(", ")}</span>}
      </div>

      {/* 요약 화면 */}
      {showSummary && <>
        <div className={card}>
          <div className={ct}>구간별 교통비 요약</div>
          {segs.map((seg, si) => {
            const rows = segSummary(ts[si], si);
            return (
              <div key={si} className="mb-4 pb-4 border-b border-gray-100 last:border-0">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  구간 {si+1}: {seg.from.split(" ")[0]} → {seg.to.split(" ")[0]}
                </div>
                {rows.map((r, ri) => (
                  <div key={ri} className="flex justify-between text-xs py-1 border-b border-gray-50">
                    <span className="text-gray-500">{r.label}</span>
                    <div className="text-right">
                      {r.corp > 0 && <span className="text-gray-400 mr-2">법카 {fmtW(r.corp)}</span>}
                      {r.personal > 0 && <span className="text-blue-600 font-medium">개인 {fmtW(r.personal)}</span>}
                      
                      {r.corp === 0 && r.personal === 0 && !r.deduct && <span className="text-gray-400">0원</span>}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        <div className={obox}>
          모든 구간 입력 완료. 3단계(숙박·일비·식비)로 진행하세요.
        </div>
        <div className="flex justify-end mt-4">
          <Btn primary onClick={() => {
            const data = { transport: ts };
            try {
              localStorage.setItem("b_step2", JSON.stringify(data));
            } catch(e) { alert("저장 오류: " + e.message); return; }
            navigate('/b/3');
          }}>3단계로 →</Btn>
        </div>
      </>}

      {/* 구간 탭 */}
      {!showSummary && <>
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {segs.map((seg, i) => (
            <button key={i}
              className={"shrink-0 border rounded-xl px-3 py-2 text-xs font-medium transition-colors "+(cur===i?"bg-blue-500 text-white border-blue-500":isValid(ts[i])?"bg-green-50 text-green-700 border-green-300":"border-gray-200 text-gray-500 hover:bg-gray-50")}
              onClick={() => setCur(i)}
            >
              <div>{isValid(ts[i]) ? "✅ " : ""}구간 {i+1}</div>
              <div className="opacity-75 mt-0.5">{seg.from.replace(PREV.origin||PREV.dept||"출발지", (PREV.origin||PREV.dept||"출발지").slice(0,4))} →<br/>{seg.to.replace("대구센터(복귀)","대구복귀")}</div>
            </button>
          ))}
        </div>

        {/* 구간 헤더 */}
        <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 border border-blue-100 rounded-xl">
          <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded font-medium">구간 {cur+1}</span>
          <span className="text-blue-800 text-sm font-medium">{segs[cur].from} → {segs[cur].to}</span>
        </div>

        {/* ── 교통수단 선택 ── */}
        <div className={card}>
          <div className={ct}>교통수단 선택</div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: "ktx",  label: "철도(KTX 등)" },
              { key: "bus",  label: "버스" },
              { key: "air",  label: "항공" },
              { key: "ship", label: "선박" },
              { key: "gov",  label: "업무용차량\n(관용차)" },
              { key: "car",  label: "자가용" },
            ].map(tp => (
              <button key={tp.key}
                className={"border rounded-lg py-2.5 px-2 text-xs font-medium whitespace-pre-line cursor-pointer "+(t.type===tp.key?"bg-blue-500 text-white border-blue-500":"border-gray-300 text-gray-600 hover:bg-gray-50")}
                onClick={() => updT(cur, { ...emptyT(), type: tp.key })}
              >{tp.label}</button>
            ))}
          </div>
        </div>

        {/* ══ 대중교통 (철도·버스·항공·선박) ══ */}
        {["ktx","bus","air","ship"].includes(t.type) && (
          <div className={card}>
            <div className={ct}>운임 입력</div>

            {/* 직급별 좌석 기준 안내 */}
            <div className={ibox + " mb-4"}>
              <div className="font-medium mb-1">적용 좌석 기준 ({eg})</div>
              {t.type === "ktx"  && <div>{(eg==="임원"||eg==="본부장") ? "실제비용 (등급 제한 없음)" : "KTX 일반실"}</div>}
              {t.type === "bus"  && <div>실제비용</div>}
              {t.type === "air"  && <div>{(eg==="임원"||eg==="본부장") ? "실제비용 (등급 제한 없음)" : "이코노미"}</div>}
              {t.type === "ship" && <div>{eg==="팀원" ? "1등보통 침대부" : "1등특별 침대부"}</div>}
              {PREV.hasComp && PREV.grade !== eg && (
                <div className="text-xs mt-1 opacity-80">동도출장 적용 — {PREV.grade} → {eg} 기준 상향</div>
              )}
            </div>

            <div className={lbl0}>운임 금액 (원)</div>
            <input className={inp} type="number" value={t.fare}
              placeholder="실제 운임 입력"
              onChange={e => updT(cur, { fare: e.target.value })} />

            <div className={lbl}>결제 수단</div>
            <CardSelect value={t.cardType} onChange={v => updT(cur, { cardType: v })} />

            {t.cardType === "corp" && t.fare && (
              <div className="mt-2 text-sm text-gray-500">법인카드 집행 — 개인지급 0원</div>
            )}
            {t.cardType === "personal" && <>
              <div className={lbl}>개인카드 사용 소명 사유 <span className="text-red-500">*필수</span></div>
              <input className={inp} type="text" value={t.personalReason}
                placeholder="예: 법인카드 한도 초과, 긴급 결제"
                onChange={e => updT(cur, { personalReason: e.target.value })} />
              {t.fare && t.personalReason && (
                <div className="mt-2 text-sm font-medium text-blue-600">개인지급: {fmtW(parseInt(t.fare))}</div>
              )}
            </>}

            {/* 탑승권 첨부 안내 */}
            {t.fare && t.cardType && (
              <div className={wbox + " mt-3"}>
                탑승권·좌석표가 있으면 첨부하세요. (선택, 출장 사실 추가 증빙)
              </div>
            )}
          </div>
        )}

        {/* ══ 업무용차량(관용차) ══ */}
        {t.type === "gov" && (
          <div className={card}>
            <div className={ct}>업무용차량(관용차) 처리</div>
            <div className={obox}>
              <div className="font-medium mb-1">자동 적용 사항</div>
              <div>✅ 운임: 0원 (여비규칙 제13조)</div>
              <div>✅ 일비: 1/2 감액 (제14조, 업무용차량)</div>
              <div className="mt-1 text-xs opacity-80">통행료: 하이패스 법인카드 자동결제 — 별도 정산 불필요</div>
            </div>

            {/* 동승자 */}
            {PREV.hasComp && companions.length > 0 && <>
              <div className={lbl}>동승자 선택</div>
              <div className="text-xs text-gray-400 mb-2">동승자도 운임 0원, 일비 1/2 감액 동일 적용</div>
              {companions.map((c, ci) => (
                <label key={ci} className="flex items-center gap-2 py-2 cursor-pointer border-b border-gray-50">
                  <input type="checkbox"
                    checked={t.govPassengers.includes(ci)}
                    onChange={() => updT(cur, { govPassengers: toggle(t.govPassengers, ci) })}
                    className="w-4 h-4 accent-blue-500" />
                  <span className="text-sm">{c.name} ({c.grade})</span>
                  <span className="text-xs text-gray-400 ml-auto">운임 0원, 일비 1/2</span>
                </label>
              ))}
            </>}

            {/* 주차료 */}
            <TollParkUI label="주차료" hasKey="hasParking" amtKey="parking"
              cardKey="parkingCard" reasonKey="parkingReason" si={cur} t={t} updT={updT} />
          </div>
        )}

        {/* ══ 자가용 ══ */}
        {t.type === "car" && (
          <div className={card}>
            <div className={ct}>자가용 정산 방식</div>

            {/* 일비 감액 안내 */}
            <div className={wbox + " mb-4"}>
            </div>

            {/* 정산 방식 선택 */}
            <div className={lbl0}>정산 방식</div>
            <div className="flex gap-2 mt-1">
              <TBtn sel={t.carMode === "public"} onClick={() => updT(cur, { carMode: "public" })}>
                대중교통준용 요금
              </TBtn>
              <TBtn sel={t.carMode === "fuel"} onClick={() => updT(cur, { carMode: "fuel" })}>
                연료비 정산
              </TBtn>
            </div>

            {/* 동승자 */}
            {PREV.hasComp && companions.length > 0 && <>
              <div className={lbl}>동승자 선택</div>
              <div className="text-xs text-gray-400 mb-2">동승자: 운임 0원</div>
              {companions.map((c, ci) => (
                <label key={ci} className="flex items-center gap-2 py-2 cursor-pointer border-b border-gray-50">
                  <input type="checkbox"
                    checked={(t.carPassengers&&t.carPassengers.includes)(ci)}
                    onChange={() => updT(cur, { carPassengers: toggle(t.carPassengers || [], ci) })}
                    className="w-4 h-4 accent-blue-500" />
                  <span className="text-sm">{c.name} ({c.grade})</span>
                  <span className="text-xs text-gray-400 ml-auto">운임 0원, 일비 1/2</span>
                </label>
              ))}
            </>}

            {/* ── 대중교통준용 ── */}
            {t.carMode === "public" && <>
              <div className="border-t border-gray-100 mt-4 pt-4">
                <div className="font-medium text-sm text-gray-700 mb-3">대중교통준용 요금 입력</div>
                <div className={ibox + " mb-3"}>
                  해당 구간 대중교통 요금 확인:<br />
                  <div className="flex gap-3 mt-1.5 flex-wrap">
                    <Link href="https://www.korail.com">코레일</Link>
                    <Link href="https://www.kobus.co.kr">고속버스</Link>
                    <Link href="https://www.bustago.or.kr">시외버스</Link>
                    <Link href="https://map.kakao.com">카카오맵</Link>
                  </div>
                </div>
                <div className={lbl0}>요금 (원)</div>
                <input className={inp} type="number" value={t.pubFare}
                  placeholder="확인한 대중교통 요금 입력"
                  onChange={e => updT(cur, { pubFare: e.target.value })} />
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input type="checkbox" checked={t.pubFareImg}
                    onChange={e => updT(cur, { pubFareImg: e.target.checked })}
                    className="w-4 h-4 accent-blue-500" />
                  <span className="text-sm text-gray-600">요금 확인 화면 캡처 첨부 완료</span>
                </label>
                {t.pubFare && (
                  <div className="mt-3 text-sm font-medium text-blue-600">
                    개인지급: {fmtW(parseInt(t.pubFare))}
                  </div>
                )}
                <div className={wbox + " mt-3 text-xs"}>
                  대중교통준용 정산 시 통행료·주차료는 별도 지급되지 않습니다. (별표1 비고6)
                </div>
              </div>
            </>}

            {/* ── 연료비 정산 ── */}
            {t.carMode === "fuel" && <>
              <div className="border-t border-gray-100 mt-4 pt-4">

                {/* 사전 확인 단계 */}
                {!t.preChecked && <>
                  <div className="font-medium text-sm text-gray-700 mb-3">입력 전 아래 정보를 먼저 확인하세요</div>

                  <div className="space-y-3">
                    {/* 거리 확인 */}
                    <div className="border border-gray-200 rounded-xl p-4">
                      <div className="font-medium text-sm mb-2">① 여행거리 확인</div>
                      <div className="text-xs text-gray-600 mb-2">
                        구간: <strong>{segs[cur].from} → {segs[cur].to}</strong>
                      </div>
                      <div className="flex gap-3 flex-wrap">
                        <Link href="https://map.kakao.com">카카오맵 길찾기 →</Link>
                        <Link href="https://map.naver.com">네이버맵 길찾기 →</Link>
                      </div>
                      <div className="text-xs text-gray-400 mt-2">
                        자동차 경로 선택 → 거리(km) 확인 → 화면 캡처 보관
                      </div>
                    </div>

                    {/* 유가 확인 */}
                    <div className="border border-gray-200 rounded-xl p-4">
                      <div className="font-medium text-sm mb-2">② 출장 시작일 유가 확인</div>
                      <div className="text-xs text-gray-600 mb-2">
                        기준일: <strong>{(PREV.startDate?PREV.startDate.replace(/-/g,"."):"(미입력)")}</strong>
                        <span className="text-gray-400 ml-2">(오피넷은 전일 기준 갱신 → 출장 후 소급 조회 가능)</span>
                      </div>
                      <Link href="https://www.opinet.co.kr">오피넷 바로가기 →</Link>
                      <div className="text-xs text-gray-400 mt-2">
                        국내유가통계 → 주유소 → 평균판매가격 → 제품별 → 일간<br />
                        기간: {(PREV.startDate?PREV.startDate.replace(/-/g,"."):"(미입력)")} ~ {(PREV.startDate?PREV.startDate.replace(/-/g,"."):"(미입력)")}
                      </div>
                      <div className={ibox + " mt-2 text-xs"}>
                        전기차: <Link href="https://www.ev.or.kr">ev.or.kr</Link>&nbsp;&nbsp;
                        수소차: <Link href="https://h2.keia.or.kr">h2.keia.or.kr</Link>
                      </div>
                    </div>
                  </div>

                  <button
                    className="mt-4 w-full border-2 border-blue-400 rounded-xl py-3 text-sm font-medium text-blue-600 hover:bg-blue-50 cursor-pointer"
                    onClick={() => updT(cur, { preChecked: true })}>
                    확인 완료 — 입력하기 →
                  </button>
                </>}

                {/* 입력 단계 */}
                {t.preChecked && <>
                  {/* 부득이한 사유 */}
                  <div className="font-medium text-sm text-gray-700 mb-2">부득이한 사유 (별표1 비고6)</div>
                  <div className="space-y-1 mb-4">
                    {CAR_REASONS.map((r, ri) => (
                      <label key={ri} className="flex items-start gap-2 py-1.5 cursor-pointer">
                        <input type="checkbox"
                          checked={!!(t.carReasons&&t.carReasons.includes(ri))}
                          onChange={() => updT(cur, { carReasons: toggle(t.carReasons || [], ri) })}
                          className="w-4 h-4 mt-0.5 accent-blue-500" />
                        <span className="text-sm text-gray-700">{r}</span>
                      </label>
                    ))}
                  </div>
                  {(!t.carReasons || t.carReasons.length === 0) && (
                    <div className={ebox + " mb-3"}>부득이한 사유를 하나 이상 선택해야 합니다.</div>
                  )}

                  {/* 유종 선택 */}
                  <div className={lbl0}>유종</div>
                  <div className="grid grid-cols-4 gap-2 mt-1">
                    {FUEL_TYPES.map(f => (
                      <TBtn key={f.key} small sel={t.fuelType === f.key}
                        onClick={() => updT(cur, { fuelType: f.key })}>
                        {f.label}
                      </TBtn>
                    ))}
                  </div>
                  {ft && (
                    <div className="text-xs text-blue-600 mt-1">
                      적용 연비: {ft.rate} {ft.unit}
                      {ft.opinet && <span className="text-gray-400 ml-2">오피넷 조회: {ft.opinet}</span>}
                    </div>
                  )}

                  {/* 여행거리 */}
                  <div className={lbl}>여행거리 (km) <span className="text-xs text-gray-400 font-normal">— 지도 캡처 필수</span></div>
                  <input className={inp} type="number" value={t.distance}
                    placeholder="예: 325"
                    onChange={e => updT(cur, { distance: e.target.value })} />
                  <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
                    <input type="checkbox" checked={t.distanceImg}
                      onChange={e => updT(cur, { distanceImg: e.target.checked })}
                      className="w-4 h-4 accent-blue-500" />
                    <span className="text-sm text-gray-600">지도 캡처 첨부 완료 ✓</span>
                  </label>

                  {/* 유가 */}
                  <div className={lbl}>유가 (원/{(ft?ft.unit:"L") || "L"}) <span className="text-xs text-gray-400 font-normal">— 오피넷 캡처 필수</span></div>
                  <input className={inp} type="number" value={t.fuelPrice}
                    placeholder={"출장 시작일 "+(PREV.startDate?PREV.startDate.replace(/-/g,"."):"")+" 기준"}
                    onChange={e => updT(cur, { fuelPrice: e.target.value })} />
                  <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
                    <input type="checkbox" checked={t.fuelPriceImg}
                      onChange={e => updT(cur, { fuelPriceImg: e.target.checked })}
                      className="w-4 h-4 accent-blue-500" />
                    <span className="text-sm text-gray-600">오피넷 캡처 첨부 완료 ✓</span>
                  </label>

                  {/* 연료비 자동 계산 */}
                  {t.fuelType && t.distance && t.fuelPrice && (
                    <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <div className="text-xs text-blue-600 mb-1">연료비 자동 계산</div>
                      <div className="text-xs text-gray-500">
                        {t.distance}km × {parseInt(t.fuelPrice).toLocaleString()}원 ÷ {(ft?ft.rate:1)} = 
                      </div>
                      <div className="text-xl font-medium text-blue-600 mt-1">{fmtW(calcFuel(t))}</div>
                    </div>
                  )}

                  {/* 통행료 */}
                  <TollParkUI label="통행료" hasKey="hasToll" amtKey="toll"
                    cardKey="tollCard" reasonKey="tollReason" si={cur} t={t} updT={updT} />

                  {/* 주차료 */}
                  <TollParkUI label="주차료" hasKey="hasParking" amtKey="parking"
                    cardKey="parkingCard" reasonKey="parkingReason" si={cur} t={t} updT={updT} />

                  {/* 이전 단계로 */}
                  <button className="mt-4 text-xs text-gray-400 underline cursor-pointer"
                    onClick={() => updT(cur, { preChecked: false })}>
                    ← 사전 확인 화면으로 돌아가기
                  </button>
                </>}
              </div>
            </>}
          </div>
        )}

        {/* 유효성 표시 */}
        {isValid(t) && (
          <div className={obox + " mb-4"}>✅ 구간 {cur+1} 입력 완료</div>
        )}

        {/* 구간 이동 */}
        <div className="flex justify-between mt-2">
          <Btn onClick={() => setCur(Math.max(0, cur - 1))} disabled={cur === 0}>← 이전 구간</Btn>
          {cur < segs.length - 1
            ? <Btn primary disabled={!isValid(t)} onClick={() => setCur(cur + 1)}>다음 구간 →</Btn>
            : <Btn primary disabled={!allDone} onClick={() => setShowSummary(true)}>요약 확인 →</Btn>
          }
        </div>
      </>}
    </div>
  );
}
