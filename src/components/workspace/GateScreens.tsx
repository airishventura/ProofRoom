import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import type { GateScreen } from './gateScreen';
import type { RoomRecord } from '../../services/api';

export function WorkspaceGateScreens(props: {
  gate: GateScreen;
  roomId: string;
  room: RoomRecord | null;
  unlockPrivate: () => void;
}) {
  const { gate, roomId, room, unlockPrivate } = props;
  if (gate === 'loading') {
    return (
      <main className="mx-auto max-w-lg px-8 py-24 text-center">
        <p className="text-sm text-ink-soft">Loading session…</p>
      </main>
    );
  }
  if (gate === 'sign-in') {
    return (
      <main className="mx-auto max-w-lg px-8 py-24 text-center">
        <Lock className="h-10 w-10 text-gold mx-auto mb-4" />
        <h1 className="font-display text-3xl mb-2">Sign in required</h1>
        <p className="text-ink-soft text-sm mb-6">
          API mode is on. Log in to load rooms, documents, and chat from Postgres.
        </p>
        <Link to="/login" className="rounded-full bg-ink text-paper px-6 py-3 text-sm font-bold inline-block">
          Go to login
        </Link>
      </main>
    );
  }
  if (gate === 'locked') {
    return (
      <main className="mx-auto max-w-lg px-8 py-24 text-center">
        <Lock className="h-10 w-10 text-gold mx-auto mb-4" />
        <h1 className="font-display text-3xl mb-2">Private endpoint locked</h1>
        <p className="text-ink-soft text-sm mb-6">{room?.name || roomId} requires an unlock token.</p>
        <button onClick={() => unlockPrivate()} className="rounded-full bg-ink text-paper px-6 py-3 text-sm font-bold">
          Unlock session
        </button>
      </main>
    );
  }
  return null;
}
