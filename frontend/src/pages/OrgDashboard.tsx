import { useState, useEffect, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useNavigate } from "react-router-dom";
import { useAbyss, EscrowTaskAccount } from "../hooks/useAbyss";
import {
  fetchSubmissions, updateSubmissionStatus, supabase,
  uploadTaskImages, insertTask,
} from "../lib/supabase";
import RegisterModal, { ProfileData } from "../components/RegisterModal";

// ── Design tokens ──────────────────────────────────────────────
const gold          = "#C9A84C";
const goldDim       = "#8B6E2E";
const goldGlow      = "rgba(201,168,76,0.10)";
const black         = "#000000";
const surface       = "#0A0A0A";
const surface2      = "#111111";
const border        = "#1A1A1A";
const borderGold    = "rgba(201,168,76,0.22)";
const textSecondary = "#6B5C35";
const textMuted     = "#2E2A1E";
const redText       = "#D97070";
const greenText     = "#4ADE80";

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: black,
    color: gold,
    fontFamily: "'DM Mono', 'Courier New', monospace",
    padding: "2rem",
    position: "relative",
  },
  gridOverlay: {
    position: "fixed",
    inset: 0,
    backgroundImage: `linear-gradient(${borderGold} 1px, transparent 1px), linear-gradient(90deg, ${borderGold} 1px, transparent 1px)`,
    backgroundSize: "60px 60px",
    pointerEvents: "none",
    zIndex: 0,
    opacity: 0.35,
  },
  content: { position: "relative", zIndex: 1 },
  backBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4rem",
    padding: "0.45rem 1rem",
    background: "transparent",
    border: `1px solid ${borderGold}`,
    color: goldDim,
    fontFamily: "'DM Mono', monospace",
    fontSize: "0.68rem",
    letterSpacing: "0.14em",
    textTransform: "uppercase" as const,
    cursor: "pointer",
    marginBottom: "1.5rem",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "2.5rem",
    paddingBottom: "1.5rem",
    borderBottom: `1px solid ${borderGold}`,
  },
  eyebrow: {
    fontSize: "0.55rem",
    letterSpacing: "0.35em",
    color: textSecondary,
    textTransform: "uppercase" as const,
    marginBottom: "0.3rem",
  },
  title: {
    fontSize: "1.55rem",
    fontFamily: "'Playfair Display', Georgia, serif",
    fontWeight: 700,
    color: gold,
    letterSpacing: "0.01em",
  },
  card: {
    background: surface,
    border: `1px solid ${border}`,
    padding: "1.5rem",
    marginBottom: "1.5rem",
  },
  cardGold: {
    background: surface,
    border: `1px solid ${borderGold}`,
    padding: "1.5rem",
    marginBottom: "1.5rem",
  },
  input: {
    width: "100%",
    padding: "0.75rem 1rem",
    background: "#060606",
    border: `1px solid ${border}`,
    color: gold,
    fontFamily: "'DM Mono', monospace",
    fontSize: "0.82rem",
    outline: "none",
    marginBottom: "1rem",
    boxSizing: "border-box" as const,
    letterSpacing: "0.02em",
  },
  label: {
    fontSize: "0.56rem",
    letterSpacing: "0.28em",
    color: textSecondary,
    textTransform: "uppercase" as const,
    display: "block",
    marginBottom: "0.45rem",
  },
  btn: {
    padding: "0.75rem 1.8rem",
    border: "none",
    cursor: "pointer",
    fontFamily: "'DM Mono', monospace",
    fontSize: "0.65rem",
    letterSpacing: "0.18em",
    textTransform: "uppercase" as const,
  },
  btnGold:    { background: gold,        color: black },
  btnOutline: { background: "transparent", border: `1px solid ${borderGold}`, color: gold },
  btnGreen:   { background: "rgba(26,74,46,0.5)", color: greenText, border: "1px solid rgba(74,222,128,0.2)" },
  btnDim:     { background: surface2, color: textSecondary, cursor: "not-allowed" as const, border: `1px solid ${border}` },
  tag: {
    display: "inline-block",
    padding: "0.18rem 0.55rem",
    fontSize: "0.62rem",
    marginRight: "0.4rem",
    letterSpacing: "0.04em",
    border: `1px solid ${borderGold}`,
    color: goldDim,
    background: goldGlow,
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1.2rem 0",
    borderBottom: `1px solid ${border}`,
  },
  statValue: {
    fontSize: "2rem",
    fontFamily: "'Playfair Display', Georgia, serif",
    fontWeight: 700,
    color: gold,
  },
  statLabel: {
    fontSize: "0.58rem",
    letterSpacing: "0.2em",
    color: textSecondary,
    textTransform: "uppercase" as const,
    marginTop: "0.3rem",
  },
  successBanner: {
    background: "rgba(26,74,46,0.25)",
    border: "1px solid rgba(74,222,128,0.2)",
    padding: "0.75rem 1rem",
    marginBottom: "1rem",
  },
  errorBanner: {
    background: "rgba(139,32,32,0.18)",
    border: "1px solid rgba(220,38,38,0.25)",
    padding: "0.75rem 1rem",
    marginBottom: "1rem",
  },
};

function makeTaskRef(name: string): string {
  const slug = name.toLowerCase().replace(/\s+/g, "_").slice(0, 20);
  const rand = Math.random().toString(36).slice(2, 7);
  return `${slug}_${rand}`;
}

// ── Image Upload Zone ─────────────────────────────────────────────────────────
interface UploadZoneProps {
  files: File[];
  previews: string[];
  onChange: (files: File[], previews: string[]) => void;
  disabled?: boolean;
}

function ImageUploadZone({ files, previews, onChange, disabled }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const accepted = Array.from(incoming).filter(f => f.type.startsWith("image/"));
    const combined = [...files, ...accepted].slice(0, 10); // hard cap 10
    const newPreviews = combined.map(f =>
      files.includes(f)
        ? previews[files.indexOf(f)]
        : URL.createObjectURL(f)
    );
    onChange(combined, newPreviews);
  };

  const removeFile = (idx: number) => {
    URL.revokeObjectURL(previews[idx]);
    const newFiles    = files.filter((_, i) => i !== idx);
    const newPreviews = previews.filter((_, i) => i !== idx);
    onChange(newFiles, newPreviews);
  };

  return (
    <div style={{ marginBottom: "1.2rem" }}>
      {/* Drop zone */}
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => {
          e.preventDefault(); setDragging(false);
          if (!disabled) addFiles(e.dataTransfer.files);
        }}
        style={{
          border: `1px dashed ${dragging ? gold : borderGold}`,
          background: dragging ? "rgba(201,168,76,0.07)" : "#060606",
          padding: "2rem",
          textAlign: "center",
          cursor: disabled ? "not-allowed" : "pointer",
          marginBottom: "1rem",
          transition: "border-color 0.2s, background 0.2s",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <div style={{ fontSize: "1.6rem", marginBottom: "0.5rem" }}>📁</div>
        <div style={{ fontSize: "0.68rem", color: gold, letterSpacing: "0.1em" }}>
          {files.length === 0
            ? "Click or drag images here"
            : `${files.length} image${files.length > 1 ? "s" : ""} selected`}
        </div>
        <div style={{ fontSize: "0.6rem", color: textSecondary, marginTop: "0.3rem", letterSpacing: "0.06em" }}>
          5–10 images required · JPG / PNG / WEBP · max 5 MB each
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={e => addFiles(e.target.files)}
        disabled={disabled}
      />

      {/* Preview grid */}
      {previews.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.5rem" }}>
          {previews.map((src, i) => (
            <div key={i} style={{ position: "relative", aspectRatio: "1", border: `1px solid ${borderGold}`, overflow: "hidden" }}>
              <img
                src={src}
                alt={`preview-${i}`}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
              {/* Remove button */}
              {!disabled && (
                <button
                  onClick={e => { e.stopPropagation(); removeFile(i); }}
                  style={{
                    position: "absolute", top: "3px", right: "3px",
                    width: "18px", height: "18px",
                    background: "rgba(0,0,0,0.75)", border: "none",
                    color: redText, cursor: "pointer",
                    fontSize: "0.65rem", lineHeight: 1,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >✕</button>
              )}
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                background: "rgba(0,0,0,0.55)",
                fontSize: "0.5rem", color: gold,
                padding: "2px 4px", letterSpacing: "0.04em",
                overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
              }}>
                {files[i]?.name}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Count hint */}
      <div style={{
        fontSize: "0.58rem", letterSpacing: "0.1em",
        color: files.length < 5 ? redText : files.length > 10 ? redText : greenText,
        marginTop: "0.5rem",
      }}>
        {files.length < 5
          ? `Need at least ${5 - files.length} more image${5 - files.length > 1 ? "s" : ""}`
          : files.length > 10
          ? "Maximum 10 images"
          : `✓ ${files.length} images ready`}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function OrgDashboard() {
  const { publicKey } = useWallet();
  const navigate = useNavigate();
  const {
    orgAccount, myEscrows, solBalance, loading, txSig, error,
    registerOrg, postTask, approveRelease, refreshAll,
  } = useAbyss();

  const [tab,      setTab]      = useState<"post"|"submissions"|"escrows">("post");
  const [taskType, setTaskType] = useState<"image_label"|"rlhf">("image_label");
  const [reward,   setReward]   = useState("0.05");
  const [slots,    setSlots]    = useState("5");
  const [taskName, setTaskName] = useState("");

  // image upload state — only relevant when taskType === "image_label"
  const [imageFiles,    setImageFiles]    = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const [submissions,   setSubmissions]   = useState<any[]>([]);
  const [subLoading,    setSubLoading]    = useState(false);
  const [pendingAction, setPendingAction] = useState<string|null>(null);
  const [lastTx,        setLastTx]        = useState<string|null>(null);
  const [localError,    setLocalError]    = useState<string|null>(null);
  const [showModal,     setShowModal]     = useState(false);

  // reset image state when task type changes
  useEffect(() => {
    if (taskType !== "image_label") {
      imagePreviews.forEach(URL.revokeObjectURL);
      setImageFiles([]);
      setImagePreviews([]);
    }
  }, [taskType]);

  useEffect(() => {
    if (!publicKey || loading) return;
    const t = setTimeout(() => { setShowModal(orgAccount === null); }, 400);
    return () => clearTimeout(t);
  }, [publicKey, orgAccount, loading]);

  useEffect(() => {
    if (tab !== "submissions") return;
    const load = async () => {
      setSubLoading(true);
      const data = await fetchSubmissions();
      setSubmissions(data);
      setSubLoading(false);
    };
    load();
  }, [tab]);

  useEffect(() => {
    if (!lastTx && !localError) return;
    const t = setTimeout(() => { setLastTx(null); setLocalError(null); }, 6000);
    return () => clearTimeout(t);
  }, [lastTx, localError]);

  const handleRegisterOnChain = async (name: string): Promise<string | null> => {
    setPendingAction("register");
    const sig = await registerOrg(name);
    setPendingAction(null);
    if (sig && sig !== "already_registered") { setLastTx(sig); return sig; }
    return null;
  };

  const handleSaveProfile = async (data: ProfileData): Promise<void> => {
    setPendingAction("profile");
    const { error: sbError } = await supabase
      .from("profiles")
      .upsert({
        wallet: data.wallet, name: data.name, email: data.email,
        specialization: data.specialization, mode: data.mode,
      }, { onConflict: "wallet" });
    setPendingAction(null);
    if (sbError) { console.error("[Supabase] saveProfile:", sbError); setLocalError("Failed to save profile."); }
  };

  const handlePost = async () => {
    setLocalError(null);
    if (!taskName.trim()) return setLocalError("Fill task name");
    if (!orgAccount)      return setLocalError("Register as org first");
    if (!publicKey)       return setLocalError("Wallet not connected");

    const rewardNum = parseFloat(reward);
    const slotsNum  = parseInt(slots);
    if (isNaN(rewardNum) || rewardNum <= 0)  return setLocalError("Invalid reward");
    if (slotsNum < 5 || slotsNum > 10)       return setLocalError("Slots must be 5–10");

    // image validation for image_label tasks
    if (taskType === "image_label") {
      if (imageFiles.length < 5)  return setLocalError("Upload at least 5 images");
      if (imageFiles.length > 10) return setLocalError("Maximum 10 images");
      for (const f of imageFiles) {
        if (f.size > 5 * 1024 * 1024) return setLocalError(`${f.name} exceeds 5 MB limit`);
      }
    }

    const taskRef = makeTaskRef(taskName);
    setPendingAction("post");

    // ── Step 1: upload images to Supabase Storage ──────────────────────────
    let imageUrls: string[] = [];
    if (taskType === "image_label" && imageFiles.length > 0) {
      try {
        setUploadProgress("Uploading images…");
        imageUrls = await uploadTaskImages(taskRef, imageFiles);
        setUploadProgress(null);
      } catch (e: any) {
        setPendingAction(null);
        setUploadProgress(null);
        return setLocalError(e?.message ?? "Image upload failed");
      }
    }

    // ── Step 2: post on-chain ──────────────────────────────────────────────
    setUploadProgress("Locking SOL on-chain…");
    const sig = await postTask(taskRef, rewardNum, slotsNum);
    setUploadProgress(null);

    if (!sig) {
      setPendingAction(null);
      return setLocalError(error ?? "postTask failed");
    }

    // ── Step 3: insert task row in Supabase ────────────────────────────────
    setUploadProgress("Saving task metadata…");
    const dbId = await insertTask({
      id:         taskRef,
      title:      taskName.trim(),
      type:       taskType,
      reward:     rewardNum.toString(),
      difficulty: "Medium",
      slots_max:  slotsNum,
      org_wallet: publicKey.toString(),
      images:     imageUrls,
    });
    setUploadProgress(null);
    setPendingAction(null);

    if (!dbId) return setLocalError("Task posted on-chain but DB insert failed — check Supabase logs.");

    // ── Reset form ─────────────────────────────────────────────────────────
    setLastTx(sig);
    setTaskName("");
    setReward("0.05");
    setSlots("5");
    imagePreviews.forEach(URL.revokeObjectURL);
    setImageFiles([]);
    setImagePreviews([]);
  };

  const handleRelease = async (sub: any) => {
    if (!publicKey) return;
    try {
      const workerPubkey = new PublicKey(sub.worker_wallet);
      setPendingAction(`release_${sub.id}`);
      const sig = await approveRelease(sub.task_id, workerPubkey, publicKey);
      setPendingAction(null);
      if (sig) {
        setLastTx(sig);
        await updateSubmissionStatus(sub.id, "approved", sig);
        setSubmissions(await fetchSubmissions());
      } else { setLocalError(error ?? "approve_release failed"); }
    } catch (e: any) { setPendingAction(null); setLocalError(e?.message ?? "Release failed"); }
  };

  const totalEscrowSol = myEscrows.reduce(
    (acc: number, e: EscrowTaskAccount) => acc + e.reward.toNumber() / LAMPORTS_PER_SOL, 0
  );

  const isPosting = pendingAction === "post";
  const canPost   = !!orgAccount && !isPosting && (
    taskType !== "image_label" || (imageFiles.length >= 5 && imageFiles.length <= 10)
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400&family=Playfair+Display:wght@700&display=swap');
        * { box-sizing: border-box; }
        input:focus, select:focus { border-color: ${borderGold} !important; outline: none; }
        select option { background: #0A0A0A; color: ${gold}; }
        button:hover:not(:disabled) { opacity: 0.82; }
      `}</style>

      <div style={s.page}>
        <div style={s.gridOverlay} />
        <div style={s.content}>

          {showModal && !loading && (
            <RegisterModal
              mode="org"
              onRegister={handleRegisterOnChain}
              onSaveProfile={handleSaveProfile}
              isLoading={pendingAction === "register" || pendingAction === "profile"}
              error={error}
            />
          )}

          <button style={s.backBtn} onClick={() => navigate("/")}>← Home</button>

          {/* Header */}
          <div style={s.header}>
            <div>
              <div style={s.eyebrow}>Abyss Protocol</div>
              <div style={s.title}>Organisation Dashboard</div>
              <div style={{ fontSize: "0.68rem", color: textSecondary, marginTop: "0.4rem", letterSpacing: "0.04em" }}>
                {publicKey
                  ? `${publicKey.toString().slice(0, 8)}…${publicKey.toString().slice(-6)}`
                  : "No wallet connected"}
                {solBalance !== null && (
                  <span style={{ color: gold, marginLeft: "1.2rem" }}>{solBalance.toFixed(4)} SOL</span>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              {orgAccount && (
                <div style={{ fontSize: "0.62rem", color: gold, letterSpacing: "0.1em", border: `1px solid ${borderGold}`, padding: "0.3rem 0.8rem", background: goldGlow }}>
                  ✦ {orgAccount.name}
                </div>
              )}
              <WalletMultiButton />
            </div>
          </div>

          {!publicKey && (
            <div style={{ ...s.cardGold, textAlign: "center", padding: "4rem 2rem" }}>
              <div style={s.eyebrow}>Authentication Required</div>
              <div style={{ fontSize: "1.1rem", fontFamily: "'Playfair Display', serif", color: gold, marginBottom: "0.5rem" }}>
                Connect your wallet to continue
              </div>
              <div style={{ color: textSecondary, fontSize: "0.75rem" }}>Use the wallet button in the top right</div>
            </div>
          )}

          {/* Feedback banners */}
          {lastTx && (
            <div style={s.successBanner}>
              <span style={{ color: greenText, fontSize: "0.72rem" }}>
                ✦ Task posted successfully —{" "}
                <a href={`https://explorer.solana.com/tx/${lastTx}?cluster=devnet`} target="_blank" rel="noopener noreferrer"
                  style={{ color: gold, textDecoration: "underline" }}>View on Explorer ↗</a>
              </span>
            </div>
          )}
          {localError && (
            <div style={s.errorBanner}>
              <span style={{ color: redText, fontSize: "0.72rem" }}>✕ {localError}</span>
            </div>
          )}

          {publicKey && (
            <>
              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1px", background: borderGold, border: `1px solid ${borderGold}`, marginBottom: "2rem" }}>
                {[
                  { label: "Tasks Posted",  value: String(orgAccount?.tasksPosted ?? 0) },
                  { label: "SOL in Escrow", value: totalEscrowSol.toFixed(3) },
                  { label: "Reputation",    value: `${orgAccount?.reputation ?? 50}/100` },
                ].map(stat => (
                  <div key={stat.label} style={{ background: black, padding: "1.5rem", textAlign: "center" }}>
                    <div style={s.statValue}>{stat.value}</div>
                    <div style={s.statLabel}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", gap: "2px", marginBottom: "1.5rem", background: border, padding: "2px" }}>
                {(["post", "submissions", "escrows"] as const).map(t => (
                  <button key={t} style={{
                    ...s.btn, flex: 1, border: "none",
                    background: tab === t ? gold : surface2,
                    color: tab === t ? black : textSecondary,
                  }} onClick={() => setTab(t)}>
                    {t === "post" ? "Post Task" : t === "submissions" ? "Submissions" : "Escrows"}
                  </button>
                ))}
              </div>

              {/* ── POST TASK TAB ────────────────────────────────────────── */}
              {tab === "post" && (
                <div style={s.card}>
                  <div style={{ ...s.eyebrow, marginBottom: "1.5rem" }}>New Task</div>

                  <label style={s.label}>Task Name</label>
                  <input
                    style={s.input}
                    placeholder="e.g. Label product images for AI dataset"
                    value={taskName}
                    onChange={e => setTaskName(e.target.value)}
                    disabled={isPosting}
                  />

                  <label style={s.label}>Task Type</label>
                  <select
                    style={{ ...s.input, appearance: "none" as any }}
                    value={taskType}
                    onChange={e => setTaskType(e.target.value as "image_label" | "rlhf")}
                    disabled={isPosting}
                  >
                    <option value="image_label">Image Labeling</option>
                    <option value="rlhf">AI Response Ranking (RLHF)</option>
                    <option value="coming_soon"  disabled>Audio Transcription — Coming Soon</option>
                    <option value="coming_soon2" disabled>Sentiment Labeling — Coming Soon</option>
                  </select>

                  {/* ── Image upload — only for image_label ── */}
                  {taskType === "image_label" && (
                    <div style={{ marginBottom: "0.5rem" }}>
                      <label style={s.label}>Task Images (5–10 required)</label>
                      <ImageUploadZone
                        files={imageFiles}
                        previews={imagePreviews}
                        onChange={(f, p) => { setImageFiles(f); setImagePreviews(p); }}
                        disabled={isPosting}
                      />
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div>
                      <label style={s.label}>Reward per slot (SOL)</label>
                      <input
                        style={s.input} type="number" step="0.01"
                        value={reward} onChange={e => setReward(e.target.value)}
                        disabled={isPosting}
                      />
                    </div>
                    <div>
                      <label style={s.label}>Max Submissions (5–10)</label>
                      <input
                        style={s.input} type="number" min="5" max="10"
                        value={slots} onChange={e => setSlots(e.target.value)}
                        disabled={isPosting}
                      />
                    </div>
                  </div>

                  {/* Escrow total */}
                  <div style={{ background: surface2, border: `1px solid ${borderGold}`, padding: "1.2rem", marginBottom: "1.2rem" }}>
                    <div style={{ ...s.label, marginBottom: "0.5rem" }}>Total to lock in escrow</div>
                    <div style={{ fontSize: "1.8rem", fontFamily: "'Playfair Display', serif", color: gold }}>
                      {(parseFloat(reward || "0") * parseInt(slots || "0")).toFixed(3)} SOL
                    </div>
                    {solBalance !== null && parseFloat(reward) * parseInt(slots) > solBalance && (
                      <div style={{ color: redText, fontSize: "0.68rem", marginTop: "0.4rem" }}>
                        Insufficient balance — {solBalance.toFixed(4)} SOL available
                      </div>
                    )}
                  </div>

                  {/* Progress indicator */}
                  {uploadProgress && (
                    <div style={{ ...s.successBanner, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <span style={{ fontSize: "0.75rem", animation: "spin 1s linear infinite", display: "inline-block" }}>⏳</span>
                      <span style={{ color: gold, fontSize: "0.72rem", letterSpacing: "0.08em" }}>{uploadProgress}</span>
                    </div>
                  )}

                  <button
                    style={{ ...s.btn, ...(canPost ? s.btnGold : s.btnDim), width: "100%" }}
                    onClick={handlePost}
                    disabled={!canPost}
                  >
                    {isPosting
                      ? uploadProgress ?? "Processing…"
                      : !orgAccount
                      ? "Register org first"
                      : taskType === "image_label" && imageFiles.length < 5
                      ? `Upload images first (${imageFiles.length}/5)`
                      : "Post Task & Lock SOL in Escrow"}
                  </button>
                </div>
              )}

              {/* ── SUBMISSIONS TAB ──────────────────────────────────────── */}
              {tab === "submissions" && (
                <div style={s.card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                    <div style={s.eyebrow}>Worker Submissions</div>
                    <button style={{ ...s.btn, ...s.btnOutline, padding: "0.4rem 0.8rem" }}
                      onClick={async () => { setSubLoading(true); setSubmissions(await fetchSubmissions()); setSubLoading(false); }}>
                      Refresh
                    </button>
                  </div>
                  {subLoading ? (
                    <div style={{ textAlign: "center", color: textSecondary, padding: "3rem", fontSize: "0.72rem", letterSpacing: "0.1em" }}>Loading…</div>
                  ) : submissions.length === 0 ? (
                    <div style={{ textAlign: "center", color: textMuted, padding: "3rem", fontSize: "0.72rem" }}>No submissions yet.</div>
                  ) : (
                    submissions.map(sub => (
                      <div key={sub.id} style={s.row}>
                        <div>
                          <div style={{ color: gold, fontSize: "0.82rem", fontWeight: "bold", marginBottom: "0.3rem" }}>{sub.task_id}</div>
                          <div style={{ color: textSecondary, fontSize: "0.7rem", marginBottom: "0.5rem" }}>
                            {sub.worker_name ?? "Unknown"} · {sub.worker_wallet?.slice(0, 8)}...
                          </div>
                          <div>
                            <span style={s.tag}>Integrity {sub.integrity_score}%</span>
                            <span style={s.tag}>Liveness {sub.liveness_score}%</span>
                            <span style={s.tag}>{sub.time_spent_seconds}s</span>
                          </div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          {sub.status === "approved" ? (
                            <div>
                              <div style={{ color: greenText, fontSize: "0.7rem", marginBottom: "0.3rem" }}>✦ Approved</div>
                              {sub.tx_sig && (
                                <a href={`https://explorer.solana.com/tx/${sub.tx_sig}?cluster=devnet`}
                                  target="_blank" rel="noopener noreferrer"
                                  style={{ color: goldDim, fontSize: "0.65rem", textDecoration: "none" }}>View tx ↗</a>
                              )}
                            </div>
                          ) : (
                            <button
                              style={{ ...s.btn, ...(pendingAction === `release_${sub.id}` ? s.btnDim : s.btnGold), padding: "0.5rem 1rem" }}
                              onClick={() => handleRelease(sub)} disabled={!!pendingAction}>
                              {pendingAction === `release_${sub.id}` ? "Releasing…" : "Release SOL"}
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ── ESCROWS TAB ──────────────────────────────────────────── */}
              {tab === "escrows" && (
                <div style={s.card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                    <div style={s.eyebrow}>On-Chain Escrow Accounts</div>
                    <button style={{ ...s.btn, ...s.btnOutline, padding: "0.4rem 0.8rem" }} onClick={refreshAll}>Refresh</button>
                  </div>
                  {myEscrows.length === 0 ? (
                    <div style={{ color: textMuted, textAlign: "center", padding: "3rem", fontSize: "0.72rem" }}>
                      No escrow accounts. Post a task to create one.
                    </div>
                  ) : (
                    myEscrows.map((e: EscrowTaskAccount) => {
                      const statusLabel = "open" in e.status ? "Open" : "underReview" in e.status ? "Under Review" : "Closed";
                      const statusColor = "open" in e.status ? greenText : "underReview" in e.status ? "#F59E0B" : textSecondary;
                      return (
                        <div key={e.pda.toString()} style={s.row}>
                          <div>
                            <div style={{ color: gold, fontSize: "0.82rem", fontWeight: "bold", marginBottom: "0.3rem" }}>{e.taskRef}</div>
                            <div style={{ color: textSecondary, fontSize: "0.68rem", marginBottom: "0.5rem" }}>
                              {e.pda.toString().slice(0, 20)}…
                            </div>
                            <div>
                              <span style={s.tag}>{(e.reward.toNumber() / LAMPORTS_PER_SOL).toFixed(4)} SOL</span>
                              <span style={{ ...s.tag, color: statusColor, borderColor: statusColor + "55" }}>{statusLabel}</span>
                              <span style={s.tag}>{e.submissionsCount}/{e.maxSubmissions} slots</span>
                            </div>
                          </div>
                          <a href={`https://explorer.solana.com/address/${e.pda.toString()}?cluster=devnet`}
                            target="_blank" rel="noopener noreferrer"
                            style={{ color: goldDim, fontSize: "0.7rem", textDecoration: "none" }}>View ↗</a>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}