import { describe, expect, it } from 'vitest';
import { deriveGateScreen, pickExpandedId } from './gateScreen';
import { WORKSPACE_TASKS, gatedTasks } from './workspaceTasks';

describe('deriveGateScreen', () => {
  it('returns loading when API mode is still loading room session', () => {
    expect(
      deriveGateScreen({
        apiMode: true,
        roomLoading: true,
        remoteReady: false,
        accessGranted: false,
      })
    ).toBe('loading');
  });

  it('returns sign-in when API mode without remote session', () => {
    expect(
      deriveGateScreen({
        apiMode: true,
        roomLoading: false,
        remoteReady: false,
        accessGranted: false,
      })
    ).toBe('sign-in');
  });

  it('returns locked when local private endpoint not unlocked', () => {
    expect(
      deriveGateScreen({
        apiMode: false,
        roomLoading: false,
        remoteReady: false,
        accessGranted: false,
      })
    ).toBe('locked');
  });

  it('returns null when access is granted (local or remote)', () => {
    expect(
      deriveGateScreen({
        apiMode: true,
        roomLoading: false,
        remoteReady: true,
        accessGranted: true,
      })
    ).toBe(null);
    expect(
      deriveGateScreen({
        apiMode: false,
        roomLoading: false,
        remoteReady: false,
        accessGranted: true,
      })
    ).toBe(null);
  });
});

describe('pickExpandedId', () => {
  it('keeps previous id when still present', () => {
    expect(pickExpandedId('b', ['a', 'b', 'c'])).toBe('b');
  });

  it('falls back to first id when previous missing', () => {
    expect(pickExpandedId('gone', ['a', 'b'])).toBe('a');
    expect(pickExpandedId('', [])).toBe('');
  });
});

describe('WORKSPACE_TASKS', () => {
  it('includes Memo Drafting as gated and at least one ready task', () => {
    expect(WORKSPACE_TASKS.some(t => t.status === 'ready')).toBe(true);
    expect(gatedTasks().map(t => t.title)).toContain('Memo Drafting');
  });
});
