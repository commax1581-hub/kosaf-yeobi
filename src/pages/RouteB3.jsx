// B경로 3단계 v3 — 20260412_0429 (백틱제거완료)
import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

/* ── 상수 ── */
const LIMIT = {
  "서울특별시": 100000, "인천광역시": 80000, "대전광역시": 80000,
  "대구광역시": 80000,  "부산광역시": 80000, "광주광역시": 80000, "울산광역시": 80000,
};
const getLimit = r => LIMIT[r] || 70000;
const fmtW = n => Math.round(n || 0).toLocaleString("ko-KR") + "원";
const MoneyHint = ({v}) => {
  const n = parseInt(v) || 0;
  if (!v || n <= 0) return null;
  return <div className="text-xs text-blue-600 font-semibold mt-1">= {n.toLocaleString("ko-KR")}원</div>;
};

const ACCOM_TYPES = [
  { key: "hotel",    label: "일반 숙박" },
  { key: "relative", label: "친지집 숙박" },
  { key: "provided", label: "기관·회사 제공" },
  { key: "none",     label: "미숙박" },
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
/* ── 샘플 이전 데이터 ── */
/* ── 출장자 목록 ── */
function buildTravelers(prev) {
  const list = [{ name: prev.grade + " (본인)", isSelf: true }];
  if (prev.hasComp) prev.companions.forEach(c =>
    list.push({ name: c.name + " (" + c.grade + ")", isSelf: false })
  );
  return list;
}

/* ── 빈 박 데이터 ── */
const emptyNight = () => ({
  type: "",            // "hotel"|"relative"|"provided"|"none"
  amount: "",          // 일반숙박 금액
  cardType: "",        // "corp"|"personal"|"cash"
  personalReason: "",
  provider: "",        // 기관·회사 제공 시 기관명
});

/* ── 초기 상태 ── */
function initState(prev) {
  const travelers = buildTravelers(prev);
  const overnightRoutes = prev.routes.filter(r => r.nights > 0);
  /* accoms[routeIdx][travelerIdx][nightIdx] */
  const accoms = overnightRoutes.map(route =>
    travelers.map(() => Array.from({ length: route.nights }, emptyNight))
  );
  return { travelers, overnightRoutes, accoms, curRoute: 0 };
}

/* ── 박 유효성 ── */
function isNightValid(n) {
  if (!n.type) return false;
  if (n.type === "relative" || n.type === "none") return true;
  if (n.type === "provided") return n.provider.trim().length > 0;
  if (n.type === "hotel") {
    if (!n.amount || !n.cardType) return false;
    if ((n.cardType === "personal" || n.cardType === "cash") && !n.personalReason.trim()) return false;
    return true;
  }
  return false;
}

/* ── 목적지 유효성 ── */
function isRouteValid(accomRoute) {
  return accomRoute.every(tRow => tRow.every(isNightValid));
}

/* ── 박 계산 ── */
function calcNight(n, region) {
  if (!n.type || n.type === "none") return { corp: 0, personal: 0, note: "미숙박" };
  if (n.type === "provided") return { corp: 0, personal: 0, note: "기관·회사 제공 ("+(n.provider||"")+")" };
  if (n.type === "relative") return { corp: 0, personal: 20000, note: "친지집 숙박 — 20,000원 (별표1 비고9)" };
  if (n.type === "hotel") {
    const amt = parseInt(n.amount) || 0;
    const limit = getLimit(region);
    const over = amt > limit;
    const cardLabel = n.cardType === "corp" ? "법인카드" : n.cardType === "personal" ? "개인카드" : "현금";
    if (n.cardType === "corp") return { corp: amt, personal: 0, over, note: "법인카드"+(over?" ⚠️ 상한 초과":"") };
    return { corp: 0, personal: amt, over, note: cardLabel+(over?" ⚠️ 상한 초과":"") };
  }
  return { corp: 0, personal: 0, note: "" };
}

/* ── 날짜 계산 ── */
function getNightDate(startDate, routeIdx, nightIdx, overnightRoutes) {
  const base = new Date(startDate);
  const prevNights = overnightRoutes.slice(0, routeIdx).reduce((s, r) => s + r.nights, 0);
  const d = new Date(base);
  d.setDate(d.getDate() + prevNights + nightIdx);
  return d.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric", weekday: "short" });
}

/* ══ NightRow — App 밖 정의 (재렌더링 시 재생성 없음 → 타이핑 안전) ══ */
const NightRow = ({ n, nightNum, nightDate, limit, onUpdate }) => {
  const amt = parseInt(n.amount) || 0;
  const isOver = n.type === "hotel" && n.amount && amt > limit;

  return (
    <div className={"border rounded-xl p-4 mb-3 "+(isNightValid(n)?"border-green-200 bg-green-50/30":"border-gray-200")}>
      {/* 박차 헤더 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full font-medium shrink-0">
          {nightNum}박차
        </span>
        <span className="text-xs text-gray-400">{nightDate}</span>
        {isNightValid(n) && (
          <span className="ml-auto text-xs font-medium text-green-600">✅</span>
        )}
      </div>

      {/* 숙박 형태 선택 */}
      <div className={lbl0}>숙박 형태</div>
      <div className="flex gap-2 flex-wrap mt-1">
        {ACCOM_TYPES.map(at => (
          <TBtn key={at.key} small sel={n.type === at.key}
            onClick={() => onUpdate({
              type: at.key, amount: "", cardType: "",
              personalReason: "", provider: "",
            })}>
            {at.label}
          </TBtn>
        ))}
      </div>

      {/* ── 일반 숙박 ── */}
      {n.type === "hotel" && <>

        {/* 과오지급 방지 안내 — 항상 표시 */}
        <div className="mt-3 border border-amber-200 bg-amber-50 rounded-xl p-4 text-xs text-amber-800 leading-relaxed">
          <div className="font-medium mb-2">⚠️ 금액 입력 전 확인하세요 — 과오지급 방지</div>
          <div className="space-y-2">
            <div>
              <span className="font-medium">이 칸에는 이 박(1박)의 본인 몫 금액만 입력합니다.</span>
            </div>
            <div className="border-t border-amber-200 pt-2">
              <div className="font-medium mb-1">법인카드로 여러 박을 한꺼번에 결제한 경우</div>
              <div className="text-amber-700">
                예: 2박 총 180,000원 결제<br />
                → 1박차: 90,000원 입력<br />
                → 2박차: 90,000원 입력
              </div>
            </div>
            <div className="border-t border-amber-200 pt-2">
              <div className="font-medium mb-1">법인카드로 다른 출장자 몫까지 한꺼번에 결제한 경우</div>
              <div className="text-amber-700">
                예: 2인 숙박비 160,000원을 본인 법인카드로 결제<br />
                → 본인 몫: 80,000원 입력<br />
                → 상대방은 본인 정산에서 별도 입력<br />
                <span className="text-amber-600">※ 법인카드 전표 1장이 내부 감사에서 확인되므로<br />
                   각자 본인 몫을 정확히 입력해야 중복 지급이 방지됩니다.</span>
              </div>
            </div>
          </div>
        </div>

        <div className={lbl}>숙박비 금액 (원)
          <span className="text-xs text-gray-400 font-normal ml-1">— 1박 상한 {fmtW(limit)}</span>
        </div>
        <input className={inp} type="text" inputMode="numeric" pattern="[0-9]*"
          value={n.amount} placeholder={"이 박(1박) 본인 몫 금액 입력 / 상한 "+fmtW(limit)}
          onChange={e => onUpdate({ amount: e.target.value.replace(/[^0-9]/g, "") })} />
        <MoneyHint v={n.amount} />

        {/* 상한 체크 */}
        {n.amount && (
          <div className={"mt-2 text-xs rounded-lg px-3 py-2 "+(isOver?"bg-red-50 text-red-700 border border-red-200":"bg-green-50 text-green-700 border border-green-200")}>
            {isOver
              ? ("⚠️ 상한 초과: "+fmtW(amt)+" > 1박 상한 "+fmtW(limit))
              : ("✅ 상한 이내: "+fmtW(amt)+" / 1박 상한 "+fmtW(limit))}
          </div>
        )}

        {/* 결제 수단 */}
        <div className={lbl}>결제 수단</div>
        <div className="flex gap-2 mt-1 flex-wrap">
          <TBtn small sel={n.cardType === "corp"}
            onClick={() => onUpdate({ cardType: "corp", personalReason: "" })}>법인카드</TBtn>
          <TBtn small sel={n.cardType === "personal"}
            onClick={() => onUpdate({ cardType: "personal" })}>개인카드</TBtn>
          <TBtn small sel={n.cardType === "cash"}
            onClick={() => onUpdate({ cardType: "cash" })}>현금</TBtn>
        </div>

        {(n.cardType === "personal" || n.cardType === "cash") && <>
          <div className={lbl}>소명 사유 <span className="text-red-500">*필수</span></div>
          <input className={inp} type="text" value={n.personalReason}
            placeholder="예: 법인카드 한도 초과, 현금만 받는 숙소"
            onChange={e => onUpdate({ personalReason: e.target.value })} />
        </>}

        {/* 결과 */}
        {n.amount && n.cardType && (
          <div className={"mt-3 rounded-lg px-3 py-2 text-sm "+(n.cardType==="corp"?"bg-gray-50 border border-gray-200 text-gray-600":"bg-blue-50 border border-blue-200 text-blue-700 font-medium")}>
            {n.cardType === "corp"
              ? <>
                  법인카드 집행 — 개인지급 0원
                  {isOver && <span className="text-red-500 ml-2">⚠️ 상한 초과 확인 필요</span>}
                </>
              : "개인지급: "+fmtW(amt)
            }
          </div>
        )}
      </>}

      {/* ── 친지집 ── */}
      {n.type === "relative" && (
        <div className={obox + " mt-3"}>
          고정 지급: <span className="font-medium">20,000원</span><br />
          <span className="text-xs opacity-80">개인지급 / 여비규칙 별표1 비고9</span>
        </div>
      )}

      {/* ── 기관·회사 제공 ── */}
      {n.type === "provided" && <>
        <div className={lbl}>제공 기관명 또는 행사명 <span className="text-red-500">*필수</span></div>
        <input className={inp} type="text" value={n.provider}
          placeholder="예: OO연수원, OO워크숍 행사"
          onChange={e => onUpdate({ provider: e.target.value })} />
        <div className={ibox + " mt-3"}>
          숙박비 0원 — 기관·회사 제공<br />
          <span className="text-xs opacity-80">
            보고서에 제공 기관명이 명시되어 감사 시 소명 근거로 활용됩니다.
          </span>
        </div>
      </>}

      {/* ── 미숙박 ── */}
      {n.type === "none" && (
        <div className="mt-3 text-sm text-gray-400">미숙박 — 숙박비 0원</div>
      )}
    </div>
  );
};

/* ══════════════ 메인 ══════════════ */
export default function RouteB3() {
  const navigate = useNavigate();
  /* ── 1·2단계 데이터 불러오기 (컴포넌트 내부) ── */
  const _raw1 = (() => { try { return JSON.parse(localStorage.getItem("b_step1")||"null"); } catch { return null; } })();
  const _raw2 = (() => { try { return JSON.parse(localStorage.getItem("b_step2")||"null"); } catch { return null; } })();
  const _isFromStorage = !!_raw1;
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

  const [st, setSt] = useState(() => initState(PREV));
  const [showSummary, setShowSummary] = useState(false);

  const { travelers, overnightRoutes, accoms, curRoute } = st;

  /* 박 업데이트 — App 밖 NightRow와 조합해 타이핑 안전 */
  const updNight = useCallback((ri, ti, ni, patch) => {
    setSt(prev => ({
      ...prev,
      accoms: prev.accoms.map((route, r) =>
        r === ri ? route.map((tRow, t) =>
          t === ti ? tRow.map((n, nIdx) =>
            nIdx === ni ? { ...n, ...patch } : n
          ) : tRow
        ) : route
      ),
    }));
  }, []);

  /* ── 브라우저 닫기 경고 ── */
  useEffect(() => {
    const fn = e => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', fn);
    return () => window.removeEventListener('beforeunload', fn);
  }, []);


  const setCurRoute = r => setSt(prev => ({ ...prev, curRoute: r }));

  const allDone = accoms.every(row => isRouteValid(row));

  /* ── 요약 계산 ── */
  function buildSummary() {
    return overnightRoutes.map((route, ri) => ({
      route,
      limit: getLimit(route.region),
      travelers: travelers.map((tr, ti) => ({
        ...tr,
        nights: accoms[ri][ti].map((n, ni) => ({
          n, calc: calcNight(n, route.region), nightNum: ni + 1,
        })),
      })),
    }));
  }

  const summary = buildSummary();
  const totalCorp     = summary.reduce((s, rs) => s + rs.travelers.reduce((s2, tr) =>
    s2 + tr.nights.reduce((s3, { calc }) => s3 + (calc.corp || 0), 0), 0), 0);
  const totalPersonal = summary.reduce((s, rs) => s + rs.travelers.reduce((s2, tr) =>
    s2 + tr.nights.reduce((s3, { calc }) => s3 + (calc.personal || 0), 0), 0), 0);
  const hasOver = summary.some(rs => rs.travelers.some(tr => tr.nights.some(({ calc }) => calc.over)));

  /* 숙박 없는 경우 */
  if (overnightRoutes.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-4 pb-12" style={{background:"#f0f4ff",minHeight:"100vh"}}>
      {/* 뒤로가기 */}
      <button onClick={()=>navigate('/')} className="flex items-center gap-1.5 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 mb-4 cursor-pointer hover:bg-blue-100 transition-all shadow-sm">
        ← 경로 선택 화면으로 (A · B · C)
      </button>
      {/* ── 상단 헤더 배너 ── */}
      <div className="rounded-2xl mb-5 overflow-hidden shadow-sm">
        <div style={{background:"linear-gradient(135deg,#1a5c38 0%,#27ae60 100%)"}} className="px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-green-200 uppercase tracking-widest mb-1">KOSAF 여비를 부탁해....</div>
              <div className="text-white font-bold text-lg">스마트 여비정산 시스템</div>
            </div>
            <div className="text-right">
              <div className="bg-white/20 rounded-xl px-3 py-1.5 text-xs font-bold text-white">🅱 국내 일반 출장 — 3/5</div>
            </div>
          </div>
        </div>
      </div>
      {_isFromStorage
        ? <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-xs text-green-700 mb-3">✅ 1단계 데이터 불러옴 — {PREV.grade} / {PREV.startDate} ~ {PREV.endDate}</div>
        : <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-xs text-amber-700 mb-3">⚠️ 샘플 데이터 사용 중 — 1단계를 먼저 완료하고 저장하세요</div>
      }
        <div className="flex items-center gap-2 mb-5">
          <span className="bg-blue-500 text-white text-xs px-2.5 py-1 rounded-full font-medium">3단계</span>
          <span className="text-lg font-medium">숙박비</span>
        </div>
        <div className={obox}>당일 출장 — 숙박비 미발생</div>
        <div className="flex justify-end mt-4">
          <Btn primary onClick={() => {
              try {
            } catch(e) { alert("저장 오류: " + e.message); return; }
            navigate('/b/4');
            }}>4단계로 →</Btn>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pb-12" style={{background:"#f0f4ff",minHeight:"100vh"}}>
      {/* 뒤로가기 */}
      <button onClick={()=>navigate('/')} className="flex items-center gap-1.5 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 mb-4 cursor-pointer hover:bg-blue-100 transition-all shadow-sm">
        ← 경로 선택 화면으로 (A · B · C)
      </button>
      {/* ── 상단 헤더 배너 ── */}
      <div className="rounded-2xl mb-5 overflow-hidden shadow-sm">
        <div style={{background:"linear-gradient(135deg,#1a5c38 0%,#27ae60 100%)"}} className="px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-green-200 uppercase tracking-widest mb-1">KOSAF 여비를 부탁해....</div>
              <div className="text-white font-bold text-lg">스마트 여비정산 시스템</div>
            </div>
            <div className="text-right">
              <div className="bg-white/20 rounded-xl px-3 py-1.5 text-xs font-bold text-white">🅱 국내 일반 출장 — 3/5</div>
            </div>
          </div>
        </div>
      </div>
      {_isFromStorage
        ? <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-xs text-green-700 mb-3">✅ 1단계 데이터 불러옴 — {PREV.grade} / {PREV.startDate} ~ {PREV.endDate}</div>
        : <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-xs text-amber-700 mb-3">⚠️ 샘플 데이터 사용 중 — 1단계를 먼저 완료하고 저장하세요</div>
      }

      {/* 헤더 */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="bg-blue-500 text-white text-xs px-2.5 py-1 rounded-full font-medium">3단계</span>
          <span className="text-lg font-medium">숙박비 입력</span>
        </div>
        {allDone && (
          <Btn small primary onClick={() => setShowSummary(!showSummary)}>
            {showSummary ? "입력으로" : "요약 보기"}
          </Btn>
        )}
      </div>

      {/* 출장 정보 */}
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 mb-4 text-xs text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
        <span>총 숙박: <strong>{PREV.routes.reduce((s, r) => s + r.nights, 0)}박</strong></span>
        <span>출장자: <strong>{travelers.length}명</strong></span>
        <span>{overnightRoutes.map(r => ""+(r.region)+" "+(r.nights)+"박").join(" · ")}</span>
      </div>

      {/* ── 요약 화면 ── */}
      {showSummary && <>
        <div className={card}>
          <div className={ct}>숙박비 요약</div>

          {summary.map((s, ri) => (
            <div key={ri} className="mb-5 pb-5 border-b border-gray-100 last:border-0">
              <div className="flex justify-between items-center mb-3">
                <div className="text-sm font-medium">{s.route.region} {s.route.place}</div>
                <div className="text-xs text-gray-400">{s.route.nights}박 · 상한 {fmtW(s.limit)}/박</div>
              </div>

              {s.travelers.map((tr, ti) => (
                <div key={ti} className="mb-3">
                  <div className="text-xs font-medium text-gray-500 mb-1">{tr.name}</div>
                  {tr.nights.map(({ n, calc, nightNum }, ni) => (
                    <div key={ni} className="flex justify-between items-center py-1.5 px-3 bg-gray-50 rounded-lg mb-1 text-sm">
                      <span className="text-gray-500 text-xs">{nightNum}박차</span>
                      <span className="text-xs text-gray-500">{
                        n.type === "hotel" ? "일반숙박"
                        : n.type === "relative" ? "친지집"
                        : n.type === "provided" ? "기관제공("+(n.provider)+")"
                        : "미숙박"
                      }</span>
                      <div className="text-right">
                        {calc.corp > 0 && <span className="text-gray-400 text-xs mr-2">법카 {fmtW(calc.corp)}</span>}
                        {calc.personal > 0 && <span className="text-blue-600 font-medium">{fmtW(calc.personal)}</span>}
                        {calc.corp === 0 && calc.personal === 0 && <span className="text-gray-400 text-xs">0원</span>}
                        {calc.over && <span className="text-red-500 text-xs ml-1">⚠️ 초과</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}

          {/* 합계 */}
          <div className="border-t border-gray-100 pt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">법인카드 집행 합계</span>
              <span className="font-medium">{fmtW(totalCorp)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">개인지급 합계</span>
              <span className="font-medium text-blue-600">{fmtW(totalPersonal)}</span>
            </div>
          </div>
        </div>

        {/* 공동숙박 안내 */}
        {travelers.length > 1 && (
          <div className={ibox + " mb-4"}>
            공동숙박 시 법인카드 대표결제 — 카드사 전표에 결제자 자동 기록<br />
            <span className="text-xs opacity-80">재단 내부 법인카드 감사에서 별도 확인됩니다.</span>
          </div>
        )}

        {/* 상한 초과 경고 */}
        {hasOver && (
          <div className={ebox + " mb-4"}>
            ⚠️ 숙박비 상한 초과 항목이 있습니다.<br />
            <span className="text-xs">제11조 제2항: 상한액의 30% 이내에서 추가 지급 가능
            (법인카드 매출전표 첨부 필수)</span>
          </div>
        )}

        <div className={obox + " mb-4"}>
          숙박비 입력 완료.<br />
          <span className="text-xs opacity-80">다음 단계: 일비·식비 입력</span>
        </div>

        <div className="flex justify-between">
          <Btn onClick={() => setShowSummary(false)}>← 수정</Btn>
          <Btn primary onClick={() => {
              try {
                localStorage.setItem("b_step3", JSON.stringify({ accom: st }));
              } catch(e) { alert("저장 오류: " + e.message); return; }
            navigate('/b/4');
            }}>4단계로 →</Btn>
        </div>
      </>}

      {/* ── 입력 화면 ── */}
      {!showSummary && <>

        {/* 목적지 탭 */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {overnightRoutes.map((route, ri) => (
            <button key={ri}
              className={"shrink-0 border rounded-xl px-3 py-2 text-xs font-medium transition-colors "+(curRoute===ri?"bg-blue-500 text-white border-blue-500":isRouteValid(accoms[ri])?"bg-green-50 text-green-700 border-green-300":"border-gray-200 text-gray-500 hover:bg-gray-50")}
              onClick={() => setCurRoute(ri)}
            >
              <div>{isRouteValid(accoms[ri]) ? "✅ " : ""}
                {route.region.replace("특별시","").replace("광역시","").replace("특별자치시","")}
              </div>
              <div className="opacity-75 mt-0.5">{route.nights}박</div>
            </button>
          ))}
        </div>

        {/* 현재 목적지 */}
        {overnightRoutes.map((route, ri) => {
          if (curRoute !== ri) return null;
          const limit = getLimit(route.region);

          return (
            <div key={ri}>
              {/* 목적지 헤더 */}
              <div className="flex items-center justify-between mb-4 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                <div>
                  <span className="text-blue-800 text-sm font-medium">{route.region} {route.place}</span>
                  <span className="text-blue-600 text-xs ml-2">{route.nights}박</span>
                </div>
                <div className="text-xs text-blue-600">
                  1박 상한 <span className="font-medium">{fmtW(limit)}</span>
                </div>
              </div>

              {/* 출장자별 박별 입력 */}
              {travelers.map((tr, ti) => (
                <div key={ti} className={card}>
                  {/* 출장자 헤더 */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm font-medium text-gray-800">{tr.name}</span>
                    {tr.isSelf && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">본인</span>
                    )}
                    {/* 완료 상태 */}
                    <span className="ml-auto text-xs text-gray-400">
                      {accoms[ri][ti].filter(isNightValid).length} / {route.nights}박 완료
                    </span>
                  </div>

                  {/* 박별 입력 — NightRow는 App 밖에 정의 */}
                  {accoms[ri][ti].map((n, ni) => (
                    <NightRow
                      key={ni}
                      n={n}
                      nightNum={ni + 1}
                      nightDate={getNightDate(PREV.startDate, ri, ni, overnightRoutes)}
                      limit={limit}
                      onUpdate={patch => updNight(ri, ti, ni, patch)}
                    />
                  ))}

                  {/* 출장자 소계 */}
                  {accoms[ri][ti].every(isNightValid) && (() => {
                    const corp = accoms[ri][ti].reduce((s, n) => s + (calcNight(n, route.region).corp || 0), 0);
                    const personal = accoms[ri][ti].reduce((s, n) => s + (calcNight(n, route.region).personal || 0), 0);
                    return (
                      <div className="mt-2 pt-3 border-t border-gray-100 flex justify-between text-sm">
                        <span className="text-gray-500">{tr.name} 소계</span>
                        <div className="text-right">
                          {corp > 0 && <span className="text-gray-400 text-xs mr-3">법카 {fmtW(corp)}</span>}
                          <span className={personal > 0 ? "text-blue-600 font-medium" : "text-gray-400 text-xs"}>
                            {personal > 0 ? "개인 "+(fmtW(personal))+"" : "개인지급 0원"}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ))}

              {/* 공동숙박 안내 (일반숙박 2명 이상) */}
              {travelers.length > 1 &&
                accoms[ri].some(tRow => tRow.some(n => n.type === "hotel" && n.cardType === "corp")) && (
                <div className={ibox + " mb-4"}>
                  법인카드 대표결제 — 카드사 전표에 결제자 자동 기록됩니다.<br />
                  <span className="text-xs opacity-80">재단 내부 법인카드 감사에서 별도 확인됩니다.</span>
                </div>
              )}

              {/* 목적지 완료 표시 */}
              {isRouteValid(accoms[ri]) && (
                <div className={obox + " mb-2"}>
                  ✅ {route.region} 숙박비 입력 완료
                </div>
              )}

              {/* 구간 이동 */}
              <div className="flex justify-between mt-2">
                <Btn disabled={curRoute === 0} onClick={() => setCurRoute(curRoute - 1)}>← 이전 지역</Btn>
                {curRoute < overnightRoutes.length - 1
                  ? <Btn primary disabled={!isRouteValid(accoms[ri])}
                      onClick={() => setCurRoute(curRoute + 1)}>다음 지역 →</Btn>
                  : <Btn primary disabled={!allDone}
                      onClick={() => setShowSummary(true)}>요약 확인 →</Btn>
                }
              </div>
            </div>
          );
        })}
      </>}

    </div>
  );
}


