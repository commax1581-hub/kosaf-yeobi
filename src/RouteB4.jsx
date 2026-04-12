import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const fmtW = n => Math.round(n || 0).toLocaleString("ko-KR") + "원";
const MEAL_UNIT = 8333; // 25,000 ÷ 3 원단위 절사

/* ── 스타일 ── */
const card = "bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5";
const ct   = "text-xs font-medium text-gray-500 uppercase tracking-wider mb-3";
const ibox = "bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800 leading-relaxed";
const obox = "bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800 leading-relaxed";
const wbox = "bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 leading-relaxed";
const ebox = "bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800 leading-relaxed";
const inp  = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white text-gray-900";
const lbl  = "block text-sm text-gray-500 mb-1 mt-3";
const lbl0 = "block text-sm text-gray-500 mb-1";

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
/* ── 1·2·3단계 데이터 불러오기 ── */
const _raw1 = (() => { try { return JSON.parse(localStorage.getItem("b_step1")||"null"); } catch { return null; } })();
const _raw2 = (() => { try { return JSON.parse(localStorage.getItem("b_step2")||"null"); } catch { return null; } })();
const _raw3 = (() => { try { return JSON.parse(localStorage.getItem("b_step3")||"null"); } catch { return null; } })();
const _isFromStorage = !!_raw1;
const PREV = _raw1 ? {
  ..._raw1,
  transport: ((_raw2&&_raw2.transport)||[]).map(t=>({seg:t.seg||"", type:t.type||""})),
  routes: _raw1.routes,
} : {
  grade: "팀원",
  startDate: "2026-04-09", startTime: "09:00",
  endDate:   "2026-04-13", endTime:   "18:00",
  hasComp: true,
  companions: [{ name: "김팀장", grade: "부서장·팀장" }],
  routes: [
    { region: "서울특별시", place: "서울 OO기관", nights: 2 },
    { region: "대전광역시", place: "대전 OO기관", nights: 2 },
  ],
  /* 2단계 교통수단 요약 */
  transport: [
    { seg: "대구→서울", type: "ktx" },
    { seg: "서울→대전", type: "gov" },   // 관용차 이용
    { seg: "대전→대구", type: "ktx" },
  ],
};

function effectiveGrade(myGrade,hasComp,companions){
  if(!hasComp||!companions||!companions.length) return myGrade;
  const order=["임원","본부장","부서장·팀장","팀원"];
  return companions.filter(c=>c.grade)
    .reduce((acc,c)=>order.indexOf(c.grade)<order.indexOf(acc)?c.grade:acc, myGrade);
}



/* ── 여행일수·날짜 계산 ── */
function buildDays(startDate, endDate) {
  const start = new Date(startDate);
  const end   = new Date(endDate);
  const days  = Math.round((end - start) / 86400000) + 1;
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return {
      date:   d.toISOString().slice(0, 10),
      label:  d.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric", weekday: "short" }),
      dayNum: i + 1,
    };
  });
}

/* ── 2단계 교통수단에서 관용차·자가용 이용 여부 ── */
function detectVehicleDays(transport) {
  const hasGov = transport.some(t => t.type === "gov");
  const hasCar = transport.some(t => t.type === "car");
  return { hasGov, hasCar, hasVehicle: hasGov || hasCar };
}

/* ── 초기 일별 데이터 ── */
function initDayData(days, transport) {
  const { hasVehicle } = detectVehicleDays(transport);
  return days.map((d, i) => ({
    ...d,
    /* 일비 */
    dayDeduct: hasVehicle && i === 0, // 첫날 기본 감액 체크 (사용자 조정 가능)
    /* 식비 */
    mealSupport: false,  // 외부 식비 지원 여부
    breakfast: false,
    lunch: false,
    dinner: false,
  }));
}

/* ── DayRow — App 밖 정의 → 타이핑 안전 ── */
const DayRow = ({ d, onUpdate, showMeal, showDay }) => {
  const mealCount = [d.breakfast, d.lunch, d.dinner].filter(Boolean).length;
  const mealDeduct = mealCount * MEAL_UNIT;
  const mealAmt = Math.max(0, 25000 - mealDeduct);
  const dayAmt = d.dayDeduct ? 12500 : 25000;

  return (
    <div className={"border rounded-xl p-4 mb-3 "+(((showDay&&d.dayDeduct)||(showMeal&&d.mealSupport))?"border-amber-200 bg-amber-50/30":"border-gray-100")}>
      {/* 날짜 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full font-medium">
            {d.dayNum}일차
          </span>
          <span className="text-sm text-gray-600">{d.label}</span>
        </div>
        <div className="text-right">
          {showDay && (
            <span className={`text-sm font-medium ${d.dayDeduct ? "text-amber-600" : "text-gray-700"}`}>
              일비 {fmtW(dayAmt)}
              {d.dayDeduct && <span className="text-xs ml-1">(1/2)</span>}
            </span>
          )}
          {showMeal && (
            <span className={`text-sm font-medium ml-3 ${mealDeduct > 0 ? "text-amber-600" : "text-gray-700"}`}>
              식비 {fmtW(mealAmt)}
              {mealDeduct > 0 && <span className="text-xs ml-1">({mealCount}식 차감)</span>}
            </span>
          )}
        </div>
      </div>

      {/* 일비 감액 */}
      {showDay && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">차량 이용으로 일비 1/2 감액</span>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={d.dayDeduct}
              onChange={e => onUpdate({ dayDeduct: e.target.checked })}
              className="w-4 h-4 accent-blue-500" />
            <span className="text-xs text-gray-600">해당</span>
          </label>
        </div>
      )}

      {/* 일비·식비 구분선 */}
      {showDay && showMeal && <div className="border-t border-gray-100 my-3" />}

      {/* 식비 차감 */}
      {showMeal && <>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500">외부 식비 지원 있음</span>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={d.mealSupport}
              onChange={e => onUpdate({ mealSupport: e.target.checked, breakfast: false, lunch: false, dinner: false })}
              className="w-4 h-4 accent-blue-500" />
            <span className="text-xs text-gray-600">해당</span>
          </label>
        </div>

        {d.mealSupport && (
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-2">
              지원받은 식사를 선택하세요 (1식당 {fmtW(MEAL_UNIT)} 차감)
            </div>
            <div className="flex gap-3">
              {[
                { key: "breakfast", label: "조식" },
                { key: "lunch",     label: "중식" },
                { key: "dinner",    label: "석식" },
              ].map(m => (
                <label key={m.key} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={d[m.key]}
                    onChange={e => onUpdate({ [m.key]: e.target.checked })}
                    className="w-4 h-4 accent-blue-500" />
                  <span className="text-sm text-gray-700">{m.label}</span>
                </label>
              ))}
            </div>
            {mealDeduct > 0 && (
              <div className="mt-2 text-xs text-amber-700">
                차감: {mealCount}식 × {fmtW(MEAL_UNIT)} = {fmtW(mealDeduct)}
                &nbsp;→ 식비 {fmtW(mealAmt)}
              </div>
            )}
          </div>
        )}
      </>}
    </div>
  );
};

/* ══════════════ 메인 ══════════════ */
export default function RouteB4() {
  const navigate = useNavigate();
  const days = buildDays(PREV.startDate, PREV.endDate);
  const { hasVehicle, hasGov, hasCar } = detectVehicleDays(PREV.transport);

  const [dayData, setDayData] = useState(() => initDayData(days, PREV.transport));
  const [step, setStep] = useState(0); // 0:일비 1:식비 2:외부공제 3:요약
  const [extSupport, setExtSupport] = useState({
    hasTransport: null,
    transportNote: "",
    hasMeal: false,
    mealDays: [],
  });
  const [showSummary, setShowSummary] = useState(false);

  const updDay = useCallback((i, patch) =>
    setDayData(prev => prev.map((d, idx) => idx === i ? { ...d, ...patch } : d)), []);

  /* ── 브라우저 닫기 경고 ── */
  useEffect(() => {
    const fn = e => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', fn);
    return () => window.removeEventListener('beforeunload', fn);
  }, []);

  const travelDays = days.length;
  const dayTotal     = dayData.reduce((s, d) => s + (d.dayDeduct ? 12500 : 25000), 0);
  const mealBaseTotal = travelDays * 25000;
  const mealDeductTotal = dayData.reduce((s, d) => {
    const cnt = [d.breakfast, d.lunch, d.dinner].filter(Boolean).length;
    return s + cnt * MEAL_UNIT;
  }, 0);
  const mealTotal = Math.max(0, mealBaseTotal - mealDeductTotal);

  const deductDays = dayData.filter(d => d.dayDeduct).length;
  const mealSupportDays = dayData.filter(d => d.mealSupport).length;

  /* ── 외부 공제 확인 ── */
  const extValid =
    extSupport.hasTransport !== null &&
    (extSupport.hasTransport === false || extSupport.transportNote.trim().length > 0);

  const STEPS = ["일비", "식비", "외부공제", "요약"];

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
              <div className="bg-white/20 rounded-xl px-3 py-1.5 text-xs font-bold text-white">🅱 국내 일반 출장 — 4/5</div>
            </div>
          </div>
        </div>
      </div>
      {_isFromStorage
        ? <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-xs text-green-700 mb-3">✅ 1단계 데이터 불러옴 — {PREV.grade} / {PREV.startDate} ~ {PREV.endDate}</div>
        : <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-xs text-amber-700 mb-3">⚠️ 샘플 데이터 사용 중 — 1단계를 먼저 완료하고 저장하세요</div>
      }

      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="bg-blue-500 text-white text-xs px-2.5 py-1 rounded-full font-medium">4단계</span>
          <span className="text-lg font-medium">일비·식비 입력</span>
        </div>
      </div>

      {/* 진행 탭 */}
      <div className="flex gap-1 mb-2">
        {STEPS.map((_, i) => (
          <div key={i} className={"flex-1 h-2 rounded-full "+(i<step?"bg-blue-500":i===step?"bg-blue-400":"bg-gray-200")} />
        ))}
      </div>
      <div className="flex mb-5">
        {STEPS.map((label, i) => (
          <div key={i} className={"flex-1 text-center text-xs pt-1 "+(i===step?"text-blue-500 font-medium":"text-gray-400")}>{label}</div>
        ))}
      </div>

      {/* 출장 기본 정보 */}
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 mb-4 text-xs text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
        <span>직급: <strong>{PREV.grade}</strong></span>
        <span>출장: <strong>{travelDays}일</strong></span>
        <span>{(PREV.startDate?PREV.startDate.replace(/-/g,"."): "")} ~ {(PREV.endDate?PREV.endDate.replace(/-/g,"."):"")}</span>
        <span className="text-blue-600">일비·식비: 25,000원/일 (전 직급 동일, 별표1)</span>
      </div>

      {/* ══ STEP 0: 일비 ══ */}
      {step === 0 && <>
        <div className={card}>
          <div className={ct}>일비 계산 — 여비규칙 제14조, 별표1</div>

          {/* 기본 안내 */}
          <div className={ibox + " mb-4"}>
            <div className="font-medium mb-1">일비 기준</div>
            <div>기본: 25,000원/일 × {travelDays}일 = <strong>{fmtW(travelDays * 25000)}</strong></div>
            <div className="text-xs mt-1 opacity-80">
              출장지별 구분 없이 전체 여행일수 기준으로 지급합니다.
            </div>
          </div>

          {/* 차량 이용 안내 */}
          {hasVehicle ? (
            <div className={wbox + " mb-4"}>
              <div className="font-medium mb-1">⚠️ 차량 이용 구간 있음 — 일비 감액 확인 필요</div>
              <div className="text-xs space-y-1">
                {hasGov && <div>• 업무용차량(관용차) 이용 구간: 해당 일 일비 1/2 감액 (제14조)</div>}
                {hasCar && <div>• 자가용 이용 구간: 해당 일 일비 1/2 감액 (제14조 취지 준용)</div>}
              </div>
              <div className="mt-2 text-xs font-medium">
                아래에서 차량 이용한 날을 확인·수정하세요.
              </div>
            </div>
          ) : (
            <div className={obox + " mb-4"}>
              차량(관용차·자가용) 이용 구간 없음 — 전일 정상 지급
            </div>
          )}

          {/* 날짜별 입력 */}
          {dayData.map((d, i) => (
            <DayRow key={i} d={d} onUpdate={p => updDay(i, p)} showDay={true} showMeal={false} />
          ))}
        </div>

        {/* 일비 합계 */}
        <div className="border-2 border-blue-200 rounded-xl p-4 mb-4 bg-blue-50/30">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm text-gray-600">일비 합계</div>
              <div className="text-xs text-gray-400 mt-0.5">
                정상 {travelDays - deductDays}일 × 25,000 + 감액 {deductDays}일 × 12,500
              </div>
            </div>
            <div className="text-2xl font-medium text-blue-600">{fmtW(dayTotal)}</div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            개인지급 (현금) — 법인카드 해당없음
          </div>
        </div>

        <div className="flex justify-end">
          <Btn primary onClick={() => setStep(1)}>식비 입력 →</Btn>
        </div>
      </>}

      {/* ══ STEP 1: 식비 ══ */}
      {step === 1 && <>
        <div className={card}>
          <div className={ct}>식비 계산 — 여비규칙 제15조 제4항, 별표1</div>

          <div className={ibox + " mb-4"}>
            <div className="font-medium mb-1">식비 기준</div>
            <div>기본: 25,000원/일 × {travelDays}일 = <strong>{fmtW(mealBaseTotal)}</strong></div>
            <div className="text-xs mt-1 opacity-80">
              회의비·연수기관 등 외부 식비를 지원받은 경우 해당 식수만큼 차감합니다.<br />
              1식당 차감액: {fmtW(MEAL_UNIT)} (25,000 ÷ 3, 원단위 절사)
            </div>
          </div>

          {/* 날짜별 식비 입력 */}
          {dayData.map((d, i) => (
            <DayRow key={i} d={d} onUpdate={p => updDay(i, p)} showDay={false} showMeal={true} />
          ))}
        </div>

        {/* 식비 합계 */}
        <div className="border-2 border-blue-200 rounded-xl p-4 mb-4 bg-blue-50/30">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm text-gray-600">식비 합계</div>
              <div className="text-xs text-gray-400 mt-0.5">
                기본 {fmtW(mealBaseTotal)}
                {mealDeductTotal > 0 && " − 차감 "+(fmtW(mealDeductTotal))+""}
              </div>
            </div>
            <div className="text-2xl font-medium text-blue-600">{fmtW(mealTotal)}</div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            개인지급 (현금) — 법인카드 해당없음
          </div>
        </div>

        <div className="flex justify-between">
          <Btn onClick={() => setStep(0)}>← 일비</Btn>
          <Btn primary onClick={() => setStep(2)}>외부공제 확인 →</Btn>
        </div>
      </>}

      {/* ══ STEP 2: 외부기관 여비 공제 ══ */}
      {step === 2 && <>
        <div className={card}>
          <div className={ct}>외부기관 여비 공제 — 여비규칙 제15조 제4항</div>

          <div className={ibox + " mb-4"}>
            외부기관(연수기관·협력기관 등)으로부터 여비를 지원받은 경우<br />
            해당 금액을 지급액에서 차감합니다.
          </div>

          {/* 교통비 공제 */}
          <div className="mb-5">
            <div className={lbl0}>교통비를 외부기관에서 지원받으셨습니까?</div>
            <div className="flex gap-2 mt-1">
              <TBtn sel={extSupport.hasTransport === false}
                onClick={() => setExtSupport(p => ({ ...p, hasTransport: false, transportNote: "" }))}>
                없음
              </TBtn>
              <TBtn sel={extSupport.hasTransport === true}
                onClick={() => setExtSupport(p => ({ ...p, hasTransport: true }))}>
                있음
              </TBtn>
            </div>
            {extSupport.hasTransport === true && <>
              <div className={lbl}>지원 내용 <span className="text-red-500">*필수</span></div>
              <input className={inp} type="text"
                value={extSupport.transportNote}
                placeholder="예: 출발편 KTX 지원 (54,600원), 왕복 지원"
                onChange={e => setExtSupport(p => ({ ...p, transportNote: e.target.value }))} />
              <div className={wbox + " mt-2"}>
                지원받은 구간의 운임은 개인지급 0원으로 처리됩니다.<br />
                <span className="text-xs opacity-80">정산 결과에서 해당 구간 운임을 확인하세요.</span>
              </div>
            </>}
            {extSupport.hasTransport === false && (
              <div className="mt-2 text-xs text-gray-400">교통비 외부 지원 없음 — 해당없음</div>
            )}
          </div>

          <div className="border-t border-gray-100 pt-4">
            <div className={lbl0}>식비를 외부기관에서 추가 지원받으셨습니까?</div>
            <div className="text-xs text-gray-400 mb-2">
              (앞 단계에서 이미 입력한 식수와 중복되지 않게 확인하세요)
            </div>
            <div className="flex gap-2 mt-1">
              <TBtn sel={extSupport.hasMeal === false}
                onClick={() => setExtSupport(p => ({ ...p, hasMeal: false }))}>
                없음
              </TBtn>
              <TBtn sel={extSupport.hasMeal === true}
                onClick={() => setExtSupport(p => ({ ...p, hasMeal: true }))}>
                있음
              </TBtn>
            </div>
            {extSupport.hasMeal === true && (
              <div className={wbox + " mt-2"}>
                앞 단계 식비 입력에서 해당 식수가 이미 차감되었는지 확인하세요.<br />
                <span className="text-xs opacity-80">
                  미입력된 항목이 있으면 ← 식비 단계로 돌아가 추가하세요.
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between">
          <Btn onClick={() => setStep(1)}>← 식비</Btn>
          <Btn primary
            disabled={!extValid || extSupport.hasMeal === null}
            onClick={() => setStep(3)}>
            요약 확인 →
          </Btn>
        </div>
      </>}

      {/* ══ STEP 3: 요약 ══ */}
      {step === 3 && <>
        <div className={card}>
          <div className={ct}>일비·식비 최종 요약</div>

          {/* 일비 */}
          <div className="mb-4 pb-4 border-b border-gray-100">
            <div className="text-sm font-medium text-gray-700 mb-2">일비</div>
            {dayData.map((d, i) => {
              const amt = d.dayDeduct ? 12500 : 25000;
              return (
                <div key={i} className="flex justify-between items-center py-1.5 text-sm border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">{d.dayNum}일차 {d.label}</span>
                    {d.dayDeduct && <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">1/2 감액</span>}
                  </div>
                  <span className={"font-medium "+(d.dayDeduct ? "text-amber-600" : "text-gray-700")+""}>{fmtW(amt)}</span>
                </div>
              );
            })}
            <div className="flex justify-between items-center pt-2 mt-1">
              <span className="text-sm font-medium">일비 합계</span>
              <span className="text-lg font-medium text-blue-600">{fmtW(dayTotal)}</span>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              근거: 여비규칙 제14조, 별표1 / 개인지급
            </div>
          </div>

          {/* 식비 */}
          <div className="mb-4 pb-4 border-b border-gray-100">
            <div className="text-sm font-medium text-gray-700 mb-2">식비</div>
            {dayData.map((d, i) => {
              const cnt = [d.breakfast, d.lunch, d.dinner].filter(Boolean).length;
              const deduct = cnt * MEAL_UNIT;
              const amt = 25000 - deduct;
              return (
                <div key={i} className="flex justify-between items-center py-1.5 text-sm border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-gray-500">{d.dayNum}일차 {d.label}</span>
                    {cnt > 0 && (
                      <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                        {[d.breakfast && "조", d.lunch && "중", d.dinner && "석"].filter(Boolean).join("·")}식 차감
                      </span>
                    )}
                  </div>
                  <span className={"font-medium "+(deduct > 0 ? "text-amber-600" : "text-gray-700")+""}>{fmtW(amt)}</span>
                </div>
              );
            })}
            <div className="flex justify-between items-center pt-2 mt-1">
              <div>
                <div className="text-sm font-medium">식비 합계</div>
                {mealDeductTotal > 0 && (
                  <div className="text-xs text-gray-400">기본 {fmtW(mealBaseTotal)} − 차감 {fmtW(mealDeductTotal)}</div>
                )}
              </div>
              <span className="text-lg font-medium text-blue-600">{fmtW(mealTotal)}</span>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              근거: 여비규칙 제15조 제4항, 별표1 / 개인지급
            </div>
          </div>

          {/* 외부 공제 */}
          <div className="mb-2">
            <div className="text-sm font-medium text-gray-700 mb-2">외부기관 여비 공제</div>
            <div className="text-sm text-gray-600">
              교통비 지원: {extSupport.hasTransport ? "있음 — "+(extSupport.transportNote)+"" : "없음"}
            </div>
            <div className="text-sm text-gray-600">
              식비 추가 지원: {extSupport.hasMeal ? "있음 (식비 단계에서 반영)" : "없음"}
            </div>
          </div>
        </div>

        {/* 최종 합계 카드 */}
        <div className="border-2 border-blue-300 rounded-xl p-5 mb-4 bg-blue-50/30">
          <div className="text-sm text-gray-500 mb-3">4단계 개인지급 합계</div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">일비</span>
              <span className="font-medium">{fmtW(dayTotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">식비</span>
              <span className="font-medium">{fmtW(mealTotal)}</span>
            </div>
            <div className="border-t border-blue-200 pt-2 flex justify-between">
              <span className="font-medium">합계</span>
              <span className="text-xl font-medium text-blue-600">{fmtW(dayTotal + mealTotal)}</span>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-400">전액 개인지급 (현금) — 법인카드 해당없음</div>
        </div>

        <div className={obox + " mb-4"}>
          일비·식비 입력 완료.<br />
          <span className="text-xs opacity-80">다음 단계: 전체 정산 검증 및 보고서 출력</span>
        </div>

        <div className="flex justify-between">
          <Btn onClick={() => setStep(2)}>← 수정</Btn>
          <Btn primary onClick={() => {
            try {
              localStorage.setItem("b_step4", JSON.stringify({
                dayBasis: dayData.map(d=>({
                  date: d.date, label: d.label, dayNum: d.dayNum,
                  dayDeduct: d.dayDeduct,
                  b: d.breakfast||false, l: d.lunch||false, d: d.dinner||false,
                })),
                extSupport: extSupport,
              }));
            } catch(e) { alert("저장 오류: " + e.message); return; }
            navigate('/b/5');
          }}>5단계로 →</Btn>
        </div>
      </>}

    </div>
  );
}
