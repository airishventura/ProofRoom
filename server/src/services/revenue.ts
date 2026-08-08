import { query } from '../db/pool.js';
import { formatUsd, PRICING, type RevenueModel } from '../lib/pricing.js';

export interface RevenueEvent {
  id: string;
  roomId: string;
  model: RevenueModel;
  amount: number;
  description: string;
  createdAt: string;
}

export async function recordRevenue(opts: {
  roomId: string;
  model: RevenueModel;
  amount: number;
  description: string;
  idempotencyKey?: string;
}): Promise<RevenueEvent | null> {
  const id = opts.idempotencyKey || `rev_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  if (opts.amount <= 0) return null;

  // Idempotent insert for subscription / publish keys
  if (opts.idempotencyKey) {
    const existing = await query('SELECT id FROM revenue_events WHERE id = $1', [id]);
    if (existing.rows[0]) return null;
  }

  await query(
    `INSERT INTO revenue_events (id, room_id, model, amount, description)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (id) DO NOTHING`,
    [id, opts.roomId, opts.model, opts.amount, opts.description]
  );

  return {
    id,
    roomId: opts.roomId,
    model: opts.model,
    amount: opts.amount,
    description: opts.description,
    createdAt: new Date().toISOString(),
  };
}

/** Model A: once per room (mock monthly). */
export async function ensureRoomSubscription(roomId: string): Promise<void> {
  await recordRevenue({
    roomId,
    model: 'A',
    amount: PRICING.subscriptionRoomMonthUsd,
    description: 'Room subscription (monthly base)',
    idempotencyKey: `sub_${roomId}`,
  });
}

export async function roomSpendUsd(roomId: string): Promise<number> {
  const res = await query<{ total: string }>(
    `SELECT COALESCE(SUM(amount),0)::text AS total FROM revenue_events WHERE room_id = $1`,
    [roomId]
  );
  return parseFloat(res.rows[0]?.total || '0') || 0;
}

export async function roomSpendFormatted(roomId: string): Promise<string> {
  return formatUsd(await roomSpendUsd(roomId));
}

export async function listRevenue(roomId: string): Promise<RevenueEvent[]> {
  const res = await query(
    `SELECT id, room_id, model, amount, description, created_at
     FROM revenue_events WHERE room_id = $1 ORDER BY created_at DESC LIMIT 200`,
    [roomId]
  );
  return res.rows.map(r => ({
    id: r.id as string,
    roomId: r.room_id as string,
    model: r.model as RevenueModel,
    amount: Number(r.amount),
    description: r.description as string,
    createdAt:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : String(r.created_at || new Date().toISOString()),
  }));
}

export async function spendByModel(roomId: string): Promise<Record<RevenueModel, number>> {
  const res = await query<{ model: string; total: string }>(
    `SELECT model, COALESCE(SUM(amount),0)::text AS total
     FROM revenue_events WHERE room_id = $1 GROUP BY model`,
    [roomId]
  );
  const out: Record<RevenueModel, number> = { A: 0, B: 0, C: 0, D: 0 };
  for (const row of res.rows) {
    const m = row.model as RevenueModel;
    if (m in out) out[m] = parseFloat(row.total) || 0;
  }
  return out;
}
