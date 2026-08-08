import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, CreditCard, BarChart3, Globe, Users } from 'lucide-react';
import { RunService, DocumentService } from '../services/api';
import type { AIRunRecord, DocumentRecord } from '../services/api';
import { AuditService } from '../services/audit';
import { RevenueService } from '../services/revenue';
import { OrchestrationService } from '../services/orchestration';
import { AuthService } from '../services/auth';
import { useRoom } from '../context/RoomContext';
import { isRemoteReady, Remote } from '../services/remote';
import { PRICING } from '../utils/pricing';

export default function ApprovalsPage() {
  const { roomId, room, refreshRooms, user: apiUser, remoteReady, apiMode, loading: roomLoading } = useRoom();
  const [pending, setPending] = useState<AIRunRecord[]>([]);
  const [runs, setRuns] = useState<AIRunRecord[]>([]);
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [spend, setSpend] = useState(0);
  const [byModel, setByModel] = useState({ A: 0, B: 0, C: 0, D: 0 });
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const localUser = AuthService.getCurrentUser();
  const user = apiUser
    ? { name: apiUser.name, role: apiUser.role }
    : { name: localUser.name, role: localUser.role };

  const refresh = useCallback(async () => {
    setErr(null);
    if (isRemoteReady()) {
      try {
        const [allRuns, allDocs, rev] = await Promise.all([
          Remote.runs(roomId),
          Remote.documents(roomId),
          Remote.revenue(roomId),
        ]);
        setRuns(allRuns);
        setPending(allRuns.filter(r => r.status === 'pending'));
        setDocs(allDocs);
        setSpend(rev.total);
        setByModel(rev.byModel);
        refreshRooms();
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Load failed');
      }
      return;
    }
    RevenueService.ensureSubscription(roomId);
    setPending(RunService.getPending(roomId));
    setRuns(RunService.getAll(roomId));
    setDocs(DocumentService.getAll(roomId));
    setSpend(RevenueService.getTotal(roomId));
    setByModel(RevenueService.getByModel(roomId));
    refreshRooms();
  }, [roomId, refreshRooms]);

  useEffect(() => {
    if (roomLoading) return;
    if (apiMode && !remoteReady) return;
    void refresh();
  }, [refresh, roomLoading, apiMode, remoteReady]);

  const approve = async (id: string) => {
    setBusy(id);
    try {
      if (isRemoteReady()) {
        await Remote.approveRun(id);
        await refresh();
        return;
      }
      const done = RunService.approve(id);
      if (!done) return;
      // Usage (B) already posted in RunService.approve via token pricing
      AuditService.log({
        type: 'approval',
        roomId,
        action: `Approved: ${done.title}`,
        actor: user.name,
        modelPath: done.evidence.modelPath,
        receiptId: done.receipt,
        cost: done.cost,
        tokens: done.tokens,
        evidenceRefs: [done.id],
      });
      OrchestrationService.advanceStep(roomId, 'step_4');
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Approve failed');
    } finally {
      setBusy(null);
    }
  };

  const reject = async (id: string) => {
    setBusy(id);
    try {
      if (isRemoteReady()) {
        await Remote.rejectRun(id);
        await refresh();
        return;
      }
      const done = RunService.reject(id);
      if (!done) return;
      AuditService.log({
        type: 'approval',
        roomId,
        action: `Rejected: ${done.title}`,
        actor: user.name,
        receiptId: '#REJ-' + Math.floor(Math.random() * 9000 + 1000),
        cost: '$0.00',
        evidenceRefs: [done.id],
      });
      OrchestrationService.rejectStep(roomId, 'step_4', user.name);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Reject failed');
    } finally {
      setBusy(null);
    }
  };

  const verifiedRuns = runs.filter(r => r.status === 'verified').length;
  const verifiedDocs = docs.filter(d => d.verified).length;

  if (apiMode && !remoteReady && !roomLoading) {
    return (
      <main className="mx-auto max-w-lg px-8 py-24 text-center">
        <h1 className="font-display text-3xl mb-2">Sign in required</h1>
        <p className="text-ink-soft text-sm mb-6">Approvals load from the API after login.</p>
        <Link to="/login" className="rounded-full bg-ink text-paper px-6 py-3 text-sm font-bold inline-block">
          Go to login
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1600px] px-8 md:px-14 py-14 md:py-20">
      <div className="mb-12 animate-[fadeUp_0.6s_ease-out]">
        <h1 className="font-display text-5xl md:text-7xl tracking-tight text-ink mb-3">Approval Controls</h1>
        <p className="text-ink-soft text-lg max-w-xl leading-relaxed">
          {room?.name || roomId} · Approver: {user.name} ({user.role}).
          {apiMode ? ' · API' : ''}
        </p>
        {err && <p className="mt-2 text-[11px] text-rose">{err}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8 md:gap-10">
        <section className="glass-card p-7 md:p-9">
          <h2 className="font-display text-2xl tracking-tight mb-6">Pending Approvals</h2>
          {pending.length === 0 ? (
            <p className="text-sm text-ink-faint">
              No gated runs.{' '}
              <Link to="/workspace" className="text-gold font-medium hover:underline">
                Queue a memo task →
              </Link>
            </p>
          ) : (
            <div className="space-y-3">
              {pending.map(a => (
                <div
                  key={a.id}
                  className="rounded-2xl border border-ink-faint/30 bg-paper-deep p-5 hover:border-gold/20 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-bold text-ink">{a.title}</h4>
                      <p className="text-[11px] text-ink-faint">
                        {a.model} · {a.meta}
                      </p>
                    </div>
                    <span className="text-sm font-display font-semibold text-ink-faint">gated</span>
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-gold-soft px-2 py-0.5 text-[10px] font-extrabold text-gold-deep border border-gold/15">
                      {a.status}
                    </span>
                    <span className="text-[10px] font-mono text-ink-faint truncate">{a.evidence.modelPath}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={busy === a.id}
                      onClick={() => void approve(a.id)}
                      className="flex-1 rounded-xl bg-ink text-paper px-4 py-2.5 text-xs font-extrabold hover:bg-ink-soft transition-colors shadow-lg shadow-ink/10 flex items-center justify-center gap-1.5 disabled:opacity-40"
                    >
                      <Check className="h-3 w-3" /> Approve
                    </button>
                    <button
                      disabled={busy === a.id}
                      onClick={() => void reject(a.id)}
                      className="flex-1 rounded-xl bg-paper-deep border border-ink-faint px-4 py-2.5 text-xs font-bold text-ink-soft hover:text-ink transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40"
                    >
                      <X className="h-3 w-3" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="space-y-6 md:space-y-8">
          <section className="glass-card p-7 md:p-9">
            <h2 className="font-display text-2xl tracking-tight mb-6">Workspace Metrics</h2>
            <div className="space-y-5">
              {[
                { label: 'Verified AI Runs', value: String(verifiedRuns), max: '10' },
                { label: 'Verified Documents', value: String(verifiedDocs), max: '12' },
                { label: 'Pending Approvals', value: String(pending.length), max: '5' },
                { label: 'Total ledger (A+B+C)', value: `$${spend.toFixed(2)}`, max: '500' },
              ].map(metric => (
                <div key={metric.label}>
                  <div className="flex items-end justify-between mb-2">
                    <span className="text-xs font-medium text-ink-soft">{metric.label}</span>
                    <span className="text-2xl font-display font-semibold text-ink">{metric.value}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-paper-deep overflow-hidden border border-ink-faint/10">
                    <div
                      className="h-full rounded-full bg-gold"
                      style={{
                        width:
                          Math.min(
                            100,
                            (parseFloat(metric.value.replace(/[^0-9.]/g, '')) / parseFloat(metric.max)) * 100
                          ) + '%',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="glass-card p-7 md:p-9">
            <h2 className="font-display text-2xl tracking-tight mb-2">Revenue Model</h2>
            <p className="text-[11px] text-ink-faint mb-6 font-mono">
              A ${PRICING.subscriptionRoomMonthUsd}/room · B ${PRICING.runUsdPer1kTokens}/1k run · $
              {PRICING.chatUsdPer1kTokens}/1k chat · C ${PRICING.publishUsd} publish
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  letter: 'A',
                  title: 'Subscription',
                  desc: `$${byModel.A.toFixed(2)} · $${PRICING.subscriptionRoomMonthUsd}/mo base`,
                  icon: CreditCard,
                },
                {
                  letter: 'B',
                  title: 'Usage Margin',
                  desc: `$${byModel.B.toFixed(2)} · token metered`,
                  icon: BarChart3,
                },
                {
                  letter: 'C',
                  title: 'Publishing',
                  desc: `$${byModel.C.toFixed(2)} · $${PRICING.publishUsd}/seal`,
                  icon: Globe,
                },
                {
                  letter: 'D',
                  title: 'Services',
                  desc: `$${byModel.D.toFixed(2)} · manual`,
                  icon: Users,
                },
              ].map(m => (
                <div key={m.letter} className="rounded-xl border border-ink-faint/20 bg-paper-deep p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg font-display font-bold text-gold">{m.letter}</span>
                    <span className="text-xs font-bold text-ink">{m.title}</span>
                  </div>
                  <p className="text-[10px] text-ink-faint">{m.desc}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
