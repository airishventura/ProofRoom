/* ------------------------------------------------------------------ */
/*  Chunk store — full-text passages for retrieval                     */
/* ------------------------------------------------------------------ */

import { Store } from './store';

export interface StoredChunk {
  id: string;
  documentId: string;
  roomId: string;
  index: number;
  text: string;
}

const SIZE = 400;

export function splitText(text: string, size = SIZE): string[] {
  if (!text) return [];
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out.length ? out : [text];
}

export const ChunkService = {
  getAll: (roomId?: string): StoredChunk[] => {
    const all = Store.getAll<StoredChunk>('chunks');
    return roomId ? all.filter(c => c.roomId === roomId) : all;
  },

  getByDoc: (documentId: string): StoredChunk[] =>
    Store.getAll<StoredChunk>('chunks')
      .filter(c => c.documentId === documentId)
      .sort((a, b) => a.index - b.index),

  saveForDocument: (documentId: string, roomId: string, text: string): StoredChunk[] => {
    const parts = splitText(text);
    const chunks: StoredChunk[] = parts.map((t, index) => ({
      id: `${documentId}_c${index}`,
      documentId,
      roomId,
      index,
      text: t,
    }));
    const others = Store.getAll<StoredChunk>('chunks').filter(c => c.documentId !== documentId);
    Store.setAll('chunks', [...others, ...chunks]);
    return chunks;
  },

  removeByDoc: (documentId: string) => {
    Store.setAll(
      'chunks',
      Store.getAll<StoredChunk>('chunks').filter(c => c.documentId !== documentId)
    );
  },

  removeByRoom: (roomId: string) => {
    Store.setAll(
      'chunks',
      Store.getAll<StoredChunk>('chunks').filter(c => c.roomId !== roomId)
    );
  },

  /** Seed chunks from doc sourceText when missing (legacy docs). */
  ensureFromDocs: (
    docs: { id: string; roomId: string; sourceText?: string; verified?: boolean }[]
  ): StoredChunk[] => {
    let all = Store.getAll<StoredChunk>('chunks');
    let changed = false;
    for (const d of docs) {
      if (!d.sourceText) continue;
      if (all.some(c => c.documentId === d.id)) continue;
      const parts = splitText(d.sourceText);
      const neu = parts.map((t, index) => ({
        id: `${d.id}_c${index}`,
        documentId: d.id,
        roomId: d.roomId || 'r1',
        index,
        text: t,
      }));
      all = [...all, ...neu];
      changed = true;
    }
    if (changed) Store.setAll('chunks', all);
    return all;
  },
};
