import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";

const PROGRAM_ID = "ChdVArQ4zjd3DzQPLyXYQtkEvRF4uupJNCnqQjxW3RvQ";

// ─── GOLD THEME PALETTE ───────────────────────────────────────────────────────
const GOLD        = "#D4AF37";
const GOLD_LIGHT  = "#F0CC5A";
const GOLD_DIM    = "#8C7420";
const GOLD_FAINT  = "#4A3A10";
const GOLD_GHOST  = "rgba(212,175,55,0.08)";
const BORDER      = "#1A1500";
const BORDER_MID  = "rgba(212,175,55,0.18)";
const TEXT_MAIN   = GOLD;
const TEXT_MID    = GOLD_DIM;
const TEXT_DIM    = GOLD_FAINT;
const BG          = "#000000";
const BG_NAV      = "rgba(0,0,0,0.94)";
const BG_HOVER    = "#0a0800";
const SUCCESS     = "#3d7a5a";

export default function Landing() {
  const navigate = useNavigate();
  const { publicKey } = useWallet();
  const [visible, setVisible] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const s: Record<string, React.CSSProperties> = {
    root: {
      minHeight: "100vh",
      background: BG,
      color: TEXT_MAIN,
      fontFamily: "'DM Mono', 'Courier New', monospace",
      overflowX: "hidden",
    },

    // ── top bar ──
    topbar: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "1.2rem 3rem",
      borderBottom: `1px solid ${BORDER_MID}`,
      background: BG_NAV,
      backdropFilter: "blur(12px)",
    },
    logoMark: {
      fontSize: "0.7rem",
      letterSpacing: "0.3em",
      color: GOLD_DIM,
      textTransform: "uppercase" as const,
    },
    logoName: {
      fontSize: "1rem",
      letterSpacing: "0.25em",
      color: GOLD_LIGHT,
      fontWeight: 400,
    },
    navRight: {
      display: "flex",
      alignItems: "center",
      gap: "2rem",
    },
    navLink: {
      fontSize: "0.7rem",
      letterSpacing: "0.2em",
      color: GOLD_DIM,
      textDecoration: "none",
      textTransform: "uppercase" as const,
      cursor: "pointer",
      transition: "color 0.2s",
    },

    // ── hero ──
    hero: {
      paddingTop: "18vh",
      paddingBottom: "12vh",
      paddingLeft: "3rem",
      paddingRight: "3rem",
      maxWidth: "1100px",
      margin: "0 auto",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(16px)",
      transition: "opacity 0.8s ease, transform 0.8s ease",
    },
    eyebrow: {
      fontSize: "0.65rem",
      letterSpacing: "0.35em",
      color: GOLD_FAINT,
      textTransform: "uppercase" as const,
      marginBottom: "2rem",
      display: "flex",
      alignItems: "center",
      gap: "1rem",
    },
    eyebrowLine: {
      width: "40px",
      height: "1px",
      background: GOLD_FAINT,
      display: "inline-block",
    },
    h1: {
      fontSize: "clamp(2.8rem, 6vw, 5.5rem)",
      fontWeight: 400,
      letterSpacing: "-0.01em",
      lineHeight: 1.0,
      margin: "0 0 0.3rem 0",
      color: GOLD_LIGHT,
      fontFamily: "'DM Serif Display', Georgia, serif",
    },
    h1Dim: {
      color: GOLD_FAINT,
    },
    tagline: {
      fontSize: "clamp(0.8rem, 1.4vw, 1rem)",
      letterSpacing: "0.08em",
      color: GOLD_DIM,
      marginTop: "2rem",
      maxWidth: "520px",
      lineHeight: 1.7,
      fontFamily: "'DM Mono', monospace",
    },
    heroActions: {
      display: "flex",
      gap: "1rem",
      marginTop: "3.5rem",
      flexWrap: "wrap" as const,
      alignItems: "center",
    },
    btnPrimary: {
      padding: "0.75rem 2rem",
      background: GOLD,
      color: "#000000",
      border: "none",
      fontSize: "0.7rem",
      letterSpacing: "0.2em",
      textTransform: "uppercase" as const,
      cursor: "pointer",
      fontFamily: "'DM Mono', monospace",
      fontWeight: 600,
      transition: "opacity 0.2s",
    },
    btnGhost: {
      padding: "0.75rem 2rem",
      background: "transparent",
      color: GOLD_DIM,
      border: `1px solid ${GOLD_FAINT}`,
      fontSize: "0.7rem",
      letterSpacing: "0.2em",
      textTransform: "uppercase" as const,
      cursor: "pointer",
      fontFamily: "'DM Mono', monospace",
      transition: "border-color 0.2s, color 0.2s",
    },

    // ── divider ──
    divider: {
      borderTop: `1px solid ${BORDER_MID}`,
      margin: "0 3rem",
    },

    // ── stat strip ──
    statStrip: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      maxWidth: "1100px",
      margin: "0 auto",
      padding: "0 3rem",
      borderLeft: `1px solid ${BORDER_MID}`,
      borderRight: `1px solid ${BORDER_MID}`,
    },
    statCell: {
      padding: "2.5rem 2rem",
      borderRight: `1px solid ${BORDER_MID}`,
    },
    statNum: {
      fontSize: "2rem",
      fontWeight: 400,
      color: GOLD_LIGHT,
      fontFamily: "'DM Serif Display', Georgia, serif",
      letterSpacing: "-0.02em",
    },
    statLabel: {
      fontSize: "0.6rem",
      letterSpacing: "0.25em",
      color: GOLD_DIM,
      textTransform: "uppercase" as const,
      marginTop: "0.4rem",
    },

    // ── section ──
    section: {
      maxWidth: "1100px",
      margin: "0 auto",
      padding: "6rem 3rem",
    },
    sectionLabel: {
      fontSize: "0.6rem",
      letterSpacing: "0.35em",
      color: GOLD_FAINT,
      textTransform: "uppercase" as const,
      marginBottom: "3rem",
      display: "flex",
      alignItems: "center",
      gap: "1rem",
    },

    // ── how it works ──
    stepsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "0",
      border: `1px solid ${BORDER_MID}`,
    },
    step: {
      padding: "2.5rem",
      borderRight: `1px solid ${BORDER_MID}`,
      position: "relative" as const,
    },
    stepNum: {
      fontSize: "0.6rem",
      letterSpacing: "0.3em",
      color: GOLD_FAINT,
      marginBottom: "1.5rem",
    },
    stepTitle: {
      fontSize: "0.9rem",
      color: GOLD,
      letterSpacing: "0.05em",
      marginBottom: "0.8rem",
      fontWeight: 400,
    },
    stepBody: {
      fontSize: "0.75rem",
      color: GOLD_DIM,
      lineHeight: 1.8,
      letterSpacing: "0.02em",
    },

    // ── two-col features ──
    featureGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "0",
      border: `1px solid ${BORDER_MID}`,
      borderBottom: "none",
    },
    featureCell: {
      padding: "2.5rem",
      borderBottom: `1px solid ${BORDER_MID}`,
      borderRight: `1px solid ${BORDER_MID}`,
    },
    featureIcon: {
      fontSize: "0.65rem",
      letterSpacing: "0.2em",
      color: GOLD_FAINT,
      marginBottom: "1.2rem",
      textTransform: "uppercase" as const,
    },
    featureTitle: {
      fontSize: "0.85rem",
      color: GOLD,
      marginBottom: "0.6rem",
      fontWeight: 400,
      letterSpacing: "0.03em",
    },
    featureBody: {
      fontSize: "0.72rem",
      color: GOLD_DIM,
      lineHeight: 1.8,
    },

    // ── contract ──
    contractBox: {
      border: `1px solid ${BORDER_MID}`,
      padding: "2.5rem",
    },
    contractRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      padding: "1rem 0",
      borderBottom: `1px solid rgba(212,175,55,0.08)`,
    },
    contractKey: {
      fontSize: "0.6rem",
      letterSpacing: "0.25em",
      color: GOLD_DIM,
      textTransform: "uppercase" as const,
      minWidth: "160px",
    },
    contractVal: {
      fontSize: "0.72rem",
      color: GOLD_DIM,
      fontFamily: "'DM Mono', monospace",
      textAlign: "right" as const,
      wordBreak: "break-all" as const,
      maxWidth: "560px",
    },
    contractValGreen: {
      color: SUCCESS,
    },

    // ── role select ──
    roleGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "1.5rem",
      marginTop: "2rem",
    },
    roleCard: {
      border: `1px solid ${BORDER_MID}`,
      padding: "2.5rem",
      cursor: "pointer",
      transition: "border-color 0.2s, background 0.2s",
    },
    roleCardHover: {
      borderColor: GOLD_DIM,
      background: BG_HOVER,
    },
    roleTag: {
      fontSize: "0.6rem",
      letterSpacing: "0.3em",
      color: GOLD_FAINT,
      textTransform: "uppercase" as const,
      marginBottom: "1.2rem",
    },
    roleTitle: {
      fontSize: "1.1rem",
      color: GOLD_LIGHT,
      fontFamily: "'DM Serif Display', Georgia, serif",
      marginBottom: "0.6rem",
      fontWeight: 400,
    },
    roleBody: {
      fontSize: "0.72rem",
      color: GOLD_DIM,
      lineHeight: 1.8,
      marginBottom: "1.8rem",
    },
    roleBtn: {
      fontSize: "0.62rem",
      letterSpacing: "0.25em",
      color: GOLD_DIM,
      textTransform: "uppercase" as const,
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
    },

    // ── footer ──
    footer: {
      borderTop: `1px solid ${BORDER_MID}`,
      padding: "2rem 3rem",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      maxWidth: "1100px",
      margin: "0 auto",
    },
    footerLeft: {
      fontSize: "0.6rem",
      letterSpacing: "0.2em",
      color: GOLD_FAINT,
      textTransform: "uppercase" as const,
    },
    footerRight: {
      fontSize: "0.6rem",
      letterSpacing: "0.2em",
      color: GOLD_FAINT,
    },
  };

  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400&family=DM+Serif+Display&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #000000; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #000000; }
        ::-webkit-scrollbar-thumb { background: ${GOLD_FAINT}; }
        .wallet-adapter-button {
          background: transparent !important;
          border: 1px solid ${GOLD_FAINT} !important;
          color: ${GOLD_DIM} !important;
          font-family: 'DM Mono', monospace !important;
          font-size: 0.65rem !important;
          letter-spacing: 0.2em !important;
          padding: 0.55rem 1.2rem !important;
          height: auto !important;
          border-radius: 0 !important;
          text-transform: uppercase;
          transition: border-color 0.2s, color 0.2s !important;
        }
        .wallet-adapter-button:hover {
          background: ${BG_HOVER} !important;
          border-color: ${GOLD_DIM} !important;
          color: ${GOLD} !important;
        }
        .wallet-adapter-button-trigger { }
      `}</style>

      <div style={s.root}>

        {/* topbar */}
        <nav style={s.topbar}>
          <div>
            <div style={s.logoMark}>Proof of Human Work</div>
            <div style={s.logoName}>ABYSS</div>
          </div>
          <div style={s.navRight}>
            <span style={s.navLink}>Solana Devnet</span>
            <span style={s.navLink}>Docs</span>
            <WalletMultiButton />
          </div>
        </nav>

        {/* hero */}
        <div style={s.hero} ref={heroRef}>
          <div style={s.eyebrow}>
            <span style={s.eyebrowLine} />
            Decentralised Human Intelligence
          </div>
          <h1 style={s.h1}>
            Verified human work.<br />
            <span style={s.h1Dim}>On-chain.</span>
          </h1>
          <p style={s.tagline}>
            Organizations lock SOL in escrow. Workers complete tasks under liveness
            verification and behavioral monitoring. Payments release trustlessly on Solana.
          </p>
          <div style={s.heroActions}>
            {publicKey ? (
              <>
                <button style={s.btnPrimary} onClick={() => navigate("/org")}>
                  Post a Task
                </button>
                <button style={s.btnGhost} onClick={() => navigate("/worker")}>
                  Find Work
                </button>
              </>
            ) : (
              <>
                <button style={s.btnPrimary} onClick={() => navigate("/org")}>
                  Organisation →
                </button>
                <button style={s.btnGhost} onClick={() => navigate("/worker")}>
                  Worker →
                </button>
              </>
            )}
          </div>
        </div>

        {/* stat strip */}
        <div style={s.divider} />
        <div style={s.statStrip}>
          {[
            { num: "4", label: "On-chain instructions" },
            { num: "3", label: "Account types" },
            { num: "0–100", label: "Reputation range" },
            { num: "₹0", label: "Infrastructure cost" },
          ].map((stat, i) => (
            <div
              key={stat.label}
              style={{ ...s.statCell, borderRight: i < 3 ? `1px solid ${BORDER_MID}` : "none" }}
            >
              <div style={s.statNum}>{stat.num}</div>
              <div style={s.statLabel}>{stat.label}</div>
            </div>
          ))}
        </div>
        <div style={s.divider} />

        {/* how it works */}
        <div style={s.section}>
          <div style={s.sectionLabel}>
            <span style={s.eyebrowLine} />
            How it works
          </div>
          <div style={s.stepsGrid}>
            {[
              {
                n: "01",
                title: "Organisation posts a task",
                body: "An org registers on-chain, defines the task type and reward, and locks SOL into a PDA escrow account. Funds are non-custodial until approval.",
              },
              {
                n: "02",
                title: "Worker completes with proof",
                body: "Workers pass liveness detection via MediaPipe and are monitored for behavioral integrity — keystroke rhythm, mouse dynamics, tab focus — throughout the session.",
              },
              {
                n: "03",
                title: "Trustless payment release",
                body: "The organisation reviews the submission. On approval, approve_release() transfers SOL directly to the worker's wallet and updates on-chain reputation for both parties.",
              },
            ].map((step, i) => (
              <div
                key={step.n}
                style={{ ...s.step, borderRight: i < 2 ? `1px solid ${BORDER_MID}` : "none" }}
              >
                <div style={s.stepNum}>{step.n}</div>
                <div style={s.stepTitle}>{step.title}</div>
                <div style={s.stepBody}>{step.body}</div>
              </div>
            ))}
          </div>
        </div>

        {/* features */}
        <div style={{ ...s.section, paddingTop: 0 }}>
          <div style={s.sectionLabel}>
            <span style={s.eyebrowLine} />
            System design
          </div>
          <div style={s.featureGrid}>
            {[
              {
                tag: "Anti-fraud",
                title: "Liveness verification",
                body: "MediaPipe face detection runs in-browser every 30–45 seconds. Submissions are blocked if the liveness score falls below 70%. No server round-trips.",
              },
              {
                tag: "Integrity",
                title: "Behavioral analytics",
                body: "A composite score weights typing naturalness (20%), mouse variance (20%), liveness (35%), time-on-task (15%), and tab focus (10%) to detect automated submissions.",
              },
              {
                tag: "Storage",
                title: "Hybrid on/off chain",
                body: "Wallet addresses, reputation scores, escrow balances, and task status live on Solana. Task metadata, images, and submission detail live in Supabase and Pinata IPFS.",
              },
              {
                tag: "Reputation",
                title: "On-chain scoring",
                body: "Workers gain +5 on approval, lose −3 on rejection. Organisations gain +5 for timely payment, lose −8 on disputes. Scores are stored in PDA accounts and publicly verifiable.",
              },
              {
                tag: "Task types",
                title: "Image labeling & RLHF",
                body: "Workers label e-commerce images by category or rank pairs of AI responses for fine-tuning datasets. Audio transcription, sentiment labeling, and video trimming are planned.",
              },
              {
                tag: "Infrastructure",
                title: "Zero-cost stack",
                body: "Solana Devnet (free), Supabase free tier, Cloudinary free tier, Pinata IPFS 1 GB, Vercel hobby plan. Total monthly cost: ₹0 for the demo build.",
              },
            ].map((f, i) => (
              <div
                key={f.tag}
                style={{
                  ...s.featureCell,
                  borderRight: i % 2 === 0 ? `1px solid ${BORDER_MID}` : "none",
                }}
              >
                <div style={s.featureIcon}>{f.tag}</div>
                <div style={s.featureTitle}>{f.title}</div>
                <div style={s.featureBody}>{f.body}</div>
              </div>
            ))}
          </div>
        </div>

        {/* contract */}
        <div style={{ ...s.section, paddingTop: 0 }}>
          <div style={s.sectionLabel}>
            <span style={s.eyebrowLine} />
            Deployed contract
          </div>
          <div style={s.contractBox}>
            {[
              { key: "Network", val: "Solana Devnet" },
              { key: "Program ID", val: PROGRAM_ID },
              {
                key: "Instructions",
                val: "register_worker · register_org · post_task · approve_release",
              },
              { key: "Account types", val: "Worker · Organisation · EscrowTask" },
              { key: "Escrow model", val: "PDA-owned — funds held by program, not by org" },
              { key: "Status", val: "✓ Deployed & tested", green: true },
            ].map((row, i) => (
              <div
                key={row.key}
                style={{
                  ...s.contractRow,
                  borderBottom: i < 5 ? `1px solid rgba(212,175,55,0.08)` : "none",
                }}
              >
                <span style={s.contractKey}>{row.key}</span>
                <span style={{ ...s.contractVal, ...(row.green ? s.contractValGreen : {}) }}>
                  {row.val}
                </span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "1rem", textAlign: "right" as const }}>
            <a
              href={`https://explorer.solana.com/address/${PROGRAM_ID}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: "0.62rem",
                letterSpacing: "0.2em",
                color: GOLD_FAINT,
                textDecoration: "none",
                textTransform: "uppercase" as const,
              }}
            >
              View on Solana Explorer ↗
            </a>
          </div>
        </div>

        {/* enter */}
        <div style={{ ...s.section, paddingTop: 0 }}>
          <div style={s.sectionLabel}>
            <span style={s.eyebrowLine} />
            Enter the platform
          </div>
          {!publicKey && (
            <p style={{ ...s.stepBody, marginBottom: "2rem" }}>
              Connect your Phantom wallet to get started.
            </p>
          )}
          <div style={s.roleGrid}>
            {[
              {
                id: "org",
                tag: "Organisation",
                title: "Post tasks",
                body: "Register your organisation on-chain, define task parameters, lock SOL in escrow, and review worker submissions.",
                path: "/org",
              },
              {
                id: "worker",
                tag: "Worker",
                title: "Earn SOL",
                body: "Register as a verified worker, browse available tasks, complete work in the monitored workspace, and receive trustless payment.",
                path: "/worker",
              },
            ].map((role) => (
              <div
                key={role.id}
                style={{
                  ...s.roleCard,
                  ...(hovered === role.id ? s.roleCardHover : {}),
                }}
                onMouseEnter={() => setHovered(role.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => navigate(role.path)}
              >
                <div style={s.roleTag}>{role.tag}</div>
                <div style={s.roleTitle}>{role.title}</div>
                <div style={s.roleBody}>{role.body}</div>
                <div style={s.roleBtn}>
                  <span>Enter</span>
                  <span>→</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* footer */}
        <div style={{ borderTop: `1px solid ${BORDER_MID}` }}>
          <div style={s.footer}>
            <span style={s.footerLeft}>
              ABYSS — 4th Semester Mini Project · DSCE Bangalore · VTU
            </span>
            <span style={s.footerRight}>Solana Devnet · All funds simulated</span>
          </div>
        </div>

      </div>
    </>
  );
}