import type { CSSProperties } from 'react';
import type { Pipeline } from '../../services/orchestration';
import { Card, CardContent, CardHeader, CardTitle } from '../lib-ary/card/Card';

const cardStyle = {
  width: '100%',
  maxWidth: 'none',
  '--lib-card-radius': '16px',
  '--lib-card-padding': '16px',
} as CSSProperties;

export function WorkspacePipeline({ pipeline }: { pipeline: Pipeline | null }) {
  if (!pipeline) return null;
  return (
    <Card className="pr-card-full mb-8" style={cardStyle}>
      <CardHeader>
        <CardTitle className="text-[11px] font-extrabold uppercase tracking-[0.15em] !text-ink-soft !font-extrabold">
          Pipeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {pipeline.steps.map((s, i) => (
            <div
              key={s.id}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-mono border ${
                s.status === 'completed'
                  ? 'bg-match-soft text-match border-match/20'
                  : s.status === 'running'
                    ? 'bg-gold-soft text-gold-deep border-gold/20'
                    : s.status === 'rejected'
                      ? 'bg-rose-soft text-rose border-rose/15'
                      : 'bg-paper-deep text-ink-faint border-ink-faint/20'
              }`}
            >
              <span className="font-bold">{i + 1}</span>
              <span>{s.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
