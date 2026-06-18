import { useState, useCallback, useRef, useEffect } from "react";

// ═══════════════════════════════════════
//  CONSTANTS & HELPERS
// ═══════════════════════════════════════
const G = 8;
const mk2D = (r, c, v = 0) => Array.from({ length: r }, () => Array(c).fill(v));
const mkPiece = (id) => ({ id, shape: mk2D(5, 5, 0) });

const PRESETS = {
  "Titik":   [[1]],
  "H-2":     [[1,1]],
  "H-3":     [[1,1,1]],
  "H-4":     [[1,1,1,1]],
  "H-5":     [[1,1,1,1,1]],
  "V-2":     [[1],[1]],
  "V-3":     [[1],[1],[1]],
  "V-4":     [[1],[1],[1],[1]],
  "V-5":     [[1],[1],[1],[1],[1]],
  "□ 2×2":   [[1,1],[1,1]],
  "□ 3×3":   [[1,1,1],[1,1,1],[1,1,1]],
  "L-kanan": [[1,0],[1,0],[1,1]],
  "L-kiri":  [[0,1],[0,1],[1,1]],
  "J-kanan": [[1,1],[1,0],[1,0]],
  "J-kiri":  [[1,1],[0,1],[0,1]],
  "T-atas":  [[1,1,1],[0,1,0]],
  "T-bawah": [[0,1,0],[1,1,1]],
  "T-kiri":  [[1,0],[1,1],[1,0]],
  "T-kanan": [[0,1],[1,1],[0,1]],
  "S-blok":  [[0,1,1],[1,1,0]],
  "Z-blok":  [[1,1,0],[0,1,1]],
  "Sudut 2": [[1,1],[1,0]],
  "Sudut 3": [[1,1,1],[1,0,0]],
  "Plus":    [[0,1,0],[1,1,1],[0,1,0]],
};

const C = {
  bg:"#080c18", surface:"#0f1828", surface2:"#162035", surface3:"#1c2a45",
  border:"#1e3a5f", accent:"#00e5ff", accent2:"#7c3aed", accent3:"#10b981",
  warn:"#f59e0b", danger:"#ef4444", text:"#e2e8f0", muted:"#64748b",
};

// solver
function trimShape(shape) {
  let minR=5,maxR=-1,minC=5,maxC=-1;
  for(let r=0;r<5;r++) for(let c=0;c<5;c++) if(shape[r][c]){
    minR=Math.min(minR,r);maxR=Math.max(maxR,r);minC=Math.min(minC,c);maxC=Math.max(maxC,c);
  }
  if(maxR<0) return [];
  return Array.from({length:maxR-minR+1},(_,i)=>shape[minR+i].slice(minC,maxC+1));
}
function countCells(shape){ return shape.flat().filter(Boolean).length; }
function canPlace(board,shape,row,col){
  for(let r=0;r<shape.length;r++) for(let c=0;c<shape[r].length;c++) if(shape[r][c]){
    const br=row+r,bc=col+c;
    if(br>=G||bc>=G||br<0||bc<0||board[br][bc]) return false;
  }
  return true;
}
function placeBoard(board,shape,row,col){
  const nb=board.map(r=>[...r]);
  for(let r=0;r<shape.length;r++) for(let c=0;c<shape[r].length;c++) if(shape[r][c]) nb[row+r][col+c]=1;
  return nb;
}
function clearLines(board){
  const nb=board.map(r=>[...r]);
  const rows=[],cols=[];
  for(let r=0;r<G;r++) if(nb[r].every(v=>v===1)) rows.push(r);
  for(let c=0;c<G;c++) if(nb.every(row=>row[c]===1)) cols.push(c);
  rows.forEach(r=>nb[r].fill(0));
  cols.forEach(c=>nb.forEach(row=>{row[c]=0;}));
  return {board:nb,linesCleared:rows.length+cols.length,rows,cols};
}
function scoreBoard(board,lines,pSize){
  let s=lines*150+pSize*3;
  for(let r=0;r<G;r++){const f=board[r].reduce((a,b)=>a+b,0);if(f===7)s+=50;else if(f>=6)s+=20;}
  for(let c=0;c<G;c++){const f=board.reduce((a,row)=>a+row[c],0);if(f===7)s+=50;else if(f>=6)s+=20;}
  return s;
}
function bestPlace(board,shape){
  let best=null,bestS=-Infinity;
  if(!shape.length) return null;
  for(let r=0;r<=G-shape.length;r++) for(let c=0;c<=G-shape[0].length;c++) if(canPlace(board,shape,r,c)){
    const placed=placeBoard(board,shape,r,c);
    const {board:after,linesCleared,rows,cols}=clearLines(placed);
    const sc=scoreBoard(after,linesCleared,shape.flat().filter(Boolean).length);
    if(sc>bestS){bestS=sc;best={row:r,col:c,score:sc,linesCleared,rows,cols,board:after};}
  }
  return best;
}
function perms(arr){
  if(arr.length<=1) return [arr];
  const res=[];
  arr.forEach((item,i)=>{perms(arr.filter((_,j)=>j!==i)).forEach(p=>res.push([item,...p]));});
  return res;
}

// ═══════════════════════════════════════
//  RESPONSIVE HOOK
// ═══════════════════════════════════════
function useWindowWidth(){
  const [w,setW]=useState(typeof window!=="undefined"?window.innerWidth:400);
  useEffect(()=>{
    const fn=()=>setW(window.innerWidth);
    window.addEventListener("resize",fn);
    return()=>window.removeEventListener("resize",fn);
  },[]);
  return w;
}

// ═══════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════
export default function App() {
  const [grid, setGrid]           = useState(()=>mk2D(G,G,0));
  const [pieces, setPieces]       = useState([mkPiece(0),mkPiece(1),mkPiece(2)]);
  const [solution, setSolution]   = useState(null);
  const [currentStep, setCurrentStep] = useState(-1);
  const [aiLoading, setAiLoading] = useState(false);
  const [toast, setToast]         = useState(null);
  const [tab, setTab]             = useState("board"); // "board" | "pieces"
  const [autoRunning, setAutoRunning] = useState(false);
  const isDown   = useRef(false);
  const lastAct  = useRef(null);
  const autoRef  = useRef(null);
  const w        = useWindowWidth();

  // Responsive sizes — fit within artifact viewport
  const CELL  = w < 420 ? 34 : w < 600 ? 38 : 42;
  const PCELL = w < 420 ? 20 : 24;
  const isMobile = w < 700;

  // ── Toast ──────────────────────────────
  const showToast = useCallback((msg, type="")=>{
    setToast({msg,type});
    setTimeout(()=>setToast(null),2800);
  },[]);

  // ── Grid ops ───────────────────────────
  const applyCell = useCallback((r,c,act,g)=>{
    const ng=g.map(row=>[...row]);
    ng[r][c]=act==="fill"?1:0;
    return ng;
  },[]);

  // Mouse
  const handleMouseDown=(r,c)=>{
    isDown.current=true;
    const act=grid[r][c]?"erase":"fill";
    lastAct.current=act;
    setGrid(g=>applyCell(r,c,act,g));
  };
  const handleMouseEnter=(r,c)=>{
    if(!isDown.current) return;
    setGrid(g=>applyCell(r,c,lastAct.current,g));
  };

  // Touch — tap to toggle, drag to paint
  const touchCell=(r,c,isStart)=>{
    if(isStart){
      const act=grid[r][c]?"erase":"fill";
      lastAct.current=act;
      setGrid(g=>applyCell(r,c,act,g));
    } else {
      setGrid(g=>applyCell(r,c,lastAct.current,g));
    }
  };

  const handleTouchMove=(e)=>{
    e.preventDefault();
    const touch=e.touches[0];
    const el=document.elementFromPoint(touch.clientX,touch.clientY);
    if(el&&el.dataset.row!==undefined){
      const r=+el.dataset.row,c=+el.dataset.col;
      setGrid(g=>applyCell(r,c,lastAct.current,g));
    }
  };

  useEffect(()=>{
    const up=()=>{isDown.current=false;lastAct.current=null;};
    window.addEventListener("mouseup",up);
    window.addEventListener("touchend",up);
    return()=>{window.removeEventListener("mouseup",up);window.removeEventListener("touchend",up);};
  },[]);

  const clearGrid=()=>{setGrid(mk2D(G,G,0));setSolution(null);setCurrentStep(-1);};
  const fillDemo=()=>{
    const ng=mk2D(G,G,0);
    for(let r=0;r<G;r++) for(let c=0;c<G;c++) if(Math.random()<0.38) ng[r][c]=1;
    const tr=Math.floor(Math.random()*8);
    for(let c=0;c<7;c++) ng[tr][c]=1;
    setGrid(ng);
    showToast("Papan contoh dibuat!","good");
  };
  const clearAll=()=>{clearGrid();setPieces([mkPiece(0),mkPiece(1),mkPiece(2)]);setSolution(null);setCurrentStep(-1);showToast("Reset!");};

  const filled=grid.flat().filter(Boolean).length;
  const fullRows=grid.filter(row=>row.every(v=>v===1)).length;

  // ── Piece ops ──────────────────────────
  const togglePC=(pi,r,c)=>setPieces(ps=>ps.map((p,i)=>i!==pi?p:{...p,shape:p.shape.map((row,rr)=>row.map((v,cc)=>rr===r&&cc===c?v^1:v))}));
  const clearPiece=(pi)=>setPieces(ps=>ps.map((p,i)=>i===pi?mkPiece(pi):p));
  const applyPreset=(pi,name)=>{
    const tmpl=PRESETS[name];
    if(!tmpl) return;
    const ns=mk2D(5,5,0);
    tmpl.forEach((row,r)=>row.forEach((v,c)=>{if(r<5&&c<5)ns[r][c]=v;}));
    setPieces(ps=>ps.map((p,i)=>i===pi?{...p,shape:ns}:p));
    showToast(`${name} → Blok ${pi+1}`,"good");
  };

  // ── Local solver ───────────────────────
  const solveLocal=useCallback(()=>{
    const active=pieces.map((p,i)=>({idx:i,shape:trimShape(p.shape)})).filter(p=>p.shape.length>0&&p.shape.flat().some(Boolean));
    if(!active.length){showToast("Tambahkan minimal 1 blok!","bad");return;}
    let bestScore=-Infinity,bestSteps=[];
    for(const perm of perms(active)){
      let board=grid.map(r=>[...r]),steps=[],score=0,ok=true;
      for(const p of perm){
        const b=bestPlace(board,p.shape);
        if(!b){ok=false;break;}
        score+=b.score;
        steps.push({pieceIdx:p.idx,shape:p.shape,row:b.row,col:b.col,linesCleared:b.linesCleared,clearedRows:b.rows,clearedCols:b.cols,reason:""});
        board=b.board;
      }
      if(ok&&score>bestScore){bestScore=score;bestSteps=steps;}
    }
    if(!bestSteps.length){showToast("Tidak ada posisi valid.","bad");return;}
    setSolution({steps:bestSteps,solver:"⚡ Cepat",strategy:""});
    setCurrentStep(-1);
    showToast(`Solusi: ${bestSteps.length} langkah!`,"good");
  },[grid,pieces,showToast]);

  // ── AI solver ──────────────────────────
  const solveAI=useCallback(async()=>{
    const active=pieces.map((p,i)=>({idx:i,shape:trimShape(p.shape)})).filter(p=>p.shape.length>0&&p.shape.flat().some(Boolean));
    if(!active.length){showToast("Tambahkan minimal 1 blok!","bad");return;}
    setAiLoading(true);setSolution(null);
    const boardRaw=grid.map(r=>r.join("")).join("\n");
    const pDesc=active.map(p=>`Blok ${p.idx+1}:\n${p.shape.map(r=>r.join(" ")).join("\n")}`).join("\n\n");
    const prompt=`Kamu adalah Block Blast puzzle solver expert.

PAPAN 8×8 (1=terisi, 0=kosong, index mulai 0):
${boardRaw}

BLOK TERSEDIA:
${pDesc}

Cari penempatan terbaik untuk memaksimalkan baris/kolom yang dihapus.
Validasi: row+tinggi<=8, col+lebar<=8, tidak konflik dengan sel=1.

Kembalikan HANYA JSON (tanpa markdown):
{"steps":[{"pieceIdx":0,"row":0,"col":0,"linesCleared":0,"reason":"alasan"}],"totalLines":0,"strategy":"strategi bahasa Indonesia"}`;
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:1000,messages:[{role:"user",content:prompt}]})
      });
      const data=await res.json();
      setAiLoading(false);
      const text=data.content.map(i=>i.text||"").join("");
      const clean=text.replace(/```json|```/g,"").trim();
      let parsed;
      try{parsed=JSON.parse(clean);}catch{showToast("Parse error, pakai lokal","bad");solveLocal();return;}
      let board=grid.map(r=>[...r]);
      const steps=[];
      for(const s of (parsed.steps||[])){
        const ap=active.find(p=>p.idx===s.pieceIdx);
        if(!ap) continue;
        const shape=ap.shape;
        let row=s.row,col=s.col;
        if(!canPlace(board,shape,row,col)){
          const fb=bestPlace(board,shape);
          if(!fb) continue;
          row=fb.row;col=fb.col;s.linesCleared=fb.linesCleared;
        }
        const placed=placeBoard(board,shape,row,col);
        const {board:after,linesCleared,rows,cols}=clearLines(placed);
        steps.push({pieceIdx:s.pieceIdx,shape,row,col,linesCleared,clearedRows:rows,clearedCols:cols,reason:s.reason||""});
        board=after;
      }
      if(!steps.length){showToast("AI gagal, pakai lokal","bad");solveLocal();return;}
      setSolution({steps,solver:"🤖 AI",strategy:parsed.strategy||""});
      setCurrentStep(-1);
      showToast(`AI: ${steps.length} langkah!`,"good");
    }catch(e){
      setAiLoading(false);showToast("Error API, pakai lokal","bad");solveLocal();
    }
  },[grid,pieces,showToast,solveLocal]);

  // ── Step preview ───────────────────────
  const getCellState=(r,c)=>{
    if(!solution||currentStep<0) return grid[r][c]?"filled":"empty";
    const {steps}=solution;
    let board=grid.map(row=>[...row]);
    const clearedSet=new Set();
    for(let i=0;i<currentStep;i++){
      const s=steps[i];
      if(s&&canPlace(board,s.shape,s.row,s.col)){
        const placed=placeBoard(board,s.shape,s.row,s.col);
        const {board:after,rows,cols}=clearLines(placed);
        rows.forEach(rr=>{for(let cc=0;cc<G;cc++) clearedSet.add(rr*G+cc);});
        cols.forEach(cc=>{for(let rr=0;rr<G;rr++) clearedSet.add(rr*G+cc);});
        board=after;
      }
    }
    const step=steps[currentStep];
    if(!step) return board[r][c]?"prev-filled":"empty";
    const placingSet=new Set();
    for(let pr=0;pr<step.shape.length;pr++) for(let pc=0;pc<step.shape[pr].length;pc++) if(step.shape[pr][pc]) placingSet.add((step.row+pr)*G+(step.col+pc));
    let placed=board;
    if(canPlace(board,step.shape,step.row,step.col)) placed=placeBoard(board,step.shape,step.row,step.col);
    const {rows:wr,cols:wc}=clearLines(placed);
    const willClear=new Set();
    wr.forEach(rr=>{for(let cc=0;cc<G;cc++) willClear.add(rr*G+cc);});
    wc.forEach(cc=>{for(let rr=0;rr<G;rr++) willClear.add(rr*G+cc);});
    const idx=r*G+c;
    if(placingSet.has(idx)) return "step-place";
    if(willClear.has(idx)) return "will-clear";
    if(board[r][c]) return "prev-filled";
    if(clearedSet.has(idx)) return "was-cleared";
    return "empty";
  };

  // ── Auto play ──────────────────────────
  const stopAuto=()=>{if(autoRef.current){clearInterval(autoRef.current);autoRef.current=null;setAutoRunning(false);}};
  const autoPlay=()=>{
    if(autoRef.current){stopAuto();return;}
    let step=currentStep>=(solution?.steps.length||0)-1?-1:currentStep;
    setAutoRunning(true);
    autoRef.current=setInterval(()=>{
      step++;
      if(!solution||step>=solution.steps.length){stopAuto();return;}
      setCurrentStep(step);
    },1200);
  };
  useEffect(()=>()=>stopAuto(),[]);

  const totalLines=solution?solution.steps.reduce((a,s)=>a+s.linesCleared,0):0;
  const estScore=totalLines*100+(solution?.steps.length||0)*10;

  // ── Cell style ─────────────────────────
  const cellBg={
    empty:"#0c1528", filled:C.accent2,
    "step-place":"rgba(16,185,129,0.7)", "will-clear":"rgba(245,158,11,0.5)",
    "prev-filled":"rgba(124,58,237,0.4)", "was-cleared":"rgba(16,185,129,0.08)",
  };
  const cellBorder={
    empty:"#182540", filled:"#9f5aff",
    "step-place":C.accent3, "will-clear":C.warn,
    "prev-filled":"rgba(159,90,255,0.4)", "was-cleared":"rgba(16,185,129,0.15)",
  };

  // ── Render ─────────────────────────────
  return (
    <div style={{background:C.bg,color:C.text,minHeight:"100vh",fontFamily:"system-ui,sans-serif",paddingBottom:32}}>

      {/* HEADER */}
      <div style={{textAlign:"center",padding:"16px 12px 10px",background:C.surface,borderBottom:`1px solid ${C.border}`}}>
        <div style={{fontSize:9,letterSpacing:5,color:C.accent,opacity:0.6,textTransform:"uppercase",fontFamily:"monospace"}}>Block Blast</div>
        <h1 style={{fontSize:"1.5rem",fontWeight:700,background:`linear-gradient(130deg,${C.accent},${C.accent2})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",margin:"2px 0 4px"}}>Puzzle Solver</h1>
        {/* Solve buttons di header — always visible */}
        <div style={{display:"flex",gap:8,justifyContent:"center",marginTop:8}}>
          <Btn variant="green" onClick={solveAI} disabled={aiLoading}>
            {aiLoading?<><Spinner/> Proses...</>:"🤖 AI Solver"}
          </Btn>
          <Btn variant="purple" onClick={solveLocal} disabled={aiLoading}>⚡ Solve Cepat</Btn>
          <Btn variant="ghost" onClick={clearAll} style={{padding:"7px 10px"}}>↩</Btn>
        </div>
      </div>

      {/* TAB NAVIGATION (mobile) */}
      {isMobile && (
        <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,background:C.surface}}>
          {[["board","🎮 Papan"],["pieces","🧩 Blok"]].map(([key,label])=>(
            <button key={key} onClick={()=>setTab(key)}
              style={{flex:1,padding:"10px 0",background:"none",border:"none",borderBottom:`2px solid ${tab===key?C.accent:"transparent"}`,color:tab===key?C.accent:C.muted,fontWeight:600,fontSize:"0.82rem",cursor:"pointer",transition:"color 0.2s"}}>
              {label}
            </button>
          ))}
        </div>
      )}

      {/* MAIN CONTENT */}
      <div style={{padding:"12px",maxWidth:900,margin:"0 auto"}}>
        {isMobile ? (
          /* ─── MOBILE: TAB VIEW ─── */
          <>
            {tab==="board" && <BoardPanel {...{grid,CELL,getCellState,cellBg,cellBorder,handleMouseDown,handleMouseEnter,handleTouchMove,touchCell,filled,fullRows,clearGrid,fillDemo}}/>}
            {tab==="pieces" && <PiecesPanel {...{pieces,PCELL,togglePC,clearPiece,applyPreset}}/>}
          </>
        ) : (
          /* ─── DESKTOP: SIDE BY SIDE ─── */
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,alignItems:"start"}}>
            <BoardPanel {...{grid,CELL,getCellState,cellBg,cellBorder,handleMouseDown,handleMouseEnter,handleTouchMove,touchCell,filled,fullRows,clearGrid,fillDemo}}/>
            <PiecesPanel {...{pieces,PCELL,togglePC,clearPiece,applyPreset}}/>
          </div>
        )}

        {/* SOLUTION */}
        {solution && (
          <div style={{marginTop:14,background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:14}}>
            {/* Score */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8,marginBottom:12}}>
              <span style={{fontSize:"0.6rem",letterSpacing:3,textTransform:"uppercase",color:C.muted,fontFamily:"monospace"}}>✅ Solusi</span>
              <span style={{background:"rgba(16,185,129,0.12)",border:"1px solid rgba(16,185,129,0.3)",borderRadius:20,padding:"3px 12px",fontFamily:"monospace",fontSize:"0.6rem",color:C.accent3}}>
                ⭐ ~{estScore} | {totalLines} baris | {solution.solver}
              </span>
            </div>

            {/* Player controls */}
            <div style={{background:C.surface2,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",marginBottom:12}}>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
                <Btn variant="ghost" sm onClick={()=>{stopAuto();setCurrentStep(-1);}}>⏮</Btn>
                <Btn variant="ghost" sm onClick={()=>setCurrentStep(s=>Math.max(-1,s-1))} disabled={currentStep<=-1}>◀</Btn>
                <Btn variant="ghost" sm onClick={()=>setCurrentStep(s=>Math.min(solution.steps.length-1,s+1))} disabled={currentStep>=solution.steps.length-1}>▶</Btn>
                <Btn variant={autoRunning?"primary":"ghost"} sm onClick={autoPlay}>{autoRunning?"⏸ Pause":"▷ Auto"}</Btn>
              </div>
              <div style={{fontSize:"0.68rem",color:C.muted,fontFamily:"monospace",marginBottom:6}}>
                {currentStep===-1
                  ?`${solution.steps.length} langkah — tekan ▶ untuk mulai`
                  :(()=>{const s=solution.steps[currentStep];return `Langkah ${currentStep+1}/${solution.steps.length}: Blok ${s.pieceIdx+1} → Baris ${s.row+1}, Kol ${s.col+1}${s.linesCleared?` ⚡ ${s.linesCleared} dihapus!`:""}`})()
                }
              </div>
              <div style={{height:3,background:C.surface3,borderRadius:2,overflow:"hidden"}}>
                <div style={{height:"100%",background:`linear-gradient(90deg,${C.accent3},${C.accent})`,width:`${currentStep>=0?((currentStep+1)/solution.steps.length*100):0}%`,transition:"width 0.3s",borderRadius:2}}/>
              </div>
            </div>

            {/* Step cards — scrollable row on mobile */}
            <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4,WebkitOverflowScrolling:"touch",marginBottom:12}}>
              {solution.steps.map((s,i)=>(
                <div key={i} onClick={()=>setCurrentStep(i)}
                  style={{flexShrink:0,minWidth:100,background:currentStep===i?"rgba(16,185,129,0.1)":C.surface2,
                    border:`1px solid ${currentStep===i?C.accent3:C.border}`,borderRadius:10,padding:"10px 10px",cursor:"pointer",transition:"all 0.15s"}}>
                  <div style={{fontSize:"0.5rem",color:C.muted,fontFamily:"monospace",marginBottom:2}}>LANGKAH {i+1}</div>
                  <div style={{fontSize:"0.8rem",fontWeight:700,color:C.accent3}}>Blok {s.pieceIdx+1}</div>
                  <div style={{fontSize:"0.65rem",color:C.muted,marginTop:2}}>B{s.row+1} K{s.col+1}</div>
                  {s.linesCleared>0&&<div style={{fontSize:"0.6rem",color:C.warn,marginTop:2}}>⚡{s.linesCleared} baris</div>}
                  {s.reason&&<div style={{fontSize:"0.58rem",color:"#4a90c0",marginTop:2,fontStyle:"italic",lineHeight:1.3}}>{s.reason}</div>}
                </div>
              ))}
            </div>

            {/* Strategy */}
            {solution.strategy&&(
              <div style={{background:C.surface2,borderLeft:`3px solid ${C.accent2}`,borderRadius:"0 8px 8px 0",padding:"8px 12px",fontSize:"0.73rem",color:C.muted,lineHeight:1.6}}>
                <strong style={{color:C.text}}>Strategi: </strong>{solution.strategy}
              </div>
            )}
          </div>
        )}
      </div>

      {/* TOAST */}
      {toast&&(
        <div style={{position:"fixed",bottom:20,left:"50%",transform:"translateX(-50%)",
          background:C.surface,border:`1px solid ${toast.type==="good"?C.accent3:toast.type==="bad"?C.danger:C.border}`,
          borderRadius:10,padding:"9px 18px",fontSize:"0.78rem",
          color:toast.type==="good"?C.accent3:toast.type==="bad"?C.danger:C.text,
          zIndex:999,whiteSpace:"nowrap",boxShadow:"0 4px 20px rgba(0,0,0,0.5)"}}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
//  BOARD PANEL
// ═══════════════════════════════════════
function BoardPanel({grid,CELL,getCellState,cellBg,cellBorder,handleMouseDown,handleMouseEnter,handleTouchMove,touchCell,filled,fullRows,clearGrid,fillDemo}){
  return(
    <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:12}}>
      <div style={{fontSize:"0.6rem",letterSpacing:2,textTransform:"uppercase",color:C.muted,marginBottom:10,fontFamily:"monospace"}}>🎮 Papan 8×8</div>

      {/* Grid */}
      <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
        {/* Col labels */}
        <div style={{display:"flex",gap:2,paddingLeft:20,marginBottom:2}}>
          {Array.from({length:8},(_,c)=>(
            <div key={c} style={{width:CELL,textAlign:"center",fontSize:"0.5rem",color:C.muted,fontFamily:"monospace"}}>{c+1}</div>
          ))}
        </div>
        <div style={{display:"flex",gap:3}}>
          {/* Row labels */}
          <div style={{display:"flex",flexDirection:"column",gap:2}}>
            {Array.from({length:8},(_,r)=>(
              <div key={r} style={{height:CELL,width:18,display:"flex",alignItems:"center",justifyContent:"flex-end",fontSize:"0.5rem",color:C.muted,fontFamily:"monospace",paddingRight:2}}>{r+1}</div>
            ))}
          </div>
          {/* Cells */}
          <div
            onTouchMove={handleTouchMove}
            style={{display:"grid",gridTemplateColumns:`repeat(8,${CELL}px)`,gridTemplateRows:`repeat(8,${CELL}px)`,gap:2,background:"#0a111f",border:`2px solid ${C.border}`,borderRadius:9,padding:4,touchAction:"none",userSelect:"none"}}>
            {Array.from({length:8},(_,r)=>Array.from({length:8},(_,c)=>{
              const state=getCellState(r,c);
              return(
                <div key={`${r}-${c}`}
                  data-row={r} data-col={c}
                  style={{width:CELL,height:CELL,borderRadius:4,border:"1px solid",background:cellBg[state]||"#0c1528",borderColor:cellBorder[state]||"#182540",cursor:"pointer",transition:"background 0.08s"}}
                  onMouseDown={()=>handleMouseDown(r,c)}
                  onMouseEnter={()=>handleMouseEnter(r,c)}
                  onTouchStart={()=>touchCell(r,c,true)}
                />
              );
            }))}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{display:"flex",gap:6,marginTop:10,justifyContent:"center",flexWrap:"wrap"}}>
        <Btn variant="ghost" sm onClick={clearGrid}>🗑 Kosong</Btn>
        <Btn variant="ghost" sm onClick={fillDemo}>🎲 Contoh</Btn>
      </div>

      {/* Stats */}
      <div style={{display:"flex",gap:12,marginTop:8,justifyContent:"center"}}>
        {[["Terisi",filled],["Kosong",64-filled],["Baris penuh",fullRows]].map(([k,v])=>(
          <div key={k} style={{fontFamily:"monospace",fontSize:"0.58rem",color:C.muted,textAlign:"center"}}>
            {k}<br/><span style={{color:C.text,fontSize:"0.82rem",fontWeight:700}}>{v}</span>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10,padding:"8px 10px",background:C.surface2,borderRadius:8}}>
        {[["#9f5aff","Terisi"],["rgba(16,185,129,0.7)","Blok baru"],["rgba(245,158,11,0.5)","Akan hapus"],["rgba(124,58,237,0.4)","Sebelumnya"]].map(([bg,label])=>(
          <div key={label} style={{display:"flex",alignItems:"center",gap:4,fontSize:"0.58rem",color:C.muted}}>
            <div style={{width:10,height:10,borderRadius:2,background:bg,flexShrink:0}}/>
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
//  PIECES PANEL
// ═══════════════════════════════════════
function PiecesPanel({pieces,PCELL,togglePC,clearPiece,applyPreset}){
  return(
    <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:12}}>
      <div style={{fontSize:"0.6rem",letterSpacing:2,textTransform:"uppercase",color:C.muted,marginBottom:10,fontFamily:"monospace"}}>🧩 Blok Tersedia</div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {pieces.map((piece,pi)=>{
          const trim=trimShape(piece.shape);
          const has=trim.length>0&&trim.flat().some(Boolean);
          return(
            <div key={pi} style={{background:C.surface2,border:`1px ${has?"solid":"dashed"} ${has?"rgba(0,229,255,0.3)":C.border}`,borderRadius:10,padding:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"monospace",fontSize:"0.58rem",color:C.muted,marginBottom:8}}>
                <span style={{fontWeight:600}}>BLOK {pi+1}</span>
                <span style={{color:C.accent}}>{countCells(piece.shape)} sel</span>
              </div>
              {/* Piece grid */}
              <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                <div style={{display:"inline-flex",flexDirection:"column",gap:2,flexShrink:0}}>
                  {piece.shape.map((row,r)=>(
                    <div key={r} style={{display:"flex",gap:2}}>
                      {row.map((v,c)=>(
                        <div key={c} onClick={()=>togglePC(pi,r,c)}
                          style={{width:PCELL,height:PCELL,borderRadius:3,cursor:"pointer",border:"1px solid",
                            background:v?C.accent:"#0c1528",borderColor:v?"#00bcd4":"#182540",
                            boxShadow:v?"0 0 4px rgba(0,229,255,0.4)":"none",transition:"background 0.1s"}}/>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              {/* Template + clear */}
              <div style={{display:"flex",gap:6,marginTop:8,alignItems:"center"}}>
                <select defaultValue="" onChange={e=>{applyPreset(pi,e.target.value);e.target.value="";}}
                  style={{flex:1,minWidth:0,background:C.surface3,border:`1px solid ${C.border}`,color:C.muted,fontSize:"0.65rem",padding:"5px 6px",borderRadius:6,cursor:"pointer",fontFamily:"system-ui"}}>
                  <option value="">+ Template...</option>
                  {Object.keys(PRESETS).map(k=><option key={k} value={k}>{k}</option>)}
                </select>
                <Btn variant="danger" sm onClick={()=>clearPiece(pi)}>✕</Btn>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{marginTop:10,fontSize:"0.62rem",color:C.muted,lineHeight:1.5,padding:"8px 10px",background:C.surface2,borderRadius:8}}>
        💡 Ketuk sel blok untuk toggle on/off. Pilih template dari dropdown.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
//  UI HELPERS
// ═══════════════════════════════════════
function Btn({variant="ghost",sm,children,style={},onClick,disabled}){
  const base={fontFamily:"system-ui",fontWeight:600,borderRadius:8,border:"none",cursor:"pointer",
    display:"inline-flex",alignItems:"center",gap:5,transition:"all 0.15s",whiteSpace:"nowrap",
    fontSize:sm?"0.65rem":"0.78rem",padding:sm?"5px 10px":"8px 14px",opacity:disabled?0.4:1};
  const v={
    green: {background:"linear-gradient(135deg,#10b981,#059669)",color:"#fff"},
    purple:{background:"linear-gradient(135deg,#7c3aed,#5b21b6)",color:"#fff"},
    primary:{background:"linear-gradient(135deg,#00e5ff,#0099cc)",color:"#001824"},
    danger:{background:"transparent",color:"#ef4444",border:"1px solid rgba(239,68,68,0.3)"},
    ghost: {background:"transparent",color:"#64748b",border:"1px solid #1e3a5f"},
  };
  return <button onClick={disabled?undefined:onClick} style={{...base,...(v[variant]||v.ghost),...style}} disabled={disabled}>{children}</button>;
}

function Spinner(){
  return <span style={{display:"inline-block",width:12,height:12,border:"2px solid rgba(0,229,255,0.2)",borderTopColor:"#00e5ff",borderRadius:"50%",animation:"spin 0.7s linear infinite",flexShrink:0}}/>;
}
