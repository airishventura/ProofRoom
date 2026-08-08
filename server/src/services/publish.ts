import { query } from '../db/pool.js';
import { evidenceHash } from '../lib/hash.js';
import { buildReportPdf } from '../lib/pdf.js';
import { config } from '../config.js';
import { deleteObject, getObject, objectKey, putObject } from './object-store.js';

export interface PublishCitation {
  title: string;
  sourceDoc: string;
  receipt: string;
  hash: string;
}

export interface PublishSnapshot {
  name: string;
  endpoint: string;
  docs: Array<{
    id: string;
    name: string;
    type: string;
    size: string;
    verified: boolean;
    chunks: number;
    endpoint: string;
  }>;
  runs: Array<{
    id: string;
    title: string;
    model: string;
    status: string;
    cost: string;
    receipt: string;
    tokens: number;
    chunks: number;
    meta: string;
    output?: string;
    evidence: {
      modelPath: string;
      receiptId: string;
      cost: string;
      timestamp: string;
      hash: string;
    };
  }>;
}

export interface PublishedReport {
  roomId: string;
  url: string;
  hash: string;
  timestamp: string;
  citations: PublishCitation[];
  verified: boolean;
  snapshot?: PublishSnapshot;
  pdfObjectKey?: string | null;
  pdfUrl?: string;
}

function publicUrl(roomId: string) {
  const base = (config.publicAppUrl || 'http://localhost:5173').replace(/\/$/, '');
  return `${base}/r/${roomId}`;
}

function mapRow(r: Record<string, unknown>): PublishedReport {
  const citationsRaw = r.citations;
  let citations: PublishCitation[] = [];
  let snapshot: PublishSnapshot | undefined;

  if (Array.isArray(citationsRaw)) {
    citations = citationsRaw as PublishCitation[];
  } else if (citationsRaw && typeof citationsRaw === 'object') {
    const obj = citationsRaw as { items?: PublishCitation[]; citations?: PublishCitation[] };
    citations = obj.items || obj.citations || [];
  }

  const snap = r.snapshot;
  if (snap && typeof snap === 'object' && Object.keys(snap as object).length) {
    snapshot = snap as PublishSnapshot;
  }

  const publishedAt = r.published_at;
  const timestamp =
    publishedAt instanceof Date
      ? publishedAt.toISOString()
      : publishedAt
        ? new Date(publishedAt as string).toISOString()
        : new Date().toISOString();

  const pdfObjectKey = (r.pdf_object_key as string) || null;
  return {
    roomId: r.room_id as string,
    url: (r.url as string) || publicUrl(r.room_id as string),
    hash: r.hash as string,
    timestamp,
    citations,
    verified: r.verified !== false,
    snapshot,
    pdfObjectKey,
    pdfUrl: pdfObjectKey
      ? `${(config.publicAppUrl || '').replace(/\/$/, '')}/api/publish/public/${r.room_id}/pdf`
      : undefined,
  };
}

export async function getPublished(roomId: string): Promise<PublishedReport | null> {
  const res = await query('SELECT * FROM published_reports WHERE room_id = $1', [roomId]);
  if (!res.rows[0]) return null;
  return mapRow(res.rows[0] as Record<string, unknown>);
}

export async function buildSnapshot(roomId: string): Promise<{
  citations: PublishCitation[];
  snapshot: PublishSnapshot;
  roomName: string;
  endpoint: string;
}> {
  const room = await query<{ name: string; endpoint: string }>(
    'SELECT name, endpoint FROM rooms WHERE id = $1',
    [roomId]
  );
  if (!room.rows[0]) throw new Error('Room not found');

  const docs = await query(
    `SELECT id, name, type, size, verified, chunks, endpoint
     FROM documents WHERE room_id = $1 AND verified = true ORDER BY created_at ASC`,
    [roomId]
  );
  const runs = await query(
    `SELECT * FROM runs WHERE room_id = $1 AND status = 'verified' ORDER BY created_at ASC`,
    [roomId]
  );

  if (!runs.rows.length) throw new Error('No verified runs to publish');

  const sourceDoc = (docs.rows[0]?.name as string) || 'source';
  const mappedRuns = runs.rows.map(r => ({
    id: r.id as string,
    title: r.title as string,
    model: r.model as string,
    status: r.status as string,
    cost: r.cost as string,
    receipt: r.receipt as string,
    tokens: Number(r.tokens || 0),
    chunks: Number(r.chunks || 0),
    meta: (r.meta as string) || '',
    output: (r.output as string) || undefined,
    evidence: {
      modelPath: (r.model_path as string) || '—',
      receiptId: (r.receipt as string) || '—',
      cost: (r.cost as string) || '—',
      timestamp:
        r.updated_at instanceof Date
          ? r.updated_at.toISOString()
          : String(r.updated_at || new Date().toISOString()),
      hash: (r.evidence_hash as string) || '',
    },
  }));

  const citations: PublishCitation[] = mappedRuns.map(r => ({
    title: r.title,
    sourceDoc,
    receipt: r.receipt,
    hash: r.evidence.hash,
  }));

  const snapshot: PublishSnapshot = {
    name: room.rows[0].name,
    endpoint: room.rows[0].endpoint,
    docs: docs.rows.map(d => ({
      id: d.id as string,
      name: d.name as string,
      type: d.type as string,
      size: d.size as string,
      verified: !!d.verified,
      chunks: Number(d.chunks || 0),
      endpoint: d.endpoint as string,
    })),
    runs: mappedRuns,
  };

  return {
    citations,
    snapshot,
    roomName: room.rows[0].name,
    endpoint: room.rows[0].endpoint,
  };
}

export async function publishRoom(roomId: string): Promise<PublishedReport> {
  const { citations, snapshot, roomName } = await buildSnapshot(roomId);
  const timestamp = new Date().toISOString();
  const hash = evidenceHash({
    roomId,
    timestamp,
    citations: citations.map(c => `${c.title}:${c.receipt}:${c.hash}`).join(';'),
  });
  const url = publicUrl(roomId);

  const bodyLines = [
    `Docs: ${snapshot.docs.map(d => d.name).join(', ') || 'none'}`,
    ...snapshot.runs.map(
      r => `Run ${r.title} · ${r.receipt} · ${r.tokens} tok · ${r.status}`
    ),
  ];
  const pdf = buildReportPdf({
    title: roomName,
    roomId,
    hash,
    url,
    timestamp,
    citations,
    bodyLines,
  });
  const key = objectKey(roomId, hash, 'pdf');
  await putObject(key, pdf, 'application/pdf');

  await query(
    `INSERT INTO published_reports (room_id, url, hash, citations, verified, published_at, snapshot, pdf_object_key)
     VALUES ($1,$2,$3,$4::jsonb,true,$5,$6::jsonb,$7)
     ON CONFLICT (room_id) DO UPDATE SET
       url = EXCLUDED.url,
       hash = EXCLUDED.hash,
       citations = EXCLUDED.citations,
       verified = true,
       published_at = EXCLUDED.published_at,
       snapshot = EXCLUDED.snapshot,
       pdf_object_key = EXCLUDED.pdf_object_key`,
    [roomId, url, hash, JSON.stringify(citations), timestamp, JSON.stringify(snapshot), key]
  );

  return {
    roomId,
    url,
    hash,
    timestamp,
    citations,
    verified: true,
    snapshot,
    pdfObjectKey: key,
    pdfUrl: `${(config.publicAppUrl || '').replace(/\/$/, '')}/api/publish/public/${roomId}/pdf`,
  };
}

export async function getPublishedPdf(roomId: string): Promise<Buffer | null> {
  const res = await query<{ pdf_object_key: string | null; hash: string }>(
    'SELECT pdf_object_key, hash FROM published_reports WHERE room_id = $1',
    [roomId]
  );
  const row = res.rows[0];
  if (!row) return null;
  if (row.pdf_object_key) {
    const buf = await getObject(row.pdf_object_key);
    if (buf) return buf;
  }
  // regenerate if missing on disk
  const full = await getPublished(roomId);
  if (!full) return null;
  const pdf = buildReportPdf({
    title: full.snapshot?.name || roomId,
    roomId,
    hash: full.hash,
    url: full.url,
    timestamp: full.timestamp,
    citations: full.citations,
  });
  const key = row.pdf_object_key || objectKey(roomId, full.hash, 'pdf');
  await putObject(key, pdf, 'application/pdf');
  if (!row.pdf_object_key) {
    await query('UPDATE published_reports SET pdf_object_key = $2 WHERE room_id = $1', [
      roomId,
      key,
    ]);
  }
  return pdf;
}

export async function revokePublished(roomId: string): Promise<boolean> {
  const res = await query<{ pdf_object_key: string | null }>(
    'SELECT pdf_object_key FROM published_reports WHERE room_id = $1',
    [roomId]
  );
  if (res.rows[0]?.pdf_object_key) {
    await deleteObject(res.rows[0].pdf_object_key);
  }
  const del = await query('DELETE FROM published_reports WHERE room_id = $1', [roomId]);
  return (del.rowCount || 0) > 0;
}
