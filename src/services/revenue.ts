/* ------------------------------------------------------------------ */
/*  Revenue Service — A/B/C/D ledger via unified Store                 */
/* ------------------------------------------------------------------ */

import { Store } from './store';
import { formatUsd, PRICING, type RevenueModel } from '../utils/pricing';

export interface RevenueRecord {
  id?: string;
  roomId: string;
  model: RevenueModel;
  amount: number;
  currency: string;
  timestamp: string;
  description: string;
}

function all(): RevenueRecord[] {
  return Store.getAll<RevenueRecord>('revenue');
}

export const RevenueService = {
  getUsage: (roomId: string) => all().filter(r => r.roomId === roomId),

  getTotal: (roomId: string): number =>
    RevenueService.getUsage(roomId).reduce((sum, r) => sum + r.amount, 0),

  getByModel: (roomId: string): Record<RevenueModel, number> => {
    const out: Record<RevenueModel, number> = { A: 0, B: 0, C: 0, D: 0 };
    for (const r of RevenueService.getUsage(roomId)) {
      out[r.model] = (out[r.model] || 0) + r.amount;
    }
    return out;
  },

  add: (record: RevenueRecord) => {
    if (record.amount <= 0) return;
    const current = all();
    Store.setAll('revenue', [
      ...current,
      {
        ...record,
        id: record.id || `rev_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        currency: record.currency || 'USD',
        timestamp: record.timestamp || new Date().toISOString(),
      },
    ]);
  },

  /** Model A — once per room. */
  ensureSubscription: (roomId: string) => {
    const key = `sub_${roomId}`;
    if (all().some(r => r.id === key || (r.roomId === roomId && r.model === 'A' && r.description.includes('subscription')))) {
      return;
    }
    RevenueService.add({
      id: key,
      roomId,
      model: 'A',
      amount: PRICING.subscriptionRoomMonthUsd,
      currency: 'USD',
      timestamp: new Date().toISOString(),
      description: 'Room subscription (monthly base)',
    });
  },

  /** Model C — idempotent per publish hash. */
  recordPublish: (roomId: string, hash: string) => {
    const key = `pub_${roomId}_${hash.slice(0, 16)}`;
    if (all().some(r => r.id === key)) return;
    RevenueService.add({
      id: key,
      roomId,
      model: 'C',
      amount: PRICING.publishUsd,
      currency: 'USD',
      timestamp: new Date().toISOString(),
      description: 'Publish sealed report',
    });
  },

  recordUsage: (roomId: string, amount: number, description: string) => {
    RevenueService.ensureSubscription(roomId);
    RevenueService.add({
      roomId,
      model: 'B',
      amount,
      currency: 'USD',
      timestamp: new Date().toISOString(),
      description,
    });
  },

  formatTotal: (roomId: string) => formatUsd(RevenueService.getTotal(roomId)),

  rates: () => ({ ...PRICING }),
};
