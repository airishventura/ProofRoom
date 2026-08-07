import { Hono } from 'hono';
import { stream } from 'hono/streaming';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { userCanAccessRoom } from '../lib/auth.js';
import { streamChat } from '../services/llm.js';
import { writeAudit } from '../services/audit.js';
import { clientKey, rateLimitAsync } from '../lib/rate-limit.js';
import { priceChat } from '../lib/pricing.js';
import { config } from '../config.js';
import { ensureRoomSubscription, recordRevenue } from '../services/revenue.js';
import type { AppEnv } from '../middleware.js';
import { requireAuth } from '../middleware.js';

export const chatRoutes = new Hono<AppEnv>();
chatRoutes.use('*', requireAuth);

const chatSchema = z.object({
  roomId: z.string(),
  message: z.string().min(1).max(8000),
});

chatRoutes.get('/history', async c => {
  const user = c.get('user');
  const roomId = c.req.query('roomId') || 'r1';
  if (!(await userCanAccessRoom(user.sub, roomId))) return c.json({ error: 'Forbidden' }, 403);
  const res = await query(
    `SELECT id, role, text, verified, receipt, created_at FROM chat_messages
     WHERE room_id = $1 ORDER BY created_at ASC LIMIT 200`,
    [roomId]
  );
  return c.json({
    messages: res.rows.map(m => ({
      id: m.id,
      role: m.role,
      text: m.text,
      verified: m.verified,
      receipt: m.receipt,
      timestamp: m.created_at,
      roomId,
    })),
  });
});

chatRoutes.post('/stream', async c => {
  const user = c.get('user');
  const ip = clientKey(c);
  const rl = await rateLimitAsync(`chat:${user.sub}:${ip}`, config.rateLimitChat);
  c.header('X-RateLimit-Limit', String(rl.limit));
  c.header('X-RateLimit-Remaining', String(rl.remaining));
  if (!rl.ok) {
    c.header('Retry-After', String(rl.retryAfterSec));
    return c.json({ error: 'Chat rate limit exceeded. Slow down.' }, 429);
  }

  const body = chatSchema.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: 'Invalid payload' }, 400);
  const { roomId, message } = body.data;
  if (!(await userCanAccessRoom(user.sub, roomId))) return c.json({ error: 'Forbidden' }, 403);

  const userMsgId = `msg_${Date.now()}_u`;
  await query(
    `INSERT INTO chat_messages (id, room_id, user_id, role, text, verified)
     VALUES ($1,$2,$3,'user',$4,false)`,
    [userMsgId, roomId, user.sub, message]
  );

  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');

  return stream(c, async s => {
    let full = '';
    let meta: { citations: string[]; model: string } = { citations: [], model: 'local' };
    try {
      const gen = streamChat(roomId, message);
      let result = await gen.next();
      while (!result.done) {
        const delta = result.value as string;
        full += delta;
        await s.write(`data: ${JSON.stringify({ type: 'delta', text: delta })}\n\n`);
        result = await gen.next();
      }
      meta = (result.value as { citations: string[]; model: string }) || meta;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'LLM error';
      await s.write(`data: ${JSON.stringify({ type: 'error', error: msg })}\n\n`);
      return;
    }

    const receipt = `#REC-${Math.floor(Math.random() * 9000 + 1000)}`;
    const agentId = `msg_${Date.now()}_a`;
    const priced = priceChat({ outputText: full, inputText: message });
    await query(
      `INSERT INTO chat_messages (id, room_id, user_id, role, text, verified, receipt)
       VALUES ($1,$2,$3,'agent',$4,true,$5)`,
      [agentId, roomId, user.sub, full, receipt]
    );
    await ensureRoomSubscription(roomId);
    await recordRevenue({
      roomId,
      model: 'B',
      amount: priced.amountUsd,
      description: `Chat (${priced.tokens} tok)`,
    });
    await writeAudit({
      roomId,
      type: 'chat',
      action: `Chat: ${message.slice(0, 80)}`,
      actor: user.name,
      modelPath: meta.model,
      receiptId: receipt,
      cost: priced.cost,
      tokens: priced.tokens,
      evidenceRefs: meta.citations,
    });

    await s.write(
      `data: ${JSON.stringify({
        type: 'done',
        receipt,
        model: meta.model,
        citations: meta.citations,
        tokens: priced.tokens,
        cost: priced.cost,
      })}\n\n`
    );
  });
});
