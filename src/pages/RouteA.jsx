import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const GRADES = ["임원", "본부장", "부서장·팀장", "팀원"];
const STEPS = ["직급", "출장지", "시간", "관용차", "서비스", "동행자", "검증", "결과", "보고서"];

const W = n => Math.round(n).toLocaleString("ko-KR") + "원";
const fmtH = h => {
  if (h === null) return "-";
  const hh = Math.floor(Math.abs(h));
  const mm = Math.round((Math.abs(h) - hh) * 60);
  return mm > 0 ? `${hh}시간 ${mm}분` : `${hh}시간`;
};

const calcH = s => {
  if (!s.sd || !s.st || !s.ed || !s.et) return null;
  return (new Date(s.ed + "T" + s.et) - new Date(s.sd + "T" + s.st)) / 3600000;
};

const calcR = s => {
  const h = calcH(s);
  if (!h || h <= 0 || s.gov) return { base: 0, svc: 0, tot: 0 };
  const base = h >= 4 ? 20000 : 10000;
  const svc = s.svcT === "oneway" ? 5000 : s.svcT === "round" ? 10000 : 0;
  return { base, svc, tot: Math.max(0, base - svc) };
};

const runChecks = s => {
  const h = calcH(s);
  return [
    h !== null && h <= 0
      ? { ok: false, msg: "종료시간이 시작시간보다 빠릅니다." }
      : { ok: true, msg: `소요시간 ${fmtH(h)} — ${h >= 4 ? "4시간 이상 (20,000원)" : "4시간 미만 (10,000원)"}` },
    s.gov
      ? { ok: null, msg: "ℹ️ 관용차 이용 — 제13조에 따라 여비 전액 미지급 (0원 처리)" }
      : { ok: true, msg: "관용차 미이용 — 정액 지급 대상" },
    s.svcT && s.svcT !== "none"
      ? { ok: null, msg: `차량운행지원서비스 이용 (${s.svcT === "oneway" ? "편도 5,000원" : "왕복 10,000원"} 차감)` }
      : null,
    s.comp && s.comps.some(c => c.n)
      ? { ok: null, msg: "A경로는 동도출장 상향 적용 항목 없음 (제4조①)" }
      : null,
    !s.dests.some(d => d.p)
      ? { ok: false, msg: "출장지가 입력되지 않았습니다." }
      : { ok: true, msg: `출장지 ${s.dests.filter(d => d.p).length}개소 입력 완료` },
  ].filter(Boolean);
};


function genHTML(s){
  const h=calcH(s),res=calcR(s);
  const totalD=(s.adjustments||[]).reduce((sm,a)=>sm+(a.deduct||0),0);
  const fin=Math.max(0,res.tot-totalD);
  const W2=n=>Math.round(n||0).toLocaleString("ko-KR")+"원";
  const dests=(s.dests||[]).filter(d=>d.p).map((d,i)=>"<tr><td class=g>"+(i+1)+"</td><td>"+d.p+(d.r?" ("+d.r+")":"")+"</td></tr>").join("");
  const compsStr=(s.comp&&s.comps.filter(c=>c.n).length)?s.comps.filter(c=>c.n).map(c=>c.n+" ("+c.g+")").join(", "):"없음";
  const svcT=!s.svcT||s.svcT==="none"?"미이용":s.svcT==="oneway"?"편도 1회 −5,000원 (제15조⑤)":"왕복 2회 −10,000원 (제15조⑤)";
  const adjItems=(s.adjustments||[]).filter(a=>a.deduct>0&&a.reason);
  const adjTable=adjItems.length?"<h2>나-4. 감액 조정</h2><table><tr><th>항목</th><th>산출값</th><th>감액</th><th>최종값</th><th>사유</th></tr>"+adjItems.map(a=>"<tr><td>"+a.key+"</td><td>"+W2(a.orig)+"</td><td style=color:#333;font-weight:600>−"+W2(a.deduct)+"</td><td style=font-weight:700>"+W2(a.orig-a.deduct)+"</td><td>"+a.reason+"</td></tr>").join("")+"</table>":"";
  const css="@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap');body{font-family:'Noto Sans KR',sans-serif;font-size:13px;margin:24px}h1{font-size:17px;font-weight:700;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:16px;color:#111}h2{font-size:13px;font-weight:700;color:#111;background:#f0f0f0;padding:4px 8px;margin:14px 0 4px;border-left:3px solid #333}table{width:100%;border-collapse:collapse;margin-bottom:8px}th{background:#333;color:#fff;padding:5px 8px;text-align:left;font-weight:500;font-size:12px}td{padding:5px 8px;border-bottom:1px solid #ddd}.g{color:#666;font-size:12px}.b{font-weight:700;color:#111}.sum{border:2px solid #111;padding:12px;margin:12px 0;background:#f8f8f8}.r{display:flex;justify-content:space-between;padding:3px 0;font-size:13px}.rf{border-top:2px solid #111;margin-top:8px;padding-top:8px;font-size:16px;font-weight:700}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}";
  return "<!DOCTYPE html><html lang=ko><head><meta charset=UTF-8><title>근무지 내 출장 여비 정산</title><style>"+css+"</style></head><body>"
    +"<h1>근무지 내 출장 여비 정산 보고서 <span style='background:linear-gradient(135deg,#922b21,#e74c3c);color:#fff;font-size:11px;padding:3px 10px;border-radius:20px;font-weight:500;vertical-align:middle'>A경로</span></h1>"
    +"<h2>가. 출장 기본정보</h2>"
    +"<table><tr><th>항목</th><th>내용</th></tr>"
    +"<tr><td class=g>소속부서</td><td>"+(s.dept||"—")+"</td></tr>"
    +"<tr><td class=g>신청자</td><td><b>"+(s.name||"—")+" ("+s.grade+")</b></td></tr>"
    +"<tr><td class=g>출장 일시</td><td>"+(s.sd||"").replace(/-/g,".")+" "+s.st+" ~ "+(s.ed||"").replace(/-/g,".")+" "+s.et+"</td></tr>"
    +"<tr><td class=g>소요 시간</td><td>"+fmtH(h)+" ("+(h>=4?"4시간 이상":"4시간 미만")+")</td></tr>"
    +"<tr><td class=g>출장 사유</td><td>"+(s.reason||"(미입력)")+"</td></tr>"
    +"<tr><td class=g>동행자</td><td>"+compsStr+"</td></tr>"
    +"<tr><td class=g>관용차 이용</td><td>"+(s.gov?"이용 (제13조 — 일비 미지급)":"미이용")+"</td></tr>"
    +"</table>"
    +"<h2>가-1. 출장지</h2>"
    +"<table><tr><th>번호</th><th>장소 및 사유</th></tr>"+dests+"</table>"
    +"<h2>나. 비용항목 정산</h2>"
    +"<h2>나-1. 일비 계산  (여비규칙 제16조, 별표1)</h2>"
    +"<table><tr><th>구분</th><th>산정 기준</th><th>금액</th></tr>"
    +"<tr><td>일비 (정액)</td><td>"+(h>=4?"4시간 이상 — 20,000원":"4시간 미만 — 10,000원")+"</td><td class=b>"+W2(res.base)+"</td></tr>"
    +(res.svc>0?"<tr><td>차량운행지원 차감</td><td>"+svcT+"</td><td style=font-weight:600>−"+W2(res.svc)+"</td></tr>":"")
    +"<tr style=background:#f0f0f0><td colspan=2><b>일비 소계</b></td><td class=b>"+W2(res.tot)+"</td></tr>"
    +"</table>"
    +adjTable
    +"<h2>다. 최종 정산 금액</h2>"
    +"<div class=sum>"
    +(totalD>0?"<div class=r><span>산출 지급액</span><span>"+W2(res.tot)+"</span></div><div class=r><span>감액</span><span style=font-weight:700>−"+W2(totalD)+"</span></div>":"")
    +"<div class='r rf'><span>◆ 최종 개인 지급액</span><span>"+W2(fin)+"</span></div>"
    +"<div class=r><span style=color:#666;font-size:12px>법인카드 집행</span><span style=color:#666;font-size:12px>0원 (해당없음)</span></div>"
    +"</div>"
    +"</body></html>";
}




const init = () => ({
  step: 0, name: "", grade: "", dept: "", origin: "", sd: "", st: "09:00", ed: "", et: "18:00",
  dests: [{ p: "", r: "" }], reason: "",
  gov: null, svcT: null, comp: null,
  comps: [{ n: "", g: "" }], adjustments: []
});

/* ── 스타일 상수 ── */
const card = "bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5";
const ct = "text-xs font-semibold text-blue-600 uppercase tracking-widest mb-3";
const inp = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 bg-white";
const lbl = "block text-sm text-gray-500 mb-1 mt-3 first:mt-0";
const ibox = "bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800 mt-3 leading-relaxed";
const wbox = "bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 mt-3 leading-relaxed";
const ebox = "bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800 mt-3 leading-relaxed";
const obox = "bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800 mt-3 leading-relaxed";

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

/* ── 파일명 생성 ── */
const mkN = (s, ext) => {
  const d = (s.sd||"").replace(/-/g,"");
  const t = (s.st||"0900").replace(":","");
  return d+"_"+t+"_A경로_"+(s.name||"출장자")+"."+ext;
};

/* TimeInput — 30분 단위 시간 선택 (B·C경로와 동일) */
const TimeInput = ({value, onChange}) => {
  const pts = (value||"09:00").split(":");
  const h = pts[0]||"09";
  const m = pts[1]||"00";
  return (
    <div className="flex items-center gap-2 mt-1">

      <select
        className="border border-gray-300 rounded-lg px-2 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:border-blue-500"
        value={h}
        onChange={e => onChange(e.target.value + ":" + m)}>
        {Array.from({length:24}, (_,i) => {
          const hh = String(i).padStart(2,"0");
          return <option key={hh} value={hh}>{hh}시</option>;
        })}
      </select>
      <span className="text-gray-400">:</span>
      <button
        className={"border rounded-lg px-3 py-2 text-sm cursor-pointer " + (m==="00"?"bg-blue-500 text-white border-blue-500":"border-gray-300 text-gray-500 hover:bg-gray-50")}
        onClick={() => onChange(h + ":00")}>00분</button>
      <button
        className={"border rounded-lg px-3 py-2 text-sm cursor-pointer " + (m==="30"?"bg-blue-500 text-white border-blue-500":"border-gray-300 text-gray-500 hover:bg-gray-50")}
        onClick={() => onChange(h + ":30")}>30분</button>
    </div>
  );
};

/* ── 보고서 오버레이 컴포넌트 (App 밖) ── */
const ReportOverlay = ({html, fileName, onClose}) => {
  const handleSaveHtml = () => {
    try {
      const blob = new Blob([html], {type:"text/html;charset=utf-8"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = (fileName||"정산보고서")+".html";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(()=>URL.revokeObjectURL(url), 1000);
    } catch(e) {
      alert("저장 오류: "+e.message);
    }
  };
  return (
    <div style={{position:"fixed",top:0,left:0,width:"100%",height:"100%",background:"rgba(0,0,0,0.75)",zIndex:9999,display:"flex",flexDirection:"column"}}>
      <div style={{background:"#1e3a5f",padding:"10px 16px",display:"flex",alignItems:"center",gap:"8px",flexShrink:0,flexWrap:"wrap"}}>
        <span style={{color:"#fff",fontWeight:600,fontSize:"14px"}}>📄 정산 보고서</span>
        <span style={{color:"#93c5fd",fontSize:"11px",flex:1}}>HTML 저장 → 브라우저에서 열기 → Ctrl+P로 인쇄</span>
        <button onClick={handleSaveHtml}
          style={{background:"#16a34a",color:"#fff",border:"none",borderRadius:"6px",padding:"6px 14px",fontSize:"13px",fontWeight:600,cursor:"pointer"}}>
          💾 HTML 저장 (인쇄용)
        </button>
        <button onClick={onClose}
          style={{background:"transparent",color:"#93c5fd",border:"1px solid #3b82f6",borderRadius:"6px",padding:"6px 12px",fontSize:"13px",cursor:"pointer"}}>
          ✕ 닫기
        </button>
      </div>
      <div style={{background:"#fef9c3",padding:"8px 16px",fontSize:"12px",color:"#92400e",flexShrink:0}}>
        💡 저장된 .html 파일을 브라우저로 열고 Ctrl+P(인쇄)를 누르면 PDF로 저장할 수 있습니다.
      </div>
      <div style={{flex:1,overflowY:"auto",background:"#fff"}}
        dangerouslySetInnerHTML={{__html:html}}/>
    </div>
  );
};







export default function RouteA() {
  const navigate = useNavigate()

  /* ── JSON 불러오기 (sessionStorage) ── */
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("kosaf_json_load");
      if (raw) {
        const j = JSON.parse(raw);
        sessionStorage.removeItem("kosaf_json_load");
        if (j.v === "A" && j.d) { setS(s => ({...s, ...j.d})); }
      }
    } catch(e) {}
  }, []);

  const [s, setS] = useState(init());
  const [reportHTML, setReportHTML] = useState(null);
  const [copied, setCopied] = useState(false);
  const [printed, setPrinted] = useState(false);
  const [saved, setSaved] = useState(false);

  const upd = useCallback(p => setS(prev => ({ ...prev, ...p })), []);
  /* ── 브라우저 닫기 경고 ── */
  useEffect(() => {
    const fn = e => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', fn);
    return () => window.removeEventListener('beforeunload', fn);
  }, []);

  const updD = useCallback((i, k, v) => setS(prev => {
    const dests = prev.dests.map((x, j) => j === i ? { ...x, [k]: v } : x);
    return { ...prev, dests };
  }), []);
  const updC = useCallback((i, k, v) => setS(prev => {
    const comps = prev.comps.map((x, j) => j === i ? { ...x, [k]: v } : x);
    return { ...prev, comps };
  }), []);

  const h = calcH(s);
  const res = calcR(s);
  const chks = runChecks(s);
  const hasErr = chks.some(c => c.ok === false);
  const totalDeduct = (s.adjustments||[]).reduce((sm,a)=>sm+(a.deduct||0),0);
  const fin = Math.max(0, res.tot - totalDeduct);
  const adjV = fin;
  const isRed = totalDeduct > 0;
  const canFin = !isRed || ((s.adjustments||[]).every(a=>a.deduct>0&&a.deduct<=a.orig&&a.reason.trim().length>0));


  const copy = () => {
    navigator.clipboard.writeText(genHTML(s)).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-4 pb-12" style={{background:"#f0f4ff",minHeight:"100vh"}}>
            {/* 뒤로가기 */}
      <button onClick={()=>navigate('/')} className="flex items-center gap-1.5 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 mb-4 cursor-pointer hover:bg-blue-100 transition-all shadow-sm">
        ← 경로 선택 화면으로 (A · B · C)
      </button>
      {/* ── 상단 헤더 배너 ── */}
      <div className="rounded-2xl mb-5 overflow-hidden shadow-sm">
        <div style={{background:"linear-gradient(135deg,#922b21 0%,#e74c3c 100%)"}} className="px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-red-200 uppercase tracking-widest mb-1">KOSAF 여비를 부탁해....</div>
              <div className="text-white font-bold text-lg">스마트 여비정산 시스템</div>
            </div>
            <div className="text-right">
              <div className="bg-white/20 rounded-xl px-3 py-1.5 text-xs font-bold text-white">🅰 근무지 내 출장</div>
            </div>
          </div>
        </div>
      </div>
      {reportHTML && <ReportOverlay html={reportHTML} fileName={"A경로_"+(s.name||"출장자")+"_"+s.sd} onClose={()=>setReportHTML(null)}/>}

      {/* 진행 바 */}
      <div className="flex gap-1 mb-6">
        {STEPS.map((_, i) => (
          <div key={i} className={"flex-1 h-2 rounded-full "+(i < s.step ? "bg-blue-500" : i === s.step ? "bg-blue-300" : "bg-gray-200")} />
        ))}
      </div>

      {/* ── STEP 0: 직급 ── */}
      {s.step === 0 && <>
        <div className="text-lg font-medium mb-5">직급을 선택하세요</div>
        <div className={card}>
          <div className={ct}>신청자 정보</div>
          <label className={lbl}>소속부서(팀)</label>
          <input className={inp} type="text" value={s.dept}
            placeholder="예) 대구센터 창업지원팀"
            onChange={e => upd({ dept: e.target.value, origin: e.target.value })}/>
          <label className={lbl}>출발지 (근무지)</label>
          <input className={inp} type="text" value={s.origin}
            placeholder="기본값: 소속부서와 동일 (수정 가능)"
            onChange={e => upd({ origin: e.target.value })}/>
          <label className={lbl}>성명</label>
          <input className={inp} type="text" value={s.name}
            placeholder="성명을 입력하세요"
            onChange={e => upd({ name: e.target.value })}/>
          <label className={lbl}>직급</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {GRADES.map(g => <TBtn key={g} sel={s.grade === g} onClick={() => upd({ grade: g })}>{g}</TBtn>)}
          </div>
          {s.grade && <div className={ibox}>A경로(근무지 내 출장)는 일비(정액)만 지급됩니다. 전 직급 동일 기준입니다.</div>}
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <Btn primary disabled={!s.dept.trim()||!s.name.trim()||!s.grade} onClick={() => upd({ step: 1 })}>다음 →</Btn>
        </div>
      </>}

      {/* ── STEP 1: 출장지 ── */}
      {s.step === 1 && <>
        <div className="text-lg font-medium mb-5">출장지를 입력하세요</div>
        <div className={card}>
          <div className={ct}>출장지 (복수 입력 가능)</div>
          {s.dests.map((d, i) => (
            <div key={i} className="border border-gray-100 rounded-lg p-3 mb-2 relative">
              <div className="text-xs text-gray-400 mb-2">목적지 {i + 1}</div>
              {i > 0 && (
                <button className="absolute top-2 right-3 text-gray-400 text-sm" onClick={() => setS(prev => ({ ...prev, dests: prev.dests.filter((_, j) => j !== i) }))}>✕</button>
              )}
              <label className={lbl}>기관명 · 장소명</label>
              <input className={inp} type="text" value={d.p} placeholder="예: 대구 중구 2030청년창업센터" onChange={e => updD(i, "p", e.target.value)} />
              <label className={lbl}>방문 사유 (선택)</label>
              <input className={inp} type="text" value={d.r} placeholder="예: 업무협의" onChange={e => updD(i, "r", e.target.value)} />
            </div>
          ))}
          <Btn small onClick={() => setS(prev => ({ ...prev, dests: [...prev.dests, { p: "", r: "" }] }))}>+ 목적지 추가</Btn>
          <div className={ibox}>출장지는 감사 대비 기록 목적입니다. 비용 계산에는 영향이 없습니다.</div>
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <Btn onClick={() => upd({ step: 0 })}>← 이전</Btn>
          <Btn primary disabled={!s.dests.some(d => d.p)} onClick={() => upd({ step: 2 })}>다음 →</Btn>
        </div>
      </>}

      {/* ── STEP 2: 시간 ── */}
      {s.step === 2 && <>
        <div className="text-lg font-medium mb-5">출장 시간을 입력하세요</div>
        <div className={card}>
          <div className={ct}>출발 일시</div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>날짜</label><input className={inp} type="date" value={s.sd} onChange={e => {
                const v = e.target.value;
                const updates = { sd: v };
                if(s.ed && v > s.ed) { updates.ed = v; updates.et = ""; }
                upd(updates);
              }} /></div>
            <div>
              <label className={lbl}>시간</label>
              <TimeInput value={s.st} onChange={v => {
                const updates = { st: v };
                if(s.ed === s.sd && s.et && v > s.et) updates.et = v;
                upd(updates);
              }} />
            </div>
          </div>
        </div>
        <div className={card}>
          <div className={ct}>종료 일시</div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>날짜</label><input className={inp} type="date" value={s.ed}
              min={s.sd}
              onChange={e => {
                const v = e.target.value;
                if(s.sd && v < s.sd) upd({ ed: s.sd, et: s.st || "" });
                else upd({ ed: v });
              }} /></div>
            <div>
              <label className={lbl}>시간</label>
              <TimeInput value={s.et} onChange={v => {
                if(s.ed === s.sd && s.st && v < s.st) upd({ et: s.st });
                else upd({ et: v });
              }} />
            </div>
          </div>
        </div>
        {h !== null && (
          h <= 0
            ? <div className={ebox}>⚠️ 종료시간이 시작시간보다 빠릅니다. 확인하세요.</div>
            : <div className={h >= 4 ? obox : ibox}>소요시간: <strong>{fmtH(h)}</strong> — {h >= 4 ? "4시간 이상 → 20,000원" : "4시간 미만 → 10,000원"} (제16조①)</div>
        )}
        <div className={card + " mt-4"}>
          <div className={ct}>출장 사유</div>
          <textarea className={inp + " resize-y min-h-[60px]"} placeholder="출장 목적을 간략히 입력하세요" value={s.reason} onChange={e => upd({ reason: e.target.value })} />
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <Btn onClick={() => upd({ step: 1 })}>← 이전</Btn>
          <Btn primary disabled={!(h !== null && h > 0)} onClick={() => upd({ step: 3 })}>다음 →</Btn>
        </div>
      </>}

      {/* ── STEP 3: 관용차 ── */}
      {s.step === 3 && <>
        <div className="text-lg font-medium mb-5">관용차 이용 여부를 선택하세요</div>
        <div className={card}>
          <div className={ct}>관용차 이용 여부</div>
          <div className="flex gap-2 mt-1">
            <TBtn sel={s.gov === false} onClick={() => upd({ gov: false })}>이용 안 함</TBtn>
            <TBtn sel={s.gov === true} onClick={() => upd({ gov: true })}>관용차 이용</TBtn>
          </div>
          {s.gov === true && <div className={ebox}>여비규칙 제13조에 따라 관용차 이용 시 운임 미지급입니다.<br />근무지 내 출장의 여비(일비)가 지급되지 않습니다.</div>}
          {s.gov === false && <div className={obox}>관용차 미이용 — 정액 지급 대상입니다.</div>}
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <Btn onClick={() => upd({ step: 2 })}>← 이전</Btn>
          <Btn primary disabled={s.gov === null} onClick={() => upd({ step: 4 })}>다음 →</Btn>
        </div>
      </>}

      {/* ── STEP 4: 서비스 ── */}
      {s.step === 4 && <>
        <div className="text-lg font-medium mb-5">차량운행지원서비스 이용 여부</div>
        <div className={card}>
          <div className={ct}>차량운행지원서비스 (제15조 제5항)</div>
          <div className="flex flex-wrap gap-2 mt-1">
            <TBtn sel={s.svcT === "none"} onClick={() => upd({ svcT: "none" })}>미이용</TBtn>
            <TBtn sel={s.svcT === "oneway"} onClick={() => upd({ svcT: "oneway" })}>편도 이용 (−5,000원)</TBtn>
            <TBtn sel={s.svcT === "round"} onClick={() => upd({ svcT: "round" })}>왕복 이용 (−10,000원)</TBtn>
          </div>
          {s.svcT && s.svcT !== "none" && (
            <div className={wbox}>편도당 5,000원이 일비에서 차감됩니다. 차감액: {W(s.svcT === "oneway" ? 5000 : 10000)}</div>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <Btn onClick={() => upd({ step: 3 })}>← 이전</Btn>
          <Btn primary disabled={!s.svcT} onClick={() => upd({ step: 5 })}>다음 →</Btn>
        </div>
      </>}

      {/* ── STEP 5: 동행자 ── */}
      {s.step === 5 && <>
        <div className="text-lg font-medium mb-5">동행 출장 여부를 확인하세요</div>
        <div className={card}>
          <div className={ct}>상급자 동행 여부</div>
          <div className="flex gap-2 mt-1">
            <TBtn sel={s.comp === false} onClick={() => upd({ comp: false })}>단독 출장</TBtn>
            <TBtn sel={s.comp === true} onClick={() => upd({ comp: true })}>동행 출장</TBtn>
          </div>
          {s.comp === true && <>
            <div className={ibox + " mb-3"}>
              A경로는 일비(정액)만 지급 항목입니다.<br />
              동도출장 운임·숙박비·식비 상향 적용 대상이 아닙니다 (제4조①).<br />
              동행자 정보는 기록 목적으로 보고서에 명시됩니다.
            </div>
            {s.comps.map((c, i) => (
              <div key={i} className="border border-gray-100 rounded-lg p-3 mb-2">
                {i > 0 && <div className="flex justify-end mb-2"><Btn small onClick={() => setS(prev => ({ ...prev, comps: prev.comps.filter((_, j) => j !== i) }))}>삭제</Btn></div>}
                <label className={lbl}>동행자 {i + 1} 성명</label>
                {/* React controlled input — 한국어 IME 정상 작동 */}
                <input className={inp} type="text" value={c.n} placeholder="성명을 입력하세요" onChange={e => updC(i, "n", e.target.value)} />
                <label className={lbl}>직급</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {GRADES.map(g => <TBtn key={g} small sel={c.g === g} onClick={() => updC(i, "g", g)}>{g}</TBtn>)}
                </div>
              </div>
            ))}
            <Btn small onClick={() => setS(prev => ({ ...prev, comps: [...prev.comps, { n: "", g: "" }] }))}>+ 동행자 추가</Btn>
          </>}
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <Btn onClick={() => upd({ step: 4 })}>← 이전</Btn>
          <Btn primary disabled={s.comp === null} onClick={() => upd({ step: 6 })}>다음 →</Btn>
        </div>
      </>}

      {/* ── STEP 6: 검증 ── */}
      {s.step === 6 && <>
        <div className="text-lg font-medium mb-5">계산 전 조건 검증</div>
        <div className={card}>
          <div className={ct}>검증 결과</div>
          {chks.map((c, i) => (
            <div key={i} className={"flex gap-2 items-start py-2 text-sm "+(i < chks.length - 1 ? "border-b border-gray-100" : "")}>
              <span className="shrink-0">{c.ok === true ? "✅" : c.ok === null ? "ℹ️" : "⚠️"}</span>
              <span>{c.msg}</span>
            </div>
          ))}
        </div>
        {hasErr
          ? <div className={ebox}>⚠️ 오류 항목이 있습니다. 이전 단계로 돌아가 수정 후 진행하세요.</div>
          : <div className={obox}>모든 항목 검증 완료. 계산을 진행할 수 있습니다.</div>
        }
        <div className="flex justify-end gap-3 mt-5">
          <Btn onClick={() => upd({ step: 5 })}>← 이전</Btn>
          <Btn primary disabled={hasErr} onClick={() => upd({ step: 7, adjustments: [] })}>계산하기 →</Btn>
        </div>
      </>}

      {/* ── STEP 7: 결과 ── */}
      {s.step === 7 && <>
        <div className="text-lg font-medium mb-5">계산 결과 및 금액 조정</div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[["기본 지급액", W(res.base), ""], ["서비스 차감", "−" + W(res.svc), "text-red-500"], ["규정 계산액", W(res.tot), "text-blue-500"]].map(([label, val, cls]) => (
            <div key={label} className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">{label}</div>
              <div className={"text-lg font-medium "+cls}>{val}</div>
            </div>
          ))}
        </div>
        <div className={card}>
          <div className={ct}>감액 조정 (B·C경로 동일 방식)</div>
          <div className={ibox + " mb-4 text-xs"}>
            감액만 가능합니다. 증액 시 처음부터 재계산하세요.<br/>
            감액 시 사유 입력 필수 — 보고서에 명시됩니다.
          </div>
          {res.tot > 0 && (()=>{
            const adj=(s.adjustments||[]).find(a=>a.key==="일비");
            const setA=patch=>upd({adjustments:adj
              ?(s.adjustments||[]).map(a=>a.key==="일비"?{...a,...patch}:a)
              :[...(s.adjustments||[]),{key:"일비",orig:res.tot,deduct:0,reason:"",...patch}]});
            const remA=()=>upd({adjustments:(s.adjustments||[]).filter(a=>a.key!=="일비")});
            return(
              <div className={"border rounded-xl p-4 mb-3 "+(adj?"border-amber-300 bg-amber-50/30":"border-gray-100")}>
                <div className="flex items-center justify-between mb-2">
                  <div><span className="text-sm font-medium">일비</span><span className="text-xs text-gray-400 ml-2">산출: {W(res.tot)}</span></div>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={!!adj}
                      onChange={e=>{if(e.target.checked)setA({deduct:0,reason:""});else remA();}}
                      className="w-4 h-4 accent-amber-500"/>
                    <span className="text-xs text-amber-600">감액</span>
                  </label>
                </div>
                {adj&&<>
                  <input className={inp} type="text" inputMode="numeric" value={adj.deduct||""}
                    placeholder={"최대 "+W(res.tot)}
                    onChange={e=>{
                      let n=parseInt(e.target.value.replace(/[^0-9]/g,""))||0;
                      if(n>res.tot){alert("⚠️ 증액 불가.");n=res.tot;}
                      setA({deduct:n});
                    }}/>
                  {adj.deduct>0&&<div className="flex justify-between text-sm mt-2 p-2 bg-white rounded-lg border border-amber-200"><span className="text-gray-500">최종값</span><span className="font-medium text-amber-700">{W(res.tot-adj.deduct)}</span></div>}
                  <div className="block text-sm text-gray-500 mb-1 mt-3">감액 사유 <span className="text-red-500">*필수</span></div>
                  <input className={inp} type="text" value={adj.reason||""}
                    placeholder="예: 외부 일비 지원, 영수증 분실로 일부 미청구"
                    onChange={e=>setA({reason:e.target.value})}/>
                </>}
                {!adj&&<div className="text-xs text-gray-400">감액 없음 — 산출값 그대로 청구</div>}
              </div>
            );
          })()}
        </div>
        <div className="border-2 border-blue-400 rounded-xl p-5 mb-4">
          <div className="text-xs text-gray-500 mb-1">최종 개인 지급액</div>
          <div className="text-3xl font-medium text-blue-500">{W(adjV)}</div>
          <div className="text-xs text-gray-400 mt-1">법인카드 집행액: 0원 (해당없음)</div>
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <Btn onClick={() => upd({ step: 6 })}>← 이전</Btn>
          <Btn primary disabled={!canFin} onClick={() => upd({ step: 8 })}>보고서 출력 →</Btn>
        </div>
      </>}

      {/* ── STEP 8: 보고서 ── */}
      {s.step === 8 && <>
        <div className="text-lg font-medium mb-5">정산 보고서</div>
        <div className="space-y-3 mb-4">
          <button className={"w-full border-2 rounded-xl p-4 text-left cursor-pointer "+(printed?"border-green-200 bg-green-50/30":"border-blue-400 hover:bg-blue-50")}
            onClick={()=>{setReportHTML(genHTML(s));setPrinted(true);}}>
            <div className={"font-medium mb-0.5 "+(printed?"text-green-600":"text-blue-600")}>{printed?"✅ 보고서 저장됨 (재저장 가능)":"💾 보고서 저장 (HTML)"}</div>
            <div className="text-xs text-gray-400">HTML 저장 후 브라우저에서 열고 Ctrl+P → PDF 저장</div>
          </button>
          <button className={"w-full border-2 rounded-xl p-4 text-left cursor-pointer "+(saved?"border-green-200 bg-green-50/30":"border-gray-300 hover:bg-gray-50")}
            onClick={()=>{
              try {
                const blob = new Blob([JSON.stringify({v:"A",t:new Date().toISOString(),d:s},null,2)],{type:"application/json"});
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = mkN(s,"json");
                document.body.appendChild(a); a.click();
                document.body.removeChild(a);
                setTimeout(()=>URL.revokeObjectURL(url),500);
                setSaved(true);
              } catch(e){alert("저장 오류: "+e.message);}
            }}>
            <div className={"font-medium mb-0.5 "+(saved?"text-green-600":"text-gray-700")}>{saved?"✅ 데이터 저장됨 (재저장 가능)":"📋 데이터 저장 (JSON)"}</div>
            <div className="text-xs text-gray-400">파일명: {mkN(s,"json")}</div>
          </button>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-xs text-blue-800 mb-4">
          💾 HTML: 보고서 저장 후 Ctrl+P로 PDF 출력<br/>
          📋 JSON: 정산 데이터 보관 및 추후 검토용
        </div>
        <div className="flex justify-between mt-5">
          <Btn onClick={() => upd({ step: 7 })}>← 수정</Btn>
          <Btn primary onClick={()=>{setS(init());setPrinted(false);setSaved(false);}}>새 정산 시작</Btn>
        </div>
      </>}
    </div>
  );
}

