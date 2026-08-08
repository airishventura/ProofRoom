/* ------------------------------------------------------------------ */
/*  Remote API — Postgres-backed ProofRoom when VITE_API_URL is set    */
/* ------------------------------------------------------------------ */

import { apiFetch, getApiBase, getToken, isApiMode } from './http';
import type { AIRunRecord, ChatMessage, DocumentRecord, RoomRecord } from './api';
import type { AuditEntry } from './audit';
import type { ReportRecord } from './publish';

const USER_KEY = 'pr.user';

export interface ApiUser {
  sub: string;
  email: string;
  name: string;
  role: string;
}

export function isRemoteReady(): boolean {
  return isApiMode() && !!getToken();
}

export function getStoredUser(): ApiUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as ApiUser) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: ApiUser | null) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    /* */
  }
}

function mapRun(r: Record<string, unknown>): AIRunRecord {
  // Supports both camelCase (list) and snake_case (create raw row)
  const roomId = (r.roomId as string) || (r.room_id as string) || 'r1';
  const evidence =
    (r.evidence as AIRunRecord['evidence']) ||
    ({
      modelPath: (r.model_path as string) || (r.modelPath as string) || '—',
      receiptId: (r.receipt as string) || '—',
      cost: (r.cost as string) || '—',
      timestamp: (r.updated_at as string) || (r.created_at as string) || new Date().toISOString(),
      hash: (r.evidence_hash as string) || (r.evidenceHash as string) || '',
    } as AIRunRecord['evidence']);

  return {
    id: r.id as string,
    roomId,
    title: r.title as string,
    model: (r.model as string) || 'ProofEngine v2',
    status: r.status as AIRunRecord['status'],
    cost: (r.cost as string) || '—',
    receipt: (r.receipt as string) || '—',
    tokens: Number(r.tokens || 0),
    chunks: Number(r.chunks || 0),
    meta: (r.meta as string) || '',
    output: (r.output as string) || undefined,
    evidence,
  };
}

export const Remote = {
  async me(): Promise<ApiUser> {
    const data = await apiFetch<{ user: ApiUser }>('/api/auth/me');
    setStoredUser(data.user);
    return data.user;
  },

  async rooms(): Promise<RoomRecord[]> {
    const data = await apiFetch<{ rooms: RoomRecord[] }>('/api/rooms');
    return data.rooms.map(r => ({
      ...r,
      spend: r.spend || '$0.00',
    }));
  },

  async resetRoomData(roomId: string): Promise<{
    ok: boolean;
    counts: Record<string, number>;
  }> {
    return apiFetch(`/api/rooms/${encodeURIComponent(roomId)}/data`, {
      method: 'DELETE',
    });
  },

  async documents(roomId: string): Promise<DocumentRecord[]> {
    const data = await apiFetch<{ documents: DocumentRecord[] }>(
      `/api/documents?roomId=${encodeURIComponent(roomId)}`
    );
    return data.documents.map(d => ({
      ...d,
      timestamp:
        typeof d.timestamp === 'string'
          ? d.timestamp
          : new Date(d.timestamp as unknown as string).toISOString(),
    }));
  },

  async ingest(
    roomId: string,
    name: string,
    text: string,
    endpoint: 'private' | 'shared' = 'private'
  ): Promise<{ documentId: string; chunksCreated: number; contentHash: string; receiptId: string }> {
    return apiFetch('/api/documents/ingest', {
      method: 'POST',
      body: JSON.stringify({ roomId, name, text, endpoint }),
    });
  },

  async verifyDocument(id: string): Promise<void> {
    await apiFetch(`/api/documents/${encodeURIComponent(id)}/verify`, { method: 'POST' });
  },

  async runs(roomId: string): Promise<AIRunRecord[]> {
    const data = await apiFetch<{ runs: AIRunRecord[] }>(
      `/api/runs?roomId=${encodeURIComponent(roomId)}`
    );
    return data.runs.map(r => mapRun(r as unknown as Record<string, unknown>));
  },

  async createRun(
    roomId: string,
    title: string,
    opts?: { gated?: boolean; modelPath?: string }
  ): Promise<AIRunRecord> {
    const data = await apiFetch<{ run: Record<string, unknown> }>('/api/runs', {
      method: 'POST',
      body: JSON.stringify({
        roomId,
        title,
        gated: opts?.gated,
        modelPath: opts?.modelPath,
      }),
    });
    return mapRun(data.run);
  },

  async approveRun(id: string): Promise<void> {
    await apiFetch(`/api/runs/${encodeURIComponent(id)}/approve`, { method: 'POST' });
  },

  async rejectRun(id: string): Promise<void> {
    await apiFetch(`/api/runs/${encodeURIComponent(id)}/reject`, { method: 'POST' });
  },

  async chatHistory(roomId: string): Promise<ChatMessage[]> {
    const data = await apiFetch<{ messages: ChatMessage[] }>(
      `/api/chat/history?roomId=${encodeURIComponent(roomId)}`
    );
    return data.messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'agent',
      text: m.text,
      verified: m.verified,
      receipt: m.receipt,
      timestamp:
        typeof m.timestamp === 'string'
          ? m.timestamp
          : new Date(m.timestamp as unknown as string).toISOString(),
      roomId: m.roomId || roomId,
    }));
  },

  async audit(roomId: string): Promise<AuditEntry[]> {
    const data = await apiFetch<{ entries: AuditEntry[] }>(
      `/api/audit?roomId=${encodeURIComponent(roomId)}`
    );
    return (data.entries || []).map(e => ({
      ...e,
      cost: e.cost || '$0.00',
      evidenceRefs: Array.isArray(e.evidenceRefs) ? e.evidenceRefs.map(String) : [],
      timestamp:
        typeof e.timestamp === 'string'
          ? e.timestamp
          : new Date(e.timestamp as unknown as string).toISOString(),
    }));
  },

  async revenue(roomId: string): Promise<{
    total: number;
    totalFormatted: string;
    byModel: { A: number; B: number; C: number; D: number };
    rates: Record<string, number>;
  }> {
    return apiFetch(`/api/revenue?roomId=${encodeURIComponent(roomId)}`);
  },

  async getPublished(roomId: string): Promise<ReportRecord | null> {
    const data = await apiFetch<{ published: boolean; record: ReportRecord | null }>(
      `/api/publish?roomId=${encodeURIComponent(roomId)}`
    );
    return data.record;
  },

  async publish(roomId: string): Promise<ReportRecord> {
    const data = await apiFetch<{ record: ReportRecord }>('/api/publish', {
      method: 'POST',
      body: JSON.stringify({ roomId }),
    });
    return data.record;
  },

  async revokePublish(roomId: string): Promise<void> {
    await apiFetch(`/api/publish/${encodeURIComponent(roomId)}`, { method: 'DELETE' });
  },

  /** Public microsite — no JWT. */
  async publicReport(roomId: string): Promise<{
    record: ReportRecord;
    snapshot: {
      name: string;
      endpoint: string;
      docs: DocumentRecord[];
      runs: AIRunRecord[];
    } | null;
  }> {
    if (!isApiMode()) throw new Error('API not configured');
    const base = getApiBase();
    const res = await fetch(`${base}/api/publish/public/${encodeURIComponent(roomId)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  /** Download server-side export (JSON or CSV) with JWT. */
  async downloadAuditExport(roomId: string, format: 'json' | 'csv'): Promise<void> {
    if (!isApiMode()) throw new Error('API not configured');
    const base = getApiBase(); // '' = same-origin
    const token = getToken();
    if (!token) throw new Error('Not signed in');
    const path =
      format === 'csv'
        ? `/api/audit/export.csv?roomId=${encodeURIComponent(roomId)}`
        : `/api/audit/export.json?roomId=${encodeURIComponent(roomId)}`;
    const res = await fetch(`${base}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error((err as { error?: string }).error || `Export failed (${res.status})`);
    }
    const blob = await res.blob();
    const cd = res.headers.get('Content-Disposition') || '';
    const match = /filename="([^"]+)"/.exec(cd);
    const filename = match?.[1] || `proofroom-audit-${roomId}.${format}`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
};
