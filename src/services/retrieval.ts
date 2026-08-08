/* ------------------------------------------------------------------ */
/*  Retrieval — TF/overlap over persisted chunks                       */
/* ------------------------------------------------------------------ */

import type { DocumentRecord } from './api';
import { ChunkService } from './chunks';

const STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'is', 'are', 'was', 'were',
  'be', 'with', 'as', 'by', 'at', 'from', 'that', 'this', 'it', 'its', 'we', 'you', 'our',
  'about', 'what', 'how', 'when', 'where', 'who', 'which', 'can', 'do', 'does', 'did',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9%\-+.]+/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOP.has(t));
}

export interface RetrievedChunk {
  docId: string;
  docName: string;
  text: string;
  score: number;
  chunkId?: string;
}

export interface RetrievalAnswer {
  text: string;
  citations: { docId: string; docName: string; score: number }[];
  chunks: RetrievedChunk[];
}

function scoreChunk(qSet: Set<string>, text: string, nameBoost = 0): number {
  const tokens = tokenize(text);
  if (!tokens.length) return 0;
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
  let score = 0;
  for (const t of qSet) {
    if (tf.has(t)) score += 1 + Math.log1p(tf.get(t)!);
  }
  return score + nameBoost;
}

export function retrieve(query: string, docs: DocumentRecord[], topK = 3): RetrievedChunk[] {
  const verified = docs.filter(d => d.verified);
  const qTokens = tokenize(query);
  if (!verified.length || !qTokens.length) return [];

  ChunkService.ensureFromDocs(verified);
  const qSet = new Set(qTokens);
  const docMap = new Map(verified.map(d => [d.id, d]));
  const roomId = verified[0]?.roomId;
  const stored = ChunkService.getAll(roomId).filter(c => docMap.has(c.documentId));

  const scored: RetrievedChunk[] = [];

  if (stored.length) {
    for (const c of stored) {
      const doc = docMap.get(c.documentId)!;
      const nameHits = tokenize(doc.name).filter(t => qSet.has(t)).length;
      const score = scoreChunk(qSet, c.text, nameHits * 1.5);
      if (score > 0) {
        scored.push({
          docId: c.documentId,
          docName: doc.name,
          text: c.text,
          score,
          chunkId: c.id,
        });
      }
    }
  } else {
    // fallback sourceText
    for (const doc of verified) {
      if (!doc.sourceText) continue;
      const nameHits = tokenize(doc.name).filter(t => qSet.has(t)).length;
      const score = scoreChunk(qSet, doc.sourceText, nameHits * 1.5);
      if (score > 0) {
        scored.push({ docId: doc.id, docName: doc.name, text: doc.sourceText.slice(0, 400), score });
      }
    }
  }

  scored.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const ranked: RetrievedChunk[] = [];
  for (const c of scored) {
    const key = (c.chunkId || c.docId) + c.text.slice(0, 24);
    if (seen.has(key)) continue;
    seen.add(key);
    ranked.push(c);
    if (ranked.length >= topK) break;
  }
  return ranked;
}

export function answerWithCitations(query: string, docs: DocumentRecord[]): RetrievalAnswer {
  if (!docs.filter(d => d.verified).length) {
    return {
      text: 'No verified documents in this room. Verify sources first, then re-ask.',
      citations: [],
      chunks: [],
    };
  }

  const chunks = retrieve(query, docs, 3);
  if (!chunks.length) {
    const fallback = docs.find(d => d.verified)!;
    return {
      text: `No strong match for “${query.slice(0, 80)}”. Closest source is ${fallback.name}: ${(fallback.sourceText || '').slice(0, 220) || '(no excerpt)'}`,
      citations: [{ docId: fallback.id, docName: fallback.name, score: 0 }],
      chunks: [],
    };
  }

  const lines = chunks.map(
    (c, i) =>
      `[${i + 1}] (${c.docName}, score ${c.score.toFixed(2)}) ${c.text.trim()}${c.text.length >= 400 ? '…' : ''}`
  );
  const citations = Object.values(
    chunks.reduce<Record<string, { docId: string; docName: string; score: number }>>((acc, c) => {
      const prev = acc[c.docId];
      if (!prev || c.score > prev.score) acc[c.docId] = { docId: c.docId, docName: c.docName, score: c.score };
      return acc;
    }, {})
  );

  return {
    text: `Retrieved ${chunks.length} passage(s) for “${query.slice(0, 60)}”:\n\n${lines.join('\n\n')}\n\nSources: ${citations.map(c => c.docName).join(' · ')}`,
    citations,
    chunks,
  };
}

