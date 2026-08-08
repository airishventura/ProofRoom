/**
 * API base URL.
 * - unset / "off" → local mock (no API)
 * - "same" / "" → same-origin `/api` (Vite proxy or nginx)
 * - "http://..." → absolute API URL
 */
const rawEnv = import.meta.env.VITE_API_URL as string | undefined;
const raw = rawEnv === undefined ? undefined : String(rawEnv).trim();

function resolveApiBase(): string {
  if (raw === undefined || raw === 'off' || raw === 'false') return '';
  if (raw === '' || raw === 'same' || raw === '/') return '';
  return raw.replace(/\/$/, '');
}

const API_URL = resolveApiBase();
const API_MODE =
  raw !== undefined && raw !== 'off' && raw !== 'false';

const TOKEN_KEY = 'pr.jwt';

export function getApiBase() {
  return API_URL;
}

export function isApiMode() {
  return API_MODE;
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('pr.user');
    }
  } catch {
    /* */
  }
}

export async function apiHealth(): Promise<{
  ok: boolean;
  llm?: boolean;
  model?: string;
  provider?: string;
  db?: boolean;
  error?: string;
} | null> {
  if (!API_MODE) return null;
  const url = `${API_URL}/api/health`;
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) return { ok: false, error: `HTTP ${r.status}` };
    return r.json();
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'fetch failed',
    };
  }
}

export async function apiFetch<T = unknown>(path: string, opts: RequestInit = {}): Promise<T> {
  if (!API_MODE) throw new Error('API not configured');
  const headers = new Headers(opts.headers || {});
  if (!headers.has('Content-Type') && opts.body) headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`${API_URL}${path}`, { ...opts, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function apiLogin(email: string, password: string) {
  const data = await apiFetch<{
    token: string;
    user: { sub: string; email: string; name: string; role: string };
  }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  setToken(data.token);
  try {
    localStorage.setItem('pr.user', JSON.stringify(data.user));
  } catch {
    /* */
  }
  return data;
}

/** SSE chat stream */
export async function streamChat(
  roomId: string,
  message: string,
  onDelta: (text: string) => void
): Promise<{ receipt?: string; model?: string; citations?: string[] }> {
  if (!API_MODE) throw new Error('API not configured');
  const token = getToken();
  const res = await fetch(`${API_URL}/api/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ roomId, message }),
  });
  if (!res.ok || !res.body) throw new Error(`Chat stream failed: ${res.status}`);

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let doneMeta: { receipt?: string; model?: string; citations?: string[] } = {};

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const parts = buf.split('\n\n');
    buf = parts.pop() || '';
    for (const part of parts) {
      const line = part.split('\n').find(l => l.startsWith('data: '));
      if (!line) continue;
      try {
        const msg = JSON.parse(line.slice(6)) as {
          type: string;
          text?: string;
          receipt?: string;
          model?: string;
          citations?: string[];
          error?: string;
        };
        if (msg.type === 'delta' && msg.text) onDelta(msg.text);
        if (msg.type === 'done')
          doneMeta = { receipt: msg.receipt, model: msg.model, citations: msg.citations };
        if (msg.type === 'error') throw new Error(msg.error || 'stream error');
      } catch (e) {
        if (e instanceof Error && e.message !== 'stream error' && !e.message.includes('JSON')) continue;
        throw e;
      }
    }
  }
  return doneMeta;
}
