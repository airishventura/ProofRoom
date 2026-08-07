/* ------------------------------------------------------------------ */
/*  Domain services — unified Store + room-scoped data                 */
/* ------------------------------------------------------------------ */

import { Store } from './store';
import { evidenceHash } from '../utils/hash';
import { priceSealedRun } from '../utils/pricing';
import { ChunkService } from './chunks';
import { synthesizeTaskOutput } from './task-output';
import { PublishService } from './publish';
import { RevenueService } from './revenue';

export interface DocumentRecord {
  id: string;
  roomId: string;
  name: string;
  type: string;
  size: string;
  verified: boolean;
  chunks: number;
  timestamp: string;
  endpoint: 'private' | 'shared';
  sourceText?: string;
}

export interface AIRunRecord {
  id: string;
  roomId: string;
  title: string;
  model: string;
  status: 'pending' | 'running' | 'verified' | 'rejected';
  cost: string;
  receipt: string;
  tokens: number;
  chunks: number;
  meta: string;
  output?: string;
  evidence: { modelPath: string; receiptId: string; cost: string; timestamp: string; hash: string };
}

export interface RoomRecord {
  id: string;
  name: string;
  endpoint: 'private' | 'shared';
  docs: number;
  runs: number;
  spend: string;
  description: string;
  authToken?: string;
}

export interface ChatMessage {
  role: 'agent' | 'user';
  text: string;
  verified?: boolean;
  receipt?: string;
  timestamp?: string;
  roomId?: string;
}

const genId = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

function withRoomId<T extends { roomId?: string }>(items: T[], roomId?: string): T[] {
  if (!roomId) return items;
  return items.filter(i => !i.roomId || i.roomId === roomId);
}

function sealRun(run: AIRunRecord): AIRunRecord {
  const hash = evidenceHash({
    id: run.id,
    roomId: run.roomId,
    title: run.title,
    model: run.model,
    status: run.status,
    receipt: run.receipt,
    tokens: run.tokens,
    chunks: run.chunks,
    output: (run.output || '').slice(0, 500),
    modelPath: run.evidence.modelPath,
    receiptId: run.evidence.receiptId,
    cost: run.evidence.cost,
    timestamp: run.evidence.timestamp,
  });
  return { ...run, evidence: { ...run.evidence, hash } };
}

function buildOutput(title: string, roomId: string): string {
  const docs = DocumentService.getAll(roomId);
  ChunkService.ensureFromDocs(docs.filter(d => d.verified));
  const chunks = ChunkService.getAll(roomId).filter(c =>
    docs.some(d => d.id === c.documentId && d.verified)
  );
  return synthesizeTaskOutput(title, docs, chunks);
}

/* ---- Room Service ---- */
export const RoomService = {
  getAll: (): RoomRecord[] => {
    const saved = Store.getAll<RoomRecord>('rooms');
    if (saved.length) return saved;
    const defaults: RoomRecord[] = [
      { id: 'r1', name: 'Acme Corp — Q3 Deal Review', endpoint: 'private', docs: 0, runs: 0, spend: '$0.00', description: 'Private endpoint for due diligence.', authToken: 'prv_4821' },
      { id: 'r2', name: 'Market Landscape — Energy', endpoint: 'shared', docs: 0, runs: 0, spend: '$0.00', description: 'Shared endpoint for team collaboration.', authToken: undefined },
      { id: 'r3', name: 'Proposal — Westbridge', endpoint: 'private', docs: 0, runs: 0, spend: '$45.00', description: 'Client proposal workspace.', authToken: 'prv_3902' },
    ];
    Store.setAll('rooms', defaults);
    return defaults;
  },
  getById: (id: string): RoomRecord | null => RoomService.getAll().find(r => r.id === id) || null,
  saveAll: (rooms: RoomRecord[]) => Store.setAll('rooms', rooms),
  update: (id: string, updates: Partial<RoomRecord>) => {
    const all = RoomService.getAll();
    const updated = all.map(r => (r.id === id ? { ...r, ...updates } : r));
    Store.setAll('rooms', updated);
    return updated.find(r => r.id === id) || null;
  },
  /** Recompute docs / runs / spend from live collections (no seed side-effects). */
  syncStats: (roomId?: string): RoomRecord[] => {
    const allDocs = Store.getAll<DocumentRecord>('documents');
    const allRuns = Store.getAll<AIRunRecord>('runs');
    const rooms = RoomService.getAll().map(r => {
      if (roomId && r.id !== roomId) return r;
      const docs = allDocs.filter(d => (d.roomId || 'r1') === r.id);
      const runs = allRuns.filter(x => (x.roomId || 'r1') === r.id);
      const spend = RevenueService.getTotal(r.id);
      return {
        ...r,
        docs: docs.length,
        runs: runs.length,
        spend: `$${spend.toFixed(2)}`,
      };
    });
    Store.setAll('rooms', rooms);
    return rooms;
  },
};

/* ---- Document Service ---- */
export const DocumentService = {
  getAll: (roomId?: string): DocumentRecord[] => {
    let saved = Store.getAll<DocumentRecord>('documents');
    if (saved.some(d => !d.roomId)) {
      saved = saved.map(d => ({ ...d, roomId: d.roomId || 'r1' }));
      Store.setAll('documents', saved);
    }
    if (!saved.length) {
      const defaults: DocumentRecord[] = [
        { id: 'd1', roomId: 'r1', name: 'Q3_Due_Diligence.md', type: 'MD', size: '12 KB', verified: true, chunks: 2, timestamp: '14:32', endpoint: 'private', sourceText: 'Revenue trajectory stable at +12% YoY. EBITDA margin expanded to 28%. Key driver: enterprise contract renewals. Working capital cycle improved by 4 days. Guidance reaffirmed for full-year ARR growth of 15-18%.' },
        { id: 'd2', roomId: 'r1', name: 'Financial_Model_Notes.md', type: 'MD', size: '8 KB', verified: true, chunks: 1, timestamp: '14:30', endpoint: 'private', sourceText: 'Margin compression of 140bps driven by supply chain costs. Revenue trajectory remains within forecast range. Sensitivity case: -5% volume still cash-flow positive through Q4.' },
        { id: 'd3', roomId: 'r1', name: 'Call_Transcript_Notes.md', type: 'MD', size: '42 KB', verified: false, chunks: 1, timestamp: '14:05', endpoint: 'private', sourceText: 'Discussed litigation risk in jurisdiction B. Legal opinion rates adverse outcome probability at 15%. Counsel recommends reserve language in SPA schedule 4.2.' },
        { id: 'd4', roomId: 'r1', name: 'Board_Notes.md', type: 'MD', size: '6 KB', verified: true, chunks: 1, timestamp: '13:58', endpoint: 'private', sourceText: 'Board approved Q3 strategy. No reserve adjustment required. Compliance audit scheduled for Q4. CFO authorized memo drafting for LP update.' },
        { id: 'd5', roomId: 'r2', name: 'Energy_Market_Notes.md', type: 'MD', size: '9 KB', verified: true, chunks: 2, timestamp: '10:00', endpoint: 'shared', sourceText: 'Grid capacity constraints in ERCOT. Capex cycle favors storage + peaker hybrids through 2028. Merchant price volatility remains elevated on summer peaks. Interconnection queue backlog ~5 years in key nodes.' },
        { id: 'd6', roomId: 'r3', name: 'Westbridge_Proposal_Draft.md', type: 'MD', size: '5 KB', verified: true, chunks: 1, timestamp: '09:00', endpoint: 'private', sourceText: 'Westbridge engagement scoped for 6-week diligence. Fee structure: retainer + success. Deliverables: red-flag memo, data room index, IC deck appendix.' },
      ];
      Store.setAll('documents', defaults);
      for (const d of defaults) {
        if (d.sourceText) ChunkService.saveForDocument(d.id, d.roomId, d.sourceText);
      }
      saved = defaults;
    }
    return withRoomId(saved, roomId);
  },

  getRaw: (): DocumentRecord[] => Store.getAll<DocumentRecord>('documents'),

  verify: (id: string, roomId?: string) => {
    const all = DocumentService.getRaw().map(d => ({ ...d, roomId: d.roomId || 'r1' }));
    const updated = all.map(d => (d.id === id ? { ...d, verified: true, timestamp: new Date().toISOString() } : d));
    Store.setAll('documents', updated);
    const found = updated.find(d => d.id === id) || null;
    if (roomId && found && found.roomId !== roomId) return null;
    RoomService.syncStats(found?.roomId);
    return found;
  },

  unverify: (id: string) => {
    const all = DocumentService.getRaw().map(d => ({ ...d, roomId: d.roomId || 'r1' }));
    const updated = all.map(d => (d.id === id ? { ...d, verified: false, timestamp: new Date().toISOString() } : d));
    Store.setAll('documents', updated);
    const found = updated.find(d => d.id === id);
    if (found) RoomService.syncStats(found.roomId);
  },

  add: (doc: DocumentRecord) => {
    const all = DocumentService.getRaw();
    if (!all.length) DocumentService.getAll(doc.roomId);
    const base = DocumentService.getRaw();
    Store.setAll('documents', [...base, { ...doc, roomId: doc.roomId || 'r1' }]);
    RoomService.syncStats(doc.roomId || 'r1');
    return doc;
  },

  uploadSimulated: (roomId: string, name: string, type: string, size: string) => {
    const newDoc: DocumentRecord = {
      id: genId('doc'),
      roomId,
      name,
      type,
      size,
      verified: false,
      chunks: Math.floor(Math.random() * 20) + 3,
      timestamp: new Date().toISOString(),
      endpoint: 'private',
      sourceText: 'New document uploaded. Awaiting verification and chunk extraction.',
    };
    DocumentService.add(newDoc);
    return newDoc;
  },

  removeByRoom: (roomId: string) => {
    Store.setAll(
      'documents',
      DocumentService.getRaw().filter(d => d.roomId !== roomId)
    );
  },
};

/* ---- AI Run Service ---- */
export const RunService = {
  getAll: (roomId?: string): AIRunRecord[] => {
    let saved = Store.getAll<AIRunRecord>('runs');
    if (saved.some(r => !r.roomId)) {
      saved = saved.map(r => ({ ...r, roomId: r.roomId || 'r1' }));
      Store.setAll('runs', saved);
    }
    if (!saved.length) {
      const defaults: AIRunRecord[] = [
        sealRun({
          id: 'run1', roomId: 'r1', title: 'Executive Summary', model: 'ProofEngine v2', status: 'verified',
          cost: '$28.40', receipt: '#REC-4821', tokens: 2847, chunks: 12, meta: '4 docs · 3 sections · 2847 tokens',
          output: buildOutput('Summarization', 'r1'),
          evidence: { modelPath: 'models/proof-v2/exec-summary', receiptId: '#REC-4821', cost: '$28.40', timestamp: '2026-01-01T14:32:01Z', hash: '' },
        }),
        sealRun({
          id: 'run2', roomId: 'r1', title: 'Red-Flag Detection', model: 'ProofEngine v2', status: 'verified',
          cost: '$45.20', receipt: '#REC-4822', tokens: 3124, chunks: 18, meta: 'Contracts · clauses · 3124 tokens',
          output: buildOutput('Red-Flag Detection', 'r1'),
          evidence: { modelPath: 'models/proof-v2/redflag-v1', receiptId: '#REC-4822', cost: '$45.20', timestamp: '2026-01-01T14:30:45Z', hash: '' },
        }),
        sealRun({
          id: 'run3', roomId: 'r1', title: 'Client Memo Draft', model: 'ProofEngine v2', status: 'pending',
          cost: '—', receipt: '—', tokens: 0, chunks: 0, meta: 'Awaiting approval gate',
          evidence: { modelPath: '—', receiptId: '—', cost: '—', timestamp: '—', hash: '' },
        }),
        sealRun({
          id: 'run_r2_1', roomId: 'r2', title: 'Market Brief', model: 'ProofEngine v2', status: 'verified',
          cost: '$18.00', receipt: '#REC-9001', tokens: 1400, chunks: 8, meta: 'Energy landscape',
          output: buildOutput('Summarization', 'r2'),
          evidence: { modelPath: 'models/proof-v2/market', receiptId: '#REC-9001', cost: '$18.00', timestamp: '2026-02-01T10:00:00Z', hash: '' },
        }),
      ];
      Store.setAll('runs', defaults);
      saved = defaults;
      RoomService.syncStats();
    }
    return withRoomId(saved, roomId);
  },

  getRaw: (): AIRunRecord[] => Store.getAll<AIRunRecord>('runs'),

  create: (title: string, opts?: { gated?: boolean; modelPath?: string; roomId?: string }): AIRunRecord => {
    const roomId = opts?.roomId || 'r1';
    const runs = RunService.getRaw().length ? RunService.getRaw() : (RunService.getAll(roomId), RunService.getRaw());
    const gated = !!opts?.gated;
    const receiptNum = Math.floor(Math.random() * 9000 + 1000);
    const receipt = gated ? '—' : '#REC-' + receiptNum;
    const ts = new Date().toISOString();
    const modelPath = opts?.modelPath || `models/proof-v2/${title.toLowerCase().replace(/\s+/g, '-')}`;
    const chunks = DocumentService.getAll(roomId).filter(d => d.verified).reduce((n, d) => n + d.chunks, 0);
    const run = sealRun({
      id: genId('run'),
      roomId,
      title,
      model: 'ProofEngine v2',
      status: gated ? 'pending' : 'running',
      cost: gated ? '—' : '…',
      receipt,
      tokens: 0,
      chunks,
      meta: gated ? 'Awaiting approval gate' : 'Processing…',
      evidence: {
        modelPath,
        receiptId: receipt,
        cost: gated ? '—' : '…',
        timestamp: ts,
        hash: '',
      },
    });
    Store.setAll('runs', [...runs, run]);
    RoomService.syncStats(roomId);
    return run;
  },

  trigger: (runId: string, onDone?: (run: AIRunRecord) => void) => {
    const updated = RunService.getRaw().map(r => {
      if (r.id !== runId || r.status === 'verified') return r;
      return { ...r, status: 'running' as const, meta: 'Processing… please wait', evidence: { ...r.evidence, timestamp: new Date().toISOString() } };
    });
    Store.setAll('runs', updated);
    setTimeout(() => {
      const completed = RunService.getRaw().map(r => {
        if (r.id !== runId || r.status === 'verified') return r;
        const receiptNum = Math.floor(Math.random() * 9000 + 1000);
        const output = buildOutput(r.title, r.roomId);
        const priced = priceSealedRun({ outputText: output, chunkCount: r.chunks });
        const receipt = '#REC-' + receiptNum;
        const ts = new Date().toISOString();
        RevenueService.recordUsage(
          r.roomId,
          priced.amountUsd,
          `AI run: ${r.title} (${priced.tokens} tok)`
        );
        return sealRun({
          ...r,
          status: 'verified',
          cost: priced.cost,
          receipt,
          tokens: priced.tokens,
          output,
          meta: `${r.chunks} chunks · ${priced.tokens} tokens · ${priced.cost}`,
          evidence: {
            modelPath: r.evidence.modelPath === '—' ? `models/proof-v2/${r.title.toLowerCase().replace(/\s+/g, '-')}` : r.evidence.modelPath,
            receiptId: receipt,
            cost: priced.cost,
            timestamp: ts,
            hash: '',
          },
        });
      });
      Store.setAll('runs', completed);
      const finished = completed.find(r => r.id === runId && r.status === 'verified') || null;
      if (finished) {
        RoomService.syncStats(finished.roomId);
        onDone?.(finished);
      }
    }, 1500);
  },

  approve: (runId: string) => {
    const updated = RunService.getRaw().map(r => {
      if (r.id !== runId || r.status === 'verified') return r;
      const receiptNum = Math.floor(Math.random() * 9000 + 1000);
      const output = buildOutput(r.title === 'Client Memo Draft' ? 'Memo Drafting' : r.title, r.roomId);
      const priced = priceSealedRun({ outputText: output, chunkCount: r.chunks });
      const receipt = '#REC-' + receiptNum;
      const ts = new Date().toISOString();
      RevenueService.recordUsage(
        r.roomId,
        priced.amountUsd,
        `Approved run: ${r.title} (${priced.tokens} tok)`
      );
      return sealRun({
        ...r,
        status: 'verified',
        cost: priced.cost,
        receipt,
        tokens: priced.tokens,
        output,
        meta: `Completed · approved · ${priced.tokens} tok · ${priced.cost}`,
        evidence: {
          modelPath: r.evidence.modelPath === '—' ? `models/proof-v2/${r.title.toLowerCase().replace(/\s+/g, '-')}` : r.evidence.modelPath,
          receiptId: receipt,
          cost: priced.cost,
          timestamp: ts,
          hash: '',
        },
      });
    });
    Store.setAll('runs', updated);
    const approved = updated.find(r => r.id === runId) || null;
    if (approved) RoomService.syncStats(approved.roomId);
    return approved;
  },

  reject: (runId: string) => {
    const updated = RunService.getRaw().map(r =>
      r.id === runId && r.status !== 'verified'
        ? sealRun({
            ...r,
            status: 'rejected',
            meta: 'Rejected at approval gate',
            evidence: { ...r.evidence, timestamp: new Date().toISOString(), hash: '' },
          })
        : r
    );
    Store.setAll('runs', updated);
    const found = updated.find(r => r.id === runId) || null;
    if (found) RoomService.syncStats(found.roomId);
    return found;
  },

  getPending: (roomId?: string): AIRunRecord[] =>
    RunService.getAll(roomId).filter(r => r.status === 'pending'),

  removeByRoom: (roomId: string) => {
    Store.setAll('runs', RunService.getRaw().filter(r => r.roomId !== roomId));
  },
};

/* ---- Chat Service ---- */
export const ChatService = {
  getAll: (roomId?: string): ChatMessage[] => {
    let saved = Store.getAll<ChatMessage>('chat');
    if (!saved.length) {
      const defaults: ChatMessage[] = [
        { role: 'agent', text: 'Verified documents across private endpoint. Audit chain ready.', verified: true, receipt: '#REC-4821', timestamp: new Date().toISOString(), roomId: 'r1' },
      ];
      Store.setAll('chat', defaults);
      saved = defaults;
    }
    return withRoomId(saved, roomId);
  },
  add: (msg: ChatMessage) => {
    const current = Store.getAll<ChatMessage>('chat');
    if (!current.length) ChatService.getAll(msg.roomId);
    Store.setAll('chat', [...Store.getAll<ChatMessage>('chat'), { ...msg, roomId: msg.roomId || 'r1' }]);
  },
  clear: (roomId = 'r1') => {
    const others = Store.getAll<ChatMessage>('chat').filter(m => m.roomId && m.roomId !== roomId);
    Store.setAll('chat', [
      ...others,
      { role: 'agent', text: 'New workspace initialized.', verified: true, receipt: '#INIT', roomId, timestamp: new Date().toISOString() },
    ]);
  },
  removeByRoom: (roomId: string) => {
    Store.setAll('chat', Store.getAll<ChatMessage>('chat').filter(m => m.roomId !== roomId));
  },
};

/* ---- Auth helpers (full AuthService in auth.ts) ---- */
export const AuthService = {
  isPrivateEndpointOpen: (token?: string): boolean => !!token && token.startsWith('prv_'),
  getTokenForRoom: (roomId: string): string | undefined => RoomService.getById(roomId)?.authToken,
};

/* ---- Reset room data ---- */
export function resetRoom(roomId: string) {
  DocumentService.removeByRoom(roomId);
  RunService.removeByRoom(roomId);
  ChatService.removeByRoom(roomId);
  ChunkService.removeByRoom(roomId);

  const audit = Store.getAll<{ roomId: string }>('audit').filter(a => a.roomId !== roomId);
  Store.setAll('audit', audit);

  const revenue = Store.getAll<{ roomId: string }>('revenue').filter(r => r.roomId !== roomId);
  Store.setAll('revenue', revenue);

  const pipes = Store.getMap('pipelines');
  delete pipes[roomId];
  Store.setMap('pipelines', pipes);

  PublishService.revoke(roomId);
  RoomService.syncStats(roomId);
}
