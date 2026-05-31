import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const fmtW = n => Math.round(n||0).toLocaleString("ko-KR")+"원";
const MoneyHint = ({v}) => {
  const n = parseInt(v) || 0;
  if (!v || n <= 0) return null;
  return <div className="text-xs text-blue-600 font-semibold mt-1">= {n.toLocaleString("ko-KR")}원</div>;
};
const MU = 8333;
const GR = ["임원","본부장","부서장·팀장","팀원"];
const GO = ["임원","본부장","부서장·팀장","팀원"];
const RG = ["서울특별시","인천광역시","대전광역시","대구광역시","부산광역시","광주광역시","울산광역시","세종특별자치시","경기도","충청남도","충청북도","경상남도","경상북도","강원도","전라남도","전라북도","제주특별자치도","기타"];
const LM = {"서울특별시":100000,"인천광역시":80000,"대전광역시":80000,"대구광역시":80000,"부산광역시":80000,"광주광역시":80000,"울산광역시":80000};
const GL = r => LM[r]||70000;
const FT = [
  {k:"gasoline",l:"휘발유",    r:11.97,u:"L",  o:"보통휘발유"},
  {k:"diesel",  l:"경유",      r:12.52,u:"L",  o:"자동차용경유"},
  {k:"lpg",     l:"LPG",       r:8.83, u:"L",  o:"부탄(LPG)"},
  {k:"hybrid",  l:"하이브리드",r:15.37,u:"L",  o:"보통휘발유"},
  {k:"plugin",  l:"플러그인",  r:10.61,u:"L",  o:"보통휘발유"},
  {k:"ev",      l:"전기",      r:2.84, u:"kWh",o:null},
  {k:"hydrogen",l:"수소",      r:94.9, u:"kg", o:null},
];
const CR=["대중교통 없는 산간오지·도서벽지","대중교통 대비 편도 1시간 이상","심야 이동 또는 긴급 사유","중량 수하물 운송"];

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
const TB = ({sel,onClick,children,small})=>(
  <button className={"border rounded-lg "+(small?"px-3 py-1.5 text-xs":"px-4 py-2 text-sm")+" "+(
    sel?"bg-blue-500 text-white border-blue-500":"border-gray-300 text-gray-500 hover:bg-gray-50"
  )+" cursor-pointer"} onClick={onClick}>{children}</button>
);
const LA = ({href,ch})=><a href={href} target="_blank" rel="noreferrer" className="text-blue-600 underline">{ch}</a>;

/* ── 유틸 ── */
function bldDays(s,e){
  if(!s||!e)return[];
  const st=new Date(s),en=new Date(e),n=Math.round((en-st)/86400000)+1;
  if(n<=0)return[];
  return Array.from({length:n},(_,i)=>{const d=new Date(st);d.setDate(d.getDate()+i);return{date:d.toISOString().slice(0,10),label:d.toLocaleDateString("ko-KR",{month:"numeric",day:"numeric",weekday:"short"}),dayNum:i+1,isFirst:i===0,isLast:i===n-1,isMid:i>0&&i<n-1};});
}
const bdAmt=(d,res)=>(d.isFirst||d.isLast)?25000:res?0:12500;
const cFuel=t=>{const f=FT.find(x=>x.k===t.fuelType);return f&&t.distance&&t.fuelPrice?Math.round(parseFloat(t.distance)*parseFloat(t.fuelPrice)/f.r):0;};
/* 교통편 1건의 개인지급/법인카드 운임 산출 (연료비·통행료·주차료 포함) */
const segT=t=>{
  const I=n=>parseInt(n)||0;
  let corp=0,personal=0;
  if(!t) return {corp,personal};
  if(t.type==="gov"){
    if(t.hasPark&&t.park) (t.parkCard==="corp"?corp+=I(t.park):personal+=I(t.park));
  }else if(t.type==="car"){
    if(t.carMode==="public"){
      personal+=I(t.pubFare);
    }else{
      personal+=cFuel(t);
      if(t.hasToll&&t.toll) (t.tollCard==="corp"?corp+=I(t.toll):personal+=I(t.toll));
      if(t.hasPark&&t.park) (t.parkCard==="corp"?corp+=I(t.park):personal+=I(t.park));
    }
  }else{
    if(t.cardType==="corp") corp+=I(t.fare);
    else if(t.cardType!=="gov") personal+=I(t.fare);
  }
  return {corp,personal};
};
/* 교통편 수단/방식 설명 (보고서 표시용) */
const segDesc=t=>{
  if(!t||!t.type) return "—";
  const wn=n=>Math.round(n||0).toLocaleString("ko-KR")+"원";
  const TY={ktx:"KTX",bus:"버스",air:"항공",ship:"선박"};
  if(t.type==="gov") return "관용차"+(t.hasPark&&t.park?" + 주차료":"");
  if(t.type==="car"){
    if(t.carMode==="public") return "자가용(대중교통준용)";
    const ft=(FT.find(f=>f.k===t.fuelType)||{});
    const ftL=ft.l||"";
    let s="자가용 연료비"+(ftL?"("+ftL+")":"");
    if(t.distance&&t.fuelPrice&&ft.r) s+="<br><span style='font-size:11px;color:#888'>"+Number(t.distance).toLocaleString("ko-KR")+"km × "+Number(t.fuelPrice).toLocaleString("ko-KR")+"원 ÷ "+ft.r+"(연비) = "+wn(cFuel(t))+"</span>";
    if(t.hasToll&&t.toll) s+="<br>+ 통행료 "+wn(parseInt(t.toll)||0);
    if(t.hasPark&&t.park) s+="<br>+ 주차료 "+wn(parseInt(t.park)||0);
    return s;
  }
  return TY[t.type]||t.type;
};
const eT=()=>({type:"",fare:"",cardType:"",personalReason:"",carMode:"",carRs:[],pubFare:"",fuelType:"",distance:"",fuelPrice:"",hasToll:null,toll:"",tollCard:"",tollRsn:"",hasPark:null,park:"",parkCard:"",parkRsn:""});
const eN=()=>({type:"",amount:"",cardType:"",personalReason:"",provider:""});
const isTV=t=>{if(!t.type)return false;if(t.type==="gov")return true;if(t.type==="car"){if(!t.carMode)return false;if(t.carMode==="public")return!!t.pubFare;if(t.carMode==="fuel"){const ok=t.carRs.length>0&&t.fuelType&&t.distance&&t.fuelPrice&&t.hasToll!==null&&t.hasPark!==null;if(!ok)return false;if(t.hasToll&&!t.toll)return false;if(t.hasPark&&!t.park)return false;return true;}return false;}return!!(t.fare&&t.cardType&&(t.cardType!=="personal"||t.personalReason.trim()));};
const isNV=n=>{if(!n.type)return false;if(n.type==="relative"||n.type==="none")return true;if(n.type==="provided")return n.provider.trim().length>0;if(n.type==="hotel")return!!(n.amount&&n.cardType&&(n.cardType==="corp"||(n.cardType!=="corp"&&n.personalReason.trim())));return false;};


/* ══ App 밖 컴포넌트 ══ */

/* TimeInput */
const TimeInput=({value,onChange})=>{
  const pts=(value||"09:00").split(":");
  const h=pts[0]||"09",m=pts[1]||"00";
  return(
    <div className="flex items-center gap-2 mt-1">

      <select className="border border-gray-300 rounded-lg px-2 py-2 text-sm bg-white text-gray-900"
        value={h} onChange={e=>onChange(e.target.value+":"+m)}>
        {Array.from({length:24},(_,i)=>{const hh=String(i).padStart(2,"0");return <option key={hh} value={hh}>{hh}시</option>;})}
      </select>
      <span className="text-gray-400">:</span>
      <button className={"border rounded-lg px-3 py-2 text-sm "+(m==="00"?"bg-blue-500 text-white border-blue-500":"border-gray-300 text-gray-500")+" cursor-pointer"} onClick={()=>onChange(h+":00")}>00분</button>
      <button className={"border rounded-lg px-3 py-2 text-sm "+(m==="30"?"bg-blue-500 text-white border-blue-500":"border-gray-300 text-gray-500")+" cursor-pointer"} onClick={()=>onChange(h+":30")}>30분</button>
    </div>
  );
};

/* TollPark */
const TollPark=({label,hk,ak,ck,rk,t,upd})=>(
  <div className="mt-3">
    <div className={lbl0}>{label} 발생 여부</div>
    <div className="flex gap-2 mt-1">
      <TB small sel={t[hk]===false} onClick={()=>upd({[hk]:false})}>없음</TB>
      <TB small sel={t[hk]===true}  onClick={()=>upd({[hk]:true})}>있음</TB>
    </div>
    {t[hk]===true&&<>
      <input className={inp+" mt-2"} type="text" inputMode="numeric" value={t[ak]} placeholder="금액 (원)"
        onChange={e=>upd({[ak]:e.target.value.replace(/[^0-9]/g,"")})}/>
      <MoneyHint v={t[ak]} />
      <div className="flex gap-2 mt-2">
        <TB small sel={t[ck]==="corp"}     onClick={()=>upd({[ck]:"corp",[rk]:""})}>법인카드</TB>
        <TB small sel={t[ck]==="personal"} onClick={()=>upd({[ck]:"personal"})}>개인카드</TB>
        <TB small sel={t[ck]==="cash"}     onClick={()=>upd({[ck]:"cash"})}>현금</TB>
      </div>
      {(t[ck]==="personal"||t[ck]==="cash")&&(
        <input className={inp+" mt-2"} type="text" value={t[rk]} placeholder="소명 사유"
          onChange={e=>upd({[rk]:e.target.value})}/>
      )}
      {t[ak]&&t[ck]&&(
        <div className="mt-1 text-sm font-medium text-blue-600">{t[ck]==="corp"?"법인카드 집행 — 개인지급 0원":"개인지급: "+fmtW(parseInt(t[ak])||0)}</div>
      )}
    </>}
  </div>
);

/* TransportForm */
const TransportForm=({t,seg,startDate,upd,eg})=>{
  const ft=FT.find(f=>f.k===t.fuelType);
  return(
    <div>
      <div className={lbl0}>교통수단</div>
      <div className="grid grid-cols-2 gap-2 mt-1">
        {[["ktx","철도(KTX)"],["bus","버스"],["air","항공"],["ship","선박"],["gov","업무용차량\n(관용차)"],["car","자가용"]].map(([k,l])=>(
          <button key={k} className={"border rounded-lg py-2.5 px-2 text-xs font-medium whitespace-pre-line leading-tight cursor-pointer "+(t.type===k?"bg-blue-500 text-white border-blue-500":"border-gray-300 text-gray-600 hover:bg-gray-50")}
            onClick={()=>upd({...eT(),type:k})}>{l}</button>
        ))}
      </div>

      {/* 대중교통 */}
      {["ktx","bus","air","ship"].includes(t.type)&&<>
        <div className={ibox+" mt-3 text-xs"}>좌석기준({eg}): {t.type==="ktx"?(eg==="임원"||eg==="본부장"?"실제비용":"KTX 일반실"):t.type==="air"?(eg==="임원"||eg==="본부장"?"실제비용":"이코노미"):t.type==="ship"?(eg==="팀원"?"1등보통 침대부":"1등특별 침대부"):"실제비용"}</div>
        <div className={lbl}>운임 금액 (원)</div>
        <input className={inp} type="text" inputMode="numeric" value={t.fare} placeholder="실제 운임"
          onChange={e=>upd({fare:e.target.value.replace(/[^0-9]/g,"")})}/>
        <MoneyHint v={t.fare} />
        <div className={lbl}>결제 수단</div>
        <div className="flex gap-2 mt-1">
          <TB small sel={t.cardType==="corp"}     onClick={()=>upd({cardType:"corp",personalReason:""})}>법인카드</TB>
          <TB small sel={t.cardType==="personal"} onClick={()=>upd({cardType:"personal"})}>개인카드</TB>
        </div>
        {t.cardType==="personal"&&(
          <input className={inp+" mt-2"} type="text" value={t.personalReason} placeholder="소명 사유 *필수"
            onChange={e=>upd({personalReason:e.target.value})}/>
        )}
        {t.fare&&t.cardType&&(
          <div className="mt-2 text-sm font-medium text-blue-600">{t.cardType==="corp"?"법인카드 — 개인지급 0원":"개인지급: "+fmtW(parseInt(t.fare)||0)}</div>
        )}
      </>}

      {/* 관용차 */}
      {t.type==="gov"&&<>
        <div className={obox+" mt-3 text-xs"}>운임 0원 (제13조) · 일비 1/2 감액 (제14조)</div>
        <TollPark label="주차료" hk="hasPark" ak="park" ck="parkCard" rk="parkRsn" t={t} upd={upd}/>
      </>}

      {/* 자가용 */}
      {t.type==="car"&&<>
        <div className={lbl0}>정산 방식</div>
        <div className="flex gap-2 mt-1">
          <TB sel={t.carMode==="public"} onClick={()=>upd({carMode:"public"})}>대중교통준용</TB>
          <TB sel={t.carMode==="fuel"}   onClick={()=>upd({carMode:"fuel"})}>연료비 정산</TB>
        </div>

        {t.carMode==="public"&&<>
          <div className={ibox+" mt-2 text-xs"}>
            요금 확인: <LA href="https://www.korail.com" ch="코레일"/>&nbsp;<LA href="https://www.kobus.co.kr" ch="고속버스"/>&nbsp;<LA href="https://www.bustago.or.kr" ch="시외버스"/>&nbsp;<LA href="https://map.kakao.com" ch="카카오맵"/>
          </div>
          <input className={inp+" mt-2"} type="text" inputMode="numeric" value={t.pubFare} placeholder="대중교통준용 요금 (원)"
            onChange={e=>upd({pubFare:e.target.value.replace(/[^0-9]/g,"")})}/>
          <MoneyHint v={t.pubFare} />
          {t.pubFare&&<div className="mt-1 text-sm font-medium text-blue-600">{"개인지급: "+fmtW(parseInt(t.pubFare)||0)}</div>}
          <div className={wbox+" mt-2 text-xs"}>대중교통준용 시 통행료·주차료 별도 지급 없음 (별표1 비고6)</div>
        </>}

        {t.carMode==="fuel"&&<>
          <div className={ibox+" mt-3 mb-2 text-xs"}>
            ① <LA href="https://map.kakao.com" ch="카카오맵"/> / <LA href="https://map.naver.com" ch="네이버맵"/> 에서 자동차 경로 거리(km) 확인<br/>
            ② <LA href="https://www.opinet.co.kr" ch="오피넷"/> 에서 출장 시작일 ({(startDate||"").replace(/-/g,".")}) 유가 확인<br/>
            <span className="text-xs opacity-70">국내유가통계→주유소→평균판매가격→제품별→일간</span>
          </div>
          <div className={lbl0}>부득이한 사유 (별표1 비고6) <span className="text-red-500">*필수</span></div>
          <select className={inp} value={t.carRs.length>0?String(t.carRs[0]):""} onChange={e=>upd({carRs:e.target.value?[parseInt(e.target.value)]:[]})} >
            <option value="">사유 선택</option>
            {CR.map((r,ri)=><option key={ri} value={ri}>{r}</option>)}
          </select>
          <div className={lbl0}>유종</div>
          <select className={inp+" mt-1"} value={t.fuelType} onChange={e=>upd({fuelType:e.target.value})}>
            <option value="">유종 선택</option>
            {FT.map(f=><option key={f.k} value={f.k}>{f.l} (연비 {f.r}{f.u})</option>)}
          </select>
          {ft&&ft.o&&<div className="text-xs text-blue-600 mt-1">오피넷 검색어: {ft.o}</div>}
          <div className={lbl}>여행거리 (km)</div>
          <input className={inp} type="text" inputMode="numeric" value={t.distance} placeholder="예: 325"
            onChange={e=>upd({distance:e.target.value.replace(/[^0-9]/g,"")})}/>
          <div className={lbl}>유가 (원/{ft?ft.u:"L"})</div>
          <input className={inp} type="text" inputMode="numeric" value={t.fuelPrice} placeholder={(startDate||"").replace(/-/g,".")+" 기준"}
            onChange={e=>upd({fuelPrice:e.target.value.replace(/[^0-9]/g,"")})}/>
          {t.fuelType&&t.distance&&t.fuelPrice&&(
            <div className="mt-2 bg-blue-50 border border-blue-200 rounded-xl p-3">
              <div className="text-xs text-blue-600 mb-1">연료비 자동 계산</div>
              <div className="text-xl font-medium text-blue-600">{fmtW(cFuel(t))}</div>
            </div>
          )}
          <TollPark label="통행료" hk="hasToll" ak="toll" ck="tollCard" rk="tollRsn" t={t} upd={upd}/>
          <TollPark label="주차료" hk="hasPark" ak="park" ck="parkCard" rk="parkRsn" t={t} upd={upd}/>
        </>}
      </>}
    </div>
  );
};

/* NightRow */
const NightRow=({n,num,date,limit,upd})=>{
  const amt=parseInt(n.amount)||0,isOver=n.type==="hotel"&&n.amount&&amt>limit;
  return(
    <div className={"border rounded-xl p-4 mb-3 "+(isNV(n)?"border-green-200 bg-green-50/30":"border-gray-100")}>
      <div className="flex items-center gap-2 mb-3">
        <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full font-medium">{num}박차</span>
        <span className="text-xs text-gray-400">{date}</span>
        {isNV(n)&&<span className="ml-auto text-xs text-green-600">✅</span>}
      </div>
      <div className={lbl0}>숙박 형태</div>
      <div className="flex gap-2 flex-wrap mt-1">
        {[["hotel","일반 숙박"],["relative","친지집 숙박"],["provided","기관·연수원 제공"],["none","미숙박"]].map(([k,l])=>(
          <TB key={k} small sel={n.type===k} onClick={()=>upd({type:k,amount:"",cardType:"",personalReason:"",provider:""})}>{l}</TB>
        ))}
      </div>
      {n.type==="hotel"&&<>
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-2 text-xs text-amber-800">⚠️ 과오지급 방지 — 이 박(1박) 본인 몫만 입력하세요.</div>
        <div className={lbl}>금액 (원) <span className="text-xs text-gray-400 font-normal">— 상한 {fmtW(limit)}</span></div>
        <input className={inp} type="text" inputMode="numeric" value={n.amount} placeholder={"상한 "+fmtW(limit)}
          onChange={e=>upd({amount:e.target.value.replace(/[^0-9]/g,"")})}/>
        <MoneyHint v={n.amount} />
        {n.amount&&<div className={"mt-1 text-xs rounded-lg px-2 py-1.5 "+(isOver?"bg-red-50 text-red-700":"bg-green-50 text-green-700")}>{isOver?"⚠️ 상한 초과: "+fmtW(amt):"✅ 상한 이내: "+fmtW(amt)}</div>}
        <div className={lbl}>결제 수단</div>
        <div className="flex gap-2 mt-1 flex-wrap">
          <TB small sel={n.cardType==="corp"}     onClick={()=>upd({cardType:"corp",personalReason:""})}>법인카드</TB>
          <TB small sel={n.cardType==="personal"} onClick={()=>upd({cardType:"personal"})}>개인카드</TB>
          <TB small sel={n.cardType==="cash"}     onClick={()=>upd({cardType:"cash"})}>현금</TB>
        </div>
        {(n.cardType==="personal"||n.cardType==="cash")&&(
          <input className={inp+" mt-2"} type="text" value={n.personalReason} placeholder="소명 사유 *필수"
            onChange={e=>upd({personalReason:e.target.value})}/>
        )}
        {n.amount&&n.cardType&&(
          <div className={"mt-1 text-sm font-medium "+(n.cardType==="corp"?"text-gray-500":"text-blue-600")}>
            {n.cardType==="corp"?("법인카드 — 개인지급 0원"+(isOver?" ⚠️":"")):("개인지급: "+fmtW(amt))}
          </div>
        )}
      </>}
      {n.type==="relative"&&<div className={obox+" mt-3"}>고정 지급: <strong>20,000원</strong> (개인지급 / 별표1 비고9)</div>}
      {n.type==="provided"&&<>
        <div className={lbl}>제공 기관명·연수원명 <span className="text-red-500">*필수</span></div>
        <input className={inp} type="text" value={n.provider} placeholder="예: OO연수원"
          onChange={e=>upd({provider:e.target.value})}/>
        <div className={ibox+" mt-2"}>숙박비 0원 — 보고서에 기관명 명시</div>
      </>}
      {n.type==="none"&&<div className="mt-2 text-sm text-gray-400">미숙박 — 0원</div>}
    </div>
  );
};

/* ── 초기 상태 & 상수 ── */
const iS=()=>({dept:"",origin:"",name:"",grade:"",trainingName:"",trainingOrg:"",trainingRegion:"",startDate:"",startTime:"09:00",endDate:"",endTime:"18:00",isResidence:null,hasComp:null,companions:[{name:"",grade:""}],policy:"",policyNote:"",policyBasis:"",inbound:eT(),outbound:eT(),nights:[],dayData:[]});
const PS=["기본정보","지급방침","교통·숙박","일비·식비","감액조정","완료·저장"];
const PN=["기본정보","지급방침","완료·저장"];

/* ══════════════ 메인 ══════════════ */

/* ── 이미지 압축 ── */
async function compressImage(file){
  return new Promise((res,rej)=>{
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
      img.onerror=rej;
      img.src=e.target.result;
    };
    r.onerror=rej;
    r.readAsDataURL(file);
  });
}

/* ── 이미지 업로드 박스 ── */
const ImageUploadBox=({label,note,required,img,loading,onUpload,onRemove})=>{
  const ref=useRef(null);
  return(
    <div className="border rounded-xl p-4 mb-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-gray-700">{label}{required&&<span className="text-red-400 ml-1">*</span>}</div>
        {note&&<div className="text-xs text-gray-400">{note}</div>}
      </div>
      {loading?<div className="text-xs text-blue-500 text-center py-4">압축 중...</div>
      :img?<div>
        <img src={img.base64} alt={label} className="w-full max-h-36 object-contain border rounded-lg mb-2"/>
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-400 truncate">{img.name}</div>
          <button className="text-xs text-red-400 ml-2 cursor-pointer" onClick={onRemove}>삭제</button>
        </div>
      </div>
      :<button className="w-full border-2 border-dashed border-gray-200 rounded-xl py-6 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-all"
        onClick={()=>ref.current&&ref.current.click()}>
        <div className="text-2xl mb-1">📎</div>
        <div className="text-xs text-gray-400">클릭하여 이미지 첨부</div>
        <input ref={ref} type="file" accept="image/*" className="hidden"
          onChange={e=>{const f=e.target.files&&e.target.files[0];if(f)onUpload(f);e.target.value="";}}/>
      </button>}
    </div>
  );
};

/* ── 보고서 오버레이 컴포넌트 (App 밖) ── */
const ReportOverlay = ({html, fileName, onClose}) => {
  const iframeRef = React.useRef(null);
  const handlePrint = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  };
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
        <span style={{color:"#fff",fontWeight:600,fontSize:"14px"}}>📄 정산 보고서 미리보기</span>
        <span style={{flex:1}}/>
        <button onClick={handlePrint}
          style={{background:"#2563eb",color:"#fff",border:"none",borderRadius:"6px",padding:"7px 16px",fontSize:"13px",fontWeight:700,cursor:"pointer"}}>
          🖨️ 인쇄 / PDF 저장
        </button>
        <button onClick={handleSaveHtml}
          style={{background:"#16a34a",color:"#fff",border:"none",borderRadius:"6px",padding:"7px 14px",fontSize:"13px",fontWeight:600,cursor:"pointer"}}>
          💾 HTML 저장
        </button>
        <button onClick={onClose}
          style={{background:"transparent",color:"#93c5fd",border:"1px solid #3b82f6",borderRadius:"6px",padding:"7px 12px",fontSize:"13px",cursor:"pointer"}}>
          ✕ 닫기
        </button>
      </div>
      <div style={{background:"#dbeafe",padding:"7px 16px",fontSize:"12px",color:"#1e40af",flexShrink:0}}>
        💡 <b>인쇄 / PDF 저장</b> 버튼 클릭 → 인쇄 창에서 <b>대상: PDF로 저장</b> 선택 &nbsp;|&nbsp; 또는 HTML 저장 후 브라우저에서 열어 Ctrl+P
      </div>
      <iframe
        ref={iframeRef}
        srcDoc={html}
        style={{flex:1,border:"none",background:"#fff"}}
        title="보고서 미리보기"
      />
    </div>
  );
};







/* ── 파일명 생성 ── */
const mkN = (s, ext) => {
  const d = (s.startDate||"").replace(/-/g,"");
  const t = (s.startTime||"0900").replace(":","");
  return d+"_"+t+"_연수_"+(s.name||"연수자")+"."+ext;
};

/* ── 저장·메일 ── */
function sData(s){
  const b=new Blob([JSON.stringify({v:"C",t:new Date().toISOString(),d:s},null,2)],{type:"application/json"});
  const u=URL.createObjectURL(b);const a=document.createElement("a");
  a.href=u;a.download=mkN(s,"json");document.body.appendChild(a);a.click();
  document.body.removeChild(a);setTimeout(()=>URL.revokeObjectURL(u),500);
}
function sDataAdj(s,adjs){
  const b=new Blob([JSON.stringify({v:"C",t:new Date().toISOString(),d:s,adjustments:adjs},null,2)],{type:"application/json"});
  const u=URL.createObjectURL(b);const a=document.createElement("a");
  a.href=u;a.download=mkN(s,"json");document.body.appendChild(a);a.click();
  document.body.removeChild(a);setTimeout(()=>URL.revokeObjectURL(u),500);
}
function dMail(s){
  const sub=encodeURIComponent("[연수여비정산] "+(s.name||"")+" ("+(s.startDate||"").replace(/-/g,".")+")");
  const bod=encodeURIComponent("안녕하세요,\n\n연수 여비 정산 보고서를 송부합니다.\n신청자: "+(s.name||"-")+"\n기간: "+(s.startDate||"")+" ~ "+(s.endDate||"")+"\n\n별첨: 정산 보고서 PDF\n\n감사합니다.");
  window.location.href="mailto:?subject="+sub+"&body="+bod;
}



function gHTML(s, adjs, imgs){
  adjs = adjs || [];
  imgs = imgs || {};
  const W = n => Math.round(n||0).toLocaleString("ko-KR")+"원";
  const days = bldDays(s.startDate, s.endDate);
  const sIn=segT(s.inbound), sOut=segT(s.outbound);
  const iF = sIn.corp+sIn.personal;
  const oF = sOut.corp+sOut.personal;
  const pIn = sIn.personal;
  const pOut = sOut.personal;
  const cIn = sIn.corp;
  const cOut = sOut.corp;
  const aC = (s.nights||[]).reduce((sm,n)=>sm+(n.type==="relative"?20000:parseInt(n.amount)||0),0);
  const dT = (s.dayData||[]).reduce((sm,d)=>{const b=bdAmt(d,s.isResidence);return sm+(d.dayDeduct?Math.round(b/2):b);},0);
  const mT = (s.dayData||[]).reduce((sm,d)=>sm+Math.max(0,25000-[d.b,d.l,d.d].filter(Boolean).length*MU),0);
  const totalD = adjs.reduce((sm,a)=>sm+(a.deduct||0),0);
  const totP = pIn+pOut+aC+dT+mT-totalD;
  const pL = s.policy==="none"?"전액 미지급":s.policy==="partial"?"일부 지급":"전액 지급";

  const css = "@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap');body{font-family:'Noto Sans KR',sans-serif;font-size:13px;margin:24px}h1{font-size:17px;font-weight:700;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:16px;color:#111}h2{font-size:13px;font-weight:700;color:#111;background:#f0f0f0;padding:4px 8px;margin:14px 0 4px;border-left:3px solid #333}table{width:100%;border-collapse:collapse;margin-bottom:8px}th{background:#333;color:#fff;padding:5px 8px;text-align:left;font-weight:500;font-size:12px}td{padding:5px 8px;border-bottom:1px solid #ddd}.g{color:#666;font-size:12px}.b{font-weight:700}.sum{border:2px solid #111;padding:12px;margin:12px 0;background:#f8f8f8}.r{display:flex;justify-content:space-between;padding:3px 0;font-size:13px}.rf{border-top:2px solid #111;margin-top:8px;padding-top:8px;font-size:16px;font-weight:700}.pg{page-break-before:always;padding:20px}.g4{display:grid;grid-template-columns:1fr 1fr;gap:12px}.gi{border:1px solid #ddd;border-radius:4px;padding:8px}.gl{font-size:12px;font-weight:600;margin-bottom:6px}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}";

  const travelDays = days.length;
  const dayRows = (s.dayData||[]).map(d=>{
    const c=[d.b,d.l,d.d].filter(Boolean).length;
    const base=bdAmt(d,s.isResidence);
    const da=d.dayDeduct?Math.round(base/2):base;
    const ma=Math.max(0,25000-c*MU);
    return "<tr><td>"+d.label+"</td><td>"+(d.dayDeduct?"관용차(½)":"정상")+"</td><td class=b>"+W(da)+"</td><td class=b>"+W(ma)+(c?" ("+c+"식)":"")+"</td></tr>";
  }).join("");
  const nightRows = (s.nights||[]).map((n,i)=>"<tr><td>"+(i+1)+"박</td><td>"+(n.type==="hotel"?"일반":n.type==="relative"?"친지집":n.type==="provided"?"기관제공":"미숙박")+"</td><td class=b>"+W(n.type==="relative"?20000:parseInt(n.amount)||0)+"</td></tr>").join("");
  const adjRows = adjs.length?"<h2>나-4. 감액 조정</h2><table><tr><th>항목</th><th>산출값</th><th>감액</th><th>최종값</th><th>사유</th></tr>"+adjs.map(a=>"<tr><td>"+a.key+"</td><td>"+W(a.orig)+"</td><td style=font-weight:600>−"+W(a.deduct)+"</td><td class=b>"+W(a.orig-a.deduct)+"</td><td>"+a.reason+"</td></tr>").join("")+"</table>":"";

  const imgSection = Object.keys(imgs).length > 0 ?
    "<div class=pg><h2>첨부 증빙자료</h2><div class=g4>" +
    Object.entries(imgs).filter(([k,v])=>v&&v.base64).map(([k,v])=>{
      const labels={"confirm":"연수 확인서","transport":"교통비 영수증","accom":"숙박비 영수증","etc":"기타 증빙"};
      return "<div class=gi><div class=gl>" +labels[k]+ "</div><img src='"+v.base64+"' style='width:100%;max-height:320px;object-fit:contain'/></div>";
    }).join("") + "</div></div>"
    : "";

  return "<!DOCTYPE html><html lang=ko><head><meta charset=UTF-8><title>연수 여비 정산 보고서</title><style>"+css+"</style></head><body>"
    +"<h1>연수 여비 정산 보고서 <span style='background:linear-gradient(135deg,#1a3a6e,#2980b9);color:#fff;font-size:11px;padding:3px 10px;border-radius:20px;font-weight:500;vertical-align:middle'>C경로</span></h1>"
    +"<h2>가. 연수 기본정보</h2>"
    +"<table><tr><th>항목</th><th>내용</th></tr>"
    +"<tr><td class=g>소속부서</td><td>"+(s.dept||"—")+"</td></tr>"
    +"<tr><td class=g>출발지</td><td>"+(s.origin||s.dept||"—")+"</td></tr>"
    +"<tr><td class=g>신청자</td><td><b>"+(s.name||"—")+" ("+s.grade+")</b></td></tr>"
    +"<tr><td class=g>연수명</td><td>"+(s.trainingName||"—")+"</td></tr>"
    +"<tr><td class=g>연수 기관</td><td>"+(s.trainingOrg||"—")+"</td></tr>"
    +"<tr><td class=g>연수 기간</td><td>"+(s.startDate||"").replace(/-/g,".")+" "+(s.startTime||"")+" ~ "+(s.endDate||"").replace(/-/g,".")+" "+(s.endTime||"")+" ("+travelDays+"일)</td></tr>"
    +"<tr><td class=g>숙박 형태</td><td>"+(s.isResidence?"합숙":"비합숙")+"</td></tr>"
    +"<tr><td class=g>지급 방침</td><td>"+pL+"</td></tr>"
    +"</table>"
    +"<h2>나. 비용항목 정산</h2>"
    +"<h2>나-1. 교통비  (여비규칙 제11조)</h2>"
    +"<table><tr><th>구분</th><th>수단/방식</th><th>법인카드</th><th>개인지급</th></tr>"
    +"<tr><td>출발 (→연수지)</td><td>"+segDesc(s.inbound)+"</td><td class=g>"+W(cIn)+"</td><td class=b>"+W(pIn)+"</td></tr>"
    +"<tr><td>복귀 (연수지→)</td><td>"+segDesc(s.outbound)+"</td><td class=g>"+W(cOut)+"</td><td class=b>"+W(pOut)+"</td></tr>"
    +"<tr style=background:#f0f0f0><td colspan=2><b>소계</b></td><td class=b>"+W(cIn+cOut)+"</td><td class=b>"+W(pIn+pOut)+"</td></tr>"
    +"</table>"
    +(s.nights&&s.nights.length?"<h2>나-2. 숙박비  (여비규칙 제12조)</h2><table><tr><th>박차</th><th>형태</th><th>금액</th></tr>"+nightRows+"<tr style=background:#f0f0f0><td colspan=2><b>소계</b></td><td class=b>"+W(aC)+"</td></tr></table>":"")
    +"<h2>나-3. 일비 · 식비  (여비규칙 제14조, 별표1)</h2>"
    +"<p style=font-size:12px;color:#666;margin:2px 0 4px>일비 기준: 합숙 12,500원/일 · 비합숙 25,000원/일 &nbsp;|&nbsp; 식비 기준: 25,000원/일, 식사 차감 8,333원/식</p>"
    +"<table><tr><th>일차</th><th>일비 구분</th><th>일비</th><th>식비</th></tr>"
    +dayRows
    +"<tr style=background:#f0f0f0><td colspan=2><b>소계</b></td><td class=b>"+W(dT)+"</td><td class=b>"+W(mT)+"</td></tr>"
    +"</table>"
    +adjRows
    +"<h2>다. 최종 정산 금액</h2>"
    +"<div class=sum>"
    +"<div class=r><span class=g>교통비 (개인지급)</span><span>"+W(pIn+pOut)+"</span></div>"
    +(aC?"<div class=r><span class=g>숙박비</span><span>"+W(aC)+"</span></div>":"")
    +"<div class=r><span class=g>일비</span><span>"+W(dT)+"</span></div>"
    +"<div class=r><span class=g>식비</span><span>"+W(mT)+"</span></div>"
    +(totalD?"<div class=r><span class=g>감액</span><span style=font-weight:600>−"+W(totalD)+"</span></div>":"")
    +"<div class='r rf'><span>◆ 최종 개인 지급 청구액</span><span>"+W(totP)+"</span></div>"
    +(cIn+cOut?"<div class=r><span style=color:#666;font-size:12px>법인카드 집행</span><span style=color:#666;font-size:12px>"+W(cIn+cOut)+"</span></div>":"")
    +"</div>"
    +imgSection
    +"</body></html>";
}




export default function RouteC(){
  const navigate = useNavigate();
  const [s,setS]=useState(iS());
  const [step,setStep]=useState(0);
  const [images,setImages]=useState({});
  const [loadingImg,setLoadingImg]=useState({});
  const [saved,setSaved]=useState(false);

  /* ── JSON 불러오기 (sessionStorage) ── */
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("kosaf_json_load");
      if (raw) {
        const j = JSON.parse(raw);
        sessionStorage.removeItem("kosaf_json_load");
        if (j.v === "C" && j.d) {
          setS(prev => ({...prev, ...j.d}));
          if (j.adjustments) setAdjs(j.adjustments);
          setStep(0);
        }
      }
    } catch(e) {}
  }, []);

  const [reportHTML,setReportHTML]=useState(null);
  const [printed,setPrinted]=useState(false);
  const [adjustments,setAdjs]=useState([]); // [{key,orig,deduct,reason}]

  const upd=useCallback(p=>setS(v=>({...v,...p})),[]);
  /* ── 브라우저 닫기 경고 ── */
  useEffect(() => {
    const fn = e => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', fn);
    return () => window.removeEventListener('beforeunload', fn);
  }, []);

  const updC=useCallback((i,k,v)=>setS(prev=>({...prev,companions:prev.companions.map((x,j)=>j===i?{...x,[k]:v}:x)})),[]);
  const updIn=useCallback(p=>setS(v=>({...v,inbound:{...v.inbound,...p}})),[]);
  const updOut=useCallback(p=>setS(v=>({...v,outbound:{...v.outbound,...p}})),[]);
  const updN=useCallback((ni,p)=>setS(v=>({...v,nights:v.nights.map((n,i)=>i===ni?{...n,...p}:n)})),[]);
  const updD=useCallback((di,p)=>setS(v=>({...v,dayData:v.dayData.map((d,i)=>i===di?{...d,...p}:d)})),[]);

  const days=bldDays(s.startDate,s.endDate);
  const tDays=days.length,tNights=Math.max(0,tDays-1),lim=GL(s.trainingRegion);
  const eg=s.hasComp&&s.companions.some(c=>c.grade)?s.companions.reduce((b,c)=>{if(!c.grade)return b;return GO.indexOf(c.grade)<GO.indexOf(b)?c.grade:b;},s.grade):s.grade;
  const STEPS=s.policy==="none"?PN:PS;
  const dStp=s.policy==="none"&&step>=2?2:step;

  const ok0=!!(s.name&&s.grade&&s.trainingName&&s.trainingOrg&&s.trainingRegion&&s.startDate&&s.endDate&&s.isResidence!==null&&s.hasComp!==null&&(s.hasComp===false||s.companions.some(c=>c.name&&c.grade)));
  const ok1=!!(s.policy&&(s.policy!=="partial"||s.policyNote.trim())&&s.policyBasis.trim());
  const ok2=isTV(s.inbound)&&isTV(s.outbound)&&(!s.isResidence||tNights===0||s.nights.every(isNV));
  const ok3=s.dayData.length===tDays;

  /* ── 감액 조정 헬퍼 ── */
  const getAdj=key=>adjustments.find(a=>a.key===key);
  const setAdj=(key,orig,patch)=>setAdjs(prev=>{
    const ex=prev.find(a=>a.key===key);
    if(ex)return prev.map(a=>a.key===key?{...a,...patch}:a);
    return [...prev,{key,orig,deduct:0,reason:"",...patch}];
  });
  const remAdj=key=>setAdjs(p=>p.filter(a=>a.key!==key));
  const totalDeduct=adjustments.reduce((s,a)=>s+(a.deduct||0),0);

  const goS1=()=>{upd({policy:"",policyBasis:"",policyNote:""});setStep(1);};
  const goS2=()=>{const nights=s.isResidence&&tNights>0?Array.from({length:tNights},eN):[];setS(v=>({...v,nights,inbound:eT(),outbound:eT()}));setStep(2);};
  const goS3=()=>{setS(v=>({...v,dayData:days.map(d=>({...d,dayDeduct:false,b:false,l:false,d:false}))}));setStep(3);};
  const uploadImg=useCallback(async(key,file)=>{
    setLoadingImg(p=>({...p,[key]:true}));
    try{const r=await compressImage(file);setImages(p=>({...p,[key]:r}));}
    catch(e){alert("이미지 오류: "+e.message);}
    finally{setLoadingImg(p=>({...p,[key]:false}));}
  },[]);
  const removeImg=useCallback((key)=>setImages(p=>{const n={...p};delete n[key];return n;}),[]);
  const hPrint=()=>{setReportHTML(gHTML(s,adjustments,images));setPrinted(true);};
  const hSave=()=>{sDataAdj(s,adjustments);setSaved(true);};

  return(
    <div className="max-w-2xl mx-auto p-4 pb-12" style={{background:"#f0f4ff",minHeight:"100vh"}}>
            {/* 뒤로가기 */}
      <button onClick={()=>navigate('/')} className="flex items-center gap-1.5 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 mb-4 cursor-pointer hover:bg-blue-100 transition-all shadow-sm">
        ← 경로 선택 화면으로 (A · B · C)
      </button>
      {/* ── 상단 헤더 배너 ── */}
      <div className="rounded-2xl mb-5 overflow-hidden shadow-sm">
        <div style={{background:"linear-gradient(135deg,#1a3a6e 0%,#2980b9 100%)"}} className="px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-blue-200 uppercase tracking-widest mb-1">KOSAF 여비를 부탁해....</div>
              <div className="text-white font-bold text-lg">스마트 여비정산 시스템</div>
            </div>
            <div className="text-right">
              <div className="bg-white/20 rounded-xl px-3 py-1.5 text-xs font-bold text-white">🅲 국내 연수</div>
            </div>
          </div>
        </div>
      </div>
      {reportHTML && <ReportOverlay html={reportHTML} fileName={"C경로_"+(s.name||"연수자")+"_"+s.startDate} onClose={()=>setReportHTML(null)}/>}
      <div className="flex items-center gap-2 mb-4">
        <span className="bg-purple-500 text-white text-xs px-2.5 py-1 rounded-full font-medium">C경로</span>
        <span className="text-lg font-medium">국내 연수 여비 정산</span>
      </div>
      <div className="flex gap-1 mb-1">
        {STEPS.map((_,i)=><div key={i} className={"flex-1 h-2 rounded-full "+(i<dStp?"bg-purple-500":i===dStp?"bg-purple-300":"bg-gray-200")}/>)}
      </div>
      <div className="flex mb-5">
        {STEPS.map((l,i)=><div key={i} className={"flex-1 text-center text-xs pt-1 "+(i===dStp?"text-purple-500 font-medium":"text-gray-400")}>{l}</div>)}
      </div>

      {/* STEP 0: 기본정보 */}
      {step===0&&<>
        <div className={card}>
          <div className={ct}>신청자 정보</div>
          <div className={lbl0}>소속부서(팀)</div>
          <input className={inp} type="text" value={s.dept||""} placeholder="예) 대구센터 창업지원팀"
            onChange={e=>upd({dept:e.target.value, origin:e.target.value})}/>
          <div className={lbl}>출발지 (근무지)</div>
          <input className={inp} type="text" value={s.origin||""} placeholder="기본값: 소속부서와 동일 (수정 가능)"
            onChange={e=>upd({origin:e.target.value})}/>
          <div className={lbl0}>성명</div>
          <input className={inp} type="text" value={s.name} placeholder="성명을 입력하세요" onChange={e=>upd({name:e.target.value})}/>
          <div className={lbl}>직급</div>
          <div className="flex flex-wrap gap-2 mt-1">{GR.map(g=><TB key={g} sel={s.grade===g} onClick={()=>upd({grade:g})}>{g}</TB>)}</div>
        </div>
        <div className={card}>
          <div className={ct}>연수 정보</div>
          <div className={lbl0}>연수명</div>
          <input className={inp} type="text" value={s.trainingName} placeholder="예: 2026년 창업지원 역량강화 연수" onChange={e=>upd({trainingName:e.target.value})}/>
          <div className={lbl}>연수 기관</div>
          <input className={inp} type="text" value={s.trainingOrg} placeholder="예: OO연수원" onChange={e=>upd({trainingOrg:e.target.value})}/>
          <div className={lbl}>연수 지역</div>
          <select className={inp} value={s.trainingRegion} onChange={e=>upd({trainingRegion:e.target.value})}>
            <option value="">지역 선택</option>
            {RG.map(r=><option key={r} value={r}>{r}</option>)}
          </select>
          {s.trainingRegion&&<div className="text-xs text-blue-600 mt-1">숙박비 상한: {fmtW(GL(s.trainingRegion))}/박</div>}
          <div className={lbl}>연수 기간 및 시간</div>
          <div className="grid grid-cols-2 gap-3 mt-1">
            <div>
              <div className={lbl0}>입소일</div>
              <input className={inp} type="date" value={s.startDate} onChange={e=>{
                const v=e.target.value;
                const updates={startDate:v};
                if(s.endDate && v>s.endDate){updates.endDate=v;updates.endTime="";}
                upd(updates);
              }}/>
              <div className="text-xs text-gray-500 mt-2 mb-1">입소 시간</div>
              <TimeInput value={s.startTime} onChange={v=>{
                const updates={startTime:v};
                if(s.startDate===s.endDate && s.endTime && v>s.endTime) updates.endTime=v;
                upd(updates);
              }}/>
            </div>
            <div>
              <div className={lbl0}>퇴소일</div>
              <input className={inp} type="date" value={s.endDate}
                min={s.startDate||undefined}
                onChange={e=>{
                  const v=e.target.value;
                  if(s.startDate && v<s.startDate) upd({endDate:s.startDate,endTime:s.endTime||""});
                  else upd({endDate:v});
                }}/>
              <div className="text-xs text-gray-500 mt-2 mb-1">퇴소 시간</div>
              <TimeInput value={s.endTime} onChange={v=>{
                if(s.startDate===s.endDate && s.startTime && v<s.startTime) upd({endTime:s.startTime});
                else upd({endTime:v});
              }}/>
            </div>
          </div>
          {days.length>0&&<>
            <div className={obox+" mt-3"}>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div><div className="text-xs opacity-70 mb-1">연수일수</div><div className="text-xl font-medium">{days.length}일</div></div>
                <div><div className="text-xs opacity-70 mb-1">숙박박수</div><div className="text-xl font-medium">{tNights}박</div></div>
                <div><div className="text-xs opacity-70 mb-1">규정</div><div className="text-sm font-medium mt-1">제17조</div></div>
              </div>
              <div className="mt-2 text-xs opacity-80 border-t border-green-200 pt-2">
                {"입소: "+(s.startDate||"").replace(/-/g,".")+" "+s.startTime+" / 퇴소: "+(s.endDate||"").replace(/-/g,".")+" "+s.endTime}
              </div>
            </div>
            {tNights===0&&<div className={wbox+" mt-2 text-xs"}>⚠️ 당일 연수 — 숙박비가 발생하지 않습니다.</div>}
          </>}
          <div className={lbl}>연수 형태</div>
          <div className="flex gap-2 mt-1">
            <TB sel={s.isResidence===true}  onClick={()=>upd({isResidence:true})}>합숙 연수</TB>
            <TB sel={s.isResidence===false} onClick={()=>upd({isResidence:false})}>비합숙 연수</TB>
          </div>
          {s.isResidence===true&&<div className={ibox+" mt-2 text-xs"}>합숙: 중간일 일비 미지급 / 숙박비 입력 필요</div>}
          {s.isResidence===false&&<div className={ibox+" mt-2 text-xs"}>비합숙: 중간일 일비 5할 / 숙박비 없음</div>}
        </div>
        <div className={card}>
          <div className={ct}>동행 연수자 여부</div>
          <div className="flex gap-2">
            <TB sel={s.hasComp===false} onClick={()=>upd({hasComp:false})}>단독</TB>
            <TB sel={s.hasComp===true}  onClick={()=>upd({hasComp:true})}>동행 있음</TB>
          </div>
          {s.hasComp===true&&<>
            <div className={ibox+" mt-3 text-xs"}>동행 상급자 시 운임·숙박·식비 기준 상향 (제4조①)</div>
            {s.companions.map((c,i)=>(
              <div key={i} className="border border-gray-100 rounded-xl p-3 mt-3">
                {i>0&&<div className="flex justify-end mb-2"><Btn small onClick={()=>setS(v=>({...v,companions:v.companions.filter((_,j)=>j!==i)}))}>삭제</Btn></div>}
                <div className={lbl0}>동행자 {i+1} 성명</div>
                <input className={inp} type="text" value={c.name} placeholder="성명" onChange={e=>updC(i,"name",e.target.value)}/>
                <div className={lbl}>직급</div>
                <div className="flex flex-wrap gap-2 mt-1">{GR.map(g=><TB key={g} small sel={c.grade===g} onClick={()=>updC(i,"grade",g)}>{g}</TB>)}</div>
              </div>
            ))}
            <button className="mt-2 text-xs text-blue-500 underline cursor-pointer"
              onClick={()=>setS(v=>({...v,companions:[...v.companions,{name:"",grade:""}]}))}>+ 동행자 추가</button>
          </>}
        </div>
        <div className="flex justify-end"><Btn primary disabled={!ok0} onClick={goS1}>다음 →</Btn></div>
      </>}

      {/* STEP 1: 지급방침 */}
      {step===1&&<>
        <div className={card}>
          <div className={ct}>연수주관부서 지급 방침</div>
          <div className={wbox+" mb-4"}><div className="font-medium mb-1">⚠️ 지급 방침을 먼저 확인하세요</div><div className="text-xs">연수주관부서의 지침과 근거를 확인 후 선택하세요.</div></div>
          <div className="grid grid-cols-1 gap-2">
            {[["none","전액 미지급","연수주관부서에서 여비 전액 지급","red"],["partial","일부 지급","교통비 또는 숙박비 일부만 지급","amber"],["full","전액 지급 (여비규칙)","여비규칙 기준으로 전액 본인 정산","green"]].map(([k,l,d,c])=>(
              <button key={k} className={"w-full border-2 rounded-xl p-3 text-left cursor-pointer "+(s.policy===k?(c==="red"?"border-red-400 bg-red-50":c==="amber"?"border-amber-400 bg-amber-50":"border-green-400 bg-green-50"):"border-gray-200 hover:bg-gray-50")}
                onClick={()=>upd({policy:k,policyNote:"",policyBasis:""})}>
                <div className={"font-medium text-sm "+(s.policy===k?(c==="red"?"text-red-700":c==="amber"?"text-amber-700":"text-green-700"):"text-gray-700")}>{l}</div>
                <div className="text-xs text-gray-400 mt-0.5">{d}</div>
              </button>
            ))}
          </div>
          {s.policy==="partial"&&<>
            <div className={lbl}>주관부서 지급 내용 <span className="text-red-500">*필수</span></div>
            <input className={inp} type="text" value={s.policyNote} placeholder="예: 교통비 지급, 숙박비·일비 미지급"
              onChange={e=>upd({policyNote:e.target.value})}/>
          </>}
          {s.policy&&<>
            <div className={lbl}>{s.policy==="none"?"미지급 근거":"지급 방침 근거"} <span className="text-red-500">*필수</span></div>
            <div className="text-xs text-gray-400 mb-1">연수주관부서의 지침과 근거 문서를 확인하세요.</div>
            <input className={inp} type="text" value={s.policyBasis} placeholder="예: OO공문 제2026-001호"
              onChange={e=>upd({policyBasis:e.target.value})}/>
            {s.policy==="none"&&s.policyBasis&&<div className={ebox+" mt-3"}>전액 미지급 확인 — 아래 완료·저장으로 처리 완료 보고서를 출력하세요.</div>}
          </>}
        </div>
        <div className="flex justify-between">
          <Btn onClick={()=>setStep(0)}>← 이전</Btn>
          {s.policy==="none"
            ?<Btn primary disabled={!ok1} onClick={()=>setStep(2)}>완료 및 저장 →</Btn>
            :<Btn primary disabled={!ok1} onClick={goS2}>교통·숙박 입력 →</Btn>}
        </div>
      </>}

      {/* STEP 2: 교통·숙박 */}
      {step===2&&s.policy!=="none"&&<>
        <div className={ibox+" mb-4 text-xs"}>✅ 입소일·퇴소일 교통비만 지급 &nbsp;/&nbsp; ❌ 중간일 교통비 미지급 (제17조)</div>
        <div className={card}>
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-purple-100 text-purple-700 text-xs px-2.5 py-1 rounded-full font-medium">입소일</span>
            <span className="text-sm font-medium">{"대구 → "+(s.trainingRegion||"연수지")}</span>
            <span className="text-xs text-gray-400 ml-auto">{(s.startDate||"").replace(/-/g,".")}</span>
          </div>
          <TransportForm t={s.inbound} seg={"대구→"+(s.trainingRegion||"연수지")} startDate={s.startDate} upd={updIn} eg={eg}/>
        </div>
        <div className={card}>
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-purple-100 text-purple-700 text-xs px-2.5 py-1 rounded-full font-medium">퇴소일</span>
            <span className="text-sm font-medium">{(s.trainingRegion||"연수지")+" → 대구"}</span>
            <span className="text-xs text-gray-400 ml-auto">{(s.endDate||"").replace(/-/g,".")}</span>
          </div>
          <TransportForm t={s.outbound} seg={(s.trainingRegion||"연수지")+"→대구"} startDate={s.startDate} upd={updOut} eg={eg}/>
        </div>
        {s.isResidence&&tNights>0&&(
          <div className={card}>
            <div className={ct}>숙박비 — {tNights}박 개별 입력</div>
            <div className={ibox+" mb-3 text-xs"}>연수지역 숙박비 상한: <strong>{fmtW(lim)}/박</strong></div>
            {s.nights.map((n,ni)=><NightRow key={ni} n={n} num={ni+1} date={(days[ni]?days[ni].label:"")||""} limit={lim} upd={p=>updN(ni,p)}/>)}
          </div>
        )}
        {s.isResidence&&tNights===0&&<div className={wbox+" mb-4"}><div className="font-medium mb-1">⚠️ 당일 연수 — 숙박비 없음</div><div className="text-xs">입소·퇴소가 같은 날이므로 숙박비가 발생하지 않습니다.</div></div>}
        {!s.isResidence&&<div className={obox+" mb-4"}>비합숙 연수 — 숙박비 없음 {tNights===0?"(당일 연수)":""}</div>}
        <div className="flex justify-between">
          <Btn onClick={()=>setStep(1)}>← 이전</Btn>
          <Btn primary disabled={!ok2} onClick={goS3}>일비·식비 →</Btn>
        </div>
      </>}

      {/* STEP 3: 일비·식비 */}
      {step===3&&<>
        <div className={card}>
          <div className={ct}>일비·식비 날짜별 입력</div>
          <div className={ibox+" mb-3 text-xs"}>일비: 입소·퇴소일 25,000원 / 중간일 {s.isResidence?"0원(미지급)":"12,500원(5할)"} / 식비: 제공 식수당 8,333원 차감</div>
          {s.dayData.map((d,di)=>{
            const base=bdAmt(d,s.isResidence),fDay=d.dayDeduct?Math.round(base/2):base,cnt=[d.b,d.l,d.d].filter(Boolean).length,mAmt=Math.max(0,25000-cnt*MU),dtype=d.isFirst?"입소일":d.isLast?"퇴소일":s.isResidence?"합숙 중간일":"비합숙 중간일";
            return(
              <div key={di} className={"border rounded-xl p-4 mb-3 "+(d.isFirst||d.isLast?"border-purple-200 bg-purple-50/30":s.isResidence?"border-gray-100":"border-amber-100 bg-amber-50/20")}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={"text-xs px-2 py-0.5 rounded-full font-medium "+(d.isFirst||d.isLast?"bg-purple-100 text-purple-700":s.isResidence?"bg-gray-100 text-gray-500":"bg-amber-100 text-amber-700")}>{dtype}</span>
                    <span className="text-sm font-medium text-gray-700">{d.dayNum}일차 {d.label}</span>
                  </div>
                  <div className="text-right text-sm">
                    <span className={"font-medium "+(fDay===0?"text-gray-400":d.dayDeduct?"text-amber-600":"text-gray-700")}>일비 {fmtW(fDay)}</span>
                    <span className={"ml-3 font-medium "+(cnt>0?"text-amber-600":"text-gray-700")}>식비 {fmtW(mAmt)}</span>
                  </div>
                </div>
                {base>0&&<div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">기준 일비: {fmtW(base)}</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={d.dayDeduct} onChange={e=>updD(di,{dayDeduct:e.target.checked})} className="w-4 h-4 accent-purple-500"/>
                    
                  </label>
                </div>}
                {base===0&&<div className="text-xs text-gray-400 mb-2">합숙 중간일 — 일비 미지급</div>}
                <div className="border-t border-gray-100 pt-3">
                  {d.isMid&&s.isResidence&&!(d.b&&d.l&&d.d)&&<div className="text-xs text-amber-600 mb-2">⚠️ 합숙 중간일 — 식사 제공 여부를 반드시 확인하세요.</div>}
                  <div className="flex gap-4 flex-wrap">
                    {[["b","조식"],["l","중식"],["d","석식"]].map(([k,l])=>(
                      <label key={k} className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={d[k]} onChange={e=>updD(di,{[k]:e.target.checked})} className="w-4 h-4 accent-purple-500"/>
                        <span className="text-sm text-gray-700">{l} 지원</span>
                      </label>
                    ))}
                  </div>
                  {cnt>0&&<div className="mt-1 text-xs text-amber-700">{cnt}식 × {fmtW(MU)} 차감 → 식비 {fmtW(mAmt)}</div>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between">
          <Btn onClick={()=>setStep(2)}>← 교통·숙박</Btn>
          <Btn primary disabled={!ok3} onClick={()=>setStep(4)}>감액 조정 →</Btn>
        </div>
      </>}


      {/* STEP 4: 감액 조정 */}
      {step===4&&s.policy!=="none"&&<>
        <div className={card}>
          <div className={ct}>사용자 감액 조정</div>
          <div className={ibox+" mb-4 text-xs"}>
            감액만 가능합니다. AI 산출값이 규정상 상한입니다.<br/>
            증액이 필요하면 처음으로 돌아가 재계산하세요.<br/>
            감액 시 사유 입력 필수 — 보고서에 명시됩니다.
          </div>
          {(()=>{
            const pIn=segT(s.inbound).personal;
            const pOut=segT(s.outbound).personal;
            const aC=(s.nights||[]).reduce((sm,n)=>sm+(n.type==="relative"?20000:parseInt(n.amount)||0),0);
            const dT=s.dayData.reduce((sm,d)=>{const b=bdAmt(d,s.isResidence);return sm+(d.dayDeduct?Math.round(b/2):b);},0);
            const mT=s.dayData.reduce((sm,d)=>sm+Math.max(0,25000-[d.b,d.l,d.d].filter(Boolean).length*MU),0);
            const pItems=[
              {key:"교통비(개인)",orig:pIn+pOut},
              {key:"숙박비(개인)",orig:aC},
              {key:"일비",orig:dT},
              {key:"식비",orig:mT},
            ].filter(i=>i.orig>0);
            const totalP=pIn+pOut+aC+dT+mT;
            return(<>
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
                      <input className={inp} type="text" inputMode="numeric" value={adj.deduct||""}
                        placeholder={"최대 "+fmtW(item.orig)}
                        onChange={e=>{
                          let n=parseInt(e.target.value.replace(/[^0-9]/g,""))||0;
                          if(n>item.orig){alert("⚠️ 증액 불가. 처음으로 돌아가 재계산하세요.");n=item.orig;}
                          setAdj(item.key,item.orig,{deduct:n});
                        }}/>
                      <MoneyHint v={adj.deduct||""} />
                      {adj.deduct>0&&<div className="flex justify-between text-sm mt-2 p-2 bg-white rounded-lg border border-amber-200"><span className="text-gray-500">최종값</span><span className="font-medium text-amber-700">{fmtW(item.orig-adj.deduct)}</span></div>}
                      <div className="block text-sm text-gray-500 mb-1 mt-3">감액 사유 <span className="text-red-500">*필수</span></div>
                      <input className={inp} type="text" value={adj.reason}
                        placeholder="예: 외부 일비 지원, 영수증 분실로 일부 미청구"
                        onChange={e=>setAdj(item.key,item.orig,{reason:e.target.value})}/>
                    </>}
                    {!adj&&<div className="text-xs text-gray-400">감액 없음 — 산출값 그대로 청구</div>}
                  </div>
                );
              })}
              <div className={"border-2 rounded-xl p-4 mb-2 "+(totalDeduct>0?"border-amber-300 bg-amber-50/30":"border-gray-200")}>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">AI 산출 개인지급</span><span>{fmtW(totalP)}</span></div>
                  {totalDeduct>0&&<div className="flex justify-between text-amber-700"><span>감액 합계</span><span>{"−"+fmtW(totalDeduct)}</span></div>}
                  <div className="flex justify-between border-t border-gray-200 pt-1.5 font-medium">
                    <span>최종 청구액</span><span className={totalDeduct>0?"text-amber-700":"text-purple-600"}>{fmtW(totalP-totalDeduct)}</span>
                  </div>
                </div>
              </div>
            </>);
          })()}
        </div>
        <div className="flex justify-between">
          <Btn onClick={()=>setStep(3)}>← 일비·식비</Btn>
          <Btn primary
            disabled={adjustments.some(a=>!a.reason.trim()||a.deduct<=0)}
            onClick={()=>setStep(5)}>완료 및 저장 →</Btn>
        </div>
      </>}

      {/* 완료·저장 */}
      {((step===2&&s.policy==="none")||(step===5&&s.policy!=="none"))&&<>
        {/* ── 이미지 첨부 ── */}
        <div className={card}>
          <div className={ct}>증빙 이미지 첨부 (선택)</div>
          <ImageUploadBox label="연수 확인서" required={false}
            img={images["confirm"]} loading={!!loadingImg["confirm"]}
            onUpload={f=>uploadImg("confirm",f)} onRemove={()=>removeImg("confirm")}/>
          <ImageUploadBox label="교통비 영수증" required={false}
            img={images["transport"]} loading={!!loadingImg["transport"]}
            onUpload={f=>uploadImg("transport",f)} onRemove={()=>removeImg("transport")}/>
          <ImageUploadBox label="숙박비 영수증" required={false}
            img={images["accom"]} loading={!!loadingImg["accom"]}
            onUpload={f=>uploadImg("accom",f)} onRemove={()=>removeImg("accom")}/>
          <ImageUploadBox label="기타 증빙" required={false}
            img={images["etc"]} loading={!!loadingImg["etc"]}
            onUpload={f=>uploadImg("etc",f)} onRemove={()=>removeImg("etc")}/>
        </div>
        <div className={card}>
          <div className="text-center py-3 mb-4">
            <div className="text-3xl mb-2">✅</div>
            <div className="text-lg font-medium">{s.policy==="none"?"전액 미지급 처리 완료":"연수 여비 정산 완료"}</div>
            <div className="text-xs text-gray-500 mt-1">보고서를 출력하고 저장하세요</div>
          </div>
          <div className="space-y-2 mb-4">
            <button className={"w-full border-2 rounded-xl p-4 text-left cursor-pointer "+(printed?"border-green-200 bg-green-50/30":"border-purple-400 hover:bg-purple-50")} onClick={hPrint}>
              <div className={"font-medium mb-0.5 "+(printed?"text-green-600":"text-purple-600")}>{printed?"✅ 보고서 출력됨 (재출력 가능)":"🖨️ 보고서 출력 (PDF 저장)"}</div>
              <div className="text-xs text-gray-400">{mkN(s,"pdf")}</div>
            </button>
            <button className={"w-full border-2 rounded-xl p-4 text-left cursor-pointer "+(saved?"border-green-400 bg-green-50":"border-blue-400 hover:bg-blue-50")} onClick={hSave}>
              <div className={"font-medium mb-0.5 "+(saved?"text-green-600":"text-blue-600")}>{saved?"✅ 데이터 저장 완료":"📥 데이터 저장 (JSON)"}</div>
              <div className="text-xs text-gray-400">{mkN(s,"json")}</div>
            </button>
          </div>
          <div className={ibox+" mb-4 text-xs"}>📄 보고서 출력 → 인쇄 창 → PDF로 저장<br/>📥 JSON → 추후 불러오기·재출력 가능</div>
          <div className="border border-gray-200 rounded-xl p-4">
            <div className="font-medium text-sm text-gray-700 mb-1">📧 메일 보내기</div>
            <div className="text-xs text-gray-400 mb-2">기본 메일 앱이 열립니다. PDF를 첨부 후 발송하세요.</div>
            <button className="w-full border border-gray-300 rounded-lg py-2.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer" onClick={()=>dMail(s)}>메일 보내기 (mailto)</button>
          </div>
        </div>
        <div className="flex justify-between">
          <Btn onClick={()=>setStep(s.policy==="none"?1:4)}>← 감액조정</Btn>
          <Btn primary onClick={()=>{setS(iS());setStep(0);setSaved(false);setPrinted(false);setAdjs([]);}}>새 정산 시작</Btn>
        </div>
      </>}
    </div>
  );
}


