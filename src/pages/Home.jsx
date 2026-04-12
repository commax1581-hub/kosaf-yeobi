import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

/* ── 상수 ── */
const wbox = "bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-700";
const ibox = "bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700";

/* ── 오늘 날짜 ── */
const today = new Date();
const todayStr = today.getFullYear()+"년 "+(today.getMonth()+1)+"월 "+today.getDate()+"일 기준";

/* ── 경로 정의 ── */
const ROUTES = [
  {
    key: "A",
    label: "근무지 내 출장",
    bgGrad: "linear-gradient(135deg,#1d4ed8,#3b82f6)",
    desc: "당일·숙박없음",
    time: "약 1분",
    규정: "제16조",
    path: "/a",
  },
  {
    key: "B",
    label: "국내 일반 출장",
    bgGrad: "linear-gradient(135deg,#065f46,#10b981)",
    desc: "숙박 포함 가능",
    time: "약 5분",
    규정: "제11~15조",
    path: "/b/1",
  },
  {
    key: "C",
    label: "국내 연수",
    bgGrad: "linear-gradient(135deg,#4c1d95,#7c3aed)",
    desc: "연수원·기관 참가",
    time: "약 3분",
    규정: "제17조",
    path: "/c",
  },
];

/* ── JSON 불러오기 ── */
function loadJSON(file, onSuccess, onError) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const json = JSON.parse(e.target.result);
      onSuccess(json);
    } catch(_) { onError("파일 형식이 올바르지 않습니다."); }
  };
  reader.onerror = () => onError("파일을 읽을 수 없습니다.");
  reader.readAsText(file);
}

/* ── 사용 안내 ── */
const StepGuide = () => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3 mb-3">
    <div className="text-sm font-semibold text-gray-700 mb-2">사용 안내</div>
    <div className="text-sm text-gray-600 leading-relaxed">
      A · B · C 중 사유에 맞게 선택 후 입력하세요.<br/>
      <span className="text-blue-600">한국장학재단 내규 기준 여비 자동 계산</span><br/>
      <span className="text-gray-400 text-xs">보고서 출력은 PC 환경을 권장합니다.</span>
    </div>
  </div>
);

export default function Home() {
  const navigate = useNavigate()
  const [loadMsg, setLoadMsg] = useState("");
  const [loadedData, setLoadedData] = useState(null);
  const fileRef = useRef(null);

  const handleLoad = useCallback(file => {
    setLoadMsg("");
    setLoadedData(null);
    loadJSON(file,
      data => {
        const v = (data.v||"").charAt(0).toUpperCase();
        const name = (data.d&&data.d.name) || "-";
        const date = (data.d&&data.d.startDate) || "";
        setLoadedData({ v, name, date, raw: data });
      },
      err => setLoadMsg(err)
    );
  }, []);

  return (
    <div className="max-w-lg mx-auto p-4 pb-4" style={{background:"#f0f4ff", minHeight:"100vh"}}>

      {/* ── 헤더 배너 ── */}
      <div className="rounded-2xl mb-3 overflow-hidden shadow-sm" style={{position:"relative"}}>
        <img
          src="/hero-bg.png"
          alt="배경"
          style={{
            width:"100%",
            height:"160px",
            objectFit:"cover",
            objectPosition:"center 30%",
            display:"block",
          }}
        />
        <div style={{
          position:"absolute",
          inset:0,
          background:"linear-gradient(135deg,rgba(30,58,138,0.72) 0%,rgba(29,78,216,0.60) 100%)",
          display:"flex",
          flexDirection:"column",
          justifyContent:"center",
          padding:"20px",
        }}>
          <div style={{color:"#fff",fontWeight:700,fontSize:"22px",lineHeight:1.2,marginBottom:"4px"}}>KOSAF 여비를 부탁해....</div>
          <div style={{color:"#bfdbfe",fontSize:"13px",marginBottom:"8px"}}>스마트 여비정산 시스템</div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{color:"#93c5fd",fontSize:"11px"}}>한국장학재단 여비규칙 기준</div>
            <div style={{color:"#bfdbfe",fontSize:"11px",background:"rgba(255,255,255,0.15)",borderRadius:"8px",padding:"3px 8px"}}>{todayStr}</div>
          </div>
        </div>
      </div>

      {/* ── 경고 안내 (상단 배치) ── */}
      <div className={wbox + " text-xs mb-3"}>
        <div className="flex gap-2">
          <span>⚠️</span>
          <div>
            <div>1. 브라우저를 닫으면 입력 내용이 초기화됩니다.</div>
            <div>2. 정산 완료 후 반드시 JSON 파일로 저장하세요.</div>
          </div>
        </div>
      </div>

      {/* ── 정산 사유 카드 3열 ── */}
      <div className="text-sm font-semibold text-gray-700 mb-2 px-1">정산 사유</div>
      <div className="grid grid-cols-3 gap-3 mb-3">
        {ROUTES.map(r => (
          <button
            key={r.key}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 text-center cursor-pointer hover:shadow-md transition-all active:scale-95"
            onClick={() => navigate(r.path)}
          >
            <div
              className="w-12 h-12 rounded-2xl mx-auto mb-2 flex items-center justify-center"
              style={{background: r.bgGrad}}
            >
              <span className="text-white font-black text-2xl">{r.key}</span>
            </div>
            <div className="text-xs font-bold text-gray-800 mb-0.5 leading-tight">{r.label}</div>
            <div className="text-xs text-gray-400 leading-tight mb-1">{r.desc}</div>
            <div className="text-xs font-medium text-blue-500">{r.time}</div>
          </button>
        ))}
      </div>

      {/* ── 사용 안내 ── */}
      <StepGuide />

      {/* ── 기존 정산 불러오기 ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-3">
        <div className="text-sm font-semibold text-gray-700 mb-0.5">기존 정산 불러오기</div>
        <div className="text-xs text-gray-400 mb-3">이전에 저장한 정산 파일(.json)을 불러옵니다.</div>
        <button
          className="w-full border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all bg-white"
          onClick={() => fileRef.current&&fileRef.current.click()}
        >
          <span className="text-xl">📂</span>
          <div className="text-left">
            <div className="text-sm font-medium text-gray-700">JSON 파일 선택</div>
            <div className="text-xs text-gray-400">예) 20260409_0900_A경로_홍길동.json</div>
          </div>
          <span className="ml-auto text-gray-300 text-sm">›</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={e => {
            const f = e.target.files&&e.target.files[0];
            if (f) handleLoad(f);
            e.target.value = "";
          }}
        />
        {loadMsg && <div className="text-xs text-red-500 text-center mt-2">{loadMsg}</div>}
        {loadedData && (
          <div className={ibox + " mt-3 text-xs"}>
            <div className="font-semibold mb-1">📋 {loadedData.v}경로 정산 파일 확인</div>
            <div>이름: {loadedData.name}</div>
            <div>기간: {loadedData.date}</div>
            <div className="mt-1 text-blue-600">해당 경로 파일을 열어 불러오기 하세요.</div>
          </div>
        )}
      </div>



    </div>
  );
}
