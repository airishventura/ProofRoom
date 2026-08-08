import { Hono } from 'hono';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { userCanAccessRoom } from '../lib/auth.js';
import { evidenceHash } from '../lib/hash.js';
import { writeAudit } from '../services/audit.js';
import type { AppEnv } from '../middleware.js';
import { requireAuth } from '../middleware.js';

const ingestSchema = z.object({
  roomId: z.string(),
  name: z.string().min(1),
  text: z.string().min(1),
  endpoint: z.enum(['private', 'shared']).default('private'),
});

export const documentRoutes = new Hono<AppEnv>();
documentRoutes.use('*', requireAuth);

documentRoutes.get('/', async c => {
  const user = c.get('user');
  const roomId = c.req.query('roomId') || 'r1';
  if (!(await userCanAccessRoom(user.sub, roomId))) return c.json({ error: 'Forbidden' }, 403);
  const res = await query(
    `SELECT id, room_id, name, type, size, verified, chunks, endpoint, source_text, content_hash, created_at
     FROM documents WHERE room_id = $1 ORDER BY created_at DESC`,
    [roomId]
  );
  return c.json({
    documents: res.rows.map(d => ({
      id: d.id,
      roomId: d.room_id,
      name: d.name,
      type: d.type,
      size: d.size,
      verified: d.verified,
      chunks: d.chunks,
      endpoint: d.endpoint,
      sourceText: d.source_text,
      contentHash: d.content_hash,
      timestamp: d.created_at,
    })),
  });
});

documentRoutes.post('/ingest', async c => {
  const user = c.get('user');
  const body = ingestSchema.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: 'Invalid payload' }, 400);
  const { roomId, name, text, endpoint } = body.data;
  if (!(await userCanAccessRoom(user.sub, roomId))) return c.json({ error: 'Forbidden' }, 403);

  const id = `doc_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const contentHash = evidenceHash({ name, size: text.length, text: text.slice(0, 4096) });
  const parts: string[] = [];
  for (let i = 0; i < text.length; i += 400) parts.push(text.slice(i, i + 400));
  const type = (name.split('.').pop() || 'txt').toUpperCase();
  const size = `${(new TextEncoder().encode(text).length / 1024).toFixed(1)} KB`;

  await query(
    `INSERT INTO documents (id, room_id, name, type, size, verified, chunks, endpoint, source_text, content_hash)
     VALUES ($1,$2,$3,$4,$5,false,$6,$7,$8,$9)`,
    [id, roomId, name, type, size, parts.length, endpoint, text.slice(0, 8000), contentHash]
  );

  for (let i = 0; i < parts.length; i++) {
    await query(
      `INSERT INTO chunks (id, document_id, room_id, idx, text) VALUES ($1,$2,$3,$4,$5)`,
      [`${id}_c${i}`, id, roomId, i, parts[i]]
    );
  }

  const receiptId = `#ING-${contentHash.slice(0, 8).toUpperCase()}`;
  await writeAudit({
    roomId,
    type: 'document_verified',
    action: `Ingested ${name} (${parts.length} chunks)`,
    actor: user.name,
    receiptId,
    cost: '$0.00',
    tokens: Math.round(text.length / 4),
    evidenceRefs: [id, contentHash],
  });

  return c.json({
    documentId: id,
    chunksCreated: parts.length,
    contentHash,
    receiptId,
  });
});

documentRoutes.post('/:id/verify', async c => {
  const user = c.get('user');
  const id = c.req.param('id');
  const doc = await query<{ room_id: string; name: string }>('SELECT room_id, name FROM documents WHERE id = $1', [id]);
  if (!doc.rows[0]) return c.json({ error: 'Not found' }, 404);
  if (!(await userCanAccessRoom(user.sub, doc.rows[0].room_id))) return c.json({ error: 'Forbidden' }, 403);

  await query('UPDATE documents SET verified = true, updated_at = NOW() WHERE id = $1', [id]);
  await writeAudit({
    roomId: doc.rows[0].room_id,
    type: 'document_verified',
    action: `Verified document ${doc.rows[0].name}`,
    actor: user.name,
    receiptId: `#VER-${Math.floor(Math.random() * 9000 + 1000)}`,
    evidenceRefs: [id],
  });
  return c.json({ ok: true });
});
