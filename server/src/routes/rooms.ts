import { Hono } from 'hono';
import { z } from 'zod';
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

const createRoomSchema = z.object({
  name: z.string().min(1).max(200),
  endpoint: z.enum(['private', 'shared']).default('private'),
  description: z.string().max(500).optional(),
});

/** Create a room in the caller's org. */
roomRoutes.post('/', async c => {
  const user = c.get('user');
  const body = createRoomSchema.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: 'Invalid payload' }, 400);

  const orgId = user.orgId;
  if (!orgId) return c.json({ error: 'No organization' }, 400);

  const id = `rm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  await query(
    `INSERT INTO rooms (id, name, endpoint, description, owner_id, org_id)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [id, body.data.name, body.data.endpoint, body.data.description || '', user.sub, orgId]
  );
  await query(`INSERT INTO room_members (room_id, user_id, role) VALUES ($1,$2,'owner')`, [
    id,
    user.sub,
  ]);

  await writeAudit({
    roomId: id,
    type: 'auth',
    action: `Create room ${body.data.name}`,
    actor: user.name,
    receiptId: `#RM-${id.slice(-6).toUpperCase()}`,
    cost: '$0.00',
    evidenceRefs: [id, orgId],
  });

  return c.json(
    {
      room: {
        id,
        name: body.data.name,
        endpoint: body.data.endpoint,
        description: body.data.description || '',
        docs: 0,
        runs: 0,
        spend: formatUsd(0),
      },
    },
    201
  );
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
