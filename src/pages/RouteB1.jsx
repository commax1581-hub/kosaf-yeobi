import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const GRADES = ["임원", "본부장", "부서장·팀장", "팀원"];
const REGIONS = ["서울특별시","인천광역시","대전광역시","대구광역시","부산광역시","광주광역시","울산광역시","세종특별자치시","경기도","충청남도","충청북도","경상남도","경상북도","강원도","전라남도","전라북도","제주특별자치도","기타"];
const LIMIT = {"서울특별시":100000,"인천광역시":80000,"대전광역시":80000,"대구광역시":80000,"부산광역시":80000,"광주광역시":80000,"울산광역시":80000};
const getLimit = r => LIMIT[r] || 70000;
const fmtD = d => d ? d.replace(/-/g,".") : "";
const STEPS = ["직급","일정","동도출장","출장경로","확인"];

const card  = "bg-white border border-gray-200 rounded-xl p-5 mb-4";
const ct    = "text-xs font-medium text-gray-500 uppercase tracking-wider mb-3";
const inp   = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white text-gray-900";
const lbl   = "block text-sm text-gray-500 mb-1 mt-3";
const lbl0  = "block text-sm text-gray-500 mb-1";
const ibox  = "bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800 mt-3 leading-relaxed";
const ebox  = "bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800 mt-3 leading-relaxed";
const obox  = "bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800 mt-3 leading-relaxed";
const wbox  = "bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 mt-3 leading-relaxed";

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

const initDefault = () => ({
  step:0,
  dept:"", origin:"",
  name:"", grade:"",
  startDate:"", endDate:"",
  hasComp:null,
  companions:[{name:"",grade:""}],
  routes:[{region:"",place:"",reason:"",nights:0}],
});
const init = () => {
  // 새로고침 시 데이터 유지: 저장된 b_step1이 있으면 복원
  try {
    const saved = JSON.parse(localStorage.getItem("b_step1") || "null");
    if (saved && typeof saved === "object") {
      return { ...initDefault(), ...saved, step:0 };
    }
  } catch(e) {}
  return initDefault();
};

function calcDays(s){
  if(!s.startDate||!s.endDate) return null;
  const diff=(new Date(s.endDate)-new Date(s.startDate))/86400000;
  if(diff<0) return null;
  return {travel:diff+1, nights:diff};
}

function effectiveGrade(myGrade,hasComp,companions){
  if(!hasComp||!companions.length) return myGrade;
  const order=["임원","본부장","부서장·팀장","팀원"];
  const best=companions
    .filter(c=>c.grade)
    .reduce((acc,c)=>order.indexOf(c.grade)<order.indexOf(acc)?c.grade:acc, myGrade);
  return best;
}

export default function RouteB1(){
  const navigate = useNavigate();

  /* ── JSON 불러오기: steps → localStorage + state 복원 ── */
  const [jsonLoaded, setJsonLoaded] = useState(false);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("kosaf_json_load");
      if (raw) {
        const j = JSON.parse(raw);
        sessionStorage.removeItem("kosaf_json_load");
        if (j.v === "B" && j.steps) {
          const {b_step1,b_step2,b_step3,b_step4} = j.steps;
          if (b_step1) localStorage.setItem("b_step1", JSON.stringify(b_step1));
          if (b_step2) localStorage.setItem("b_step2", JSON.stringify(b_step2));
          if (b_step3) localStorage.setItem("b_step3", JSON.stringify(b_step3));
          if (b_step4) localStorage.setItem("b_step4", JSON.stringify(b_step4));
          if (b_step1) setS(prev => ({...prev, ...b_step1}));
          setJsonLoaded(true);
          setTimeout(() => setJsonLoaded(false), 8000); // 8초 후 자동 닫힘
        }
      }
    } catch(e) {}
  }, []);

  const [s,setS]=useState(init());
  const [autoSaved,setAutoSaved]=useState(false);

  const upd=useCallback(p=>setS(prev=>({...prev,...p})),[]);

  /* ── 입력 중 자동저장 (새로고침해도 데이터 유지) ── */
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const {step, ...data} = s;
        localStorage.setItem("b_step1", JSON.stringify(data));
        setAutoSaved(true);
      } catch(e) {}
    }, 500); // 입력 0.5초 후 저장
    return () => clearTimeout(t);
  }, [s]);

  /* ── 브라우저 닫기 경고 ── */
  useEffect(() => {
    const fn = e => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", fn);
    return () => window.removeEventListener("beforeunload", fn);
  }, []);


  const updComp=useCallback((i,k,v)=>
    setS(prev=>({...prev,companions:prev.companions.map((x,j)=>j===i?{...x,[k]:v}:x)})),[]);

  const updRoute=useCallback((i,k,v)=>
    setS(prev=>({...prev,routes:prev.routes.map((x,j)=>j===i?{...x,[k]:v}:x)})),[]);

  const addComp=()=>setS(prev=>({...prev,companions:[...prev.companions,{name:"",grade:""}]}));
  const delComp=i=>setS(prev=>({...prev,companions:prev.companions.filter((_,j)=>j!==i)}));

  const addRoute=()=>setS(prev=>({...prev,routes:[...prev.routes,{region:"",place:"",reason:"",nights:0}]}));
  const delRoute=i=>setS(prev=>({...prev,routes:prev.routes.filter((_,j)=>j!==i)}));

  const days=calcDays(s);
  const totalNights=((days&&days.nights)||0);
  const assignedNights=s.routes.reduce((acc,r)=>acc+(parseInt(r.nights)||0),0);
  const remainNights=totalNights-assignedNights;
  const nightsOk=days&&remainNights===0;
  const effGrade=effectiveGrade(s.grade,s.hasComp,s.companions);

  const hasRoutes=s.routes.some(r=>r.region&&r.place);
  const canStep1=!!s.grade;
  const canStep2=days!==null&&days.travel>0;
  const canStep3=s.hasComp!==null&&(s.hasComp===false||s.companions.some(c=>c.name&&c.grade));
  const canStep4=hasRoutes&&nightsOk;

  return(
    <div className="max-w-2xl mx-auto p-4 pb-12" style={{background:"#f0f4ff",minHeight:"100vh"}}>
      {/* 뒤로가기 */}
      <button onClick={()=>navigate('/')} className="flex items-center gap-1.5 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 mb-4 cursor-pointer hover:bg-blue-100 transition-all shadow-sm">
        ← 경로 선택 화면으로 (A · B · C)
      </button>

      {/* ── JSON 불러오기 안내 배너 ── */}
      {jsonLoaded && (
        <div className="flex items-start justify-between gap-3 bg-green-50 border border-green-300 rounded-xl px-4 py-3 mb-4 shadow-sm">
          <div>
            <div className="text-sm font-bold text-green-800 mb-0.5">✅ 저장된 정산 파일을 불러왔습니다</div>
            <div className="text-xs text-green-700">내용을 확인·수정 후 단계별로 진행하거나, <span className="font-semibold">5단계(보고서)</span>에서 바로 출력할 수 있습니다.</div>
          </div>
          <button onClick={()=>setJsonLoaded(false)} className="text-green-500 hover:text-green-800 text-lg font-bold leading-none mt-0.5 cursor-pointer">✕</button>
        </div>
      )}

      {/* ── 상단 헤더 배너 ── */}
      <div className="rounded-2xl mb-5 overflow-hidden shadow-sm">
        <div style={{background:"linear-gradient(135deg,#1a5c38 0%,#27ae60 100%)"}} className="px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-green-200 uppercase tracking-widest mb-1">KOSAF 여비를 부탁해....</div>
              <div className="text-white font-bold text-lg">스마트 여비정산 시스템</div>
            </div>
            <div className="text-right">
              <div className="bg-white/20 rounded-xl px-3 py-1.5 text-xs font-bold text-white">🅱 국내 일반 출장 — 1/5</div>
            </div>
          </div>
        </div>
      </div>

      {/* 진행 바 */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-gray-600">기본정보 입력 <span className="text-blue-600">{s.step+1}/{STEPS.length}</span> · {STEPS[s.step]}</div>
        {autoSaved && <div className="text-xs text-green-600 flex items-center gap-1">💾 자동 저장됨</div>}
      </div>
      <div className="flex gap-1 mb-2">
        {STEPS.map((_,i)=>(
          <div key={i} className={"flex-1 h-2 rounded-full transition-all "+(i<s.step?"bg-blue-500":i===s.step?"bg-blue-400":"bg-gray-200")}/>
        ))}
      </div>
      <div className="flex gap-1 mb-5">
        {STEPS.map((label,i)=>(
          <div key={i} className={"flex-1 text-center text-xs pt-1 "+(i===s.step?"text-blue-500 font-medium":"text-gray-400")}>{label}</div>
        ))}
      </div>

      {/* ══ STEP 0: 직급 ══ */}
      {s.step===0&&<>
        <div className="text-lg font-medium mb-5">신청자 정보를 입력하세요</div>
        <div className={card}>
          <div className={ct}>신청자 정보</div>
          <div className={lbl0}>소속부서(팀)</div>
          <input className={inp} type="text" value={s.dept||""}
            placeholder="예) 대구센터 창업지원팀"
            onChange={e=>upd({dept:e.target.value, origin:e.target.value})}/>
          <div className={lbl0}>출발지 (근무지)</div>
          <input className={inp} type="text" value={s.origin||""}
            placeholder="기본값: 소속부서와 동일 (수정 가능)"
            onChange={e=>upd({origin:e.target.value})}/>
          <div className={lbl0}>성명</div>
          <input className={inp} type="text" value={s.name||""}
            placeholder="성명을 입력하세요"
            onChange={e=>upd({name:e.target.value})}/>
          <div className={lbl}>직급</div>
          <div className="flex flex-wrap gap-2">
            {GRADES.map(g=><TBtn key={g} sel={s.grade===g} onClick={()=>upd({grade:g})}>{g}</TBtn>)}
          </div>
          {s.grade&&(
            <div className={ibox}>
              <div className="font-medium mb-1">직급별 운임 기준</div>
              {s.grade==="임원"&&"철도: 실제비용 / 항공: 실제비용 / 선박: 1등특별 침대부"}
              {s.grade==="본부장"&&"철도: 실제비용 / 항공: 실제비용 / 선박: 1등특별 침대부"}
              {s.grade==="부서장·팀장"&&"철도: KTX 일반실 / 항공: 이코노미 / 선박: 1등특별 침대부"}
              {s.grade==="팀원"&&"철도: KTX 일반실 / 항공: 이코노미 / 선박: 1등보통 침대부"}
              <div className="mt-1 text-xs opacity-80">일비·식비: 25,000원/일 (전 직급 동일, 별표1)</div>
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <Btn primary disabled={!canStep1} onClick={()=>upd({step:1})}>다음 →</Btn>
        </div>
      </>}

      {/* ══ STEP 1: 출장 일정 ══ */}
      {s.step===1&&<>
        <div className="text-lg font-medium mb-5">출장 일정을 입력하세요</div>
        <div className={card}>
          <div className={ct}>출장 기간</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className={lbl0}>출발일</div>
              <input className={inp} type="date" value={s.startDate}
                onChange={e=>upd({startDate:e.target.value})}/>
            </div>
            <div>
              <div className={lbl0}>복귀일</div>
              <input className={inp} type="date" value={s.endDate}
                onChange={e=>upd({endDate:e.target.value})}/>
            </div>
          </div>
          {s.startDate&&s.endDate&&(
            days===null||days.travel<=0
              ?<div className={ebox}>복귀일이 출발일보다 빠릅니다. 날짜를 확인하세요.</div>
              :<div className={obox}>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-xs opacity-70 mb-1">여행일수</div>
                    <div className="text-xl font-medium">{days.travel}일</div>
                  </div>
                  <div>
                    <div className="text-xs opacity-70 mb-1">총 숙박박수</div>
                    <div className="text-xl font-medium">{days.nights}박</div>
                  </div>
                  <div>
                    <div className="text-xs opacity-70 mb-1">근거</div>
                    <div className="text-sm font-medium mt-1">제14조</div>
                  </div>
                </div>
                {days.nights===0&&(
                  <div className="mt-2 text-xs opacity-80 border-t border-green-200 pt-2">
                    당일 출장 — 숙박비 미발생
                  </div>
                )}
              </div>
          )}
        </div>
        <div className="flex justify-between">
          <Btn onClick={()=>upd({step:0})}>← 이전</Btn>
          <Btn primary disabled={!canStep2} onClick={()=>upd({step:2})}>다음 →</Btn>
        </div>
      </>}

      {/* ══ STEP 2: 동도출장 ══ */}
      {s.step===2&&<>
        <div className="text-lg font-medium mb-5">동행 출장 여부를 확인하세요</div>
        <div className={card}>
          <div className={ct}>상급자 동행 여부 (제4조 제1항)</div>
          <div className="flex gap-2">
            <TBtn sel={s.hasComp===false} onClick={()=>upd({hasComp:false})}>단독 출장</TBtn>
            <TBtn sel={s.hasComp===true} onClick={()=>upd({hasComp:true})}>동행 출장</TBtn>
          </div>
          {s.hasComp===false&&<div className={obox}>단독 출장 — 본인 직급 기준으로 계산합니다.</div>}
          {s.hasComp===true&&<>
            <div className={ibox}>
              동도출장 적용 시 운임·숙박비·식비를 상급자 기준으로 계산합니다.<br/>
              <span className="font-medium">일비는 본인 직급 기준 유지됩니다.</span> (제4조①)
            </div>
            <div className="mt-4 space-y-3">
              {s.companions.map((c,i)=>(
                <div key={i} className="border border-gray-100 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-medium text-gray-600">동행자 {i+1}</span>
                    {i>0&&<Btn small onClick={()=>delComp(i)}>삭제</Btn>}
                  </div>
                  <div className={lbl0}>성명</div>
                  <input className={inp} type="text" value={c.name}
                    placeholder="성명을 입력하세요"
                    onChange={e=>updComp(i,"name",e.target.value)}/>
                  <div className={lbl}>직급</div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {GRADES.map(g=><TBtn key={g} small sel={c.grade===g} onClick={()=>updComp(i,"grade",g)}>{g}</TBtn>)}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3"><Btn small onClick={addComp}>+ 동행자 추가</Btn></div>
            {s.companions.some(c=>c.name&&c.grade)&&(
              <div className={wbox}>
                <div className="font-medium mb-1">동도출장 적용 결과</div>
                <div>운임·숙박비·식비 기준: <span className="font-medium">{effGrade}</span></div>
                <div>일비 기준: <span className="font-medium">{s.grade} (본인 직급 유지)</span></div>
                <div className="text-xs mt-1 opacity-80">
                  동행 상급자: {s.companions.filter(c=>c.name).map(c=>c.name+" ("+c.grade+")").join(", ")}
                </div>
              </div>
            )}
          </>}
        </div>
        <div className="flex justify-between">
          <Btn onClick={()=>upd({step:1})}>← 이전</Btn>
          <Btn primary disabled={!canStep3} onClick={()=>upd({step:3})}>다음 →</Btn>
        </div>
      </>}

      {/* ══ STEP 3: 출장 경로 ══ */}
      {s.step===3&&<>
        <div className="text-lg font-medium mb-5">출장 경로를 입력하세요</div>

        {/* 숙박 배분 현황 — 핵심 추가 */}
        {days&&days.nights>0&&(
          <div className={"mb-4 border rounded-xl p-4 "+(nightsOk?"border-green-300 bg-green-50":"border-amber-300 bg-amber-50")}>
            <div className="flex justify-between items-center">
              <span className={"text-sm font-medium "+(nightsOk?"text-green-700":"text-amber-700")}>
                숙박 박수 배분 현황
              </span>
              <span className={"text-sm font-medium "+(nightsOk?"text-green-700":"text-amber-700")}>
                {assignedNights} / {totalNights}박
              </span>
            </div>
            {/* 진행 바 */}
            <div className="mt-2 h-2 bg-white rounded-full border border-gray-200 overflow-hidden">
              <div
                className={"h-full rounded-full transition-all "+(nightsOk?"bg-green-500":assignedNights>totalNights?"bg-red-500":"bg-amber-400")}
                style={{width:Math.min(100,(assignedNights/Math.max(totalNights,1))*100)+"%"}}
              />
            </div>
            <div className={"text-xs mt-1.5 "+(nightsOk?"text-green-600":"text-amber-600")}>
              {nightsOk
                ?"✅ 모든 박수가 배분되었습니다."
                :assignedNights>totalNights
                  ?("⚠️ 배분 박수("+assignedNights+"박)가 총 숙박("+totalNights+"박)을 초과합니다.")
                  :("미배분 "+remainNights+"박 — 목적지별 숙박 박수를 입력해 주세요.")
              }
            </div>
            {days.nights===0&&(
              <div className="text-xs text-green-600 mt-1">당일 출장 — 숙박 없음</div>
            )}
          </div>
        )}

        {/* 출발지 고정 */}
        <div className="flex items-center gap-3 mb-2 px-1">
          <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-medium shrink-0">출</div>
          <div className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-400 bg-gray-50">대구센터 (출발지 고정)</div>
        </div>

        {s.routes.map((r,i)=>(
          <div key={i}>
            <div className="flex justify-center my-1 text-gray-300">↓</div>
            <div className="border border-gray-200 rounded-xl p-4 mb-1">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-gray-600">목적지 {i+1}</span>
                {i>0&&<Btn small onClick={()=>delRoute(i)}>삭제</Btn>}
              </div>

              <div className={lbl0}>출장 지역</div>
              <select className={inp} value={r.region}
                onChange={e=>updRoute(i,"region",e.target.value)}>
                <option value="">지역을 선택하세요</option>
                {REGIONS.map(reg=><option key={reg} value={reg}>{reg}</option>)}
              </select>
              {r.region&&(
                <div className="text-xs text-blue-600 mt-1">
                  숙박비 상한: {getLimit(r.region).toLocaleString()}원/박
                </div>
              )}

              <div className={lbl}>기관명 · 장소명</div>
              <input className={inp} type="text" value={r.place}
                placeholder="예: 서울 OO기관"
                onChange={e=>updRoute(i,"place",e.target.value)}/>

              <div className={lbl}>방문 사유</div>
              <input className={inp} type="text" value={r.reason}
                placeholder="예: 업무협의, 계약체결"
                onChange={e=>updRoute(i,"reason",e.target.value)}/>

              {/* ── 숙박 박수 입력 (핵심 수정) ── */}
              <div className={lbl}>이 목적지 숙박 박수</div>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                  <button
                    className="px-3 py-2 text-gray-500 hover:bg-gray-100 text-lg leading-none"
                    onClick={()=>{
                      const n=Math.max(0,(parseInt(r.nights)||0)-1);
                      updRoute(i,"nights",n);
                    }}>−</button>
                  <div className="px-4 py-2 text-sm font-medium min-w-[60px] text-center">
                    {parseInt(r.nights)||0}박
                  </div>
                  <button
                    className={"px-3 py-2 text-lg leading-none cursor-pointer "+((days&&days.nights===0)?"opacity-30 cursor-not-allowed text-gray-300":"text-gray-500 hover:bg-gray-100")}
                    disabled={!!(days&&days.nights===0)}
                    onClick={()=>{
                      const n=(parseInt(r.nights)||0)+1;
                      updRoute(i,"nights",n);
                    }}>+</button>
                </div>
                <span className="text-xs text-gray-400">
                  {parseInt(r.nights)===0?"당일 이동":"숙박"}
                </span>
              </div>

              {/* 숙박 있을 때 상한 안내 */}
              {parseInt(r.nights)>0&&r.region&&(
                <div className={ibox}>
                  {r.region} {parseInt(r.nights)}박 — 상한 {getLimit(r.region).toLocaleString()}원/박<br/>
                  <span className="text-xs opacity-80">
                    숙박 형태(일반/친척집 등) 및 법인카드 여부는 다음 단계에서 입력합니다.
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}

        <div className="flex justify-center my-1 text-gray-300">↓</div>
        <div className="flex items-center gap-3 px-1 mb-4">
          <div className="w-8 h-8 rounded-full bg-gray-400 text-white flex items-center justify-center text-sm font-medium shrink-0">복</div>
          <div className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-400 bg-gray-50">대구센터 (복귀)</div>
        </div>

        <div className="mb-4"><Btn small onClick={addRoute}>+ 목적지 추가</Btn></div>

        {/* 숙박비 상한 전체 요약 */}
        {s.routes.some(r=>parseInt(r.nights)>0&&r.region)&&(
          <div className={card}>
            <div className={ct}>숙박비 상한 요약</div>
            {s.routes.filter(r=>parseInt(r.nights)>0&&r.region).map((r,i)=>(
              <div key={i} className="flex justify-between items-center py-2 text-sm border-b border-gray-100 last:border-0">
                <span className="text-gray-600">{r.region} ({parseInt(r.nights)}박)</span>
                <div className="text-right">
                  <span className="font-medium">{getLimit(r.region).toLocaleString()}원/박</span>
                  <span className="text-xs text-gray-400 ml-2">
                    최대 {(getLimit(r.region)*parseInt(r.nights)).toLocaleString()}원
                  </span>
                </div>
              </div>
            ))}
            {/* 합계 */}
            <div className="flex justify-between items-center pt-2 mt-1 text-sm">
              <span className="text-gray-500">숙박비 총 상한 (참고)</span>
              <span className="font-medium text-blue-600">
                {s.routes.filter(r=>parseInt(r.nights)>0&&r.region)
                  .reduce((acc,r)=>acc+getLimit(r.region)*parseInt(r.nights),0)
                  .toLocaleString()}원
              </span>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              ※ 실제 숙박비는 법인카드 집행 후 별도 정산 / 친척집 등 숙박 형태는 다음 단계에서 입력
            </div>
          </div>
        )}

        {/* 미배분 경고 */}
        {days&&days.nights>0&&!nightsOk&&hasRoutes&&(
          <div className={assignedNights>totalNights?ebox:wbox}>
            {assignedNights>totalNights
              ?("⚠️ 배분 박수("+assignedNights+"박)가 총 숙박("+totalNights+"박)을 초과합니다. 목적지별 박수를 조정해 주세요.")
              :("미배분 "+remainNights+"박이 있습니다. 목적지별 숙박 박수 합계가 총 "+totalNights+"박이 되어야 합니다.")
            }
          </div>
        )}

        <div className="flex justify-between">
          <Btn onClick={()=>upd({step:2})}>← 이전</Btn>
          <Btn primary disabled={!canStep4} onClick={()=>upd({step:4})}>다음 →</Btn>
        </div>
      </>}

      {/* ══ STEP 4: 확인 요약 ══ */}
      {s.step===4&&<>
        <div className="text-lg font-medium mb-5">입력 내용 확인</div>

        <div className={card}>
          <div className={ct}>기본 정보</div>
          <div className="space-y-0 text-sm">
            {[
              ["신청자", (s.name||"-")+" ("+s.grade+")"],
              ["출장 기간", fmtD(s.startDate)+" ~ "+fmtD(s.endDate)],
              ["여행일수 / 숙박", (days?days.travel:"?")+"일 / "+(days?days.nights:"?")+"박"],
            ].map(([k,v])=>(
              <div key={k} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="text-gray-500">{k}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={card}>
          <div className={ct}>동도출장</div>
          {s.hasComp===false
            ?<div className="text-sm text-gray-600">단독 출장</div>
            :<div className="text-sm space-y-0">
              {[
                ["운임·숙박·식비 기준", effGrade],
                ["일비 기준", s.grade+" (본인)"],
              ].map(([k,v])=>(
                <div key={k} className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">{k}</span>
                  <span className="font-medium text-blue-600">{v}</span>
                </div>
              ))}
              {s.companions.filter(c=>c.name).map((c,i)=>(
                <div key={i} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-gray-500">동행자 {i+1}</span>
                  <span className="font-medium">{c.name} ({c.grade})</span>
                </div>
              ))}
            </div>
          }
        </div>

        <div className={card}>
          <div className={ct}>출장 경로 및 숙박</div>
          <div className="text-sm">
            <div className="flex items-center gap-2 py-2">
              <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center shrink-0">출</span>
              <span className="text-gray-400">{s.origin||"출발지"}</span>
            </div>
            {s.routes.filter(r=>r.place).map((r,i)=>(
              <div key={i}>
                <div className="text-center text-gray-300 text-xs py-0.5">↓</div>
                <div className="flex items-start gap-2 py-2 border-b border-gray-100">
                  <span className="w-5 h-5 rounded-full bg-gray-300 text-white text-xs flex items-center justify-center shrink-0 mt-0.5">{i+1}</span>
                  <div className="flex-1">
                    <div className="font-medium">{r.region} {r.place}</div>
                    <div className="text-gray-400 text-xs mt-0.5">
                      {r.reason&&(r.reason+" · ")}
                      {parseInt(r.nights)>0
                        ?<span className="text-blue-600">{parseInt(r.nights)}박 (상한 {getLimit(r.region).toLocaleString()}원/박)</span>
                        :<span>당일 이동</span>
                      }
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className="text-center text-gray-300 text-xs py-0.5">↓</div>
            <div className="flex items-center gap-2 py-2">
              <span className="w-5 h-5 rounded-full bg-gray-400 text-white text-xs flex items-center justify-center shrink-0">복</span>
              <span className="text-gray-400">{s.origin||"출발지"}</span>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-3 mt-1 flex justify-between text-sm">
            <span className="text-gray-500">총 숙박</span>
            <span className="font-medium">{assignedNights}박 (배분 완료 ✅)</span>
          </div>
        </div>

        <div className={obox}>
          1단계 입력이 완료되었습니다.<br/>
          <span className="text-xs opacity-80 mt-1 block">
            다음 단계: 교통수단 입력 (대중교통·자가용·관용차 선택, 법인카드 여부, 자가용 연료비 계산)
          </span>
        </div>

        <div className="flex justify-between mt-5">
          <Btn onClick={()=>upd({step:3})}>← 이전</Btn>
          <Btn primary onClick={()=>{
            const data={
              dept:s.dept||"", origin:s.origin||s.dept||"",
              name:s.name, grade:s.grade,
              startDate:s.startDate, startTime:s.startTime||"09:00",
              endDate:s.endDate, endTime:s.endTime||"18:00",
              hasComp:s.hasComp,
              companions:s.companions.filter(c=>c.name&&c.grade),
              routes:s.routes.filter(r=>r.place),
            };
            try{
              localStorage.setItem("b_step1",JSON.stringify(data));
            }catch(e){alert("저장 오류: "+e.message);return;}
            navigate('/b/2');
          }}>2단계로 →</Btn>
        </div>
      </>}

    </div>
  );
}


