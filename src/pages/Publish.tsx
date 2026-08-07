import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { DocumentService, RunService } from '../services/api';
import type { DocumentRecord, AIRunRecord } from '../services/api';
import { PublishService } from '../services/publish';
import type { ReportRecord } from '../services/publish';
import { AuditService } from '../services/audit';
import { OrchestrationService } from '../services/orchestration';
import { RevenueService } from '../services/revenue';
import { PRICING } from '../utils/pricing';
import { useRoom } from '../context/RoomContext';
import ReportPortal from '../components/ReportPortal';
import { isRemoteReady, Remote } from '../services/remote';

export default function PublishPage() {
  const { roomId, room, refreshRooms, apiMode, remoteReady, loading: roomLoading } = useRoom();
  const [pub, setPub] = useState<ReportRecord | null>(null);
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [runs, setRuns] = useState<AIRunRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setErr(null);
    if (isRemoteReady()) {
      try {
        const [record, d, r] = await Promise.all([
          Remote.getPublished(roomId),
          Remote.documents(roomId),
          Remote.runs(roomId),
        ]);
        setPub(record);
        setDocs(d);
        setRuns(r);
        refreshRooms();
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Failed to load publish state');
      }
      return;
    }
    setPub(PublishService.getRecord(roomId));
    setDocs(DocumentService.getAll(roomId));
    setRuns(RunService.getAll(roomId));
    refreshRooms();
  }, [roomId, refreshRooms]);

  useEffect(() => {
    if (roomLoading) return;
    if (apiMode && !remoteReady) return;
    void refresh();
  }, [refresh, roomLoading, apiMode, remoteReady]);

  const verifiedRuns = runs.filter(r => r.status === 'verified');
  const verifiedDocs = docs.filter(d => d.verified);

  const handlePublish = async () => {
    setBusy(true);
    setErr(null);
    try {
      if (isRemoteReady()) {
        const record = await Remote.publish(roomId);
        setPub(record);
        await refresh();
        return;
      }
      const citations = verifiedRuns.map(r => ({
        title: r.title,
        sourceDoc: verifiedDocs[0]?.name || 'source',
        receipt: r.receipt,
        hash: r.evidence.hash,
      }));
      const record = PublishService.publish(roomId, citations);
      AuditService.log({
        type: 'publish',
        roomId,
        action: `Published report ${record.url}`,
        actor: 'ReportAgent',
        receiptId: '#PUB-' + record.hash.slice(0, 8).toUpperCase(),
        cost: `$${PRICING.publishUsd.toFixed(2)}`,
        evidenceRefs: verifiedRuns.map(r => r.id),
      });
      RevenueService.ensureSubscription(roomId);
      RevenueService.recordPublish(roomId, record.hash);
      OrchestrationService.advanceStep(roomId, 'step_5');
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Publish failed');
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async () => {
    setBusy(true);
    setErr(null);
    try {
      if (isRemoteReady()) {
        await Remote.revokePublish(roomId);
        setPub(null);
        await refresh();
        return;
      }
      PublishService.revoke(roomId);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Revoke failed');
    } finally {
      setBusy(false);
    }
  };

  if (apiMode && roomLoading) {
    return (
      <main className="mx-auto max-w-lg px-8 py-24 text-center">
        <p className="text-sm text-ink-soft">Loading session…</p>
      </main>
    );
  }

  if (apiMode && !remoteReady) {
    return (
      <main className="mx-auto max-w-lg px-8 py-24 text-center">
        <h1 className="font-display text-3xl mb-2">Sign in required</h1>
        <p className="text-ink-soft text-sm mb-6">Publish writes to Postgres after login.</p>
        <Link to="/login" className="rounded-full bg-ink text-paper px-6 py-3 text-sm font-bold inline-block">
          Go to login
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1600px] px-6 md:px-10 py-14 md:py-24">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl md:text-5xl tracking-tight text-ink mb-2">Publish</h1>
          <p className="text-sm text-ink-soft">
            {room?.name || roomId} · {verifiedRuns.length} verified runs · {verifiedDocs.length} verified sources
            {apiMode ? ' · API' : ''}
            {room ? ` · ${room.docs}d / ${room.runs}r / ${room.spend}` : ''}
          </p>
          {err && <p className="mt-2 text-[11px] text-rose">{err}</p>}
          {pub && (
            <p className="mt-2 text-[11px] font-mono text-match flex flex-wrap items-center gap-2">
              Live:{' '}
              <a
                href={pub.url.startsWith('http') ? pub.url : `/r/${roomId}`}
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-gold inline-flex items-center gap-1"
              >
                {pub.url}
                <ExternalLink className="h-3 w-3" />
              </a>
              <span className="text-ink-faint">sha256:{pub.hash.slice(0, 12)}…</span>
            </p>
          )}
        </div>
        {!pub ? (
          <button
            onClick={() => void handlePublish()}
            disabled={verifiedRuns.length === 0 || busy}
            className="rounded-full bg-ink text-paper px-6 py-3 text-sm font-bold hover:bg-ink-soft disabled:opacity-40 shadow-lg shadow-ink/10"
          >
            {busy ? 'Publishing…' : 'Publish Microsite'}
          </button>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/r/${roomId}`}
              className="rounded-full border border-gold/30 bg-gold-soft px-6 py-3 text-sm font-bold text-gold-deep hover:border-gold/50"
            >
              Open public view
            </Link>
            {(pub.pdfUrl || apiMode) && (
              <a
                href={pub.pdfUrl || `/api/publish/public/${roomId}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-ink-faint px-6 py-3 text-sm font-bold text-ink-soft hover:text-ink inline-flex items-center gap-1"
              >
                Download PDF
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <button
              onClick={() => void handleRevoke()}
              disabled={busy}
              className="rounded-full border border-ink-faint px-6 py-3 text-sm font-bold text-ink-soft hover:text-ink disabled:opacity-40"
            >
              {busy ? '…' : 'Revoke Publication'}
            </button>
          </div>
        )}
      </div>

      {verifiedRuns.length === 0 && (
        <p className="mb-8 text-sm text-ink-faint">
          Nothing to publish yet.{' '}
          <Link to="/workspace" className="text-gold font-medium hover:underline">
            Complete verified runs →
          </Link>
        </p>
      )}

      <ReportPortal
        docs={docs}
        runs={runs}
        name={room?.name || 'Workspace Report'}
        endpoint={room?.endpoint || 'private'}
        publishedAt={pub?.timestamp}
        contentHash={pub?.hash}
      />
    </main>
  );
}
