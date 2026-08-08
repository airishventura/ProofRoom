import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { DocumentRecord, AIRunRecord } from '../services/api';
import type { ReportRecord } from '../services/publish';
import ReportPortal from '../components/ReportPortal';
import { getApiBase, isApiMode } from '../services/http';
import { Remote } from '../services/remote';
import { PublishService } from '../services/publish';
import { DocumentService, RunService, RoomService } from '../services/api';

export default function PublicReportPage() {
  const { roomId = 'r1' } = useParams();
  const [record, setRecord] = useState<ReportRecord | null>(null);
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [runs, setRuns] = useState<AIRunRecord[]>([]);
  const [name, setName] = useState('Workspace Report');
  const [endpoint, setEndpoint] = useState('private');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        if (isApiMode() && getApiBase()) {
          const data = await Remote.publicReport(roomId);
          if (cancelled) return;
          setRecord(data.record);
          if (data.snapshot) {
            setName(data.snapshot.name);
            setEndpoint(data.snapshot.endpoint);
            setDocs(
              data.snapshot.docs.map(d => ({
                ...d,
                roomId,
                timestamp: '',
              }))
            );
            setRuns(
              data.snapshot.runs.map(r => ({
                ...r,
                roomId,
                status: r.status as AIRunRecord['status'],
              }))
            );
          }
        } else {
          const pub = PublishService.getRecord(roomId);
          if (!pub) throw new Error('Not published');
          if (cancelled) return;
          setRecord(pub);
          const room = RoomService.getById(roomId);
          setName(room?.name || 'Workspace Report');
          setEndpoint(room?.endpoint || 'private');
          setDocs(DocumentService.getAll(roomId).filter(d => d.verified));
          setRuns(RunService.getAll(roomId).filter(r => r.status === 'verified'));
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Report unavailable');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  if (loading) {
    return (
      <main className="mx-auto max-w-lg px-8 py-24 text-center">
        <p className="text-sm text-ink-soft">Loading report…</p>
      </main>
    );
  }

  if (err || !record) {
    return (
      <main className="mx-auto max-w-lg px-8 py-24 text-center">
        <h1 className="font-display text-3xl mb-2">Report not available</h1>
        <p className="text-ink-soft text-sm mb-6">{err || 'This room has not been published.'}</p>
        <Link to="/" className="text-gold font-bold">
          ← Home
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 md:px-10 py-14 md:py-24">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] font-mono text-ink-faint">
          Public microsite · {roomId} · sha256:{record.hash.slice(0, 16)}…
        </p>
        <Link to="/publish" className="text-[11px] font-bold text-gold hover:underline">
          Publisher console →
        </Link>
      </div>
      <ReportPortal
        docs={docs}
        runs={runs}
        name={name}
        endpoint={endpoint}
        publishedAt={record.timestamp}
        contentHash={record.hash}
      />
    </main>
  );
}
