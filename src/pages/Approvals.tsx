import { ShieldCheck, Check, X, CreditCard, BarChart3, Globe, Users } from 'lucide-react';

export default function ApprovalsPage() {
  return (
    <div className="min-h-screen bg-paper">
      <header className="glass-nav sticky top-0 z-50">
        <div className="mx-auto max-w-6xl px-8 md:px-14 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-gold/20 to-match/20 border border-gold/15 flex items-center justify-center shadow-[0_0_20px_rgba(196,123,78,0.1)]">
              <ShieldCheck className="h-4.5 w-4.5 text-gold" strokeWidth={2.5} />
            </div>
            <span className="font-display text-xl tracking-tight">Proof<span className="text-gold">Room</span></span>
          </a>
          <nav className="hidden md:flex items-center gap-10 text-[13px] font-medium text-ink-soft">
            <a href="/" className="hover:text-ink transition-colors">Home</a>
            <a href="/workspace" className="hover:text-ink transition-colors">Workspace</a>
            <a href="/audit" className="hover:text-ink transition-colors">Audit</a>
            <a href="/publish" className="hover:text-ink transition-colors">Publish</a>
            <a href="/approvals" className="text-gold">Approvals</a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-8 md:px-14 py-14 md:py-20">
        <div className="mb-12 animate-[fadeUp_0.6s_ease-out]">
          <h1 className="font-display text-5xl md:text-7xl tracking-tight text-ink mb-3">Approval Controls</h1>
          <p className="text-ink-soft text-lg max-w-xl leading-relaxed">Spend gates with multi-party sign-off. No agent executes above its approved budget.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8 md:gap-10">
          {/* Pending */}
          <section className="glass-card p-7 md:p-9">
            <h2 className="font-display text-2xl tracking-tight mb-6">Pending Approvals</h2>
            <div className="space-y-3">
              {[
                { title: 'Agent spend over budget threshold', amount: '$4,200', requester: 'Research Team', priority: 'High', status: 'pending' },
                { title: 'Client Report Portal upgrade', amount: '$850', requester: 'Product', priority: 'Normal', status: 'pending' },
              ].map((a, i) => (
                <div key={i} className="rounded-2xl border border-ink-faint/30 bg-paper-deep p-5 hover:border-gold/20 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-bold text-ink">{a.title}</h4>
                      <p className="text-[11px] text-ink-faint">Requested by {a.requester}</p>
                    </div>
                    <span className="text-xl font-display font-semibold text-ink">{a.amount}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-gold-soft px-2 py-0.5 text-[10px] font-extrabold text-gold-deep border border-gold/15">{a.status}</span>
                    <span className={`text-[10px] font-extrabold rounded-full px-2 py-0.5 ${a.priority === 'High' ? 'bg-rose-soft text-rose border border-rose/15' : 'bg-ink/5 text-ink-faint border border-ink-faint/10'}`}>{a.priority}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => alert('Approved: ' + a.title)} className="flex-1 rounded-xl bg-ink text-paper px-4 py-2.5 text-xs font-extrabold hover:bg-ink-soft transition-colors shadow-lg shadow-ink/10 flex items-center justify-center gap-1.5">
                      <Check className="h-3 w-3" /> Approve
                    </button>
                    <button onClick={() => alert('Rejected: ' + a.title)} className="flex-1 rounded-xl bg-paper-deep border border-ink-faint px-4 py-2.5 text-xs font-bold text-ink-soft hover:text-ink transition-colors flex items-center justify-center gap-1.5">
                      <X className="h-3 w-3" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Metrics + Revenue */}
          <div className="space-y-6 md:space-y-8">
            <section className="glass-card p-7 md:p-9">
              <h2 className="font-display text-2xl tracking-tight mb-6">Workspace Metrics</h2>
              <div className="space-y-5">
                {[
                  { label: 'Verified AI Runs', value: '3', max: '10', color: 'bg-match text-match' },
                  { label: 'Verified Documents', value: '4', max: '8', color: 'bg-gold text-gold-deep' },
                  { label: 'Pending Approvals', value: '2', max: '5', color: 'bg-rose-soft text-rose' },
                ].map(metric => (
                  <div key={metric.label}>
                    <div className="flex items-end justify-between mb-2">
                      <span className="text-xs font-medium text-ink-soft">{metric.label}</span>
                      <span className="text-2xl font-display font-semibold text-ink">{metric.value}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-paper-deep overflow-hidden border border-ink-faint/10">
                      <div className={`h-full rounded-full shimmer-gold`} style={{ width: (parseInt(metric.value) / parseInt(metric.max) * 100) + '%' }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="glass-card p-7 md:p-9">
              <h2 className="font-display text-2xl tracking-tight mb-6">Revenue Model</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { letter: 'A', title: 'Subscription', desc: 'SaaS', icon: CreditCard, color: 'text-violet' },
                  { letter: 'B', title: 'Usage Margin', desc: 'AI Margin', icon: BarChart3, color: 'text-match' },
                  { letter: 'C', title: 'Publishing', desc: 'Add-Ons', icon: Globe, color: 'text-gold' },
                  { letter: 'D', title: 'Services', desc: 'Revenue', icon: Users, color: 'text-rose' },
                ].map(m => (
                  <a href="#" key={m.letter} className="group rounded-xl border border-ink-faint/20 bg-paper-deep p-4 hover:border-gold/20 hover:-translate-y-0.5 transition-all block">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg font-display font-bold text-gold">{m.letter}</span>
                      <span className="text-xs font-bold text-ink">{m.title}</span>
                    </div>
                    <p className="text-[10px] text-ink-faint">{m.desc}</p>
                  </a>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
