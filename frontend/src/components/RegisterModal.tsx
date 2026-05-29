import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

export type RegisterMode = "worker" | "org";

interface RegisterModalProps {
  mode: RegisterMode;
  onRegister: (name: string) => Promise<string | null>;
  onSaveProfile: (data: ProfileData) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export interface ProfileData {
  wallet:         string;
  name:           string;
  email:          string;
  specialization: string;
  mode:           RegisterMode;
}

const WORKER_SPECS = [
  { value: "image_label", label: "Image Labeling",      desc: "Classify and annotate visual datasets" },
  { value: "rlhf",        label: "RLHF Ranking",        desc: "Rank AI responses for fine-tuning" },
  { value: "audio",       label: "Audio Transcription", desc: "Transcribe and clean audio data" },
  { value: "general",     label: "General",             desc: "All task types" },
];

const ORG_TYPES = [
  { value: "ai_company",   label: "AI Company",   desc: "Building AI products or models" },
  { value: "research_lab", label: "Research Lab", desc: "Academic or independent research" },
  { value: "startup",      label: "Startup",      desc: "Early-stage product company" },
  { value: "enterprise",   label: "Enterprise",   desc: "Large-scale data operations" },
];

// ── standalone dynamic style functions (NOT inside the s object) ──
function dotStyle(active: boolean, done: boolean): React.CSSProperties {
  return {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: done ? "#3d7a5a" : active ? "#e8e6df" : "#1e1c2e",
    transition: "background 0.3s",
  };
}

function cardStyle(selected: boolean, hov: boolean): React.CSSProperties {
  return {
    padding: "0.9rem 1rem",
    border: `1px solid ${selected ? "#3a3848" : hov ? "#2a2838" : "#1a1828"}`,
    background: selected ? "#12101f" : hov ? "#0e0c1c" : "transparent",
    cursor: "pointer",
    transition: "border-color 0.15s, background 0.15s",
  };
}

function cardLabelStyle(selected: boolean): React.CSSProperties {
  return {
    fontSize: "0.72rem",
    color: selected ? "#c8c6bf" : "#5a5870",
    letterSpacing: "0.03em",
    marginBottom: "0.2rem",
    transition: "color 0.15s",
  };
}

// ── static styles ──────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(4,4,10,0.88)",
    backdropFilter: "blur(6px)",
    zIndex: 200,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem",
  },
  modal: {
    background: "#0d0b1a",
    border: "1px solid #1e1c2e",
    width: "100%",
    maxWidth: "520px",
    fontFamily: "'DM Mono', 'Courier New', monospace",
    color: "#e8e6df",
  },
  header: {
    padding: "1.8rem 2rem 1.4rem",
    borderBottom: "1px solid #1a1828",
  },
  eyebrow: {
    fontSize: "0.58rem",
    letterSpacing: "0.32em",
    color: "#3a3848",
    textTransform: "uppercase",
    marginBottom: "0.5rem",
  },
  title: {
    fontSize: "1.15rem",
    fontFamily: "'DM Serif Display', Georgia, serif",
    fontWeight: 400,
    color: "#e8e6df",
    letterSpacing: "0.01em",
  },
  stepBar: {
    display: "flex",
    padding: "1rem 2rem",
    gap: "0.5rem",
    borderBottom: "1px solid #1a1828",
    alignItems: "center",
  },
  stepLine: {
    flex: 1,
    height: "1px",
    background: "#1a1828",
  },
  stepLabel: {
    fontSize: "0.58rem",
    letterSpacing: "0.2em",
    color: "#3a3848",
    textTransform: "uppercase",
    marginLeft: "0.75rem",
  },
  body: {
    padding: "2rem",
  },
  label: {
    fontSize: "0.6rem",
    letterSpacing: "0.25em",
    color: "#4a4860",
    textTransform: "uppercase",
    display: "block",
    marginBottom: "0.5rem",
  },
  input: {
    width: "100%",
    background: "#080810",
    border: "1px solid #1e1c2e",
    color: "#e8e6df",
    fontFamily: "'DM Mono', monospace",
    fontSize: "0.82rem",
    padding: "0.75rem 1rem",
    outline: "none",
    marginBottom: "1.4rem",
    transition: "border-color 0.2s",
    letterSpacing: "0.02em",
    boxSizing: "border-box",
  },
  specGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "0.6rem",
    marginBottom: "1.5rem",
  },
  specCardDesc: {
    fontSize: "0.62rem",
    color: "#2e2c3a",
    lineHeight: 1.5,
  },
  errorBox: {
    padding: "0.7rem 1rem",
    border: "1px solid #3a1a1a",
    background: "#1a0c0c",
    fontSize: "0.68rem",
    color: "#a05050",
    letterSpacing: "0.02em",
    marginBottom: "1.2rem",
  },
  btnPrimary: {
    width: "100%",
    padding: "0.85rem",
    background: "#e8e6df",
    color: "#080810",
    border: "none",
    fontSize: "0.65rem",
    letterSpacing: "0.25em",
    textTransform: "uppercase",
    cursor: "pointer",
    fontFamily: "'DM Mono', monospace",
    transition: "opacity 0.2s",
  },
  btnDisabled: {
    opacity: 0.35,
    cursor: "not-allowed",
  },
  hint: {
    fontSize: "0.6rem",
    color: "#2e2c3a",
    letterSpacing: "0.05em",
    marginTop: "0.9rem",
    lineHeight: 1.6,
  },
  successBody: {
    padding: "3rem 2rem",
    textAlign: "center",
  },
  successMark: {
    fontSize: "2rem",
    marginBottom: "1.2rem",
  },
  successTitle: {
    fontSize: "1rem",
    fontFamily: "'DM Serif Display', Georgia, serif",
    color: "#e8e6df",
    marginBottom: "0.6rem",
    fontWeight: 400,
  },
  successSub: {
    fontSize: "0.68rem",
    color: "#4a4860",
    lineHeight: 1.7,
    marginBottom: "1.8rem",
  },
  txLink: {
    fontSize: "0.6rem",
    letterSpacing: "0.15em",
    color: "#3d7a5a",
    textDecoration: "none",
    display: "block",
    marginBottom: "2rem",
  },
};

export default function RegisterModal({
  mode, onRegister, onSaveProfile, isLoading, error,
}: RegisterModalProps) {
  const { publicKey } = useWallet();
  const [step,       setStep]       = useState<1 | 2 | 3>(1);
  const [name,       setName]       = useState("");
  const [email,      setEmail]      = useState("");
  const [spec,       setSpec]       = useState("");
  const [txSig,      setTxSig]      = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [hoveredSpec, setHoveredSpec] = useState<string | null>(null);

  const options   = mode === "worker" ? WORKER_SPECS : ORG_TYPES;
  const label     = mode === "worker" ? "worker"     : "organisation";
  const specLabel = mode === "worker" ? "Specialization" : "Organisation type";

  useEffect(() => {
    if (error) setLocalError(error);
  }, [error]);

  const handleOnChain = async () => {
    setLocalError(null);
    if (!name.trim())      return setLocalError("Name is required");
    if (name.length > 32)  return setLocalError("Name must be 32 characters or fewer");
    const sig = await onRegister(name.trim());
    if (sig) { setTxSig(sig); setStep(2); }
  };

  const handleProfile = async () => {
    setLocalError(null);
    if (!email.trim())                             return setLocalError("Email is required");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setLocalError("Enter a valid email");
    if (!spec)                                     return setLocalError(`Select a ${specLabel.toLowerCase()}`);
    if (!publicKey) return;
    await onSaveProfile({ wallet: publicKey.toString(), name: name.trim(), email: email.trim(), specialization: spec, mode });
    setStep(3);
  };

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400&family=DM+Serif+Display&display=swap');`}</style>
      <div style={s.overlay}>
        <div style={s.modal}>

          {/* header */}
          <div style={s.header}>
            <div style={s.eyebrow}>New {label} registration</div>
            <div style={s.title}>
              {step === 1 && `Register as ${label}`}
              {step === 2 && "Complete your profile"}
              {step === 3 && "Registration complete"}
            </div>
          </div>

          {/* step bar */}
          <div style={s.stepBar}>
            <div style={dotStyle(step === 1, step > 1)} />
            <div style={s.stepLine} />
            <div style={dotStyle(step === 2, step > 2)} />
            <div style={s.stepLine} />
            <div style={dotStyle(step === 3, false)} />
            <span style={s.stepLabel}>
              {step === 1 ? "On-chain identity" : step === 2 ? "Profile" : "Done"}
            </span>
          </div>

          {/* step 1 */}
          {step === 1 && (
            <div style={s.body}>
              <label style={s.label}>
                {mode === "worker" ? "Your name" : "Organisation name"}
              </label>
              <input
                style={s.input}
                placeholder={mode === "worker" ? "e.g. Tanishq" : "e.g. OpenAI India"}
                value={name}
                onChange={e => { setName(e.target.value); setLocalError(null); }}
                maxLength={32}
                autoFocus
              />
              {localError && <div style={s.errorBox}>{localError}</div>}
              <button
                style={{ ...s.btnPrimary, ...(isLoading ? s.btnDisabled : {}) }}
                onClick={handleOnChain}
                disabled={isLoading}
              >
                {isLoading ? "Confirming on Solana…" : "Register on-chain →"}
              </button>
              <p style={s.hint}>
                This writes your name and a starting reputation of 50 to a PDA on Solana Devnet.
                You will need to approve a wallet transaction.
              </p>
            </div>
          )}

          {/* step 2 */}
          {step === 2 && (
            <div style={s.body}>
              <label style={s.label}>Email address</label>
              <input
                style={s.input}
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setLocalError(null); }}
                autoFocus
              />
              <label style={s.label}>{specLabel}</label>
              <div style={s.specGrid}>
                {options.map(opt => (
                  <div
                    key={opt.value}
                    style={cardStyle(spec === opt.value, hoveredSpec === opt.value)}
                    onClick={() => { setSpec(opt.value); setLocalError(null); }}
                    onMouseEnter={() => setHoveredSpec(opt.value)}
                    onMouseLeave={() => setHoveredSpec(null)}
                  >
                    <div style={cardLabelStyle(spec === opt.value)}>{opt.label}</div>
                    <div style={s.specCardDesc}>{opt.desc}</div>
                  </div>
                ))}
              </div>
              {localError && <div style={s.errorBox}>{localError}</div>}
              <button
                style={{ ...s.btnPrimary, ...(isLoading ? s.btnDisabled : {}) }}
                onClick={handleProfile}
                disabled={isLoading}
              >
                {isLoading ? "Saving…" : "Save profile →"}
              </button>
              <p style={s.hint}>
                Email and {specLabel.toLowerCase()} are stored in Supabase, not on-chain.
                Used for task matching and notifications only.
              </p>
            </div>
          )}

          {/* step 3 */}
          {step === 3 && (
            <div style={s.successBody}>
              <div style={s.successMark}>✦</div>
              <div style={s.successTitle}>
                {mode === "worker" ? "Worker registered" : "Organisation registered"}
              </div>
              <div style={s.successSub}>
                Your on-chain identity is live. Reputation starts at 50.
                {txSig && " Transaction confirmed on Solana Devnet."}
              </div>
              {txSig && (
                <a
                  href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={s.txLink}
                >
                  View transaction ↗
                </a>
              )}
              <p style={{ fontSize: "0.62rem", color: "#2e2c3a" }}>
                Loading your dashboard…
              </p>
            </div>
          )}

        </div>
      </div>
    </>
  );
}