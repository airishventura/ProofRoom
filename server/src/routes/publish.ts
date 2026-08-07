import { Hono } from 'hono';
import { z } from 'zod';
import { userCanAccessRoom } from '../lib/auth.js';
import { writeAudit } from '../services/audit.js';
import {
  getPublished,
  getPublishedPdf,
  publishRoom,
  revokePublished,
} from '../services/publish.js';
import { formatUsd, PRICING } from '../lib/pricing.js';
import { ensureRoomSubscription, recordRevenue } from '../services/revenue.js';
import type { AppEnv } from '../middleware.js';
import { requireAuth } from '../middleware.js';

export const publishRoutes = new Hono<AppEnv>();

/** Public microsite payload — only if published (no JWT). */
publishRoutes.get('/public/:roomId', async c => {
  const roomId = c.req.param('roomId');
  const record = await getPublished(roomId);
  if (!record) return c.json({ error: 'Not published' }, 404);
  return c.json({
    published: true,
    record: {
      roomId: record.roomId,
      url: record.url,
      hash: record.hash,
      timestamp: record.timestamp,
      verified: record.verified,
      citations: record.citations,
      pdfUrl: record.pdfUrl,
    },
    snapshot: record.snapshot || null,
  });
});

/** Public sealed PDF download (only if published). */
publishRoutes.get('/public/:roomId/pdf', async c => {
  const roomId = c.req.param('roomId');
  const pdf = await getPublishedPdf(roomId);
  if (!pdf) return c.json({ error: 'Not published' }, 404);
  c.header('Content-Type', 'application/pdf');
  c.header('Content-Disposition', `attachment; filename="proofroom-${roomId}.pdf"`);
  c.header('Cache-Control', 'public, max-age=300');
  return c.body(pdf);
});

const secured = new Hono<AppEnv>();
secured.use('*', requireAuth);

secured.get('/', async c => {
  const user = c.get('user');
  const roomId = c.req.query('roomId') || 'r1';
  if (!(await userCanAccessRoom(user.sub, roomId))) return c.json({ error: 'Forbidden' }, 403);
  const record = await getPublished(roomId);
  return c.json({ published: !!record, record });
});

const bodySchema = z.object({
  roomId: z.string().min(1),
});

secured.post('/', async c => {
  const user = c.get('user');
  const body = bodySchema.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: 'Invalid payload' }, 400);
  const { roomId } = body.data;
  if (!(await userCanAccessRoom(user.sub, roomId))) return c.json({ error: 'Forbidden' }, 403);

  try {
    const record = await publishRoom(roomId);
    const publishCost = formatUsd(PRICING.publishUsd);
    await ensureRoomSubscription(roomId);
    // One publish fee per room snapshot hash (re-publish same hash is free; new seal recharges)
    await recordRevenue({
      roomId,
      model: 'C',
      amount: PRICING.publishUsd,
      description: `Publish sealed report ${record.url}`,
      idempotencyKey: `pub_${roomId}_${record.hash.slice(0, 16)}`,
    });
    await writeAudit({
      roomId,
      type: 'publish',
      action: `Published report ${record.url}`,
      actor: user.name,
      receiptId: `#PUB-${record.hash.slice(0, 8).toUpperCase()}`,
      cost: publishCost,
      evidenceRefs: record.citations.map(x => x.receipt),
    });
    return c.json({ record, pricing: { model: 'C', amount: PRICING.publishUsd, cost: publishCost } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Publish failed';
    return c.json({ error: msg }, 400);
  }
});

secured.delete('/:roomId', async c => {
  const user = c.get('user');
  const roomId = c.req.param('roomId');
  if (!(await userCanAccessRoom(user.sub, roomId))) return c.json({ error: 'Forbidden' }, 403);
  const ok = await revokePublished(roomId);
  if (ok) {
    await writeAudit({
      roomId,
      type: 'publish',
      action: `Revoked publication for ${roomId}`,
      actor: user.name,
      receiptId: `#REV-${Date.now().toString(36).toUpperCase()}`,
      cost: '$0.00',
      evidenceRefs: [roomId],
    });
  }
  return c.json({ ok });
});

publishRoutes.route('/', secured);
