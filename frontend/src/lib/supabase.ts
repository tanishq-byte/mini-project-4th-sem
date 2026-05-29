import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = process.env.REACT_APP_SUPABASE_URL!;
const SUPABASE_ANON = process.env.REACT_APP_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  throw new Error("Supabase env vars not set");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── Task helpers ──────────────────────────────────────────────────────────────
export interface DBTask {
  id:         string;
  title:      string;
  type:       "image_label" | "rlhf";
  reward:     string;
  difficulty: string;
  slots_max:  number;
  slots_used: number;
  deadline:   string;
  org_wallet: string;
  created_at: string;
}

export interface DBSubmission {
  id?:                   string;
  task_id:               string;
  worker_wallet:         string;
  worker_name?:          string;
  integrity_score:       number;
  liveness_score:        number;
  time_spent_seconds:    number;
  keystroke_count:       number;
  paste_count:           number;
  tab_switches:          number;
  status?:               string;
  tx_sig?:               string;
  submitted_at?:         string;
}

export async function fetchTasks(): Promise<DBTask[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) { console.error("[Supabase] fetchTasks:", error); return []; }
  return data ?? [];
}

export async function insertSubmission(sub: DBSubmission): Promise<string | null> {
  const { data, error } = await supabase
    .from("submissions")
    .insert(sub)
    .select("id")
    .single();
  if (error) { console.error("[Supabase] insertSubmission:", error); return null; }
  return data?.id ?? null;
}

export async function incrementSlot(taskId: string): Promise<void> {
  await supabase.rpc("increment_slot", { task_id: taskId });
}
export async function fetchSubmissions(taskId?: string): Promise<any[]> {
    let query = supabase
      .from("submissions")
      .select("*")
      .order("submitted_at", { ascending: false });
    if (taskId) query = (query as any).eq("task_id", taskId);
    const { data, error } = await query;
    if (error) { console.error("[Supabase] fetchSubmissions:", error); return []; }
    return data ?? [];
  }
  
  export async function updateSubmissionStatus(id: string, status: string, txSig?: string): Promise<void> {
    await supabase
      .from("submissions")
      .update({ status, tx_sig: txSig })
      .eq("id", id);
  }