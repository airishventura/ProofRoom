import { Hono } from 'hono';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { query } from '../db/pool.js';
import type { AppEnv } from '../middleware.js';
import { requireAuth } from '../middleware.js';
import { writeAudit } from '../services/audit.js';

export const orgRoutes = new Hono<AppEnv>();
orgRoutes.use('*', requireAuth);

/** Current user's org + membership. */
orgRoutes.get('/me', async c => {
  const user = c.get('user');
  if (!user.orgId) {
    return c.json({ org: null, members: [], role: null });
  }
  const org = await query<{ id: string; name: string; slug: string }>(
    'SELECT id, name, slug FROM orgs WHERE id = $1',
    [user.orgId]
  );
  const members = await query<{ user_id: string; role: string; email: string; name: string }>(
    `SELECT om.user_id, om.role, u.email, u.name
     FROM org_members om
     JOIN users u ON u.id = om.user_id
     WHERE om.org_id = $1
     ORDER BY u.name`,
    [user.orgId]
  );
  const myRole = members.rows.find(m => m.user_id === user.sub)?.role || null;
  return c.json({
    org: org.rows[0] || null,
    role: myRole,
    members: members.rows.map(m => ({
      userId: m.user_id,
      email: m.email,
      name: m.name,
      role: m.role,
    })),
  });
});

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['member', 'admin', 'analyst', 'lead']).default('member'),
  expiresInDays: z.number().int().min(1).max(30).optional(),
});

/** Create invite token for org (admin/owner only). */
orgRoutes.post('/invites', async c => {
  const user = c.get('user');
  if (!user.orgId) return c.json({ error: 'No org' }, 400);

  const roleCheck = await query(
    `SELECT role FROM org_members WHERE org_id = $1 AND user_id = $2`,
    [user.orgId, user.sub]
  );
  const myRole = roleCheck.rows[0]?.role;
  if (!myRole || !['owner', 'admin', 'lead'].includes(myRole)) {
    return c.json({ error: 'Forbidden — admin required' }, 403);
  }

  const body = inviteSchema.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: 'Invalid payload' }, 400);

  const id = `inv_${Date.now().toString(36)}`;
  const token = randomBytes(24).toString('hex');
  const days = body.data.expiresInDays ?? 7;
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  await query(
    `INSERT INTO org_invites (id, org_id, email, role, token, created_by, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [id, user.orgId, body.data.email.toLowerCase(), body.data.role, token, user.sub, expires.toISOString()]
  );

  await writeAudit({
    roomId: 'r1',
    type: 'auth',
    action: `Invite ${body.data.email} to org ${user.orgId}`,
    actor: user.name,
    receiptId: `#INV-${id.slice(-6).toUpperCase()}`,
    cost: '$0.00',
    evidenceRefs: [user.orgId, body.data.email],
  });

  return c.json({
    id,
    email: body.data.email.toLowerCase(),
    role: body.data.role,
    token,
    expiresAt: expires.toISOString(),
    // client can build accept URL
    acceptPath: `/api/orgs/invites/${token}/accept`,
  });
});

/** Accept invite (authenticated user email must match). */
orgRoutes.post('/invites/:token/accept', async c => {
  const user = c.get('user');
  const token = c.req.param('token');
  const inv = await query<{
    id: string;
    org_id: string;
    email: string;
    role: string;
    expires_at: Date;
    accepted_at: Date | null;
  }>('SELECT * FROM org_invites WHERE token = $1', [token]);
  const row = inv.rows[0];
  if (!row) return c.json({ error: 'Invalid invite' }, 404);
  if (row.accepted_at) return c.json({ error: 'Already accepted' }, 400);
  if (new Date(row.expires_at) < new Date()) return c.json({ error: 'Invite expired' }, 400);
  if (user.email.toLowerCase() !== row.email.toLowerCase()) {
    return c.json({ error: 'Invite email mismatch' }, 403);
  }

  await query(
    `INSERT INTO org_members (org_id, user_id, role) VALUES ($1,$2,$3)
     ON CONFLICT (org_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
    [row.org_id, user.sub, row.role]
  );
  await query('UPDATE users SET org_id = $2 WHERE id = $1', [user.sub, row.org_id]);
  await query('UPDATE org_invites SET accepted_at = NOW() WHERE id = $1', [row.id]);

  return c.json({ ok: true, orgId: row.org_id, role: row.role });
});
