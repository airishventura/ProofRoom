import { Hono } from 'hono';
import { query } from '../db/pool.js';
import { userCanAccessRoom } from '../lib/auth.js';
import { writeAudit } from '../services/audit.js';
import { resetRoomData } from '../services/room-reset.js';
import { formatUsd } from '../lib/pricing.js';
import type { AppEnv } from '../middleware.js';
import { requireAuth } from '../middleware.js';

export const roomRoutes = new Hono<AppEnv>();

roomRoutes.use('*', requireAuth);

roomRoutes.get('/', async c => {
  const user = c.get('user');
  const res = await query(
    `SELECT r.id, r.name, r.endpoint, r.description,
            (SELECT COUNT(*)::int FROM documents d WHERE d.room_id = r.id) AS docs,
            (SELECT COUNT(*)::int FROM runs run WHERE run.room_id = r.id) AS runs,
            (SELECT COALESCE(SUM(amount),0) FROM revenue_events e WHERE e.room_id = r.id) AS spend
     FROM rooms r
     WHERE r.endpoint = 'shared'
        OR EXISTS (SELECT 1 FROM room_members m WHERE m.room_id = r.id AND m.user_id = $1)
     ORDER BY r.id`,
    [user.sub]
  );
  return c.json({
    rooms: res.rows.map(r => ({
      id: r.id,
      name: r.name,
      endpoint: r.endpoint,
      description: r.description,
      docs: r.docs,
      runs: r.runs,
      spend: formatUsd(Number(r.spend) || 0),
    })),
  });
});

roomRoutes.get('/:id', async c => {
  const user = c.get('user');
  const id = c.req.param('id');
  if (!(await userCanAccessRoom(user.sub, id))) return c.json({ error: 'Forbidden' }, 403);
  const res = await query('SELECT * FROM rooms WHERE id = $1', [id]);
  if (!res.rows[0]) return c.json({ error: 'Not found' }, 404);
  return c.json({ room: res.rows[0] });
});

/**
 * Clear all workspace data for a room (docs, runs, chat, audit, publish).
 * Keeps the room + memberships. Membership-gated.
 */
roomRoutes.delete('/:id/data', async c => {
  const user = c.get('user');
  const id = c.req.param('id');
  if (!(await userCanAccessRoom(user.sub, id))) return c.json({ error: 'Forbidden' }, 403);

  const room = await query('SELECT id FROM rooms WHERE id = $1', [id]);
  if (!room.rows[0]) return c.json({ error: 'Not found' }, 404);

  const counts = await resetRoomData(id);
  await writeAudit({
    roomId: id,
    type: 'auth',
    action: `Reset room data (${Object.entries(counts)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ')})`,
    actor: user.name,
    receiptId: `#RST-${Date.now().toString(36).toUpperCase()}`,
    cost: '$0.00',
    evidenceRefs: [id],
  });

  return c.json({ ok: true, roomId: id, counts });
});
