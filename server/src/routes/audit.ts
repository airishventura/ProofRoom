import { Hono } from 'hono';
import { userCanAccessRoom } from '../lib/auth.js';
import { listAudit } from '../services/audit.js';
import type { AppEnv } from '../middleware.js';
import { requireAuth } from '../middleware.js';

export const auditRoutes = new Hono<AppEnv>();
auditRoutes.use('*', requireAuth);

function toCsv(
  entries: Array<{
    id: string;
    roomId: string;
    type: string;
    action: string;
    actor: string;
    modelPath?: string | null;
    receiptId: string;
    cost: string;
    tokens?: number | null;
    verificationHash: string;
    timestamp: string;
    evidenceRefs: string[] | unknown;
  }>
): string {
  const headers = [
    'id',
    'type',
    'roomId',
    'action',
    'actor',
    'modelPath',
    'receiptId',
    'cost',
    'tokens',
    'verificationHash',
    'timestamp',
    'evidenceRefs',
  ];
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = entries.map(e => {
    const refs = Array.isArray(e.evidenceRefs) ? e.evidenceRefs.join('|') : String(e.evidenceRefs || '');
    return [
      e.id,
      e.type,
      e.roomId,
      e.action,
      e.actor,
      e.modelPath || '',
      e.receiptId,
      e.cost,
      e.tokens ?? '',
      e.verificationHash,
      e.timestamp,
      refs,
    ]
      .map(esc)
      .join(',');
  });
  return [headers.join(','), ...rows].join('\n');
}

auditRoutes.get('/', async c => {
  const user = c.get('user');
  const roomId = c.req.query('roomId') || 'r1';
  if (!(await userCanAccessRoom(user.sub, roomId))) return c.json({ error: 'Forbidden' }, 403);
  const entries = await listAudit(roomId);
  return c.json({
    roomId,
    count: entries.length,
    entries,
  });
});

/** Server-authoritative JSON export (membership-gated). */
auditRoutes.get('/export.json', async c => {
  const user = c.get('user');
  const roomId = c.req.query('roomId') || 'r1';
  if (!(await userCanAccessRoom(user.sub, roomId))) return c.json({ error: 'Forbidden' }, 403);
  const entries = await listAudit(roomId);
  const body = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      roomId,
      exporter: { sub: user.sub, email: user.email, name: user.name },
      count: entries.length,
      entries,
    },
    null,
    2
  );
  c.header('Content-Type', 'application/json; charset=utf-8');
  c.header('Content-Disposition', `attachment; filename="proofroom-audit-${roomId}.json"`);
  return c.body(body);
});

/** Server-authoritative CSV export (membership-gated). */
auditRoutes.get('/export.csv', async c => {
  const user = c.get('user');
  const roomId = c.req.query('roomId') || 'r1';
  if (!(await userCanAccessRoom(user.sub, roomId))) return c.json({ error: 'Forbidden' }, 403);
  const entries = await listAudit(roomId);
  const body = toCsv(entries);
  c.header('Content-Type', 'text/csv; charset=utf-8');
  c.header('Content-Disposition', `attachment; filename="proofroom-audit-${roomId}.csv"`);
  return c.body(body);
});
