/* ------------------------------------------------------------------ */
/*  Mock Backend Service — ProofRoom v1                                  */
/* ------------------------------------------------------------------ */

export interface DocumentRecord {
  id: string; name: string; type: string; size: string;
  verified: boolean; chunks: number; timestamp: string; endpoint: 'private' | 'shared';
  sourceText?: string;
}

export interface AIRunRecord {
  id: string; title: string; model: string; status: 'pending' | 'running' | 'verified' | 'rejected';
  cost: string; receipt: string; tokens: number; chunks: number; meta: string;
  evidence: { modelPath: string; receiptId: string; cost: string; timestamp: string; hash: string };
}

export interface RoomRecord {
  id: string; name: string; endpoint: 'private' | 'shared'; docs: number; runs: number; spend: string;
  description: string;
  authToken?: string;
}

export interface ChatMessage {
  role: 'agent' | 'user'; text: string; verified?: boolean; receipt?: string; timestamp?: string;
}

/* ---- Storage keys ---- */
const STORAGE_KEYS = {
  rooms: 'proofroom_rooms',
  docs: 'proofroom_docs',
  runs: 'proofroom_runs',
  chat: 'proofroom_chat',
  approvals: 'proofroom_approvals',
  published: 'proofroom_published',
};

/* ---- Helper: generate IDs ---- */
const genId = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

/* ---- Persistence ---- */
const load = <T>(key: string): T | null => {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
};
const save = (key: string, data: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(data)); }
  catch { /* silent fail */ }
};

/* ---- Room Service ---- */
export const RoomService = {
  getAll: (): RoomRecord[] => {
    const saved = load<RoomRecord[]>(STORAGE_KEYS.rooms);
    if (saved) return saved;
    const defaults: RoomRecord[] = [
      { id: 'r1', name: 'Acme Corp — Q3 Deal Review', endpoint: 'private', docs: 4, runs: 3, spend: '$73.60', description: 'Private endpoint for due diligence.', authToken: 'prv_4821' },
      { id: 'r2', name: 'Market Landscape — Energy', endpoint: 'shared', docs: 7, runs: 5, spend: '$312.50', description: 'Shared endpoint for team collaboration.', authToken: undefined },
      { id: 'r3', name: 'Proposal — Westbridge', endpoint: 'private', docs: 2, runs: 1, spend: '$45.00', description: 'Client proposal workspace.', authToken: 'prv_3902' },
    ];
    save(STORAGE_KEYS.rooms, defaults);
    return defaults;
  },
  getById: (id: string): RoomRecord | null => RoomService.getAll().find(r => r.id === id) || null,
  saveAll: (rooms: RoomRecord[]) => save(STORAGE_KEYS.rooms, rooms),
  update: (id: string, updates: Partial<RoomRecord>) => {
    const all = RoomService.getAll();
    const updated = all.map(r => r.id === id ? { ...r, ...updates } : r);
    save(STORAGE_KEYS.rooms, updated);
    return updated.find(r => r.id === id) || null;
  },
};

/* ---- Document Service ---- */
export const DocumentService = {
  getAll: (_roomId?: string): DocumentRecord[] => {
    const saved = load<DocumentRecord[]>(STORAGE_KEYS.docs);
    if (saved) return saved.filter(d => d.endpoint === 'private' ? true : true);
    const defaults: DocumentRecord[] = [
      { id: 'd1', name: 'Q3_Due_Diligence.pdf', type: 'PDF', size: '2.4 MB', verified: true, chunks: 28, timestamp: '14:32', endpoint: 'private', sourceText: 'Revenue trajectory stable at +12% YoY. EBITDA margin expanded to 28%. Key driver: enterprise contract renewals.' },
      { id: 'd2', name: 'Financial_Model_v3.xlsx', type: 'XLSX', size: '890 KB', verified: true, chunks: 12, timestamp: '14:30', endpoint: 'private', sourceText: 'Margin compression of 140bps driven by supply chain costs. Revenue trajectory remains within forecast range.' },
      { id: 'd3', name: 'Call_Transcript_Notes.md', type: 'MD', size: '42 KB', verified: false, chunks: 3, timestamp: '14:05', endpoint: 'private', sourceText: 'Discussed litigation risk in jurisdiction B. Legal opinion rates adverse outcome probability at 15%.' },
      { id: 'd4', name: 'Board_Deck_Final.pdf', type: 'PDF', size: '4.1 MB', verified: true, chunks: 36, timestamp: '13:58', endpoint: 'private', sourceText: 'Board approved Q3 strategy. No reserve adjustment required. Compliance audit scheduled for Q4.' },
    ];
    save(STORAGE_KEYS.docs, defaults);
    return defaults;
  },
  verify: (id: string) => {
    const docs = DocumentService.getAll('r1');
    const updated = docs.map(d => d.id === id ? { ...d, verified: true, timestamp: new Date().toISOString() } : d);
    save(STORAGE_KEYS.docs, updated);
    return updated.find(d => d.id === id) || null;
  },
  unverify: (id: string) => {
    const docs = DocumentService.getAll('r1');
    const updated = docs.map(d => d.id === id ? { ...d, verified: false, timestamp: new Date().toISOString() } : d);
    save(STORAGE_KEYS.docs, updated);
  },
  uploadSimulated: (roomId: string, name: string, type: string, size: string) => {
    const docs = DocumentService.getAll(roomId);
    const newDoc: DocumentRecord = {
      id: genId('doc'), name, type, size, verified: false, chunks: Math.floor(Math.random() * 20) + 3,
      timestamp: new Date().toISOString(), endpoint: 'private', sourceText: 'New document uploaded. Awaiting verification and chunk extraction.',
    };
    const updated = [...docs, newDoc];
    save(STORAGE_KEYS.docs, updated);
    return newDoc;
  },
};

/* ---- AI Run Service ---- */
export const RunService = {
  getAll: (): AIRunRecord[] => {
    const saved = load<AIRunRecord[]>(STORAGE_KEYS.runs);
    if (saved) return saved;
    const defaults: AIRunRecord[] = [
      { id: 'run1', title: 'Executive Summary', model: 'ProofEngine v2', status: 'verified', cost: '$28.40', receipt: '#REC-4821', tokens: 2847, chunks: 12, meta: '4 docs · 3 sections · 2847 tokens', evidence: { modelPath: 'models/proof-v2/exec-summary', receiptId: '#REC-4821', cost: '$28.40', timestamp: '2026-01-01T14:32:01Z', hash: 'a1b2c3d4e5f6789a' } },
      { id: 'run2', title: 'Red-Flag Detection', model: 'ProofEngine v2', status: 'verified', cost: '$45.20', receipt: '#REC-4822', tokens: 3124, chunks: 18, meta: 'Contracts · clauses · 3124 tokens', evidence: { modelPath: 'models/proof-v2/redflag-v1', receiptId: '#REC-4822', cost: '$45.20', timestamp: '2026-01-01T14:30:45Z', hash: 'b2c3d4e5f6789a1b' } },
      { id: 'run3', title: 'Client Memo Draft', model: 'ProofEngine v2', status: 'pending', cost: '—', receipt: '—', tokens: 0, chunks: 0, meta: 'Awaiting approval gate', evidence: { modelPath: '—', receiptId: '—', cost: '—', timestamp: '—', hash: '—' } },
    ];
    save(STORAGE_KEYS.runs, defaults);
    return defaults;
  },
  trigger: (runId: string) => {
    const runs = RunService.getAll();
    const updated = runs.map(r => {
      if (r.id !== runId) return r;
      if (r.status === 'verified') return r;
      return { ...r, status: 'running' as const, meta: 'Processing... please wait', evidence: { ...r.evidence, timestamp: new Date().toISOString() } };
    });
    save(STORAGE_KEYS.runs, updated);
    setTimeout(() => {
      const completed = updated.map(r => {
        if (r.id !== runId || r.status !== 'running') return r;
        const receiptNum = Math.floor(Math.random() * 9000 + 1000);
        return {
          ...r, status: 'verified' as const,
          cost: '$' + (Math.random() * 30 + 20).toFixed(2),
          receipt: '#REC-' + receiptNum,
          tokens: r.id === 'run3' ? 2150 : r.tokens,
          meta: r.meta.includes('Awaiting') ? r.meta.replace('Awaiting approval gate', 'Completed · approved') : r.meta,
          evidence: { ...r.evidence, receiptId: '#REC-' + receiptNum, cost: '$' + (Math.random() * 30 + 20).toFixed(2), timestamp: new Date().toISOString(), hash: Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10) },
        };
      });
      save(STORAGE_KEYS.runs, completed);
    }, 1500);
  },
  approve: (runId: string) => {
    const runs = RunService.getAll();
    const updated = runs.map(r => {
      if (r.id !== runId || r.status === 'verified') return r;
      const receiptNum = Math.floor(Math.random() * 9000 + 1000);
      return {
        ...r, status: 'verified' as const,
        cost: '$' + (Math.random() * 30 + 20).toFixed(2),
        receipt: '#REC-' + receiptNum,
        meta: r.meta.includes('Awaiting') ? r.meta.replace('Awaiting approval gate', 'Completed · approved') : r.meta,
        evidence: { ...r.evidence, receiptId: '#REC-' + receiptNum, cost: '$' + (Math.random() * 30 + 20).toFixed(2), timestamp: new Date().toISOString(), hash: Math.random().toString(36).substring(2, 12) },
      };
    });
    save(STORAGE_KEYS.runs, updated);
    return updated.find(r => r.id === runId) || null;
  },
};

/* ---- Chat Service ---- */
export const ChatService = {
  getAll: (): ChatMessage[] => {
    const saved = load<ChatMessage[]>(STORAGE_KEYS.chat);
    if (saved) return saved;
    const defaults: ChatMessage[] = [
      { role: 'agent', text: 'Verified 4 documents across private endpoint. 3 runs completed, 1 pending approval.', verified: true, receipt: '#REC-4821', timestamp: new Date().toISOString() },
    ];
    save(STORAGE_KEYS.chat, defaults);
    return defaults;
  },
  add: (msg: ChatMessage) => {
    const current = ChatService.getAll();
    const updated = [...current, msg];
    save(STORAGE_KEYS.chat, updated);
  },
  clear: () => save(STORAGE_KEYS.chat, [{ role: 'agent', text: 'New workspace initialized.', verified: true, receipt: '#INIT' }]),
};

/* ---- Publishing Service ---- */
export const PublishService = {
  isPublished: (roomId?: string): boolean => {
    const saved = load<{ roomId: string; url: string; hash: string; timestamp: string }>(STORAGE_KEYS.published);
    return saved ? saved.roomId === (roomId || 'r1') : false;
  },
  publish: (roomId: string) => {
    const record = { roomId, url: `https://proofroom.app/r/${roomId}`, hash: Math.random().toString(36).substring(2, 14), timestamp: new Date().toISOString() };
    save(STORAGE_KEYS.published, record);
    return record;
  },
  getRecord: () => load(STORAGE_KEYS.published) || null,
};

/* ---- Auth / Endpoint Isolation ---- */
export const AuthService = {
  isPrivateEndpointOpen: (token?: string): boolean => {
    if (!token) return false;
    return token.startsWith('prv_');
  },
  getTokenForRoom: (roomId: string): string | undefined => {
    return RoomService.getById(roomId)?.authToken;
  },
};
