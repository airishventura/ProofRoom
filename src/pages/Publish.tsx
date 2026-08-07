import { ShieldCheck, Globe, BadgeCheck, FileText } from 'lucide-react';
import { PublishService, RoomService, DocumentService, RunService } from '../services/api';

export default function PublishPage() {
  const pub = PublishService.getRecord() as { roomId?: string; url?: string; hash?: string; timestamp?: string } | null;
  const room = pub ? RoomService.getById(pub.roomId || 'r1') : null;
  const docs = DocumentService.getAll('r1');
  const runs = RunService.getAll();
  const verifiedRuns = runs.filter(r => r.status === 'verified');

  return (
    <div className="min-h-screen bg-paper">
      <header className="glass-nav sticky top-0 z-50">
        <div className="mx-auto max-w-5xl px-6 md:px-10 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-gold/20 to-match/20 border border-gold/15 flex items-center justify-center shadow-[0_0_20px_rgba(196,123,78,0.1)]">
              <ShieldCheck className="h-4.5 w-4.5 text-gold" strokeWidth={2.5} />
            </div>
            <span className="font-display text-xl tracking-tight">Proof<span className="text-gold">Room</span></span>
          </a>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-ink-soft">
            <a href="/" className="hover:text-ink transition-colors">Home</a>
            <a href="/workspace" className="hover:text-ink transition-colors">Workspace</a>
            <a href="/audit" className="hover:text-ink transition-colors">Audit</a>
            <a href="/publish" className="text-gold">Publish</a>
            <a href="/approvals" className="hover:text-ink transition-colors">Approvals</a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 md:px-10 py-14 md:py-24">
        {/* Report Microsite */}
        <div className="glass-card overflow-hidden shadow-xl shadow-ink/5 mb-12">
          <div className="bg-gradient-to-r from-paper-deep to-paper px-6 md:px-10 py-4 border-b border-ink-faint/20 flex items-center gap-3 text-[11px] font-mono text-ink-faint">
            <Globe className="h-3.5 w-3.5 text-gold" />
            <span>https://proofroom.app/r/{pub?.roomId || 'r1'}</span>
            <span className="ml-auto text-[10px] font-extrabold text-match uppercase tracking-wider">Public · Read-Only</span>
          </div>
          <div className="p-8 md:p-12 md:pb-16">
            <div className="max-w-3xl">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-gold mb-3">Verified Report</div>
              <h1 className="font-display text-4xl md:text-6xl tracking-tight text-ink mb-4">{room?.name || 'Workspace Report'}</h1>
              <div className="flex items-center gap-4 text-xs text-ink-faint mb-10">
                <span>{room?.endpoint || 'shared'} endpoint</span>
                <span className="h-3 w-px bg-ink-faint/30" />
                <span>Published: Oct 14, 2025</span>
                <span className="h-3 w-px bg-ink-faint/30" />
                <span className="flex items-center gap-1 text-match font-medium"><BadgeCheck className="h-3 w-3" /> {docs.filter(d => d.verified).length} verified sources</span>
              </div>

              <div className="space-y-6">
                {verifiedRuns.map(run => (
                  <div key={run.id} className="rounded-2xl border border-ink-faint/20 bg-paper-deep p-6 md:p-7 hover:border-gold/20 transition-colors">
                    <h3 className="font-display text-xl md:text-2xl tracking-tight mb-3">{run.title}</h3>
                    <p className="text-sm text-ink-soft leading-relaxed mb-4">{run.meta}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      {[
                        { label: 'Model Path', value: run.evidence.modelPath },
                        { label: 'Receipt ID', value: run.evidence.receiptId },
                        { label: 'Cost', value: run.evidence.cost },
                        { label: 'Hash', value: run.evidence.hash },
                      ].map(cell => (
                        <div key={cell.label} className="rounded-xl bg-paper border border-ink-faint/10 px-3 py-2.5">
                          <p className="text-[10px] text-ink-faint font-medium uppercase tracking-wide">{cell.label}</p>
                          <p className="text-[10px] font-mono text-ink truncate">{cell.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-ink-faint">
                      <BadgeCheck className="h-3 w-3 text-match" /> Evidence verified · {run.tokens.toLocaleString()} tokens · {run.chunks} chunks
                    </div>
                  </div>
                ))}
              </div>

              {/* Source Documents */}
              <div className="pt-8 border-t border-ink-faint/20 mt-8">
                <h4 className="font-display text-xl tracking-tight mb-5">Verified Source Documents</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  {docs.filter(d => d.verified).map(doc => (
                    <a key={doc.id} href="#" className="rounded-2xl border border-ink-faint/20 bg-paper-deep px-5 py-4 hover:border-gold/20 hover:-translate-y-0.5 transition-all block">
                      <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-ink-faint shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <h5 className="text-sm font-bold text-ink hover:text-gold transition-colors truncate">{doc.name}</h5>
                          <p className="text-[11px] text-ink-faint font-mono">{doc.type} · {doc.size} · {doc.chunks} chunks</p>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
