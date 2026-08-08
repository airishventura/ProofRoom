import { Hono } from 'hono';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { userCanAccessRoom } from '../lib/auth.js';
import { evidenceHash } from '../lib/hash.js';
import { priceSealedRun } from '../lib/pricing.js';
import { writeAudit } from '../services/audit.js';
import { ensureRoomSubscription, recordRevenue } from '../services/revenue.js';
import type { AppEnv } from '../middleware.js';
import { requireAuth } from '../middleware.js';

export const runRoutes = new Hono<AppEnv>();
runRoutes.use('*', requireAuth);

runRoutes.get('/', async c => {
  const user = c.get('user');
  const roomId = c.req.query('roomId') || 'r1';
  if (!(await userCanAccessRoom(user.sub, roomId))) return c.json({ error: 'Forbidden' }, 403);
  const res = await query(
    `SELECT * FROM runs WHERE room_id = $1 ORDER BY created_at DESC`,
    [roomId]
  );
  return c.json({
    runs: res.rows.map(r => ({
      id: r.id,
      roomId: r.room_id,
      title: r.title,
      model: r.model,
      status: r.status,
      cost: r.cost,
      receipt: r.receipt,
      tokens: r.tokens,
      chunks: r.chunks,
      meta: r.meta,
      output: r.output,
      evidence: {
        modelPath: r.model_path || '—',
        receiptId: r.receipt,
        cost: r.cost,
        timestamp: r.updated_at,
        hash: r.evidence_hash || '',
      },
    })),
  });
});

const createSchema = z.object({
  roomId: z.string(),
  title: z.string(),
  gated: z.boolean().optional(),
  modelPath: z.string().optional(),
});

runRoutes.post('/', async c => {
  const user = c.get('user');
  const body = createSchema.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: 'Invalid payload' }, 400);
  const { roomId, title, gated, modelPath } = body.data;
  if (!(await userCanAccessRoom(user.sub, roomId))) return c.json({ error: 'Forbidden' }, 403);

  const id = `run_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const status = gated ? 'pending' : 'running';
  const path = modelPath || `models/proof-v2/${title.toLowerCase().replace(/\s+/g, '-')}`;
  const chunksRes = await query<{ c: number }>(
    `SELECT COALESCE(SUM(chunks),0)::int AS c FROM documents WHERE room_id = $1 AND verified = true`,
    [roomId]
  );
  const verifiedChunks = chunksRes.rows[0]?.c || 0;

  await query(
    `INSERT INTO runs (id, room_id, title, model, status, cost, receipt, tokens, chunks, meta, model_path)
     VALUES ($1,$2,$3,'ProofEngine v2',$4,$5,$6,0,$7,$8,$9)`,
    [
      id,
      roomId,
      title,
      status,
      gated ? '—' : '…',
      gated ? '—' : '—',
      verifiedChunks,
      gated ? 'Awaiting approval gate' : 'Processing…',
      path,
    ]
  );

  await ensureRoomSubscription(roomId);

  if (!gated) {
    // complete immediately with sealed output
    const docs = await query<{ name: string; source_text: string | null }>(
      `SELECT name, source_text FROM documents WHERE room_id = $1 AND verified = true`,
      [roomId]
    );
    const output = `## ${title}\nSources: ${docs.rows.map(d => d.name).join(', ') || 'none'}\n\n${docs.rows
      .map((d, i) => `(${i + 1}) ${(d.source_text || '').slice(0, 280)}`)
      .join('\n\n')}\n\n— Server ProofEngine`;
    const receipt = `#REC-${Math.floor(Math.random() * 9000 + 1000)}`;
    const priced = priceSealedRun({ outputText: output, chunkCount: verifiedChunks });
    const { tokens, cost, amountUsd } = priced;
    const hash = evidenceHash({ id, roomId, title, receipt, tokens, output: output.slice(0, 500) });
    await query(
      `UPDATE runs SET status='verified', cost=$2, receipt=$3, tokens=$4, output=$5, meta=$6, evidence_hash=$7, updated_at=NOW()
       WHERE id=$1`,
      [id, cost, receipt, tokens, output, `${tokens} tokens · sealed · ${cost}`, hash]
    );
    await recordRevenue({
      roomId,
      model: 'B',
      amount: amountUsd,
      description: `AI run: ${title} (${tokens} tok)`,
    });
    await writeAudit({
      roomId,
      type: 'ai_run',
      action: `Completed ${title}`,
      actor: user.name,
      modelPath: path,
      receiptId: receipt,
      cost,
      tokens,
      evidenceRefs: [id],
    });
  } else {
    await writeAudit({
      roomId,
      type: 'approval',
      action: `Gated task queued: ${title}`,
      actor: user.name,
      modelPath: path,
      receiptId: `#GATE-${Math.floor(Math.random() * 9000 + 1000)}`,
      evidenceRefs: [id],
    });
  }

  const run = await query('SELECT * FROM runs WHERE id = $1', [id]);
  return c.json({ run: run.rows[0] });
});

runRoutes.post('/:id/approve', async c => {
  const user = c.get('user');
  const id = c.req.param('id');
  const existing = await query('SELECT * FROM runs WHERE id = $1', [id]);
  const r = existing.rows[0];
  if (!r) return c.json({ error: 'Not found' }, 404);
  if (!(await userCanAccessRoom(user.sub, r.room_id))) return c.json({ error: 'Forbidden' }, 403);

  const docs = await query<{ name: string; source_text: string | null }>(
    `SELECT name, source_text FROM documents WHERE room_id = $1 AND verified = true`,
    [r.room_id]
  );
  const chunksRes = await query<{ c: number }>(
    `SELECT COALESCE(SUM(chunks),0)::int AS c FROM documents WHERE room_id = $1 AND verified = true`,
    [r.room_id]
  );
  const output = `## ${r.title}\nApproved by ${user.name}\n\n${docs.rows
    .map((d, i) => `(${i + 1}) ${(d.source_text || '').slice(0, 280)}`)
    .join('\n\n')}`;
  const receipt = `#REC-${Math.floor(Math.random() * 9000 + 1000)}`;
  const priced = priceSealedRun({
    outputText: output,
    chunkCount: chunksRes.rows[0]?.c || Number(r.chunks) || 0,
  });
  const { tokens, cost, amountUsd } = priced;
  const hash = evidenceHash({ id, roomId: r.room_id, title: r.title, receipt, tokens, output: output.slice(0, 500) });

  await query(
    `UPDATE runs SET status='verified', cost=$2, receipt=$3, tokens=$4, output=$5, meta=$6, evidence_hash=$7, updated_at=NOW()
     WHERE id=$1`,
    [id, cost, receipt, tokens, output, `Completed · approved · ${tokens} tok · ${cost}`, hash]
  );
  await ensureRoomSubscription(r.room_id as string);
  await recordRevenue({
    roomId: r.room_id as string,
    model: 'B',
    amount: amountUsd,
    description: `Approved run: ${r.title} (${tokens} tok)`,
  });
  await writeAudit({
    roomId: r.room_id,
    type: 'approval',
    action: `Approved: ${r.title}`,
    actor: user.name,
    receiptId: receipt,
    cost,
    tokens,
    evidenceRefs: [id],
  });
  return c.json({ ok: true });
});

runRoutes.post('/:id/reject', async c => {
  const user = c.get('user');
  const id = c.req.param('id');
  const existing = await query('SELECT * FROM runs WHERE id = $1', [id]);
  const r = existing.rows[0];
  if (!r) return c.json({ error: 'Not found' }, 404);
  if (!(await userCanAccessRoom(user.sub, r.room_id))) return c.json({ error: 'Forbidden' }, 403);

  await query(
    `UPDATE runs SET status='rejected', meta='Rejected at approval gate', updated_at=NOW() WHERE id=$1`,
    [id]
  );
  await writeAudit({
    roomId: r.room_id,
    type: 'approval',
    action: `Rejected: ${r.title}`,
    actor: user.name,
    receiptId: `#REJ-${Math.floor(Math.random() * 9000 + 1000)}`,
    evidenceRefs: [id],
  });
  return c.json({ ok: true });
});
