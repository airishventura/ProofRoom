import { Link } from 'react-router-dom';
import { Globe } from 'lucide-react';
import type { RoomRecord } from '../../services/api';

export function WorkspaceHeader(props: {
  roomId: string;
  room: RoomRecord | null;
  apiMode: boolean;
  verifiedDocs: number;
  verifiedRuns: number;
  canPublish: boolean;
  loadErr: string | null;
}) {
  const { roomId, room, apiMode, verifiedDocs, verifiedRuns, canPublish, loadErr } = props;
  return (
    <div className="mb-8 sm:mb-10 animate-[fadeUp_0.6s_ease-out]">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
        <h1 className="font-display text-4xl sm:text-5xl md:text-7xl tracking-tight text-ink">Workspace</h1>
        <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-[0.15em] px-2 sm:px-2.5 py-1 rounded-full bg-gold-soft text-gold-deep border border-gold/15 max-w-full truncate">
          {room?.endpoint || 'private'} · {roomId}
          {apiMode ? ' · API' : ''}
        </span>
      </div>
      <p className="text-ink-soft text-base sm:text-lg max-w-xl leading-relaxed">
        {room?.name || 'Room'} — {verifiedDocs} verified docs · {verifiedRuns} runs
      </p>
      {loadErr && <p className="mt-2 text-[11px] text-rose">{loadErr}</p>}
      {canPublish && (
        <Link
          to="/publish"
          className="inline-flex items-center gap-2 mt-4 rounded-full border border-gold/30 bg-gold-soft px-4 py-2 text-xs font-bold text-gold-deep hover:border-gold/50"
        >
          <Globe className="h-3.5 w-3.5" /> Ready to publish microsite →
        </Link>
      )}
    </div>
  );
}
