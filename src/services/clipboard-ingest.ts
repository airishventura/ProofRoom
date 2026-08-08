/* ------------------------------------------------------------------ */
/*  Clipboard ingest — last copied text → document                     */
/* ------------------------------------------------------------------ */

import { FileIngestionService, IngestError } from './ingestion-real';
import type { IngestionResult } from './ingestion-real';

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

function guessName(text: string): string {
  const first = text.trim().split(/\r?\n/).find(l => l.trim()) || 'clipboard';
  const slug = first
    .slice(0, 48)
    .replace(/[^\w\s.-]+/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .toLowerCase();
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  return `${slug || 'clipboard'}_${stamp}.md`;
}

/**
 * Turn clipboard / last-copied text into an ingested document
 * (local Store or API, same path as file upload).
 */
export async function ingestClipboardText(
  text: string,
  endpoint: 'private' | 'shared',
  roomId: string
): Promise<IngestionResult> {
  const trimmed = (text || '').trim();
  if (!trimmed) throw new IngestError('Clipboard is empty. Copy text first, then Paste.');
  if (trimmed.length > 5 * 1024 * 1024) throw new IngestError('Clipboard text exceeds 5 MB.');
  if (looksBinary(trimmed)) throw new IngestError('Clipboard looks binary. Copy plain text.');

  const name = guessName(trimmed);
  const file = new File([trimmed], name, { type: 'text/markdown' });
  return FileIngestionService.ingestFile(file, endpoint, roomId);
}
