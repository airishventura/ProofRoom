import { ShieldCheck } from 'lucide-react';
import { RunService } from '../services/api';

export default function AuditPage() {
  const runs = RunService.getAll();
  return (
    <div className="min-h-screen bg-paper">
      <header className="glass-nav sticky top-0 z-50">
        <div className="mx-auto max-w-5xl px-8 md:px-14 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-gold/20 to-match/20 border border-gold/15 flex items-center justify-center shadow-[0_0_20px_rgba(196,123,78,0.1)]">
              <ShieldCheck className="h-4.5 w-4.5 text-gold" strokeWidth={2.5} />
            </div>
            <span className="font-display text-xl tracking-tight">Proof<span className="text-gold">Room</span></span>
          </a>
          <nav className="hidden md:flex items-center gap-10 text-[13px] font-medium text-ink-soft">
            <a href="/" className="hover:text-ink transition-colors">Home</a>
            <a href="/workspace" className="hover:text-ink transition-colors">Workspace</a>
            <a href="/audit" className="text-gold">Audit</a>
            <a href="/publish" className="hover:text-ink transition-colors">Publish</a>
            <a href="/approvals" className="hover:text-ink transition-colors">Approvals</a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-8 md:px-14 py-14 md:py-20">
        <div className="mb-12 animate-[fadeUp_0.6s_ease-out]">
          <h1 className="font-display text-5xl md:text-7xl tracking-tight text-ink mb-3">Audit Layer</h1>
          <p className="text-ink-soft text-lg max-w-xl leading-relaxed">Every AI output carries model path, receipt ID, cost history, verification hash, token count, and timestamp.</p>
        </div>

        <div className="space-y-5">
          {runs.map(run => (
            <div key={run.id} className="glass-card p-8 md:p-10 hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="font-display text-2xl md:text-3xl tracking-tight mb-1">{run.title}</h2>
                  <p className="text-sm text-ink-soft">{run.model}</p>
                </div>
                <span className={`text-[10px] font-extrabold uppercase tracking-[0.12em] px-3 py-1 rounded-full border ${run.status === 'verified' ? 'bg-match-soft text-match border-match/20' : 'bg-gold-soft text-gold-deep border-gold/15'}`}>{run.status}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[
                  { label: 'Model Path', value: run.evidence.modelPath },
                  { label: 'Receipt ID', value: run.evidence.receiptId },
                  { label: 'Cost', value: run.evidence.cost },
                  { label: 'Verification Hash', value: run.evidence.hash },
                ].map(cell => (
                  <div key={cell.label} className="rounded-xl bg-paper-deep border border-ink-faint/20 px-4 py-3">
                    <p className="text-[10px] text-ink-faint font-medium uppercase tracking-wide mb-1">{cell.label}</p>
                    <p className="text-[11px] font-mono text-ink truncate">{cell.value}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 text-xs font-mono text-ink-faint">
                <span>Tokens: <span className="text-gold font-medium">{run.tokens.toLocaleString()}</span></span>
                <span>·</span>
                <span>Chunks: <span className="text-ink font-medium">{run.chunks}</span></span>
                <span>·</span>
                <span>Timestamp: {run.evidence.timestamp}</span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
