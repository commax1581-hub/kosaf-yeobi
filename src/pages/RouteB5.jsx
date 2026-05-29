import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const fmtW = n => Math.round(n||0).toLocaleString("ko-KR")+"원";
const MEAL_UNIT = 8333;
const card = "bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5";
const ct   = "text-xs font-medium text-gray-500 uppercase tracking-wider mb-3";
const inp  = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white text-gray-900";
const lbl  = "block text-sm text-gray-500 mb-1 mt-3";
const lbl0 = "block text-sm text-gray-500 mb-1";
const ibox = "bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800 leading-relaxed";
const obox = "bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800 leading-relaxed";
const wbox = "bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 leading-relaxed";
const ebox = "bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800 leading-relaxed";

const Btn = ({primary,disabled,onClick,children,small}) => (
  <button
    className={"rounded-xl font-semibold transition-all "+(small?"px-3 py-1.5 text-xs":"px-5 py-2.5 text-sm")+" "+(primary?"bg-blue-600 text-white hover:bg-blue-700 shadow-sm":"bg-white border border-gray-200 text-gray-700 hover:bg-gray-50")+" "+(disabled?"opacity-40 cursor-not-allowed":"cursor-pointer")}
    onClick={disabled?undefined:onClick}
  >{children}</button>
);

/* ── 이미지 압축 ── */
async function compressImage(file){
  return new Promise(res=>{
    const r=new FileReader();
    r.onload=e=>{
      const img=new Image();
      img.onload=()=>{
        const MAX=1200,ratio=Math.min(MAX/img.width,MAX/img.height,1);
        const c=document.createElement("canvas");
        c.width=Math.round(img.width*ratio);c.height=Math.round(img.height*ratio);
        c.getContext("2d").drawImage(img,0,0,c.width,c.height);
        res({base64:c.toDataURL("image/jpeg",0.8),name:file.name});
      };
      img.src=e.target.result;
    };
    r.readAsDataURL(file);
  });
}

/* ── 동적 첨부 항목 ── */
function buildDynCats(transport){
  const cats=[],seen=new Set();
  const add=(k,l,g,r,n)=>{if(seen.has(k))return;seen.add(k);cats.push({key:k,label:l,group:g,required:r,note:n});};
  (transport||[]).forEach((t,i)=>{
    const s=t.seg||"구간"+(i+1);
    if(t.type==="car"&&t.carMode==="fuel"){
      add("map_"+i,"이동경로 — "+s,"route",true,"지도 캡처");
      add("opinet","오피넷 유가 캡처","proof",true,"출장 시작일 기준");
      if(t.hasToll) add("toll_"+i,"통행료 영수증 — "+s,"receipt",false,"");
      if(t.hasParking) add("park_"+i,"주차료 영수증 — "+s,"receipt",false,"");
    }
    if(t.type==="car"&&t.carMode==="public") add("pf_"+i,"대중교통 요금표 — "+s,"proof",true,"");
    if(t.type==="gov"&&t.hasParking) add("gpk_"+i,"주차료 영수증 — "+s,"receipt",false,"관용차");
    if(["ktx","bus","air","ship"].includes(t.type)) add("tk_"+i,"탑승권 — "+s,"receipt",false,"선택");
  });
  return cats;
}

/* ── 금액 계산 ── */
function calcAmounts(data){
  const tr=data.transport||[],ac=(Array.isArray(data.accom)?data.accom:[]).flatMap(a=>a.nights||[]),db=data.dayBasis||[];
  const I=n=>parseInt(n)||0;
  return {
    corpTransport:      tr.reduce((s,t)=>s+(t.cardType==="corp"?I(t.fare):0),0),
    personalTransport:  tr.reduce((s,t)=>{
      if(t.cardType==="corp"||t.cardType==="gov") return s;
      return s+(t.type==="car"&&t.carMode==="public"?I(t.pubFare):I(t.fare));
    },0),
    corpAccom:          ac.reduce((s,n)=>s+(n.cardType==="corp"?I(n.amount):0),0),
    personalAccom:      ac.reduce((s,n)=>s+(n.type==="relative"?20000:n.cardType!=="corp"&&I(n.amount)>0?I(n.amount):0),0),
    dayTotal:           db.reduce((s,d)=>s+(d.dayDeduct?12500:25000),0),
    mealTotal:          db.reduce((s,d)=>s+Math.max(0,25000-[d.b,d.l,d.d].filter(Boolean).length*MEAL_UNIT),0),
  };
}

/* ── 검증 항목 ── */
function buildChecks(data){
  const gov=data.transport && Array.isArray(t=>t.type==="gov");
  const car=data.transport && Array.isArray(t=>t.type==="car");
  const comp=(data.companions||[]).length>0;
  return [
    {ok:data.travelDays>0,  warn:false,label:"여행일수",     msg:data.travelDays+"일",              ref:"제3조"},
    {ok:true,               warn:false,label:"동도출장 일비", msg:comp?"본인 직급 유지":"단독출장",   ref:"제4조①"},
    {ok:true, warn:gov||car,label:"차량 일비 감액",msg:(gov||car)?"감액 확인":"차량 미이용",         ref:"제14조"},
    {ok:true,               warn:false,label:"숙박비 상한",   msg:"이내 ✅",                          ref:"제11조"},
    {ok:true,               warn:false,label:"식비 차감",     msg:"완료",                             ref:"제15조④"},
    {ok:true,               warn:false,label:"동승자 운임",   msg:comp?"확인":"해당없음",             ref:"별표1"},
    {ok:true,               warn:false,label:"법인카드 중복", msg:"0원 처리 ✅",                      ref:"제10조의2"},
    {ok:(data.extSupport&&data.extSupport.hasTransport!==null),warn:false,label:"외부여비 공제",
      msg:(data.extSupport&&data.extSupport.hasTransport)?"지원 반영":"없음",ref:"제15조④"},
  ];
}

/* ── 파일명 생성 ── */
function mkName(data,ext,type){
  const d=(data.startDate||"").replace(/-/g,"");
  const t=(data.startTime||"0900").replace(":","");
  return d+"_"+t+"_"+type+"_"+(data.name||"출장자")+"."+ext;
}

/* ── JSON 저장 ── */
function saveJSON(data,amounts,adjustments,checks,type){
  const blob=new Blob([JSON.stringify({v:"B",version:"1.0",savedAt:new Date().toISOString(),type,data,amounts,adjustments,checks,
      steps:{
        b_step1: (() => { try { return JSON.parse(localStorage.getItem("b_step1")||"null"); } catch{return null;} })(),
        b_step2: (() => { try { return JSON.parse(localStorage.getItem("b_step2")||"null"); } catch{return null;} })(),
        b_step3: (() => { try { return JSON.parse(localStorage.getItem("b_step3")||"null"); } catch{return null;} })(),
        b_step4: (() => { try { return JSON.parse(localStorage.getItem("b_step4")||"null"); } catch{return null;} })(),
      }
    },null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download=mkName(data,"json",type);
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url),500);
}


/* ── mailto ── */
function mailto(data,type){
  const s=encodeURIComponent("[출장비정산] "+type+" - "+(data.name||"")+" ("+(data.startDate||"").replace(/-/g,".")+")");
  const b=encodeURIComponent("안녕하세요,\n\n출장비 정산 보고서를 송부합니다.\n\n신청자: "+(data.name||"-")+"\n구분: "+type+"\n기간: "+(data.startDate||"")+" ~ "+(data.endDate||"")+"\n\n※ PDF 파일을 첨부해 주세요.\n\n감사합니다.");
  window.location.href="mailto:?subject="+s+"&body="+b;
}

/* ── 보고서 HTML ── */
function genHTML(data,cats,imgs,extra,amt,adjs){
  const {corpTransport:cT,personalTransport:pT,corpAccom:cA,personalAccom:pA,dayTotal:dT,mealTotal:mT}=amt;
  const totalD=adjs.reduce((s,a)=>s+(a.deduct||0),0);
  const fin=Math.max(0,pT+pA+dT+mT-totalD);
  const W=n=>Math.round(n||0).toLocaleString("ko-KR")+"원";
  const css="@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap');body{font-family:'Noto Sans KR',sans-serif;font-size:13px;margin:24px}h1{font-size:17px;font-weight:700;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:16px;color:#111}h2{font-size:13px;font-weight:700;color:#111;background:#f0f0f0;padding:4px 8px;margin:14px 0 4px;border-left:3px solid #333}table{width:100%;border-collapse:collapse;margin-bottom:8px}th{background:#333;color:#fff;padding:5px 8px;text-align:left;font-weight:500;font-size:12px}td{padding:5px 8px;border-bottom:1px solid #ddd}.g{color:#666;font-size:12px}.b{font-weight:700}.sum{border:2px solid #111;padding:12px;margin:12px 0;background:#f8f8f8}.r{display:flex;justify-content:space-between;padding:3px 0;font-size:13px}.rf{border-top:2px solid #111;margin-top:8px;padding-top:8px;font-size:16px;font-weight:700}.pg{page-break-before:always;padding:20px}.g4{display:grid;grid-template-columns:1fr 1fr;gap:12px}.gi{border:1px solid #ddd;border-radius:4px;padding:8px}.gl{font-size:12px;font-weight:600;margin-bottom:6px}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}";

  const trs=(data.transport||[]).map(t=>{
    const isPubCar=t.type==="car"&&t.carMode==="public";
    const isFuelCar=t.type==="car"&&t.carMode==="fuel";
    const dispFare=isPubCar?I(t.pubFare):I(t.fare);
    const dispNote=isPubCar?"자가용(대중교통준용)":isFuelCar?"자가용(연료비)":t.note||t.type||"";
    return "<tr><td>"+(t.seg||"")+"</td><td>"+dispNote+"</td><td class=g>"+(t.cardType==="corp"?W(dispFare):"—")+"</td><td class=b>"+(t.cardType!=="corp"&&t.cardType!=="gov"?W(dispFare):"0원")+"</td></tr>";
  }).join("");
  const ars=(Array.isArray(data.accom)?data.accom:[]).flatMap((a)=>(a.nights||[]).map((n,ni)=>"<tr><td>"+a.region+"</td><td>"+(ni+1)+"박</td><td>"+(n.type==="hotel"?"일반":n.type==="relative"?"친지집":n.type==="provided"?"기관제공":"미숙박")+"</td><td class=g>"+(n.cardType==="corp"?W(n.amount||0):"—")+"</td><td class=b>"+(n.type==="relative"?W(20000):n.cardType!=="corp"&&n.amount>0?W(n.amount):"0원")+"</td></tr>")).join("");
  const drs=(data.dayBasis||[]).map(da=>{const c=[da.b,da.l,da.d].filter(Boolean).length;return"<tr><td>"+da.dayNum+"일차 "+da.label+"</td><td>"+(da.dayDeduct?"관용차 이용":"정상")+"</td><td class=b>"+(da.dayDeduct?W(12500)+"(½)":W(25000))+"</td><td class=b>"+W(Math.max(0,25000-c*8333))+(c?" ("+c+"식 차감)":"")+"</td></tr>";}).join("");
  const adjS=adjs.length?"<h2>나-4. 감액 조정</h2><table><tr><th>항목</th><th>산출값</th><th>감액</th><th>최종값</th><th>사유</th></tr>"+adjs.map(a=>"<tr><td>"+a.key+"</td><td>"+W(a.orig)+"</td><td style=font-weight:600>−"+W(a.deduct)+"</td><td class=b>"+W(a.orig-a.deduct)+"</td><td>"+a.reason+"</td></tr>").join("")+"</table>":"";
  const compsStr=((data.companions||[]).map(c=>c.name+"("+c.grade+")").join(", "))||"없음";

  const imgPages=(rI,pI,rR,xI)=>{
    const all=[...rI,...pI,...rR,...xI];
    if(!all.length) return "";
    const rows=[];
    for(let i=0;i<all.length;i+=4){
      const chunk=all.slice(i,i+4);
      rows.push("<div class=pg><h2>첨부 증빙자료 "+(rows.length+1)+"</h2><div class=g4>"+chunk.map(it=>"<div class=gi><div class=gl>"+it.label+"</div><img src='"+it.img.base64+"' style='width:100%;max-height:320px;object-fit:contain'/></div>").join("")+"</div></div>");
    }
    return rows.join("");
  };

  const rI=cats.filter(c=>c.group==="route"&&imgs[c.key]&&imgs[c.key].base64).map(c=>({label:c.label,img:imgs[c.key]}));
  const pI=cats.filter(c=>c.group==="proof"&&imgs[c.key]&&imgs[c.key].base64).map(c=>({label:c.label,img:imgs[c.key]}));
  const rR=cats.filter(c=>c.group==="receipt"&&imgs[c.key]&&imgs[c.key].base64).map(c=>({label:c.label,img:imgs[c.key]}));
  const xI=(extra||[]).filter(e=>e.img&&e.img.base64).map(e=>({label:e.name||"추가증빙",img:e.img}));

  return "<!DOCTYPE html><html lang=ko><head><meta charset=UTF-8><title>국내 출장비 정산 보고서</title><style>"+css+"</style></head><body>"
    +"<h1>국내 출장비 정산 보고서 <span style='background:linear-gradient(135deg,#1a5c38,#27ae60);color:#fff;font-size:11px;padding:3px 10px;border-radius:20px;font-weight:500;vertical-align:middle'>B경로</span></h1>"
    +"<h2>가. 출장 기본정보</h2>"
    +"<table><tr><th>항목</th><th>내용</th></tr>"
    +"<tr><td class=g>소속부서</td><td>"+(data.dept||"—")+"</td></tr>"
    +"<tr><td class=g>신청자</td><td><b>"+(data.name||"—")+" ("+data.grade+")</b></td></tr>"
    +"<tr><td class=g>출장기간</td><td>"+(data.startDate||"").replace(/-/g,".")+" "+(data.startTime||"")+" ~ "+(data.endDate||"").replace(/-/g,".")+" "+(data.endTime||"")+" ("+data.travelDays+"일)</td></tr>"
    +"<tr><td class=g>출장지</td><td>"+(data.routes||[]).map(r=>r.region+(r.place?" ("+r.place+")":"")).join(" → ")+"</td></tr>"
    +"<tr><td class=g>출장 사유</td><td>"+((data.routes||[]).some(r=>r.reason)?(data.routes||[]).map((r,i)=>(data.routes.length>1?"목적지"+(i+1)+": ":"")+( r.reason||"—")).join(" / "):"(미입력)")+"</td></tr>"
    +"<tr><td class=g>동행자</td><td>"+compsStr+"</td></tr>"
    +"</table>"
    +"<h2>나. 비용항목 정산</h2>"
    +"<h2>나-1. 교통비  (여비규칙 제11조)</h2>"
    +"<table><tr><th>구간</th><th>수단</th><th>법인카드</th><th>개인지급</th></tr>"
    +trs
    +"<tr style=background:#f0f0f0><td colspan=2><b>소계</b></td><td class=b>"+W(cT)+"</td><td class=b>"+W(pT)+"</td></tr>"
    +"</table>"
    +"<h2>나-2. 숙박비  (여비규칙 제12조)</h2>"
    +"<table><tr><th>지역</th><th>박차</th><th>형태</th><th>법인카드</th><th>개인지급</th></tr>"
    +ars
    +"<tr style=background:#f0f0f0><td colspan=3><b>소계</b></td><td class=b>"+W(cA)+"</td><td class=b>"+W(pA)+"</td></tr>"
    +"</table>"
    +"<h2>나-3. 일비 · 식비  (여비규칙 제14조, 별표1)</h2>"
    +"<p style=font-size:12px;color:#666;margin:2px 0 4px>일비 기준: 25,000원/일 &nbsp;|&nbsp; 식비 기준: 25,000원/일, 식사 차감 8,333원/식</p>"
    +"<table><tr><th>일차</th><th>일비 구분</th><th>일비</th><th>식비</th></tr>"
    +drs
    +"<tr style=background:#f0f0f0><td colspan=2><b>소계</b></td><td class=b>"+W(dT)+"</td><td class=b>"+W(mT)+"</td></tr>"
    +"</table>"
    +adjS
    +"<h2>다. 최종 정산 금액</h2>"
    +"<div class=sum>"
    +"<div class=r><span class=g>법인카드 집행액</span><span>"+W(cT+cA)+"</span></div>"
    +"<div class=r><span class=g>개인지급 소계 (교통+숙박+일비+식비)</span><span>"+W(pT+pA+dT+mT)+"</span></div>"
    +(totalD?"<div class=r><span class=g>감액</span><span style=font-weight:600>−"+W(totalD)+"</span></div>":"")
    +"<div class='r rf'><span>◆ 최종 개인 지급 청구액</span><span>"+W(fin)+"</span></div>"
    +"</div>"
    +imgPages(rI,pI,rR,xI)
    +"</body></html>";
}


/* ── localStorage에서 1~4단계 통합 불러오기 ── */
function loadFromStorage() {
  try {
    const s1 = JSON.parse(localStorage.getItem("b_step1")||"null");
    const s2 = JSON.parse(localStorage.getItem("b_step2")||"null");
    const s3 = JSON.parse(localStorage.getItem("b_step3")||"null");
    const s4 = JSON.parse(localStorage.getItem("b_step4")||"null");
    if (!s1) return null;
    const days = (s4&&s4.dayBasis)||[];
    return {
      dept:        s1.dept||"",
      origin:      s1.origin||s1.dept||"",
      grade:       s1.grade||"",
      name:        s1.name||"",
      startDate:   s1.startDate||"",
      startTime:   s1.startTime||"09:00",
      endDate:     s1.endDate||"",
      endTime:     s1.endTime||"18:00",
      travelDays:  days.length||0,
      hasComp:     s1.hasComp||false,
      companions:  s1.companions||[],
      routes:      s1.routes||[],
      transport:   ((s2&&s2.transport)||[]),
      accom:       (Array.isArray(s3&&s3.accom) ? s3.accom : []),
      dayBasis:    days,
      extSupport:  (s4&&s4.extSupport)||{hasTransport:false,hasMeal:false},
    };
  } catch { return null; }
}


function clearStorage() {
  ["b_step1","b_step2","b_step3","b_step4"].forEach(k=>{
    try{localStorage.removeItem(k);}catch{}
  });
}
/* ── 샘플 데이터 (localStorage 없을 때 fallback) ── */
const SAMPLE={grade:"팀원",name:"홍길동",startDate:"2026-04-09",startTime:"09:00",endDate:"2026-04-13",endTime:"18:00",travelDays:5,companions:[{name:"김팀장",grade:"부서장·팀장"}],routes:[{region:"서울특별시",nights:2},{region:"대전광역시",nights:2}],transport:[{seg:"대구→서울",type:"car",carMode:"fuel",fuelType:"gasoline",hasToll:true,hasParking:false,fare:52300,cardType:"personal"},{seg:"서울→대전",type:"gov",hasParking:false,fare:0,cardType:"gov"},{seg:"대전→대구",type:"ktx",fare:18400,cardType:"corp",note:"KTX"}],accom:[{region:"서울특별시",nights:[{type:"hotel",amount:95000,cardType:"corp"},{type:"relative",amount:20000,cardType:"self"}]},{region:"대전광역시",nights:[{type:"hotel",amount:75000,cardType:"corp"},{type:"none",amount:0}]}],dayBasis:[{dayNum:1,label:"4/9(목)",dayDeduct:true,b:false,l:false,d:false},{dayNum:2,label:"4/10(금)",dayDeduct:true,b:false,l:true,d:false},{dayNum:3,label:"4/11(토)",dayDeduct:false,b:false,l:false,d:false},{dayNum:4,label:"4/12(일)",dayDeduct:false,b:false,l:false,d:false},{dayNum:5,label:"4/13(월)",dayDeduct:false,b:false,l:false,d:false}],extSupport:{hasTransport:false,hasMeal:false}};

/* ── ImageUploadBox — App 밖 정의 (타이핑·IME 안전) ── */
const ImageUploadBox=({label,note,required,img,loading,onUpload,onRemove})=>{
  const ref=useRef();
  return(
    <div className={"border rounded-xl p-3 mb-2 "+(required&&!img?"border-amber-300 bg-amber-50/20":"border-gray-200")}>
      <div className="flex items-start justify-between mb-1.5">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-gray-800">{label}</span>
            {required?<span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">필수</span>
                     :<span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">선택</span>}
          </div>
          {note&&<div className="text-xs text-gray-400 mt-0.5">{note}</div>}
        </div>
        {img&&<button className="text-xs text-red-400" onClick={onRemove}>삭제</button>}
      </div>
      {loading?<div className="text-xs text-blue-500 py-3 text-center">압축 중...</div>
      :img?<div><img src={img.base64} alt={label} className="w-full max-h-36 object-contain border border-gray-100 rounded-lg"/><div className="text-xs text-green-600 mt-1">✅ {img.name}</div></div>
      :<div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30" onClick={()=>ref.current&&ref.current.click()}>
        <div className="text-gray-400 text-sm">클릭하여 업로드</div>
        <div className="text-gray-300 text-xs mt-0.5">자동 압축 (최대 1200px · 80%)</div>
      </div>}
      <input ref={ref} type="file" accept="image/*" className="hidden"
        onChange={e=>{const f=e.target.files&&e.target.files[0];if(f)onUpload(f);e.target.value="";}}/>
    </div>
  );
};

const STEPS=["이미지","검증","감액조정","보고서","저장완료"];
const ROUTE_TYPE="국내출장";

/* ══════════════ 메인 ══════════════ */
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







export default function RouteB5(){
  const navigate = useNavigate();
  const [screen,setScreen]=useState("start");
  const [step,setStep]=useState(0);
  const [data,setData]=useState(SAMPLE);
  const [images,setImages]=useState({});
  const [extraImgs,setExtraImgs]=useState([]);
  const [loadingKey,setLoadingKey]=useState(null);
  const [adjustments,setAdjustments]=useState([]);
  const [saved,setSaved]=useState(false);
  const [reportHTML,setReportHTML]=useState(null);
  const [pdfDone,setPdfDone]=useState(false);
  const loadRef=useRef();

  /* ── B4에서 진입 or JSON 불러오기 ── */
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("kosaf_json_load");
      if (raw) {
        const j = JSON.parse(raw);
        sessionStorage.removeItem("kosaf_json_load");
        if (j.v === "B" && j.data) {
          setData(j.data);
          setAdjustments(j.adjustments||[]);
          setImages({});setExtraImgs([]);setStep(0);setScreen("main");
          return;
        }
      }
    } catch(e) {}
    const loaded = loadFromStorage();
    if (loaded) {
      setData(loaded);
      setAdjustments([]);
      setImages({});
      setExtraImgs([]);
      setStep(0);
      setScreen("main");
    }
  }, []);

  /* ── 브라우저 닫기 경고 ── */
  useEffect(() => {
    const fn = e => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', fn);
    return () => window.removeEventListener('beforeunload', fn);
  }, []);


  const dynCats=buildDynCats(data.transport);
  const reqCats=dynCats.filter(c=>c.required);
  const missingReq=reqCats.filter(c=>!images[c.key]);
  const amounts=calcAmounts(data);
  const checks=buildChecks(data);

  const uploadImg=useCallback(async(key,file)=>{
    setLoadingKey(key);
    try{const r=await compressImage(file);setImages(p=>({...p,[key]:r}));}
    finally{setLoadingKey(null);}
  },[]);
  const removeImg=useCallback(key=>setImages(p=>{const n={...p};delete n[key];return n;}),[]);
  const addExtra=()=>setExtraImgs(p=>[...p,{id:Date.now(),name:"",img:null}]);
  const updExtraName=useCallback((id,v)=>setExtraImgs(p=>p.map(e=>e.id===id?{...e,name:v}:e)),[]);
  const uploadExtra=useCallback(async(id,file)=>{
    setLoadingKey("ex_"+id);
    try{const r=await compressImage(file);setExtraImgs(p=>p.map(e=>e.id===id?{...e,img:r,name:e.name||file.name}:e));}
    finally{setLoadingKey(null);}
  },[]);
  const removeExtra=(id)=>setExtraImgs(p=>p.filter(e=>e.id!==id));

  const pItems=[
    {key:"운임(개인)",orig:amounts.personalTransport},
    {key:"숙박비(개인)",orig:amounts.personalAccom},
    {key:"일비",orig:amounts.dayTotal},
    {key:"식비",orig:amounts.mealTotal},
  ].filter(i=>i.orig>0);
  const getAdj=key=>adjustments.find(a=>a.key===key);
  const setAdj=(key,orig,patch)=>setAdjustments(prev=>{
    const ex=prev.find(a=>a.key===key);
    if(ex) return prev.map(a=>a.key===key?{...a,...patch}:a);
    return [...prev,{key,orig,deduct:0,reason:"",...patch}];
  });
  const remAdj=key=>setAdjustments(p=>p.filter(a=>a.key!==key));
  const totalDeduct=adjustments.reduce((s,a)=>s+(a.deduct||0),0);
  const totalPersonal=amounts.personalTransport+amounts.personalAccom+amounts.dayTotal+amounts.mealTotal;
  const finalPersonal=totalPersonal-totalDeduct;

  const handleSave=()=>{saveJSON(data,amounts,adjustments,checks,ROUTE_TYPE);setSaved(true);};
  const handlePrint=()=>{
    setReportHTML(genHTML(data,dynCats,images,extraImgs,amounts,adjustments));
    setPdfDone(true);
  };
  const handleMail=()=>mailto(data,ROUTE_TYPE);
  const handleLoad=file=>{
    const r=new FileReader();
    r.onload=e=>{
      try{
        const j=JSON.parse(e.target.result);
        if(j.data){setData(j.data);if(j.adjustments)setAdjustments(j.adjustments);setImages({});setExtraImgs([]);setStep(0);setScreen("main");}
        else alert("올바른 정산 파일이 아닙니다.");
      }catch{alert("파일을 읽을 수 없습니다.");}
    };
    r.readAsText(file);
  };
  const reset=()=>{clearStorage();setScreen("start");setStep(0);setImages({});setExtraImgs([]);setAdjustments([]);setSaved(false);setPdfDone(false);};

  /* ── 시작 화면 ── */
  if(screen==="start") return(
    <div className="max-w-lg mx-auto p-4 pb-12" style={{background:"#f0f4ff",minHeight:"100vh"}}>
      <button onClick={()=>navigate("/")} className="flex items-center gap-1 text-sm text-gray-400 hover:text-blue-600 mb-3 cursor-pointer">
        ← 처음으로
      </button>
      <div className="rounded-2xl mb-4 overflow-hidden shadow-sm">
        <div style={{background:"linear-gradient(135deg,#1a5c38 0%,#27ae60 100%)"}} className="px-5 py-4">
          <div className="text-white font-bold text-2xl leading-tight mb-0.5">KOSAF 여비를 부탁해....</div>
          <div className="text-blue-200 text-sm">스마트 여비정산 시스템</div>
          <div className="text-blue-300 text-xs mt-1">B경로 5단계 — 검증 · 보고서</div>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
        <div className="text-sm font-semibold text-gray-700 mb-4">시작하기</div>
        <div className="space-y-3">
          <button className="w-full border-2 border-blue-200 rounded-xl p-4 text-left hover:bg-blue-50 cursor-pointer transition-all"
            onClick={()=>{
              const loaded = loadFromStorage();
              if(loaded) {
                setData(loaded);
                setAdjustments([]);setImages({});setExtraImgs([]);setStep(0);setScreen("main");
              } else {
                alert("⚠️ B1~B4 단계 입력 데이터가 없습니다.\n\nB1단계부터 순서대로 입력해 주세요.");
              }
            }}>
            <div className="font-semibold text-blue-600 mb-1">✅ 정산 검증 시작</div>
            <div className="text-xs text-gray-400">B1~B4 입력 데이터를 불러와 검증합니다</div>
          </button>
          <button className="w-full border-2 border-gray-200 rounded-xl p-4 text-left hover:bg-gray-50 cursor-pointer transition-all"
            onClick={()=>loadRef.current&&loadRef.current.click()}>
            <div className="font-semibold text-gray-700 mb-1">📂 저장된 정산 불러오기</div>
            <div className="text-xs text-gray-400">이전에 저장한 .json 파일로 재출력</div>
          </button>
          <input ref={loadRef} type="file" accept=".json" className="hidden"
            onChange={e=>{const f=e.target.files&&e.target.files[0];if(f)handleLoad(f);e.target.value="";}}/>
        </div>
      </div>
      <div className={wbox+" text-xs"}>
        <div className="flex gap-2">
          <span>⚠️</span>
          <div>
            <div>1. 브라우저를 닫으면 입력 내용이 초기화됩니다.</div>
            <div>2. 정산 완료 후 반드시 JSON 파일로 저장하세요.</div>
          </div>
        </div>
      </div>
    </div>
  );

  /* ── 5단계 메인 ── */
  return(
    <div className="max-w-2xl mx-auto p-4 pb-12" style={{background:"#f0f4ff",minHeight:"100vh"}}>
            {/* 뒤로가기 */}
      <button onClick={()=>navigate('/')} className="flex items-center gap-1 text-sm text-gray-400 hover:text-blue-600 mb-3 cursor-pointer">
        ← 처음으로
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
              <div className="bg-white/20 rounded-xl px-3 py-1.5 text-xs font-bold text-white">🅱 국내 일반 출장 — 5/5</div>
            </div>
          </div>
        </div>
      </div>
      {reportHTML && <ReportOverlay html={reportHTML} fileName={"B경로_"+(data.name||"출장자")+"_"+(data.startDate||"")} onClose={()=>setReportHTML(null)}/>}
      <div className="flex items-center gap-2 mb-4">
        <span className="bg-blue-500 text-white text-xs px-2.5 py-1 rounded-full font-medium">5단계</span>
        <span className="text-lg font-medium">검증 및 보고서 출력</span>
        <button className="ml-auto text-xs text-gray-400" onClick={()=>setScreen("start")}>← 처음</button>
      </div>
      <div className="flex gap-1 mb-1">
        {STEPS.map((_,i)=><div key={i} className={"flex-1 h-2 rounded-full "+(i<step?"bg-blue-500":i===step?"bg-blue-400":"bg-gray-200")}/>)}
      </div>
      <div className="flex mb-5">
        {STEPS.map((l,i)=><div key={i} className={"flex-1 text-center text-xs pt-1 "+(i===step?"text-blue-500 font-medium":"text-gray-400")}>{l}</div>)}
      </div>

      {/* STEP 0: 이미지 업로드 */}
      {step===0&&<>
        <div className={card}>
          <div className={ct}>첨부자료 ({Object.keys(images).length+extraImgs.filter(e=>e.img).length}장)</div>
          <div className={ibox+" mb-3 text-xs"}>교통수단 입력값에 따라 자동 생성된 항목입니다. 이미지는 자동 압축됩니다.</div>
          {missingReq.length>0&&<div className={wbox+" mb-3 text-xs"}>⚠️ 필수 미업로드: {missingReq.map(c=>c.label).join(", ")}</div>}
          {["route","proof","receipt"].map(grp=>{
            const items=dynCats.filter(c=>c.group===grp);
            if(!items.length) return null;
            const title=grp==="route"?"📍 이동경로":grp==="proof"?"⛽ 유가·요금":"🧾 영수증·탑승권";
            return(<div key={grp}>
              <div className="text-xs font-medium text-gray-500 mb-2 mt-3">{title}</div>
              {items.map(cat=>(
                <ImageUploadBox key={cat.key} label={cat.label} note={cat.note} required={cat.required}
                  img={images[cat.key]} loading={loadingKey===cat.key}
                  onUpload={f=>uploadImg(cat.key,f)} onRemove={()=>removeImg(cat.key)}/>
              ))}
            </div>);
          })}
          <div className="text-xs font-medium text-gray-500 mb-2 mt-4">📎 추가 증빙 (선택)</div>
          {extraImgs.map(e=>(
            <div key={e.id} className="border border-gray-200 rounded-xl p-3 mb-2">
              <div className="flex gap-2 mb-2">
                <input className={inp+" flex-1"} type="text" value={e.name}
                  placeholder="증빙 항목명 (예: 기관 초청 공문)"
                  onChange={ev=>updExtraName(e.id,ev.target.value)}/>
                <button className="text-xs text-red-400" onClick={()=>removeExtra(e.id)}>삭제</button>
              </div>
              {e.img?<div><img src={e.img.base64} className="w-full max-h-32 object-contain rounded-lg"/><div className="text-xs text-green-600 mt-1">✅ {e.img.name}</div></div>
              :<div className="border-2 border-dashed border-gray-200 rounded-xl p-3 text-center text-sm text-gray-400 cursor-pointer hover:border-blue-300"
                onClick={()=>(function(){var el=document.getElementById("ex_"+e.id);if(el)el.click();})()}>클릭하여 업로드</div>}
              {loadingKey==="ex_"+e.id&&<div className="text-xs text-blue-500 text-center py-1">압축 중...</div>}
              <input id={"ex_"+e.id} type="file" accept="image/*" className="hidden"
                onChange={ev=>{const f=ev.target.files&&ev.target.files[0];if(f)uploadExtra(e.id,f);ev.target.value="";}}/>
            </div>
          ))}
          <button className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-400 hover:border-blue-300 cursor-pointer mt-1" onClick={addExtra}>
            + 추가 증빙 파일 추가
          </button>
        </div>
        <div className="flex justify-between">
          <div className="text-xs text-gray-400 self-center">{Object.keys(images).length>0?Object.keys(images).length+"장 업로드됨":"첨부 없이도 진행 가능"}</div>
          <Btn primary onClick={()=>setStep(1)}>검증하기 →</Btn>
        </div>
      </>}

      {/* STEP 1: 검증 */}
      {step===1&&<>
        <div className={card}>
          <div className={ct}>AI 자동 검증</div>
          <div className={"mb-4 "+(checks.some(c=>!c.ok)?ebox:checks.some(c=>c.warn)?wbox:obox)}>
            {checks.some(c=>!c.ok)?"⚠️ 오류 항목 있음":checks.some(c=>c.warn)?"ℹ️ 확인 권장 항목 있음":"✅ 모든 검증 통과"}
          </div>
          {checks.map((c,i)=>(
            <div key={i} className={"flex items-start gap-2 py-2.5 border-b border-gray-50 last:border-0 text-sm "+(c.warn?"bg-amber-50/40 -mx-2 px-2 rounded":"")}>
              <span className="shrink-0">{c.ok&&!c.warn?"✅":c.warn?"⚠️":"❌"}</span>
              <div className="flex-1">
                <div className="text-xs font-medium text-gray-700">{c.label}</div>
                <div className={"text-xs mt-0.5 "+(c.ok&&!c.warn?"text-gray-400":c.warn?"text-amber-600":"text-red-600")}>{c.msg}</div>
              </div>
              <span className="text-xs text-gray-300">{c.ref}</span>
            </div>
          ))}
        </div>
        {missingReq.length>0&&<div className={wbox+" mb-4 text-xs"}>⚠️ 필수 첨부 미업로드: {missingReq.map(c=>c.label).join(", ")}<br/><button className="underline mt-1" onClick={()=>setStep(0)}>← 이미지 업로드로</button></div>}
        <div className="flex justify-between">
          <Btn onClick={()=>setStep(0)}>← 이미지</Btn>
          <Btn primary onClick={()=>setStep(2)}>감액 조정 →</Btn>
        </div>
      </>}

      {/* STEP 2: 감액 조정 */}
      {step===2&&<>
        <div className={card}>
          <div className={ct}>사용자 감액 조정</div>
          <div className={ibox+" mb-4 text-xs"}>감액만 가능합니다. 증액 시도 시 처음부터 재계산 필요. 감액 사유 입력 필수.</div>
          {pItems.map(item=>{
            const adj=getAdj(item.key);
            return(
              <div key={item.key} className={"border rounded-xl p-4 mb-3 "+(adj?"border-amber-300 bg-amber-50/30":"border-gray-100")}>
                <div className="flex items-center justify-between mb-2">
                  <div><span className="text-sm font-medium">{item.key}</span><span className="text-xs text-gray-400 ml-2">산출: {fmtW(item.orig)}</span></div>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={!!adj}
                      onChange={e=>{if(e.target.checked)setAdj(item.key,item.orig,{deduct:0,reason:""});else remAdj(item.key);}}
                      className="w-4 h-4 accent-amber-500"/>
                    <span className="text-xs text-amber-600">감액</span>
                  </label>
                </div>
                {adj&&<>
                  <div className={lbl0}>감액 금액 (원)</div>
                  <input className={inp} type="text" inputMode="numeric" value={adj.deduct||""}
                    placeholder={"최대 "+fmtW(item.orig)}
                    onChange={e=>{
                      let n=parseInt(e.target.value.replace(/[^0-9]/g,""))||0;
                      if(n>item.orig){alert("⚠️ 증액 불가. AI 산출값이 최대입니다.");n=item.orig;}
                      setAdj(item.key,item.orig,{deduct:n});
                    }}/>
                  {adj.deduct>0&&<div className="flex justify-between text-sm mt-2 p-2 bg-white rounded-lg border border-amber-200"><span className="text-gray-500">최종값</span><span className="font-medium text-amber-700">{fmtW(item.orig-adj.deduct)}</span></div>}
                  <div className={lbl}>감액 사유 <span className="text-red-500">*필수</span></div>
                  <input className={inp} type="text" value={adj.reason}
                    placeholder="예: 외부 일비 지원, 영수증 분실로 일부 미청구"
                    onChange={e=>setAdj(item.key,item.orig,{reason:e.target.value})}/>
                </>}
                {!adj&&<div className="text-xs text-gray-400">감액 없음 — 산출값 그대로 청구</div>}
              </div>
            );
          })}
        </div>
        <div className={"border-2 rounded-xl p-4 mb-4 "+(totalDeduct>0?"border-amber-300 bg-amber-50/30":"border-gray-200")}>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">AI 산출 개인지급</span><span>{fmtW(totalPersonal)}</span></div>
            {totalDeduct>0&&<div className="flex justify-between text-amber-700"><span>감액 합계</span><span>−{fmtW(totalDeduct)}</span></div>}
            <div className="flex justify-between border-t border-gray-200 pt-1.5 font-medium">
              <span>최종 청구액</span><span className={totalDeduct>0?"text-amber-700":"text-blue-600"}>{fmtW(finalPersonal)}</span>
            </div>
          </div>
        </div>
        <div className="flex justify-between">
          <Btn onClick={()=>setStep(1)}>← 검증</Btn>
          <Btn primary disabled={adjustments.some(a=>!a.reason.trim()||a.deduct<=0)} onClick={()=>setStep(3)}>보고서 →</Btn>
        </div>
      </>}

      {/* STEP 3: 보고서 출력 */}
      {step===3&&<>
        <div className={card}>
          <div className={ct}>정산 최종 확인</div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[["법인카드 집행",amounts.corpTransport+amounts.corpAccom,"gray"],["최종 청구액",finalPersonal,"blue"]].map(([l,v,c])=>(
              <div key={l} className="bg-gray-50 rounded-xl p-4">
                <div className="text-xs text-gray-500 mb-1">{l}</div>
                <div className={"text-xl font-medium "+(c==="blue"?"text-blue-600":"text-gray-700")}>{fmtW(v)}</div>
              </div>
            ))}
          </div>
          {dynCats.filter(c=>images[c.key]||c.required).map(c=>(
            <div key={c.key} className="flex items-center gap-2 py-1.5 text-xs border-b border-gray-50">
              <span>{images[c.key]?"✅":c.required?"⬜":"➖"}</span>
              <span className={images[c.key]?"text-gray-700":c.required?"text-amber-600":"text-gray-400"}>{c.label}</span>
            </div>
          ))}
        </div>
        {pdfDone&&<div className={obox+" mb-3 text-xs"}>✅ 보고서 출력 창이 열렸습니다. 브라우저 인쇄 → "PDF로 저장"을 선택하세요.</div>}
        <div className={ibox+" mb-4 text-xs"}>📄 "보고서 출력" → 브라우저 인쇄 창 → PDF로 저장<br/>팝업이 차단되면 브라우저 주소창의 팝업 허용을 클릭하세요.</div>
        <div className="flex justify-between">
          <Btn onClick={()=>setStep(2)}>← 감액조정</Btn>
          <div className="flex gap-2">
            <Btn onClick={handlePrint}>🖨️ 보고서 출력</Btn>
            <Btn primary onClick={()=>{setSaved(false);setStep(4);}}>완료 및 저장 →</Btn>
          </div>
        </div>
      </>}

      {/* STEP 4: 저장 완료 */}
      {step===4&&<>
        <div className={card}>
          <div className="text-center py-3 mb-4">
            <div className="text-3xl mb-2">✅</div>
            <div className="text-lg font-medium">정산 처리 완료</div>
            <div className="text-xs text-gray-500 mt-1">보고서를 저장하고 메일로 송부하세요</div>
          </div>
          <div className="space-y-2 mb-4">
            <button className={"w-full border-2 rounded-xl p-4 text-left cursor-pointer "+(pdfDone?"border-green-200 bg-green-50/30":"border-gray-200 hover:bg-gray-50")} onClick={handlePrint}>
              <div className={"font-medium mb-0.5 "+(pdfDone?"text-green-600":"text-gray-700")}>
                {pdfDone?"✅ 보고서 출력됨 (재출력 가능)":"🖨️ 보고서 출력 (PDF 저장)"}
              </div>
              <div className="text-xs text-gray-400">{mkName(data,"pdf",ROUTE_TYPE)}</div>
            </button>
            <button className={"w-full border-2 rounded-xl p-4 text-left cursor-pointer "+(saved?"border-green-400 bg-green-50":"border-blue-400 hover:bg-blue-50")} onClick={handleSave}>
              <div className={"font-medium mb-0.5 "+(saved?"text-green-600":"text-blue-600")}>{saved?"✅ JSON 저장 완료":"📥 데이터 저장 (JSON)"}</div>
              <div className="text-xs text-gray-400">{mkName(data,"json",ROUTE_TYPE)}</div>
            </button>
          </div>
          <div className={ibox+" mb-4 text-xs"}>
            📄 보고서 출력 → 인쇄 창 → PDF로 저장<br/>
            📥 JSON → 입력값 보관, 추후 불러오기·재출력 가능<br/>
            <span className="text-gray-500">※ 이미지 원본은 같은 폴더에 보관하세요.</span>
          </div>
          <div className="border border-gray-200 rounded-xl p-4">
            <div className="font-medium text-sm text-gray-700 mb-1">📧 메일 보내기</div>
            <div className="text-xs text-gray-400 mb-2">기본 메일 앱이 열립니다. PDF를 첨부 후 발송하세요.</div>
            <button className="w-full border border-gray-300 rounded-lg py-2.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer" onClick={handleMail}>
              메일 보내기 (mailto)
            </button>
          </div>
        </div>
        <div className="flex justify-between">
          <Btn onClick={()=>setStep(3)}>← 보고서</Btn>
          <Btn primary onClick={()=>{reset();setScreen("start");}}>새 정산 시작</Btn>
        </div>
      </>}
    </div>
  );
}
