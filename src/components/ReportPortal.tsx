import { BadgeCheck, FileText } from 'lucide-react';
import type { DocumentRecord, AIRunRecord } from '../services/api';
import { BrandMark } from './BrandMark';

interface Props {
  docs: DocumentRecord[];
  runs: AIRunRecord[];
  name: string;
  endpoint: string;
  publishedAt?: string;
  contentHash?: string;
}

export default function ReportPortal({ docs, runs, name, endpoint, publishedAt, contentHash }: Props) {
  const verifiedDocs = docs.filter(d => d.verified);
  const verifiedRuns = runs.filter(r => r.status === 'verified');
  const when = publishedAt ? new Date(publishedAt) : new Date();

  return (
    <div className="rounded-3xl border border-ink-faint/20 bg-paper overflow-hidden shadow-xl shadow-ink/5">
      <div className="border-b border-ink-faint/20 bg-paper-deep/80 px-4 sm:px-6 md:px-10 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-2">
        <BrandMark size="sm" />
        <span className="text-[9px] sm:text-[10px] font-extrabold text-match uppercase tracking-wider">
          Public · Read-Only · Verified
        </span>
      </div>

      <div className="px-4 sm:px-6 md:px-10 py-8 sm:py-10 md:py-12">
        <div className="inline-flex items-center gap-2 rounded-full bg-gold-soft border border-gold/15 px-3 py-1 text-[10px] font-extrabold text-gold-deep uppercase tracking-[0.15em] mb-5">
          <BadgeCheck className="h-3 w-3" /> Verified Report
        </div>
        <h1 className="font-display text-3xl md:text-5xl tracking-tight text-ink mb-3">{name}</h1>
        <div className="flex flex-wrap items-center gap-3 text-xs text-ink-faint mb-8">
          <span>Endpoint: <span className="text-ink font-medium">{endpoint}</span></span>
          <span className="h-1 w-1 rounded-full bg-ink-faint" />
          <span>Published: {when.toLocaleString()}</span>
          <span className="h-1 w-1 rounded-full bg-ink-faint" />
          <span>{verifiedDocs.length} sources · {verifiedRuns.length} runs</span>
          {contentHash && (
            <>
              <span className="h-1 w-1 rounded-full bg-ink-faint" />
              <span className="font-mono" title={contentHash}>sha256:{contentHash.slice(0, 16)}…</span>
            </>
          )}
        </div>

        <div className="space-y-6">
          {verifiedRuns.length === 0 && (
            <p className="text-sm text-ink-faint">No verified runs in this report.</p>
          )}
          {verifiedRuns.map(run => (
            <div key={run.id} className="rounded-2xl border border-ink-faint/20 bg-paper-deep p-6 md:p-7">
              <h3 className="font-display text-xl md:text-2xl tracking-tight mb-2">{run.title}</h3>
              <p className="text-sm text-ink-soft mb-3">{run.meta}</p>
              {run.output && (
                <pre className="mb-4 whitespace-pre-wrap rounded-xl bg-paper border border-ink-faint/15 p-4 text-[12px] leading-relaxed text-ink-soft font-mono max-h-48 overflow-y-auto">
                  {run.output}
                </pre>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                {[
                  { label: 'Model Path', value: run.evidence.modelPath },
                  { label: 'Receipt ID', value: run.evidence.receiptId },
                  { label: 'Cost', value: run.evidence.cost },
                  { label: 'SHA-256', value: run.evidence.hash },
                ].map(cell => (
                  <div key={cell.label} className="rounded-xl bg-paper border border-ink-faint/10 px-3 py-2.5">
                    <p className="text-[10px] text-ink-faint font-medium uppercase tracking-wide">{cell.label}</p>
                    <p className="text-[10px] font-mono text-ink truncate" title={cell.value}>{cell.value}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono text-match">
                <BadgeCheck className="h-3 w-3" /> Evidence sealed · {run.tokens.toLocaleString()} tokens
              </div>
            </div>
          ))}
        </div>

        {verifiedDocs.length > 0 && (
          <div className="pt-8 border-t border-ink-faint/20 mt-8">
            <h3 className="font-display text-xl tracking-tight mb-5">Verified Source Documents</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {verifiedDocs.map(doc => (
                <div key={doc.id} className="rounded-xl border border-ink-faint/20 bg-paper-deep px-5 py-4">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-ink-faint shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-ink truncate">{doc.name}</h4>
                      <p className="text-[11px] text-ink-faint font-mono">{doc.type} · {doc.size} · {doc.chunks} chunks</p>
                      {doc.sourceText && (
                        <p className="text-[11px] text-ink-soft mt-2 leading-relaxed line-clamp-2">{doc.sourceText}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
