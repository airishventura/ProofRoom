import { BadgeCheck, FileText, ShieldCheck } from 'lucide-react';
import { DocumentRecord, AIRunRecord } from '../services/api';

interface Props {
  docs: DocumentRecord[];
  runs: AIRunRecord[];
  name: string;
  endpoint: string;
}

export default function ReportPortal({ docs, runs, name, endpoint }: Props) {
  const verifiedDocs = docs.filter(d => d.verified);
  const verifiedRuns = runs.filter(r => r.status === 'verified');
  const publishedAt = new Date().toISOString();

  return (
    <div className="min-h-screen bg-void text-text font-sans selection:bg-gold/25 selection:text-text">
      {/* Header */}
      <nav className="sticky top-0 z-50 border-b border-border/20 backdrop-blur-xl bg-void-deep/60">
        <div className="mx-auto max-w-5xl px-6 md:px-12 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-4 w-4 text-gold" />
            <span className="font-serif text-base text-text-muted">Proof<span className="text-gold">Room</span></span>
          </div>
          <span className="text-[10px] font-extrabold text-teal uppercase tracking-wider">Public · Read-Only · Verified</span>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-6 md:px-12 py-16 md:py-24">
        {/* Hero Card */}
        <div className="glass-strong rounded-[28px] overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.5)] mb-12">
          <div className="bg-gradient-to-r from-void-soft via-void-deep to-void-soft px-8 md:px-12 py-10 md:py-14 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gold/[0.04] rounded-full -translate-y-1/3 translate-x-1/4 blur-[100px]" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full bg-gold-soft border border-gold/15 px-3 py-1 text-[10px] font-extrabold text-gold uppercase tracking-[0.15em] mb-6 shadow-[0_0_16px_rgba(200,164,110,0.1)]">
                <BadgeCheck className="h-3 w-3" /> Verified Report
              </div>
              <h1 className="font-serif text-4xl md:text-6xl tracking-tight text-text mb-4">{name}</h1>
              <div className="flex items-center gap-4 text-sm text-text-dim mb-2">
                <span>Endpoint: <span className="text-text font-medium">{endpoint}</span></span>
                <span className="w-1 h-1 rounded-full bg-text-dim" />
                <span>Published: {new Date(publishedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="mt-6 flex items-center gap-4 text-xs text-text-dim font-mono">
                <span>{verifiedDocs.length} verified sources</span>
                <span className="w-1 h-1 rounded-full bg-text-dim" />
                <span>{verifiedRuns.length} verified runs</span>
                <span className="w-1 h-1 rounded-full bg-text-dim" />
                <span>Audit chain: active</span>
              </div>
            </div>
          </div>

          {/* Sections */}
          <div className="px-8 md:px-12 py-10 md:py-14 space-y-8">
            {verifiedRuns.map(run => (
              <div key={run.id} className="rounded-2xl border border-border bg-void-soft/30 p-6 md:p-8 hover:border-border-strong transition-colors">
                <h3 className="font-serif text-xl md:text-2xl tracking-tight mb-3">{run.title}</h3>
                <p className="text-sm leading-relaxed text-text-muted mb-4">{run.meta}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                  {[
                    { label: 'Model Path', value: run.evidence.modelPath },
                    { label: 'Receipt ID', value: run.evidence.receiptId },
                    { label: 'Cost', value: run.evidence.cost },
                    { label: 'Hash', value: run.evidence.hash },
                  ].map(cell => (
                    <div key={cell.label} className="rounded-xl bg-ink/30 px-3 py-3">
                      <p className="text-[10px] text-text-dim font-medium uppercase tracking-wide mb-0.5">{cell.label}</p>
                      <p className="text-[11px] font-mono text-text truncate">{cell.value}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-violet">
                  <BadgeCheck className="h-3 w-3" /> Evidence verified at {new Date(run.evidence.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} UTC
                </div>
              </div>
            ))}

            {/* Source Documents */}
            <div className="pt-4">
              <h3 className="font-serif text-xl tracking-tight mb-5">Verified Source Documents</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {verifiedDocs.map(doc => (
                  <a key={doc.id} href="#" className="rounded-xl border border-border bg-void-soft/20 px-5 py-4 hover:border-border-strong hover:bg-void-soft/30 transition-colors group block">
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-text-dim shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-text group-hover:text-gold transition-colors truncate">{doc.name}</h4>
                        <p className="text-[11px] text-text-dim font-mono">{doc.type} · {doc.size} · {doc.chunks} chunks</p>
                        {doc.sourceText && (
                          <p className="text-[11px] text-text-muted mt-2 leading-relaxed line-clamp-2">{doc.sourceText}</p>
                        )}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
