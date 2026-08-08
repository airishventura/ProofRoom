import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ExternalLink } from 'lucide-react';
import type { AIRunRecord } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../lib-ary/card/Card';
import { Button } from '../lib-ary/button/Button';
import { gatesSummary } from './pendingRuns';
import type { WorkspaceTask } from './workspaceTasks';

const cardStyle = {
  width: '100%',
  maxWidth: 'none',
  '--lib-card-radius': '16px',
  '--lib-card-padding': '20px',
} as CSSProperties;

export function GatesPanel(props: {
  runs: AIRunRecord[];
  busyTask: string | null;
  onRunGatedTask: (task: WorkspaceTask) => void;
}) {
  const { runs, busyTask, onRunGatedTask } = props;
  const { pendingRuns, gatedTasks, pendingCount } = gatesSummary(runs);

  return (
    <Card className="pr-card-full" style={cardStyle}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-gold" />
              Gates
            </CardTitle>
            <CardDescription>
              {pendingCount} pending approval{pendingCount === 1 ? '' : 's'} · same filter as Approvals
            </CardDescription>
          </div>
          <Link
            to="/approvals"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-gold hover:underline shrink-0"
          >
            Approvals <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-muted mb-2">
            Awaiting sign-off
          </p>
          {pendingRuns.length === 0 ? (
            <p className="text-[12px] text-ink-soft">No pending runs.</p>
          ) : (
            <ul className="space-y-2">
              {pendingRuns.map(r => (
                <li
                  key={r.id}
                  className="rounded-xl border border-gold/20 bg-gold-soft px-3 py-2.5 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{r.title}</p>
                    <p className="text-[10px] font-mono text-ink-muted">{r.status} · {r.meta || 'queued'}</p>
                  </div>
                  <Link
                    to="/approvals"
                    className="text-[10px] font-bold text-gold-deep shrink-0 hover:underline"
                  >
                    Review
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-muted mb-2">
            Gated catalog
          </p>
          <ul className="space-y-2">
            {gatedTasks.map(t => {
              const existing = runs.find(r => r.title === t.title);
              const running = busyTask === t.title || existing?.status === 'running';
              const pending = existing?.status === 'pending';
              return (
                <li
                  key={t.title}
                  className="rounded-xl border border-ink-faint/20 bg-paper-deep px-3 py-2.5 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{t.title}</p>
                    <p className="text-[11px] text-ink-soft line-clamp-2">{t.desc}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={running || pending}
                    className="!text-[10px] !py-1.5 !px-2.5 shrink-0"
                    onClick={() => onRunGatedTask(t)}
                  >
                    {pending ? 'Queued' : running ? '…' : 'Queue'}
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
