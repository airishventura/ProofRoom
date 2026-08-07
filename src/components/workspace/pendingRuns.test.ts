import { describe, expect, it } from 'vitest';
import { filterPendingRuns, catalogGatedTasks, gatesSummary } from './pendingRuns';
import type { AIRunRecord } from '../../services/api';

function run(partial: Partial<AIRunRecord> & { id: string; status: string }): AIRunRecord {
  return {
    id: partial.id,
    roomId: 'r1',
    title: partial.title || partial.id,
    model: 'm',
    status: partial.status as AIRunRecord['status'],
    cost: '$0',
    receipt: '—',
    tokens: 0,
    chunks: 0,
    meta: '',
    evidence: {
      modelPath: '—',
      receiptId: '—',
      cost: '—',
      timestamp: new Date().toISOString(),
      hash: '',
    },
  };
}

describe('filterPendingRuns', () => {
  it('matches Approvals status === pending only', () => {
    const runs = [
      run({ id: 'a', status: 'pending' }),
      run({ id: 'b', status: 'verified' }),
      run({ id: 'c', status: 'running' }),
      run({ id: 'd', status: 'rejected' }),
    ];
    expect(filterPendingRuns(runs).map(r => r.id)).toEqual(['a']);
  });
});

describe('catalogGatedTasks', () => {
  it('includes Memo Drafting', () => {
    expect(catalogGatedTasks().some(t => t.title === 'Memo Drafting')).toBe(true);
  });
});

describe('gatesSummary', () => {
  it('counts pending runs', () => {
    const s = gatesSummary([run({ id: 'a', status: 'pending' }), run({ id: 'b', status: 'verified' })]);
    expect(s.pendingCount).toBe(1);
    expect(s.gatedTasks.length).toBeGreaterThan(0);
  });
});
