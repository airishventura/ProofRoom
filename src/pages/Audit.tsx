import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, RefreshCw } from 'lucide-react';
import { RunService } from '../services/api';
import type { AIRunRecord } from '../services/api';
import { AuditService } from '../services/audit';
import type { AuditEntry } from '../services/audit';
import { auditToCSV, auditToJSON, downloadText } from '../services/export-audit';
import { useRoom } from '../context/RoomContext';
import { isRemoteReady, Remote } from '../services/remote';

export default function AuditPage() {
  const { roomId, room, apiMode, remoteReady, loading: roomLoading } = useRoom();
  const [runs, setRuns] = useState<AIRunRecord[]>([]);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<'json' | 'csv' | null>(null);

  const refresh = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      if (isRemoteReady()) {
        const [auditEntries, apiRuns] = await Promise.all([
          Remote.audit(roomId),
          Remote.runs(roomId),
        ]);
        setEntries(auditEntries);
        setRuns(apiRuns);
        return;
      }
      setRuns(RunService.getAll(roomId));
      setEntries(AuditService.getAll(roomId).slice().reverse());
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load audit');
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    if (roomLoading) return;
    if (apiMode && !remoteReady) return;
    void refresh();
  }, [refresh, roomLoading, apiMode, remoteReady]);

  const exportJSON = async () => {
    setExporting('json');
    setErr(null);
    try {
      if (isRemoteReady()) {
        await Remote.downloadAuditExport(roomId, 'json');
      } else {
        downloadText(`proofroom-audit-${roomId}.json`, auditToJSON(entries), 'application/json');
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'JSON export failed');
    } finally {
      setExporting(null);
    }
  };

  const exportCSV = async () => {
    setExporting('csv');
    setErr(null);
    try {
      if (isRemoteReady()) {
        await Remote.downloadAuditExport(roomId, 'csv');
      } else {
        downloadText(`proofroom-audit-${roomId}.csv`, auditToCSV(entries), 'text/csv');
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'CSV export failed');
    } finally {
      setExporting(null);
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
        <p className="text-ink-soft text-sm mb-6">Audit trail is loaded from Postgres after login.</p>
        <Link to="/login" className="rounded-full bg-ink text-paper px-6 py-3 text-sm font-bold inline-block">
          Go to login
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1600px] px-8 md:px-14 py-14 md:py-20">
      <div className="mb-12 animate-[fadeUp_0.6s_ease-out] flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl md:text-7xl tracking-tight text-ink mb-3">Audit Layer</h1>
          <p className="text-ink-soft text-lg max-w-xl leading-relaxed">
            {room?.name || roomId} — model path, receipt, cost, SHA-256 hash, tokens.
            {apiMode ? ' · Postgres' : ' · Local store'}
          </p>
          {err && <p className="mt-2 text-[11px] text-rose">{err}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-ink-faint/30 bg-paper-deep px-3 py-2 text-[11px] font-bold text-ink-soft hover:text-ink disabled:opacity-40"
            title="Refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => void exportJSON()}
            disabled={!entries.length || exporting !== null}
            className="inline-flex items-center gap-1.5 rounded-xl border border-ink-faint/30 bg-paper-deep px-3 py-2 text-[11px] font-bold text-ink-soft hover:text-ink disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" /> {exporting === 'json' ? '…' : 'JSON'}
          </button>
          <button
            type="button"
            onClick={() => void exportCSV()}
            disabled={!entries.length || exporting !== null}
            className="inline-flex items-center gap-1.5 rounded-xl bg-ink text-paper px-3 py-2 text-[11px] font-bold hover:bg-ink-soft disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" /> {exporting === 'csv' ? '…' : 'CSV'}
          </button>
        </div>
      </div>

      {entries.length > 0 && (
        <section className="mb-12">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-ink-soft mb-4">
            Event Trail ({entries.length})
          </h2>
          <div className="space-y-2">
            {entries.map(e => (
              <div
                key={e.id}
                className="rounded-xl border border-ink-faint/20 bg-paper-deep px-4 py-3 flex flex-wrap items-center gap-3 text-[11px] font-mono"
              >
                <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gold-soft text-gold-deep border border-gold/15">
                  {e.type}
                </span>
                <span className="text-ink flex-1 min-w-[12rem]">{e.action}</span>
                <span className="text-ink-faint">{e.actor}</span>
                <span className="text-match">{e.receiptId}</span>
                <span className="text-gold">{e.cost}</span>
                <span className="text-ink-faint truncate max-w-[140px]" title={e.verificationHash}>
                  sha256:{(e.verificationHash || '').slice(0, 12)}
                  {(e.verificationHash || '').length > 12 ? '…' : ''}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {entries.length === 0 && runs.length === 0 && !loading && (
        <p className="text-sm text-ink-faint mb-8">
          No audit events in this room yet. Run tasks or verify docs in Workspace.
        </p>
      )}

      {runs.length > 0 && (
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-ink-soft mb-4">
          Run Evidence ({runs.length})
        </h2>
      )}

      <div className="space-y-5">
        {runs.map(run => (
          <div
            key={run.id}
            className="glass-card p-8 md:p-10 hover:-translate-y-1 transition-all duration-300"
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="font-display text-2xl md:text-3xl tracking-tight mb-1">{run.title}</h2>
                <p className="text-sm text-ink-soft">{run.model}</p>
              </div>
              <span
                className={`text-[10px] font-extrabold uppercase tracking-[0.12em] px-3 py-1 rounded-full border ${
                  run.status === 'verified'
                    ? 'bg-match-soft text-match border-match/20'
                    : run.status === 'rejected'
                      ? 'bg-rose-soft text-rose border-rose/15'
                      : 'bg-gold-soft text-gold-deep border-gold/15'
                }`}
              >
                {run.status}
              </span>
            </div>
            {run.output && (
              <pre className="mb-6 whitespace-pre-wrap rounded-xl bg-paper-deep border border-ink-faint/15 p-4 text-[12px] font-mono text-ink-soft max-h-48 overflow-y-auto">
                {run.output}
              </pre>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Model Path', value: run.evidence.modelPath },
                { label: 'Receipt ID', value: run.evidence.receiptId },
                { label: 'Cost', value: run.evidence.cost },
                { label: 'SHA-256', value: run.evidence.hash },
              ].map(cell => (
                <div key={cell.label} className="rounded-xl bg-paper-deep border border-ink-faint/20 px-4 py-3">
                  <p className="text-[10px] text-ink-faint font-medium uppercase tracking-wide mb-1">
                    {cell.label}
                  </p>
                  <p className="text-[11px] font-mono text-ink truncate" title={cell.value}>
                    {cell.value || '—'}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 text-xs font-mono text-ink-faint">
              <span>
                Tokens: <span className="text-gold font-medium">{run.tokens.toLocaleString()}</span>
              </span>
              <span>·</span>
              <span>
                Chunks: <span className="text-ink font-medium">{run.chunks}</span>
              </span>
              <span>·</span>
              <span>Timestamp: {run.evidence.timestamp}</span>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
