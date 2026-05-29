import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useNavigate } from "react-router-dom";
import { useAbyss } from "../hooks/useAbyss";
import { fetchTasks, DBTask, supabase } from "../lib/supabase";
import RegisterModal, { ProfileData } from "../components/RegisterModal";

// ── Design tokens ──────────────────────────────────────────────
const gold       = "#C9A84C";
const goldDim    = "#8B6E2E";
const goldGlow   = "rgba(201,168,76,0.10)";
const black      = "#000000";
const surface    = "#0A0A0A";
const surface2   = "#111111";
const border     = "#1A1A1A";
const borderGold = "rgba(201,168,76,0.22)";
const textSecondary = "#6B5C35";
const textMuted     = "#2E2A1E";
const redText    = "#D97070";
const greenText  = "#4ADE80";

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
  btn: {
    padding: "0.75rem 1.8rem",
    border: "none",
    cursor: "pointer",
    fontFamily: "'DM Mono', monospace",
    fontSize: "0.65rem",
    letterSpacing: "0.18em",
    textTransform: "uppercase" as const,
  },
  btnGold:    { background: gold, color: black },
  btnOutline: { background: "transparent", border: `1px solid ${borderGold}`, color: gold },
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

export default function WorkerDashboard() {
  const { publicKey } = useWallet();
  const navigate      = useNavigate();
  const {
    workerAccount, solBalance, loading, error,
    registerWorker,
  } = useAbyss();

  const [tasks,         setTasks]         = useState<DBTask[]>([]);
  const [tasksLoading,  setTasksLoading]  = useState(true);
  const [selected,      setSelected]      = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [lastTx,        setLastTx]        = useState<string | null>(null);
  const [localError,    setLocalError]    = useState<string | null>(null);
  const [showModal,     setShowModal]     = useState(false);

  // ── FIX: wait for loading to settle before deciding to show modal ──
  useEffect(() => {
    if (!publicKey || loading) return;
    const t = setTimeout(() => { setShowModal(workerAccount === null); }, 400);
    return () => clearTimeout(t);
  }, [publicKey, workerAccount, loading]);

  useEffect(() => {
    const load = async () => {
      setTasksLoading(true);
      const data = await fetchTasks();
      setTasks(data);
      setTasksLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (!lastTx && !localError) return;
    const t = setTimeout(() => { setLastTx(null); setLocalError(null); }, 6000);
    return () => clearTimeout(t);
  }, [lastTx, localError]);

  const handleRegisterOnChain = async (name: string): Promise<string | null> => {
    setPendingAction("register");
    const sig = await registerWorker(name);
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
    if (sbError) {
      console.error("[Supabase] saveProfile:", sbError);
      setLocalError("Failed to save profile. Please try again.");
    }
  };

  const openWorkspace = (task: DBTask) => {
    navigate("/workspace", {
      state: {
        task: {
          id:           task.id,
          title:        task.title,
          type:         task.type,
          reward:       task.reward,
          difficulty:   task.difficulty,
          orgAuthority: task.org_wallet,
        },
      },
    });
  };

  const difficultyColor = (d: string) =>
    d === "Easy" ? greenText : d === "Medium" ? "#F59E0B" : redText;
  const difficultyBorderColor = (d: string) =>
    d === "Easy" ? "rgba(74,222,128,0.3)" : d === "Medium" ? "rgba(245,158,11,0.3)" : "rgba(217,112,112,0.3)";

  const tasksCompleted = workerAccount?.tasksCompleted ?? 0;
  const reputation     = workerAccount?.reputation     ?? 50;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400&family=Playfair+Display:wght@700&display=swap');
        * { box-sizing: border-box; }
        button:hover:not(:disabled) { opacity: 0.82; }
      `}</style>

      <div style={s.page}>
        <div style={s.gridOverlay} />
        <div style={s.content}>

          {showModal && !loading && (
            <RegisterModal
              mode="worker"
              onRegister={handleRegisterOnChain}
              onSaveProfile={handleSaveProfile}
              isLoading={pendingAction === "register" || pendingAction === "profile"}
              error={error}
            />
          )}

          {/* Back button */}
          <button style={s.backBtn} onClick={() => navigate("/")}>
            ← Home
          </button>

          {/* Header */}
          <div style={s.header}>
            <div>
              <div style={s.eyebrow}>Abyss Protocol</div>
              <div style={s.title}>Worker Dashboard</div>
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
              {workerAccount && (
                <div style={{ fontSize: "0.62rem", color: gold, letterSpacing: "0.1em", border: `1px solid ${borderGold}`, padding: "0.3rem 0.8rem", background: goldGlow }}>
                  ✦ {workerAccount.name}
                </div>
              )}
              <WalletMultiButton />
            </div>
          </div>

          {/* Not connected */}
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
                ✦ Registered on-chain —{" "}
                <a href={`https://explorer.solana.com/tx/${lastTx}?cluster=devnet`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ color: gold, textDecoration: "underline" }}>
                  View on Explorer ↗
                </a>
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
              {/* On-chain identity badge */}
              {workerAccount && (
                <div style={{ ...s.cardGold, background: "rgba(201,168,76,0.05)", marginBottom: "1.5rem" }}>
                  <div style={{ color: gold, fontSize: "0.72rem", fontWeight: "bold", marginBottom: "0.35rem", letterSpacing: "0.05em" }}>
                    ✦ On-chain identity — {workerAccount.name}
                  </div>
                  <div style={{ color: textSecondary, fontSize: "0.68rem", letterSpacing: "0.04em" }}>
                    Reputation: {workerAccount.reputation}/100 · Completed: {workerAccount.tasksCompleted}
                  </div>
                </div>
              )}

              {/* Stats grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1px", background: borderGold, border: `1px solid ${borderGold}`, marginBottom: "2rem" }}>
                {[
                  { label: "Tasks Completed", value: String(tasksCompleted) },
                  { label: "Tasks Available",  value: String(tasks.length)  },
                  { label: "Reputation",       value: `${reputation}/100`   },
                ].map(stat => (
                  <div key={stat.label} style={{ background: black, padding: "1.5rem", textAlign: "center" }}>
                    <div style={s.statValue}>{stat.value}</div>
                    <div style={s.statLabel}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Task Feed header */}
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", marginBottom: "1.2rem" }}>
                <div style={{ fontSize: "0.6rem", letterSpacing: "0.28em", color: textSecondary, textTransform: "uppercase" }}>
                  Available Tasks
                </div>
                <div style={{ fontSize: "0.58rem", color: textMuted, letterSpacing: "0.06em" }}>live from Supabase</div>
              </div>

              {tasksLoading ? (
                <div style={{ ...s.card, textAlign: "center", color: textSecondary, padding: "3rem", fontSize: "0.72rem", letterSpacing: "0.1em" }}>
                  Loading…
                </div>
              ) : tasks.length === 0 ? (
                <div style={{ ...s.card, textAlign: "center", color: textMuted, padding: "3rem", fontSize: "0.72rem" }}>
                  No tasks available right now. Check back soon.
                </div>
              ) : (
                tasks.map(task => (
                  <div key={task.id} style={{
                    ...s.card,
                    border: selected === task.id ? `1px solid ${borderGold}` : `1px solid ${border}`,
                    background: selected === task.id ? goldGlow : surface,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: gold, fontWeight: "bold", fontSize: "0.9rem", marginBottom: "0.6rem", letterSpacing: "0.02em" }}>
                          {task.title}
                        </div>
                        <div style={{ marginBottom: "0.8rem" }}>
                          <span style={s.tag}>
                            {task.type === "image_label" ? "Image Labeling" : "RLHF Ranking"}
                          </span>
                          <span style={{
                            ...s.tag,
                            color: difficultyColor(task.difficulty),
                            borderColor: difficultyBorderColor(task.difficulty),
                          }}>
                            {task.difficulty}
                          </span>
                        </div>
                        <div style={{ color: textSecondary, fontSize: "0.68rem", letterSpacing: "0.04em" }}>
                          {task.deadline} left · {task.slots_used}/{task.slots_max} slots filled
                        </div>
                      </div>
                      <div style={{ textAlign: "center", marginLeft: "1.5rem", flexShrink: 0 }}>
                        <div style={{ fontSize: "1.5rem", fontFamily: "'Playfair Display', serif", fontWeight: 700, color: gold }}>
                          {task.reward}
                        </div>
                        <div style={{ color: textSecondary, fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
                          SOL / task
                        </div>
                        <button
                          style={{ ...s.btn, ...s.btnGold, fontSize: "0.62rem", padding: "0.5rem 1.2rem" }}
                          onClick={() => setSelected(selected === task.id ? null : task.id)}
                        >
                          {selected === task.id ? "Deselect" : "Select"}
                        </button>
                      </div>
                    </div>

                    {selected === task.id && (
                      <div style={{ marginTop: "1.2rem", padding: "1rem", background: surface2, border: `1px solid ${borderGold}` }}>
                        {workerAccount ? (
                          <>
                            <div style={{ color: greenText, fontSize: "0.7rem", marginBottom: "0.6rem", letterSpacing: "0.05em" }}>
                              ✦ Task selected — ready to open workspace
                            </div>
                            <div style={{ color: textSecondary, fontSize: "0.68rem", marginBottom: "0.25rem" }}>
                              · Liveness check activates when workspace opens
                            </div>
                            <div style={{ color: textSecondary, fontSize: "0.68rem", marginBottom: "1rem" }}>
                              · Integrity monitoring begins automatically
                            </div>
                            <button
                              style={{ ...s.btn, ...s.btnGold, fontSize: "0.62rem" }}
                              onClick={() => openWorkspace(task)}
                            >
                              Open Workspace →
                            </button>
                          </>
                        ) : (
                          <div style={{ color: "#F59E0B", fontSize: "0.7rem", letterSpacing: "0.04em" }}>
                            ⚠ Complete registration to open the workspace
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}