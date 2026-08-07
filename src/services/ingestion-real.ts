/* ------------------------------------------------------------------ */
/*  Real File Ingestion — text-safe uploads + content hash             */
/* ------------------------------------------------------------------ */

import { DocumentService, RoomService } from './api';
import { AuditService } from './audit';
import { OrchestrationService } from './orchestration';
import { ChunkService } from './chunks';
import { evidenceHash } from '../utils/hash';
import { isRemoteReady, Remote } from './remote';

export interface ChunkData {
  index: number;
  text: string;
  embedding: number[];
}

export interface IngestionResult {
  documentId: string;
  chunksCreated: number;
  totalTokens: number;
  verified: boolean;
  receiptId: string;
  contentHash: string;
  chunksData: ChunkData[];
}

const TEXT_EXT = new Set([
  'txt', 'md', 'markdown', 'csv', 'tsv', 'json', 'jsonl', 'xml', 'html', 'htm',
  'log', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'rtf', 'tex', 'tsv',
]);

const TEXT_MIME = [
  'text/',
  'application/json',
  'application/xml',
  'application/x-yaml',
  'application/yaml',
  'application/csv',
  'application/javascript',
];

export class IngestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IngestError';
  }
}

function extOf(name: string) {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

/** Reject binary / unsupported types before read. */
export function assertIngestable(file: File): void {
  if (!file || file.size === 0) throw new IngestError('Empty file.');
  if (file.size > 5 * 1024 * 1024) throw new IngestError('Max 5 MB for browser ingest.');

  const ext = extOf(file.name);
  const mime = (file.type || '').toLowerCase();

  const mimeOk = !mime || TEXT_MIME.some(p => mime.startsWith(p));
  const extOk = TEXT_EXT.has(ext);

  // known bad binaries
  if (['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'zip', 'docx', 'xlsx', 'pptx', 'doc', 'xls'].includes(ext)) {
    throw new IngestError(`Unsupported type .${ext}. Use text/markdown/csv/json (PDF not parsed in demo).`);
  }

  if (!extOk && !mimeOk) {
    throw new IngestError(`Unsupported type${ext ? ` .${ext}` : ''}${mime ? ` (${mime})` : ''}. Use .txt .md .csv .json.`);
  }
}

function looksBinary(text: string): boolean {
  if (!text) return true;
  const sample = text.slice(0, 2048);
  let bad = 0;
  for (let i = 0; i < sample.length; i++) {
    const c = sample.charCodeAt(i);
    if (c === 0) return true;
    if (c < 9 || (c > 13 && c < 32)) bad++;
  }
  return bad / sample.length > 0.05;
}

export const FileIngestionService = {
  assertIngestable,

  ingestFile: async (file: File, endpoint: 'private' | 'shared', roomId = 'r1'): Promise<IngestionResult> => {
    assertIngestable(file);
    const text = await file.text();
    if (looksBinary(text)) {
      throw new IngestError('File looks binary. Export as UTF-8 text first.');
    }

    // Postgres-backed path
    if (isRemoteReady()) {
      try {
        const res = await Remote.ingest(roomId, file.name, text, endpoint);
        return {
          documentId: res.documentId,
          chunksCreated: res.chunksCreated,
          totalTokens: Math.round(text.length / 4),
          verified: false,
          receiptId: res.receiptId,
          contentHash: res.contentHash,
          chunksData: [],
        };
      } catch (e) {
        throw new IngestError(e instanceof Error ? e.message : 'API ingest failed');
      }
    }

    const contentHash = evidenceHash({ name: file.name, size: file.size, text: text.slice(0, 4096) });
    const chunksCount = Math.max(1, Math.ceil(text.length / 600));
    const chunksData: ChunkData[] = [];
    for (let i = 0; i < chunksCount; i++) {
      const slice = text.slice(i * 600, (i + 1) * 600);
      chunksData.push({
        index: i,
        text: slice,
        embedding: Array.from({ length: 32 }, (_, j) => ((slice.charCodeAt(j % Math.max(slice.length, 1)) || 0) / 255) * (j + 1) * 0.01),
      });
    }
    const documentId = 'doc_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    const receiptId = '#ING-' + contentHash.slice(0, 8).toUpperCase();

    DocumentService.add({
      id: documentId,
      roomId,
      name: file.name,
      type: extOf(file.name).toUpperCase() || 'TXT',
      size: (file.size / 1024).toFixed(1) + ' KB',
      verified: false,
      chunks: chunksCount,
      timestamp: new Date().toISOString(),
      endpoint,
      sourceText: text.slice(0, 8000),
    });

    ChunkService.saveForDocument(documentId, roomId, text);
    RoomService.syncStats(roomId);

    AuditService.log({
      type: 'document_verified',
      roomId,
      action: `Ingested ${file.name} (${chunksCount} chunks)`,
      actor: 'IngestionAgent',
      receiptId,
      cost: '$0.00',
      tokens: Math.round(text.length / 4),
      evidenceRefs: [documentId, contentHash],
    });

    const pipe = OrchestrationService.getPipeline(roomId);
    if (pipe.steps[0]?.status === 'pending') {
      OrchestrationService.advanceStep(roomId, 'step_1');
    }

    return {
      documentId,
      chunksCreated: chunksCount,
      totalTokens: Math.round(text.length / 4),
      verified: false,
      receiptId,
      contentHash,
      chunksData,
    };
  },

  extractTextFromFile: async (file: File): Promise<string> => {
    assertIngestable(file);
    return file.text();
  },
};
