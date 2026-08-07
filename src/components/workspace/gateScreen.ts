/**
 * Pure gate for Workspace full-page screens.
 * Predicates must stay aligned with RoomContext + dual-mode matrix.
 */
export type GateScreen = 'loading' | 'sign-in' | 'locked' | null;

export function deriveGateScreen(opts: {
  apiMode: boolean;
  roomLoading: boolean;
  remoteReady: boolean;
  accessGranted: boolean;
}): GateScreen {
  if (opts.apiMode && opts.roomLoading) return 'loading';
  if (opts.apiMode && !opts.remoteReady) return 'sign-in';
  if (!opts.accessGranted) return 'locked';
  return null;
}

/** Expand selection after refresh: keep previous if still present, else first item. */
export function pickExpandedId(prev: string, ids: string[]): string {
  if (prev && ids.includes(prev)) return prev;
  return ids[0] || '';
}
