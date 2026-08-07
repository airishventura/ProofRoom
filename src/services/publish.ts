/* ------------------------------------------------------------------ */
/*  Publish Service — report microsite + content hash                  */
/* ------------------------------------------------------------------ */

import { Store } from './store';
import { evidenceHash } from '../utils/hash';

export interface ReportRecord {
  roomId: string;
  url: string;
  hash: string;
  timestamp: string;
  citations: { title: string; sourceDoc: string; receipt: string; hash: string }[];
  verified: boolean;
  pdfUrl?: string;
  pdfObjectKey?: string | null;
}

function isReport(x: unknown): x is ReportRecord {
  return !!x && typeof x === 'object' && 'url' in (x as object) && 'roomId' in (x as object);
}

function loadMap(): Record<string, ReportRecord> {
  // Prefer map; normalize legacy single-object shape
  const map = Store.getMap<ReportRecord | string>('published') as Record<string, ReportRecord | unknown>;
  const out: Record<string, ReportRecord> = {};

  // Legacy: entire published key is one ReportRecord
  if (isReport(map) || (map && isReport(map as unknown))) {
    // getMap always returns object — if it has .url it's legacy
  }
  if (map && typeof map === 'object' && 'url' in map && 'roomId' in map && !('r1' in map || 'r2' in map || 'r3' in map)) {
    const legacy = map as unknown as ReportRecord;
    out[legacy.roomId || 'r1'] = legacy;
    return out;
  }

  for (const [k, v] of Object.entries(map || {})) {
    if (isReport(v)) out[k] = v;
  }
  return out;
}

export const PublishService = {
  publish: (roomId: string, citations?: ReportRecord['citations']): ReportRecord => {
    const cites = citations || [];
    const timestamp = new Date().toISOString();
    const hash = evidenceHash({
      roomId,
      timestamp,
      citations: cites.map(c => `${c.title}:${c.receipt}:${c.hash}`).join(';'),
    });
    const record: ReportRecord = {
      roomId,
      url: `https://proofroom.site/r/${roomId}`,
      hash,
      timestamp,
      citations: cites,
      verified: true,
    };
    const map = loadMap();
    map[roomId] = record;
    Store.setMap('published', map);
    return record;
  },

  getRecord: (roomId = 'r1'): ReportRecord | null => loadMap()[roomId] || null,

  isPublished: (roomId = 'r1'): boolean => !!PublishService.getRecord(roomId),

  revoke: (roomId = 'r1') => {
    const map = loadMap();
    delete map[roomId];
    Store.setMap('published', map);
  },
};
