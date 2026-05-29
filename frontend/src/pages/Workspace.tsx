import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAbyss } from "../hooks/useAbyss";
import { insertSubmission, incrementSlot } from "../lib/supabase";

interface Task {
  id: string;
  title: string;
  type: "image_label" | "rlhf";
  reward: string;
  difficulty: string;
  orgAuthority?: string;
}

interface ImageLabelItem { id: number; url: string; label: string | null; }
interface RlhfPair { id: number; prompt: string; responseA: string; responseB: string; chosen: "A"|"B"|null; }

export interface IntegritySnapshot {
  finalScore: number;
  keystrokeCount: number;
  avgKeystrokeInterval: number;
  pasteCount: number;
  clickCount: number;
  mouseDistancePx: number;
  mouseVariance: number;
  idlePenalties: number;
  tabSwitches: number;
  livenessScore: number;
  timeSpentSeconds: number;
}

const MOCK_IMAGES: ImageLabelItem[] = [
  { id:1, url:"https://picsum.photos/seed/prod1/400/300", label:null },
  { id:2, url:"https://picsum.photos/seed/prod2/400/300", label:null },
  { id:3, url:"https://picsum.photos/seed/prod3/400/300", label:null },
  { id:4, url:"https://picsum.photos/seed/prod4/400/300", label:null },
];
const IMAGE_LABELS = ["Electronics","Clothing","Furniture","Food","Books","Toys","Sports","Other"];

const MOCK_RLHF: RlhfPair[] = [
  { id:1, prompt:"Explain how photosynthesis works in simple terms.",
    responseA:"Photosynthesis is when plants use sunlight to make food. They take in CO2 and water, then use light to convert these into glucose and oxygen.",
    responseB:"Plants absorb light through chlorophyll. The light drives a reaction converting CO2 and water into glucose and oxygen as a byproduct.", chosen:null },
  { id:2, prompt:"What is the best way to learn programming?",
    responseA:"Start with Python, build small projects, read documentation, and practice every day. Join communities like Stack Overflow and GitHub.",
    responseB:"Consistent practice is key. Pick one language, follow structured tutorials, then build real projects that solve problems you care about.", chosen:null },
  { id:3, prompt:"How do I stay motivated when working on a long project?",
    responseA:"Break the project into milestones, celebrate small wins, and keep a log of your progress. Share your work with others for accountability.",
    responseB:"Motivation follows action. Set a fixed daily work schedule, remove distractions, and focus on the process rather than the outcome.", chosen:null },
];

// ─── GOLD THEME PALETTE ───────────────────────────────────────────────────────
const GOLD       = "#D4AF37";
const GOLD_LIGHT = "#F0CC5A";
const GOLD_DIM   = "#8C7420";
const GOLD_GLOW  = "rgba(212,175,55,0.18)";
const BG_CARD    = "rgba(212,175,55,0.06)";
const BG_CARD2   = "rgba(212,175,55,0.10)";
const BORDER     = "rgba(212,175,55,0.25)";
const BORDER_MID = "rgba(212,175,55,0.45)";
const TEXT_DIM   = "#8C7420";
const TEXT_MUT   = "#5A4A10";
const SUCCESS    = "#4ade80";
const DANGER     = "#f87171";
const WARN       = "#fbbf24";

const s: Record<string, React.CSSProperties> = {
  page:   { minHeight:"100vh", background:"#000000", color:GOLD, fontFamily:"monospace", padding:"1.5rem", position:"relative" },
  header: { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem", paddingBottom:"1rem", borderBottom:`1px solid ${BORDER}` },
  card:   { background:BG_CARD, border:`1px solid ${BORDER}`, borderRadius:"12px", padding:"1.5rem", marginBottom:"1rem" },
  btn:    { padding:"0.7rem 1.5rem", borderRadius:"8px", border:"none", cursor:"pointer", fontFamily:"monospace", fontSize:"0.9rem", transition:"opacity 0.2s" },
  green:  { background:"#14532d", color:SUCCESS, border:`1px solid ${SUCCESS}` },
  purple: { background:"rgba(212,175,55,0.2)", color:GOLD_LIGHT, border:`1px solid ${GOLD_DIM}` },
  amber:  { background:"rgba(212,175,55,0.25)", color:GOLD_LIGHT, border:`1px solid ${GOLD}` },
  ghost:  { background:BG_CARD, color:GOLD, border:`1px solid ${BORDER}` },
  dim:    { background:"rgba(255,255,255,0.03)", color:TEXT_MUT, cursor:"not-allowed", border:`1px solid ${TEXT_MUT}` },
};

function IntegrityBar({ score }: { score: number }) {
  const color = score>=80 ? SUCCESS : score>=50 ? GOLD : DANGER;
  return (
    <div style={{ marginBottom:"0.5rem" }}>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.75rem", color:GOLD_DIM, marginBottom:"0.3rem" }}>
        <span>📊 Integrity Score</span>
        <span style={{ color }}>{score}%</span>
      </div>
      <div style={{ height:"6px", background:"rgba(212,175,55,0.12)", borderRadius:"3px", overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${score}%`, background:color, borderRadius:"3px", transition:"width 0.5s ease" }} />
      </div>
    </div>
  );
}

interface LivenessBoxProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  livenessOk: boolean; livenessScore: number;
  totalChecks: number; passedChecks: number; isChecking: boolean;
}
function LivenessBox({ videoRef, livenessOk, livenessScore, totalChecks, passedChecks, isChecking }: LivenessBoxProps) {
  const borderColor = isChecking ? GOLD : livenessOk ? SUCCESS : DANGER;
  const glowColor   = isChecking ? GOLD_GLOW : livenessOk ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)";
  return (
    <div style={{ position:"fixed", bottom:"1.5rem", right:"1.5rem", width:"190px", background:"#0a0a00", border:`1px solid ${borderColor}`, borderRadius:"12px", overflow:"hidden", zIndex:100, boxShadow:`0 0 20px ${glowColor}`, transition:"border-color 0.3s,box-shadow 0.3s" }}>
      <div style={{ height:"120px", background:"#000", position:"relative", overflow:"hidden" }}>
        <video ref={videoRef} autoPlay muted playsInline style={{ width:"100%", height:"100%", objectFit:"cover", transform:"scaleX(-1)" }} />
        {isChecking && <div style={{ position:"absolute", top:0, left:0, right:0, height:"2px", background:GOLD }} />}
        {[
          { top:"6px",    left:"6px",  borderTop:"2px solid",    borderLeft:"2px solid"  },
          { top:"6px",    right:"6px", borderTop:"2px solid",    borderRight:"2px solid" },
          { bottom:"6px", left:"6px",  borderBottom:"2px solid", borderLeft:"2px solid"  },
          { bottom:"6px", right:"6px", borderBottom:"2px solid", borderRight:"2px solid" },
        ].map((c,i) => <div key={i} style={{ position:"absolute", width:"10px", height:"10px", borderColor, ...c }} />)}
        {isChecking && (
          <div style={{ position:"absolute", inset:0, background:"rgba(212,175,55,0.08)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontSize:"0.6rem", color:GOLD_LIGHT }}>SCANNING…</span>
          </div>
        )}
      </div>
      <div style={{ padding:"0.5rem 0.6rem" }}>
        <div style={{ fontSize:"0.65rem", color:isChecking?GOLD_LIGHT:livenessOk?SUCCESS:DANGER, fontWeight:"bold", marginBottom:"0.3rem" }}>
          {isChecking ? "🔍 CHECKING…" : livenessOk ? "✅ LIVENESS OK" : "⚠️ FACE NOT DETECTED"}
        </div>
        <div style={{ marginBottom:"0.35rem" }}>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.58rem", color:GOLD_DIM, marginBottom:"0.15rem" }}>
            <span>Liveness Score</span>
            <span style={{ color:livenessScore>=75?SUCCESS:DANGER }}>{totalChecks===0?"—":`${livenessScore}%`}</span>
          </div>
          <div style={{ height:"4px", background:"rgba(212,175,55,0.12)", borderRadius:"2px" }}>
            <div style={{ height:"100%", width:`${livenessScore}%`, background:livenessScore>=75?SUCCESS:DANGER, borderRadius:"2px", transition:"width 0.5s ease" }} />
          </div>
        </div>
        <div style={{ fontSize:"0.58rem", color:TEXT_MUT }}>{passedChecks}/{totalChecks} passed</div>
      </div>
    </div>
  );
}

function ImageLabelMode({ onProgress }: { onProgress: (n: number) => void }) {
  const [images,  setImages]  = useState<ImageLabelItem[]>(MOCK_IMAGES);
  const [current, setCurrent] = useState(0);
  const label = (lbl: string) => {
    const updated = images.map((img,i) => i===current ? { ...img, label:lbl } : img);
    setImages(updated);
    onProgress(Math.round((updated.filter(i => i.label!==null).length / images.length) * 100));
    if (current < images.length-1) setCurrent(c => c+1);
  };
  const img     = images[current];
  const labeled = images.filter(i => i.label!==null).length;
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.8rem", color:GOLD_DIM, marginBottom:"0.5rem" }}>
        <span>Image {current+1} of {images.length}</span><span>{labeled} labeled</span>
      </div>
      <div style={{ height:"4px", background:"rgba(212,175,55,0.12)", borderRadius:"2px", marginBottom:"1.2rem" }}>
        <div style={{ height:"100%", width:`${(labeled/images.length)*100}%`, background:GOLD, borderRadius:"2px", transition:"width 0.3s" }} />
      </div>
      <div style={{ ...s.card, padding:"0.5rem", marginBottom:"1rem" }}>
        <img src={img.url} alt="label this" style={{ width:"100%", borderRadius:"8px", display:"block", maxHeight:"300px", objectFit:"cover" }} />
        {img.label && <div style={{ textAlign:"center", marginTop:"0.5rem", color:SUCCESS, fontSize:"0.85rem" }}>✅ Labeled: <strong>{img.label}</strong></div>}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"0.5rem", marginBottom:"1rem" }}>
        {IMAGE_LABELS.map(lbl => (
          <button key={lbl} style={{ ...s.btn, ...(img.label===lbl?s.purple:s.ghost), fontSize:"0.75rem", padding:"0.5rem" }} onClick={() => label(lbl)}>{lbl}</button>
        ))}
      </div>
      <div style={{ display:"flex", gap:"0.5rem" }}>
        <button style={{ ...s.btn, ...s.ghost }} onClick={() => setCurrent(c => Math.max(0,c-1))} disabled={current===0}>← Prev</button>
        <button style={{ ...s.btn, ...s.ghost }} onClick={() => setCurrent(c => Math.min(images.length-1,c+1))} disabled={current===images.length-1}>Next →</button>
      </div>
      <div style={{ display:"flex", gap:"0.5rem", marginTop:"1rem", overflowX:"auto" }}>
        {images.map((img,i) => (
          <div key={img.id} onClick={() => setCurrent(i)} style={{ flexShrink:0, width:"60px", height:"45px", borderRadius:"6px", overflow:"hidden", border:`2px solid ${i===current?GOLD:img.label?SUCCESS:"transparent"}`, cursor:"pointer", position:"relative" }}>
            <img src={img.url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            {img.label && <div style={{ position:"absolute", inset:0, background:"rgba(74,222,128,0.25)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.7rem" }}>✓</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function RlhfMode({ onProgress }: { onProgress: (n: number) => void }) {
  const [pairs,   setPairs]   = useState<RlhfPair[]>(MOCK_RLHF);
  const [current, setCurrent] = useState(0);
  const choose = (choice: "A"|"B") => {
    const updated = pairs.map((p,i) => i===current ? { ...p, chosen:choice } : p);
    setPairs(updated);
    onProgress(Math.round((updated.filter(p => p.chosen!==null).length / pairs.length) * 100));
    if (current < pairs.length-1) setTimeout(() => setCurrent(c => c+1), 400);
  };
  const pair   = pairs[current];
  const ranked = pairs.filter(p => p.chosen!==null).length;
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.8rem", color:GOLD_DIM, marginBottom:"0.5rem" }}>
        <span>Pair {current+1} of {pairs.length}</span><span>{ranked} ranked</span>
      </div>
      <div style={{ height:"4px", background:"rgba(212,175,55,0.12)", borderRadius:"2px", marginBottom:"1.2rem" }}>
        <div style={{ height:"100%", width:`${(ranked/pairs.length)*100}%`, background:GOLD_LIGHT, borderRadius:"2px", transition:"width 0.3s" }} />
      </div>
      <div style={{ ...s.card, background:BG_CARD2, marginBottom:"1rem", borderColor:BORDER_MID }}>
        <div style={{ fontSize:"0.75rem", color:GOLD_DIM, marginBottom:"0.4rem" }}>💬 PROMPT</div>
        <div style={{ fontSize:"0.95rem", lineHeight:1.5, color:GOLD_LIGHT }}>{pair.prompt}</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem", marginBottom:"1rem" }}>
        {(["A","B"] as const).map(key => {
          const chosen   = pair.chosen===key;
          const rejected = pair.chosen!==null && pair.chosen!==key;
          return (
            <div key={key} onClick={() => choose(key)} style={{ ...s.card, cursor:"pointer", border:`1px solid ${chosen?GOLD:rejected?"rgba(212,175,55,0.08)":BORDER}`, background:chosen?BG_CARD2:rejected?"rgba(0,0,0,0.3)":BG_CARD, opacity:rejected?0.45:1, transition:"all 0.2s" }}>
              <div style={{ fontSize:"0.75rem", color:GOLD_DIM, marginBottom:"0.5rem", display:"flex", justifyContent:"space-between" }}>
                <span>Response {key}</span>{chosen && <span style={{ color:GOLD_LIGHT }}>⭐ Preferred</span>}
              </div>
              <div style={{ fontSize:"0.85rem", lineHeight:1.6, color:rejected?TEXT_MUT:GOLD }}>{key==="A"?pair.responseA:pair.responseB}</div>
              {!pair.chosen && <div style={{ marginTop:"0.8rem", textAlign:"center" }}><button style={{ ...s.btn, ...s.amber, fontSize:"0.75rem", padding:"0.4rem 1rem" }}>⭐ Prefer {key}</button></div>}
            </div>
          );
        })}
      </div>
      <div style={{ display:"flex", gap:"0.5rem", alignItems:"center" }}>
        <button style={{ ...s.btn, ...s.ghost }} onClick={() => setCurrent(c => Math.max(0,c-1))} disabled={current===0}>← Prev</button>
        <button style={{ ...s.btn, ...s.ghost }} onClick={() => setCurrent(c => Math.min(pairs.length-1,c+1))} disabled={current===pairs.length-1}>Next →</button>
        {pair.chosen && <span style={{ color:SUCCESS, fontSize:"0.8rem", marginLeft:"0.5rem" }}>✓ Ranked</span>}
      </div>
      <div style={{ display:"flex", gap:"0.4rem", marginTop:"0.8rem" }}>
        {pairs.map((p,i) => <div key={p.id} onClick={() => setCurrent(i)} style={{ width:"10px", height:"10px", borderRadius:"50%", background:p.chosen?GOLD:i===current?GOLD_LIGHT:"rgba(212,175,55,0.2)", cursor:"pointer" }} />)}
      </div>
    </div>
  );
}

declare global {
  interface Window {
    blazeface?: { load: () => Promise<{ estimateFaces: (input: HTMLVideoElement, options?: { returnTensors: boolean }) => Promise<unknown[]> }> };
  }
}

function useIntegrity(elapsed: number, tabSwitches: number, livenessScore: number, livenessChecksTotal: number) {
  const lastKeyTime    = useRef<number>(0);
  const keystrokeGaps  = useRef<number[]>([]);
  const pasteCount     = useRef(0);
  const clickCount     = useRef(0);
  const lastMousePos   = useRef<{x:number;y:number;t:number}|null>(null);
  const mouseSpeeds    = useRef<number[]>([]);
  const mouseDistance  = useRef(0);
  const idlePenalties  = useRef(0);
  const lastActivityAt = useRef(Date.now());
  const [score,     setScore]     = useState(60);
  const [breakdown, setBreakdown] = useState({ typing:0, mouse:0, paste:0, idle:0, tab:0, liveness:0 });

  const recalculate = useCallback(() => {
    const gaps  = keystrokeGaps.current;
    let typingPts = 0;
    if (gaps.length >= 3) {
      const avg    = gaps.reduce((a,b) => a+b,0)/gaps.length;
      const stddev = Math.sqrt(gaps.reduce((a,b) => a+Math.pow(b-avg,2),0)/gaps.length);
      typingPts = Math.round(Math.min(1,stddev/80) * (avg>60&&avg<800?1:0.4) * 25);
    } else if (gaps.length > 0) typingPts = 8;

    const speeds = mouseSpeeds.current;
    let mousePts = 0;
    if (speeds.length >= 5) {
      const avgSpd = speeds.reduce((a,b) => a+b,0)/speeds.length;
      const stddev = Math.sqrt(speeds.reduce((a,b) => a+Math.pow(b-avgSpd,2),0)/speeds.length);
      mousePts = Math.round(Math.min(1,mouseDistance.current/200)*Math.min(1,stddev/0.3)*25);
    } else if (mouseDistance.current>50) mousePts = 10;

    const pastePenalty = Math.min(20, pasteCount.current*7);
    const clickPts     = Math.min(10, clickCount.current*2);
    const idlePenalty  = Math.min(24, idlePenalties.current*8);
    const tabPenalty   = Math.min(20, tabSwitches*5);
    const livenessPts  = livenessChecksTotal>0 ? Math.round((livenessScore/100)*15) : 0;
    const final = Math.min(100, Math.max(0, typingPts+mousePts+clickPts+livenessPts-pastePenalty-idlePenalty-tabPenalty+20));
    setScore(final);
    setBreakdown({ typing:typingPts, mouse:mousePts, paste:-pastePenalty, idle:-idlePenalty, tab:-tabPenalty, liveness:livenessPts });
  }, [tabSwitches, livenessScore, livenessChecksTotal]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const now = Date.now(); lastActivityAt.current = now;
      if (lastKeyTime.current>0) { const gap=now-lastKeyTime.current; if (gap<3000) keystrokeGaps.current.push(gap); }
      lastKeyTime.current = now;
    };
    const onPaste = (e: ClipboardEvent) => { if ((e.clipboardData?.getData("text")??"").length>10) pasteCount.current++; lastActivityAt.current=Date.now(); };
    const onMouseMove = (e: MouseEvent) => {
      const now = Date.now(); lastActivityAt.current=now;
      if (lastMousePos.current) {
        const dx=e.clientX-lastMousePos.current.x, dy=e.clientY-lastMousePos.current.y, dt=now-lastMousePos.current.t;
        const dist=Math.sqrt(dx*dx+dy*dy); mouseDistance.current+=dist;
        if (dt>0&&dt<500&&dist>5) { mouseSpeeds.current.push(dist/dt); if (mouseSpeeds.current.length>200) mouseSpeeds.current.shift(); }
      }
      lastMousePos.current={x:e.clientX,y:e.clientY,t:now};
    };
    const onClick = () => { clickCount.current++; lastActivityAt.current=Date.now(); };
    document.addEventListener("keydown",   onKey,       true);
    document.addEventListener("paste",     onPaste,     true);
    document.addEventListener("mousemove", onMouseMove, true);
    document.addEventListener("click",     onClick,     true);
    return () => {
      document.removeEventListener("keydown",   onKey,       true);
      document.removeEventListener("paste",     onPaste,     true);
      document.removeEventListener("mousemove", onMouseMove, true);
      document.removeEventListener("click",     onClick,     true);
    };
  }, []);

  useEffect(() => {
    const idle = setInterval(() => {
      if (Date.now()-lastActivityAt.current>30_000) { idlePenalties.current++; lastActivityAt.current=Date.now(); }
    }, 10_000);
    return () => clearInterval(idle);
  }, []);

  useEffect(() => { const t=setInterval(recalculate,3000); return () => clearInterval(t); }, [recalculate]);

  const buildSnapshot = useCallback((): IntegritySnapshot => {
    const gaps=keystrokeGaps.current, speeds=mouseSpeeds.current;
    const avg=gaps.length ? gaps.reduce((a,b)=>a+b,0)/gaps.length : 0;
    const avgSpd=speeds.length ? speeds.reduce((a,b)=>a+b,0)/speeds.length : 0;
    const varSpd=speeds.length ? Math.sqrt(speeds.reduce((a,b)=>a+Math.pow(b-avgSpd,2),0)/speeds.length) : 0;
    return {
      finalScore:           score,
      keystrokeCount:       keystrokeGaps.current.length+1,
      avgKeystrokeInterval: Math.round(avg),
      pasteCount:           pasteCount.current,
      clickCount:           clickCount.current,
      mouseDistancePx:      Math.round(mouseDistance.current),
      mouseVariance:        Math.round(varSpd*1000)/1000,
      idlePenalties:        idlePenalties.current,
      tabSwitches,
      livenessScore,
      timeSpentSeconds:     elapsed,
    };
  }, [score, tabSwitches, livenessScore, elapsed]);

  return { score, breakdown, buildSnapshot };
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const el = document.createElement("script");
    el.src=src; el.onload=()=>resolve(); el.onerror=()=>reject();
    document.head.appendChild(el);
  });
}

const fmt = (sec: number) => `${String(Math.floor(sec/60)).padStart(2,"0")}:${String(sec%60).padStart(2,"0")}`;

export default function Workspace() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { publicKey } = useWallet();
  const { workerAccount } = useAbyss();

  const task: Task = location.state?.task ?? {
    id:"task_001", title:"Label E-commerce Product Images",
    type:"image_label", reward:"0.05", difficulty:"Easy",
  };

  const [workProgress, setWorkProgress] = useState(0);
  const [taskEnded,    setTaskEnded]    = useState(false);
  const [submitted,    setSubmitted]    = useState(false);
  const [elapsed,      setElapsed]      = useState(0);
  const [tabSwitches,  setTabSwitches]  = useState(0);
  const [submitError,  setSubmitError]  = useState<string|null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const videoRef  = useRef<HTMLVideoElement>(null);
  const modelRef  = useRef<Awaited<ReturnType<NonNullable<typeof window.blazeface>["load"]>>|null>(null);
  const streamRef = useRef<MediaStream|null>(null);

  const [livenessOk,   setLivenessOk]   = useState(false);
  const [isChecking,   setIsChecking]    = useState(false);
  const [totalChecks,  setTotalChecks]   = useState(0);
  const [passedChecks, setPassedChecks]  = useState(0);
  const [camError,     setCamError]      = useState<string|null>(null);

  const livenessScore = totalChecks===0 ? 0 : Math.round((passedChecks/totalChecks)*100);
  const { score: integrityScore, breakdown, buildSnapshot } = useIntegrity(elapsed, tabSwitches, livenessScore, totalChecks);

  useEffect(() => {
    if (submitted) return;
    const t = setInterval(() => setElapsed(e => e+1), 1000);
    return () => clearInterval(t);
  }, [submitted]);

  useEffect(() => {
    const fn = () => { if (document.hidden) setTabSwitches(w => w+1); };
    document.addEventListener("visibilitychange", fn);
    return () => document.removeEventListener("visibilitychange", fn);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode:"user" } });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch { setCamError("Camera denied. Liveness disabled."); return; }
      if (!window.blazeface) {
        await loadScript("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.2.0/dist/tf.min.js");
        await loadScript("https://cdn.jsdelivr.net/npm/@tensorflow-models/blazeface@0.0.7/dist/blazeface.min.js");
      }
      if (cancelled) return;
      try { modelRef.current = await window.blazeface!.load(); }
      catch { setCamError("Face model failed to load."); }
    };
    boot();
    return () => { cancelled=true; streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  const runLivenessCheck = useCallback(async () => {
    if (!modelRef.current || !videoRef.current) return;
    setIsChecking(true);
    try {
      const faces = await modelRef.current.estimateFaces(videoRef.current, { returnTensors:false });
      const ok = faces.length>0;
      setLivenessOk(ok);
      setTotalChecks(t => t+1);
      if (ok) setPassedChecks(p => p+1);
    } catch {
      setLivenessOk(false); setTotalChecks(t => t+1);
    } finally { setIsChecking(false); }
  }, []);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const scheduleNext = () => {
      const delay = Math.floor(Math.random()*40+20);
      timeout = setTimeout(async () => { await runLivenessCheck(); scheduleNext(); }, delay*1000);
    };
    const init = setTimeout(async () => { await runLivenessCheck(); scheduleNext(); }, 5000);
    return () => { clearTimeout(init); clearTimeout(timeout); };
  }, [runLivenessCheck]);

  const handleEndTask = () => {
    if (workProgress < 100) { alert("Complete all items first!"); return; }
    setTaskEnded(true);
  };

  const canSubmit = taskEnded && livenessScore >= 75;

  const handleSubmit = async () => {
    if (!taskEnded)          return alert("Click 'End Task' first.");
    if (livenessScore < 75)  return alert(`Liveness ${livenessScore}% — need 75%.`);
    if (integrityScore < 30) return alert("Integrity score too low to submit.");
    if (!publicKey)          return alert("Wallet not connected.");

    const snapshot = buildSnapshot();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const subId = await insertSubmission({
        task_id:            task.id,
        worker_wallet:      publicKey.toString(),
        worker_name:        workerAccount?.name ?? "Unknown",
        integrity_score:    snapshot.finalScore,
        liveness_score:     snapshot.livenessScore,
        time_spent_seconds: snapshot.timeSpentSeconds,
        keystroke_count:    snapshot.keystrokeCount,
        paste_count:        snapshot.pasteCount,
        tab_switches:       snapshot.tabSwitches,
        status:             "pending",
      });

      await incrementSlot(task.id);

      if (subId) {
        setSubmitted(true);
      } else {
        setSubmitError("Failed to save submission. Try again.");
      }
    } catch (e: any) {
      setSubmitError(e?.message ?? "Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    const snap = buildSnapshot();
    return (
      <div style={{ ...s.page, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column" }}>
        <div style={{ fontSize:"4rem", marginBottom:"1rem" }}>🎉</div>
        <div style={{ fontSize:"1.5rem", fontWeight:"bold", marginBottom:"0.5rem", color:GOLD_LIGHT }}>Work Submitted!</div>
        <div style={{ color:GOLD_DIM, marginBottom:"1.5rem", textAlign:"center", maxWidth:"500px" }}>
          Your work has been saved. The organisation will review your submission and release{" "}
          <strong style={{ color:GOLD }}>{task.reward} SOL</strong> to your wallet upon approval.
        </div>

        <div style={{ ...s.card, background:"rgba(74,222,128,0.08)", border:`1px solid ${SUCCESS}`, marginBottom:"1rem", textAlign:"center", minWidth:"400px" }}>
          <div style={{ color:SUCCESS, fontSize:"0.9rem" }}>✅ Submission saved to Supabase</div>
          <div style={{ color:GOLD_DIM, fontSize:"0.8rem", marginTop:"0.3rem" }}>Status: Pending org review</div>
        </div>

        {submitError && (
          <div style={{ ...s.card, background:"rgba(212,175,55,0.08)", border:`1px solid ${GOLD}`, marginBottom:"1rem", minWidth:"400px" }}>
            <div style={{ color:GOLD_LIGHT, fontSize:"0.8rem" }}>⚠️ {submitError}</div>
          </div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"1rem", marginBottom:"1rem", minWidth:"500px" }}>
          {[
            { label:"Integrity",  value:`${snap.finalScore}%`,       color:SUCCESS      },
            { label:"Liveness",   value:`${snap.livenessScore}%`,    color:GOLD_LIGHT   },
            { label:"Time Spent", value:fmt(snap.timeSpentSeconds),   color:GOLD         },
            { label:"Reward",     value:`${task.reward} SOL`,        color:GOLD_LIGHT   },
          ].map(stat => (
            <div key={stat.label} style={{ ...s.card, textAlign:"center" }}>
              <div style={{ fontSize:"1.3rem", fontWeight:"bold", color:stat.color }}>{stat.value}</div>
              <div style={{ color:GOLD_DIM, fontSize:"0.75rem" }}>{stat.label}</div>
            </div>
          ))}
        </div>

        <div style={{ ...s.card, minWidth:"500px", marginBottom:"1.5rem" }}>
          <div style={{ fontSize:"0.75rem", color:GOLD_DIM, marginBottom:"0.8rem" }}>🔬 INTEGRITY BREAKDOWN</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"0.5rem" }}>
            {[
              { label:"Keystrokes",     value:snap.keystrokeCount },
              { label:"Avg Gap (ms)",   value:snap.avgKeystrokeInterval },
              { label:"Paste Events",   value:snap.pasteCount },
              { label:"Clicks",         value:snap.clickCount },
              { label:"Mouse (px)",     value:snap.mouseDistancePx },
              { label:"Idle Penalties", value:snap.idlePenalties },
            ].map(item => (
              <div key={item.label} style={{ background:"rgba(212,175,55,0.06)", borderRadius:"8px", padding:"0.5rem 0.75rem", border:`1px solid ${BORDER}` }}>
                <div style={{ fontSize:"1rem", fontWeight:"bold", color:GOLD_LIGHT }}>{item.value}</div>
                <div style={{ fontSize:"0.65rem", color:TEXT_MUT }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        <button style={{ ...s.btn, ...s.purple }} onClick={() => navigate("/worker")}>← Back to Dashboard</button>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <style>{`
        @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.3} }
        * { scrollbar-width: thin; scrollbar-color: ${GOLD_DIM} #111; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #111; }
        ::-webkit-scrollbar-thumb { background: ${GOLD_DIM}; border-radius: 3px; }
      `}</style>

      <div style={s.header}>
        <div style={{ display:"flex", alignItems:"center", gap:"1rem" }}>
          <button style={{ ...s.btn, ...s.ghost, padding:"0.4rem 0.8rem", fontSize:"0.8rem" }} onClick={() => navigate("/worker")}>← Exit</button>
          <div>
            <div style={{ fontWeight:"bold", fontSize:"1rem", color:GOLD_LIGHT }}>{task.title}</div>
            <div style={{ color:GOLD_DIM, fontSize:"0.75rem" }}>
              {task.type==="image_label"?"🏷️ Image Labeling":"⭐ RLHF Ranking"}&nbsp;·&nbsp;Reward: <span style={{ color:GOLD }}>{task.reward} SOL</span>
              {workerAccount && <span style={{ color:SUCCESS }}>&nbsp;·&nbsp;👤 {workerAccount.name}</span>}
            </div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"1.5rem" }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:"1.2rem", fontWeight:"bold", color:GOLD_LIGHT, letterSpacing:"0.1em" }}>{fmt(elapsed)}</div>
            <div style={{ fontSize:"0.65rem", color:GOLD_DIM }}>TIME IN SESSION</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:"0.4rem", fontSize:"0.75rem", color:DANGER }}>
            <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:DANGER, animation:"pulse-dot 1.5s ease infinite" }} />
            MONITORING
          </div>
          {tabSwitches>0 && <div style={{ fontSize:"0.75rem", color:WARN }}>⚠️ {tabSwitches} tab switch{tabSwitches>1?"es":""}</div>}
          {camError && <div style={{ fontSize:"0.7rem", color:DANGER }}>📷 {camError}</div>}
        </div>
      </div>

      <div style={{ ...s.card, padding:"1rem", marginBottom:"1rem" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.5rem", alignItems:"center", marginBottom:"1rem" }}>
          <IntegrityBar score={integrityScore} />
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.75rem", color:GOLD_DIM, marginBottom:"0.3rem" }}>
              <span>✅ Work Progress</span>
              <span style={{ color:SUCCESS }}>{workProgress}%</span>
            </div>
            <div style={{ height:"6px", background:"rgba(212,175,55,0.12)", borderRadius:"3px" }}>
              <div style={{ height:"100%", width:`${workProgress}%`, background:`linear-gradient(90deg,${GOLD_DIM},${GOLD})`, borderRadius:"3px", transition:"width 0.5s ease" }} />
            </div>
          </div>
        </div>

        <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap", marginBottom:"1rem" }}>
          {[
            { label:"⌨️ Typing",   val:breakdown.typing   },
            { label:"🖱️ Mouse",    val:breakdown.mouse    },
            { label:"👁️ Liveness", val:breakdown.liveness },
            { label:"📋 Paste",    val:breakdown.paste    },
            { label:"💤 Idle",     val:breakdown.idle     },
            { label:"🔀 Tabs",     val:breakdown.tab      },
          ].map(({ label, val }) => (
            <div key={label} style={{ background:"rgba(212,175,55,0.06)", border:`1px solid ${BORDER}`, borderRadius:"6px", padding:"0.25rem 0.5rem", fontSize:"0.65rem", color:val<0?DANGER:val>0?SUCCESS:TEXT_MUT }}>
              {label}: <strong>{val>0?`+${val}`:val}</strong>
            </div>
          ))}
        </div>

        <div style={{ display:"flex", gap:"0.75rem", alignItems:"center", flexWrap:"wrap" }}>
          <button
            style={{ ...s.btn, ...(workProgress>=100&&!taskEnded ? s.amber : { background:"rgba(212,175,55,0.08)", color:TEXT_MUT, cursor:taskEnded?"default":"not-allowed", border:`1px solid ${TEXT_MUT}` }), fontSize:"0.85rem" }}
            onClick={handleEndTask}
            disabled={taskEnded||workProgress<100}
          >
            {taskEnded ? "✔ Task Ended" : workProgress>=100 ? "🏁 End Task" : `End Task (${workProgress}%)`}
          </button>

          <button
            style={{ ...s.btn, ...(canSubmit&&!isSubmitting ? s.green : s.dim), fontSize:"0.85rem" }}
            onClick={handleSubmit}
            disabled={!canSubmit||isSubmitting}
          >
            {isSubmitting
              ? "⏳ Saving submission…"
              : canSubmit
              ? "✅ Submit Work"
              : !taskEnded
              ? "Submit (end task first)"
              : `Submit (liveness ${livenessScore}% < 75%)`}
          </button>

          {taskEnded && livenessScore<75  && <div style={{ fontSize:"0.72rem", color:DANGER }}>⚠️ Keep face visible — need {75-livenessScore}% more</div>}
          {taskEnded && livenessScore>=75 && <div style={{ fontSize:"0.72rem", color:SUCCESS }}>✅ Liveness verified — ready to submit!</div>}
        </div>
      </div>

      <div style={s.card}>
        <div style={{ fontSize:"0.75rem", color:GOLD_DIM, marginBottom:"1rem", display:"flex", alignItems:"center", gap:"0.5rem" }}>
          <span style={{ width:"8px", height:"8px", borderRadius:"50%", background:SUCCESS, display:"inline-block" }} />
          WORKSPACE ACTIVE — Complete all items to unlock submission
        </div>
        {task.type==="image_label" ? <ImageLabelMode onProgress={setWorkProgress} /> : <RlhfMode onProgress={setWorkProgress} />}
      </div>

      <LivenessBox
        videoRef={videoRef as React.RefObject<HTMLVideoElement>}
        livenessOk={livenessOk} livenessScore={livenessScore}
        totalChecks={totalChecks} passedChecks={passedChecks} isChecking={isChecking}
      />
    </div>
  );
}