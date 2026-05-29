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
  images:     string[];   // public URLs from Supabase Storage
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

// ── Image upload ──────────────────────────────────────────────────────────────
// Uploads an array of File objects into the "task-images" Storage bucket.
// Returns the public URL for each uploaded file.
// Each file is stored at: task-images/{taskRef}/{filename}
export async function uploadTaskImages(
  taskRef: string,
  files: File[]
): Promise<string[]> {
  const urls: string[] = [];

  for (const file of files) {
    // Sanitise filename: strip special chars, prefix with timestamp to avoid collisions
    const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const path = `${taskRef}/${safeName}`;

    const { error } = await supabase.storage
      .from("task-images")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (error) {
      console.error("[Supabase] uploadTaskImages:", error);
      throw new Error(`Failed to upload ${file.name}: ${error.message}`);
    }

    const { data } = supabase.storage.from("task-images").getPublicUrl(path);
    urls.push(data.publicUrl);
  }

  return urls;
}

// ── Insert a task row ─────────────────────────────────────────────────────────
// Call this AFTER the on-chain postTask so you can pass the on-chain task_ref.
export async function insertTask(task: {
  id:         string;   // task_ref from on-chain (makeTaskRef output)
  title:      string;
  type:       "image_label" | "rlhf";
  reward:     string;
  difficulty: string;
  slots_max:  number;
  org_wallet: string;
  images:     string[]; // public URLs returned by uploadTaskImages
}): Promise<string | null> {
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      id:         task.id,
      title:      task.title,
      type:       task.type,
      reward:     task.reward,
      difficulty: task.difficulty,
      slots_max:  task.slots_max,
      slots_used: 0,
      org_wallet: task.org_wallet,
      images:     task.images,
      deadline:   new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select("id")
    .single();

  if (error) { console.error("[Supabase] insertTask:", error); return null; }
  return data?.id ?? null;
}

export async function fetchTasks(): Promise<DBTask[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) { console.error("[Supabase] fetchTasks:", error); return []; }
  return data ?? [];
}

export async function fetchTaskById(id: string): Promise<DBTask | null> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .single();
  if (error) { console.error("[Supabase] fetchTaskById:", error); return null; }
  return data ?? null;
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