import React from 'react';

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

export default ReportOverlay;
