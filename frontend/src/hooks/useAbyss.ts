// src/hooks/useAbyss.ts
// Central hook — all Solana/Anchor interactions live here.
// Import this in OrgDashboard, WorkerDashboard, and Workspace.

// ALL imports must come first (ESLint import/first rule)
import { Buffer as BufferPolyfill } from "buffer";
import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import IDL_RAW from "../idl/abyss.json";

// ── Polyfill guard ────────────────────────────────────────────────────────────
// Force Buffer onto window/globalThis before any Anchor code runs.
// CRACO's ProvidePlugin injects Buffer lazily; this ensures it exists
// synchronously at module evaluation time.
if (typeof window !== "undefined" && !(window as any).Buffer) {
  (window as any).Buffer = BufferPolyfill;
}
if (typeof globalThis !== "undefined" && !(globalThis as any).Buffer) {
  (globalThis as any).Buffer = BufferPolyfill;
}

// ─── Env config ───────────────────────────────────────────────────────────────
const PROGRAM_ID_STR  = process.env.REACT_APP_PROGRAM_ID!;
const RPC_URL         = process.env.REACT_APP_RPC_URL ?? "https://api.devnet.solana.com";

if (!PROGRAM_ID_STR) throw new Error("REACT_APP_PROGRAM_ID not set in .env");

// Anchor v0.26+ reads idl.metadata.address as a plain base58 string inside
// new Program(IDL, provider). Injecting it here avoids the _bn crash that
// happens when a PublicKey is constructed before Buffer polyfills are ready.
const IDL = {
  ...IDL_RAW,
  address: PROGRAM_ID_STR,
} as any;

// ─── Constants ────────────────────────────────────────────────────────────────
const PROGRAM_ID = new PublicKey(PROGRAM_ID_STR);

// ─── PDA helpers ─────────────────────────────────────────────────────────────
export function workerPDA(authority: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("worker"), authority.toBuffer()],
    PROGRAM_ID
  );
}
console.log(IDL.accounts);

export function orgPDA(authority: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("org"), authority.toBuffer()],
    PROGRAM_ID
  );
}

export function escrowPDA(authority: PublicKey, taskRef: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), authority.toBuffer(), Buffer.from(taskRef)],
    PROGRAM_ID
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface WorkerAccount {
  authority: PublicKey;
  name: string;
  reputation: number;
  tasksCompleted: number;
  tasksAttempted: number;
  bump: number;
}

export interface OrgAccount {
  authority: PublicKey;
  name: string;
  reputation: number;
  tasksPosted: number;
  tasksCompleted: number;
  bump: number;
}

export interface EscrowTaskAccount {
  org: PublicKey;
  reward: BN;
  maxSubmissions: number;
  submissionsCount: number;
  status: { open?: {} } | { underReview?: {} } | { closed?: {} };
  taskRef: string;
  bump: number;
  // derived — the escrow PDA address itself (for approve_release)
  pda: PublicKey;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAbyss() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [program, setProgram] = useState<Program | null>(null);
  const [workerAccount, setWorkerAccount] = useState<WorkerAccount | null>(null);
  const [orgAccount, setOrgAccount]       = useState<OrgAccount | null>(null);
  const [myEscrows, setMyEscrows]         = useState<EscrowTaskAccount[]>([]);
  const [loading, setLoading]             = useState(false);
  const [txSig, setTxSig]                 = useState<string | null>(null);
  const [error, setError]                 = useState<string | null>(null);

  // ── Build provider + program whenever wallet connects ──
  // We wrap in setTimeout(0) so this runs AFTER the current render cycle,
  // guaranteeing webpack Buffer/crypto polyfills are fully initialized before
  // Anchor's translateAddress calls new PublicKey() internally.
  useEffect(() => {
    if (!wallet.publicKey || !wallet.signTransaction) { setProgram(null); return; }
    let cancelled = false;
    const t = setTimeout(() => {
      if (cancelled) return;
      try {
        const provider = new AnchorProvider(
          connection,
          wallet as any,
          { commitment: "confirmed" }
        );
        console.log("PROGRAM_ID_STR =", PROGRAM_ID_STR);
        console.log("IDL_RAW =", IDL_RAW);
        console.log("IDL =", IDL);
        console.log("IDL metadata =", IDL.metadata);
        console.log("IDL address =", IDL.metadata?.address);
        // @ts-ignore — IDL type cast
        const prog = new Program(
          IDL as any,
          PROGRAM_ID,
          provider
        );
        setProgram(prog);
      } catch (e) {
        console.error("[ABYSS] Program init failed:", e);
      }
    }, 0);
    return () => { cancelled = true; clearTimeout(t); };
  }, [connection, wallet.publicKey, wallet.signTransaction]);

  // ── Refresh accounts whenever program changes ──
  useEffect(() => {
    if (!program || !wallet.publicKey) return;
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Refresh helpers
  // ─────────────────────────────────────────────────────────────────────────────
  const refreshAll = useCallback(async () => {
    if (!program || !wallet.publicKey) return;
    await Promise.all([fetchWorker(), fetchOrg(), fetchMyEscrows()]);
  }, [program, wallet.publicKey]);

  const fetchWorker = useCallback(async () => {
    if (!program || !wallet.publicKey) return;
    try {
      const [pda] = workerPDA(wallet.publicKey);
      const acc = await (program.account as any).worker.fetch(pda);
      setWorkerAccount(acc as WorkerAccount);
    } catch {
      setWorkerAccount(null); // account doesn't exist yet
    }
  }, [program, wallet.publicKey]);

  const fetchOrg = useCallback(async () => {
    if (!program || !wallet.publicKey) return;
    try {
      const [pda] = orgPDA(wallet.publicKey);
      const acc = await (program.account as any).organisation.fetch(pda);
      setOrgAccount(acc as OrgAccount);
    } catch {
      setOrgAccount(null);
    }
  }, [program, wallet.publicKey]);

  // Fetch all EscrowTask accounts owned by current wallet (as org)
  const fetchMyEscrows = useCallback(async () => {
    if (!program || !wallet.publicKey) return;
    try {
      const allEscrows = await (program.account as any).escrowTask.all([
        {
          memcmp: {
            offset: 8, // after discriminator
            bytes: wallet.publicKey.toBase58(),
          },
        },
      ]);
      const mapped: EscrowTaskAccount[] = allEscrows.map((e: any) => ({
        ...e.account,
        pda: e.publicKey,
      }));
      setMyEscrows(mapped);
    } catch {
      setMyEscrows([]);
    }
  }, [program, wallet.publicKey]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Instructions
  // ─────────────────────────────────────────────────────────────────────────────

  // register_worker — idempotent: skips if account already exists
  const registerWorker = useCallback(async (name: string): Promise<string | null> => {
    if (!program || !wallet.publicKey) return null;
    if (workerAccount) return "already_registered";
    setLoading(true); setError(null);
    try {
      const [workerPda] = workerPDA(wallet.publicKey);
      const sig = await (program.methods as any)
        .registerWorker(name)
        .accounts({
          worker: workerPda,
          signer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      setTxSig(sig);
      await fetchWorker();
      return sig;
    } catch (e: any) {
      const msg = e?.message ?? "registerWorker failed";
      setError(msg);
      console.error("[ABYSS] registerWorker:", e);
      return null;
    } finally { setLoading(false); }
  }, [program, wallet.publicKey, workerAccount, fetchWorker]);

  // register_org
  const registerOrg = useCallback(async (name: string): Promise<string | null> => {
    if (!program || !wallet.publicKey) return null;
    if (orgAccount) return "already_registered";
    setLoading(true); setError(null);
    try {
      const [opda] = orgPDA(wallet.publicKey);
      const sig = await (program.methods as any)
        .registerOrg(name)
        .accounts({
          org: opda,
          signer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      setTxSig(sig);
      await fetchOrg();
      return sig;
    } catch (e: any) {
      setError(e?.message ?? "registerOrg failed");
      console.error("[ABYSS] registerOrg:", e);
      return null;
    } finally { setLoading(false); }
  }, [program, wallet.publicKey, orgAccount, fetchOrg]);

  // post_task — locks SOL in escrow PDA
  const postTask = useCallback(async (
    taskRef: string,           // short unique ID e.g. "task_abc123"
    rewardSol: number,         // e.g. 0.05
    maxSubmissions: number,    // 5–10
  ): Promise<string | null> => {
    if (!program || !wallet.publicKey) return null;
    if (!orgAccount) { setError("Register as org first"); return null; }
    setLoading(true); setError(null);
    try {
      const [opda]    = orgPDA(wallet.publicKey);
      const [escrow]  = escrowPDA(wallet.publicKey, taskRef);
      const lamports  = new BN(Math.round(rewardSol * LAMPORTS_PER_SOL));

      const sig = await (program.methods as any)
        .postTask(taskRef, lamports, maxSubmissions)
        .accounts({
          escrow,
          org:           opda,
          signer:        wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      setTxSig(sig);
      await fetchMyEscrows();
      return sig;
    } catch (e: any) {
      setError(e?.message ?? "postTask failed");
      console.error("[ABYSS] postTask:", e);
      return null;
    } finally { setLoading(false); }
  }, [program, wallet.publicKey, orgAccount, fetchMyEscrows]);

  // approve_release — org calls this to pay a worker
  // workerAuthority = the worker's wallet address (from submission metadata)
  const approveRelease = useCallback(async (
    taskRef: string,
    workerAuthority: PublicKey,   // the worker's wallet pubkey
    orgAuthority: PublicKey,      // whoever posted the task
  ): Promise<string | null> => {
    if (!program || !wallet.publicKey) return null;
    setLoading(true); setError(null);
    try {
      const [opda]       = orgPDA(orgAuthority);
      const [wPda]       = workerPDA(workerAuthority);
      const [escrow]     = escrowPDA(orgAuthority, taskRef);

      const sig = await (program.methods as any)
        .approveRelease()
        .accounts({
          escrow,
          org:          opda,
          worker:       wPda,
          workerWallet: workerAuthority,
          signer:       wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      setTxSig(sig);
      await refreshAll();
      return sig;
    } catch (e: any) {
      setError(e?.message ?? "approveRelease failed");
      console.error("[ABYSS] approveRelease:", e);
      return null;
    } finally { setLoading(false); }
  }, [program, wallet.publicKey, refreshAll]);

  // ── Utility: SOL balance ──
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const fetchBalance = useCallback(async () => {
    if (!wallet.publicKey) return;
    const bal = await connection.getBalance(wallet.publicKey);
    setSolBalance(bal / LAMPORTS_PER_SOL);
  }, [connection, wallet.publicKey]);

  useEffect(() => { fetchBalance(); }, [fetchBalance]);

  return {
    // state
    program,
    workerAccount,
    orgAccount,
    myEscrows,
    solBalance,
    loading,
    txSig,
    error,
    // actions
    registerWorker,
    registerOrg,
    postTask,
    approveRelease,
    refreshAll,
    fetchBalance,
    // PDA helpers (re-exported so pages don't import separately)
    workerPDA,
    orgPDA,
    escrowPDA,
    PROGRAM_ID,
    RPC_URL,
  };
}