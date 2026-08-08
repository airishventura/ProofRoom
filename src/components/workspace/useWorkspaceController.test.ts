import { describe, expect, it } from 'vitest';
import { deriveGateScreen, pickExpandedId } from './gateScreen';
import { WORKSPACE_TASKS } from './workspaceTasks';
import { filterPendingRuns, catalogGatedTasks } from './pendingRuns';

describe('deriveGateScreen', () => {
  it('loading while rooms bootstrap', () => {
    expect(
      deriveGateScreen({ apiMode: true, roomLoading: true, remoteReady: false, accessGranted: false })
    ).toBe('loading');
  });

  it('sign-in when API mode and not remote-ready', () => {
    expect(
      deriveGateScreen({ apiMode: true, roomLoading: false, remoteReady: false, accessGranted: false })
    ).toBe('sign-in');
  });

  it('locked without access', () => {
    expect(
      deriveGateScreen({ apiMode: false, roomLoading: false, remoteReady: false, accessGranted: false })
    ).toBe('locked');
  });

  it('null when access granted', () => {
    expect(
      deriveGateScreen({ apiMode: true, roomLoading: false, remoteReady: true, accessGranted: true })
    ).toBe(null);
  });
});

describe('pickExpandedId', () => {
  it('keeps previous when still present', () => {
    expect(pickExpandedId('b', ['a', 'b', 'c'])).toBe('b');
  });
  it('falls back to first', () => {
    expect(pickExpandedId('z', ['a', 'b'])).toBe('a');
  });
});

describe('WORKSPACE_TASKS', () => {
  it('includes gated and ready tasks', () => {
    expect(WORKSPACE_TASKS.length).toBeGreaterThan(0);
    expect(catalogGatedTasks().length).toBeGreaterThan(0);
    expect(WORKSPACE_TASKS.some(t => t.status !== 'gated')).toBe(true);
  });
});

describe('filterPendingRuns', () => {
  it('filters pending only', () => {
    const pending = filterPendingRuns([
      { id: 'a', status: 'pending' },
      { id: 'b', status: 'done' },
      { id: 'c', status: 'pending' },
    ] as Parameters<typeof filterPendingRuns>[0]);
    expect(pending.map(r => r.id)).toEqual(['a', 'c']);
  });
});

describe('refresh branch predicate', () => {
  it('remoteReady implies API path preference', () => {
    const isRemoteReady = (token: string | null, apiMode: boolean) => apiMode && !!token;
    expect(isRemoteReady(null, true)).toBe(false);
    expect(isRemoteReady('jwt', true)).toBe(true);
    expect(isRemoteReady('jwt', false)).toBe(false);
  });
});
