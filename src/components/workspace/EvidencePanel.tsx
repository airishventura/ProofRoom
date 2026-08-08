import type { CSSProperties } from 'react';
import type { AIRunRecord } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../lib-ary/card/Card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../lib-ary/accordion/Accordion';

const cardStyle = {
  width: '100%',
  maxWidth: 'none',
  '--lib-card-radius': '16px',
  '--lib-card-padding': '20px',
} as CSSProperties;

export function EvidencePanel(props: {
  runs: AIRunRecord[];
  expandedEvidence: string;
  setExpandedEvidence: (id: string) => void;
}) {
  const { runs, expandedEvidence, setExpandedEvidence } = props;
  return (
    <Card className="pr-card-full" style={cardStyle}>
      <CardHeader>
        <CardTitle className="text-[11px] font-extrabold uppercase tracking-[0.15em] !text-ink-soft !font-extrabold">
          Evidence
        </CardTitle>
      </CardHeader>
      <CardContent>
        {runs.length === 0 ? (
          <p className="text-sm text-ink-soft">No runs yet. Start an AI task.</p>
        ) : (
          <Accordion
            type="single"
            value={expandedEvidence}
            onValueChange={v => setExpandedEvidence(typeof v === 'string' ? v : '')}
          >
            {runs.map(run => (
              <AccordionItem key={run.id} value={run.id}>
                <AccordionTrigger>
                  <span className="flex items-center gap-2 min-w-0 w-full">
                    <span
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        run.status === 'verified'
                          ? 'bg-match'
                          : run.status === 'running'
                            ? 'bg-gold animate-pulse'
                            : run.status === 'rejected'
                              ? 'bg-rose'
                              : 'bg-ink-faint'
                      }`}
                    />
                    <span className="truncate flex-1 text-left">{run.title}</span>
                    <span
                      className={`text-[10px] font-mono shrink-0 ${
                        run.status === 'verified' ? 'text-match' : 'text-ink-muted'
                      }`}
                    >
                      {run.cost}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="rounded-xl bg-ink/5 border border-ink-faint/10 p-3 space-y-2 text-[11px] font-mono text-ink-soft mb-2">
                    <div className="flex justify-between gap-2">
                      <span>Model</span>
                      <span className="text-ink truncate">{run.evidence.modelPath}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Receipt</span>
                      <span className="text-ink">{run.evidence.receiptId}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span>SHA-256</span>
                      <span className="text-ink truncate" title={run.evidence.hash}>
                        {run.evidence.hash ? `${run.evidence.hash.slice(0, 16)}…` : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tokens</span>
                      <span className="text-gold">{run.tokens.toLocaleString()}</span>
                    </div>
                  </div>
                  {run.output && (
                    <pre className="rounded-xl bg-paper-deep border border-ink-faint/15 p-3 text-[10px] font-mono text-ink-soft whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed">
                      {run.output}
                    </pre>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
