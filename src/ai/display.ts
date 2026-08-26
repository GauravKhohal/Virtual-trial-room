// VITE_API_BASE must be set at deploy time (Vite env vars are baked in at
// build time, not read at runtime) — falls back to localhost for local dev.
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5500';

export type DisplayPhase = 'idle' | 'selfie' | 'loading' | 'result' | 'error';

export interface DisplayState {
  phase: DisplayPhase;
  selfieUrl?: string;
  resultUrl?: string;
  step?: string;
  error?: string;
  topName?: string;
  bottomName?: string;
  updatedAt: number;
}

// Best-effort — a tablet with no TV linked, or a flaky connection to the
// server, must never block or break the tablet's own try-on flow.
export async function pushDisplayState(room: string, state: Omit<DisplayState, 'updatedAt'>): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/display/${encodeURIComponent(room)}/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });
  } catch {
    // TV sync failing is silent — the tablet UI itself is unaffected
  }
}

export async function fetchDisplayState(room: string): Promise<DisplayState> {
  const res = await fetch(`${API_BASE}/api/display/${encodeURIComponent(room)}/state`);
  if (!res.ok) throw new Error('Could not reach the try-on server.');
  return res.json();
}
