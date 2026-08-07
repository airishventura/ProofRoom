import { ShieldCheck, ArrowRight, Sparkles, Lock, Database, Check, Globe, X } from 'lucide-react';
import { useState, useCallback } from 'react';
import { FileIngestionService } from '../services/ingestion-real';

export default function HomePage() {
  const [showDemo, setShowDemo] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const [uploadResult, setUploadResult] = useState<unknown>(null);

  const handleRealUpload = useCallback(async () => {
    if (!uploadFile) return;
    const result = await FileIngestionService.ingestFile(uploadFile, 'private');
    setUploadResult(result);
    setShowDemo(false);
    setTimeout(() => setUploadResult(null), 6000);
  }, [uploadFile]);

  return (
    <div className="min-h-screen bg-paper hero-pattern relative overflow-hidden">
      {/* Subtle decorative golden ring */}
      <div className="absolute -top-40 -right-20 w-[600px] h-[600px] rounded-full border border-gold/5 pointer-events-none" />
      <div className="absolute top-[40%] -left-32 w-[400px] h-[400px] rounded-full border border-gold/5 pointer-events-none" />

      <nav className="glass-nav sticky top-0 z-50">
        <div className="mx-auto max-w-6xl px-8 md:px-14 h-20 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-gold/20 to-match/20 border border-gold/15 flex items-center justify-center shadow-[0_0_20px_rgba(196,123,78,0.12)]">
              <ShieldCheck className="h-5 w-5 text-gold" strokeWidth={2.5} />
            </div>
            <span className="font-display text-2xl tracking-tight">Proof<span className="text-gold">Room</span></span>
          </a>
          <div className="hidden md:flex items-center gap-10 text-[13px] font-medium text-ink-soft">
            <a href="/workspace" className="hover:text-ink transition-colors">Workspace</a>
            <a href="/audit" className="hover:text-ink transition-colors">Audit</a>
            <a href="/publish" className="hover:text-ink transition-colors">Publish</a>
            <a href="/approvals" className="hover:text-ink transition-colors">Approvals</a>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-8 md:px-14 pt-28 md:pt-40 pb-20 md:pb-32">
        {/* Hero */}
        <section className="max-w-4xl animate-[fadeUp_0.9s_ease-out] mb-32 md:mb-44">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-ink-faint bg-paper-deep px-4 py-1.5 mb-10 text-[11px] font-medium tracking-[0.12em] text-ink-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" /> End-to-end workspace · Business-grade verification
          </div>
          <h1 className="font-display text-6xl md:text-8xl lg:text-9xl leading-[0.88] tracking-tight text-ink mb-8">
            Create a room.<br />
            <span className="italic text-ink-faint">Run verified AI.</span><br />
            Publish with proof.
          </h1>
          <p className="text-xl md:text-2xl text-ink-soft leading-relaxed max-w-2xl mb-12 font-light">
            Private endpoints. Verified AI runs with cryptographic receipts. Approval gates. Client-ready microsites. Revenue tracking built in.
          </p>
          <div className="flex flex-wrap gap-4">
            <a href="/workspace" className="inline-flex items-center gap-2.5 rounded-full bg-ink text-paper px-8 py-4 text-sm font-bold shadow-[0_12px_40px_rgba(10,10,12,0.15)] hover:-translate-y-0.5 hover:shadow-[0_16px_48px_rgba(10,10,12,0.2)] transition-all duration-300">
              Enter Workspace <ArrowRight className="h-4 w-4" />
            </a>
            <button onClick={() => setShowDemo(true) as unknown as void} className="inline-flex items-center gap-2.5 rounded-full border border-ink-faint bg-paper-deep px-8 py-4 text-sm font-medium text-ink hover:border-gold/30 hover:-translate-y-0.5 transition-all duration-300">
              <Sparkles className="h-4 w-4 text-gold" /> Upload Demo Document
            </button>
          </div>
        </section>

        {/* Interactive Demo Modal */}
        {showDemo && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-void-deep/70 backdrop-blur-xl p-6" onClick={() => setShowDemo(false)}>
            <div className="glass-card rounded-3xl p-8 md:p-10 max-w-md w-full shadow-[0_32px_80px_rgba(0,0,0,0.25)] animate-[fadeUp_0.3s_ease-out]" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display text-2xl">Real Document Ingestion</h3>
                <button onClick={() => setShowDemo(false)} className="h-8 w-8 rounded-full bg-ink text-paper flex items-center justify-center hover:bg-ink-soft transition-colors"><X className="h-4 w-4" /></button>
              </div>
              <p className="text-sm text-ink-soft mb-6">Select a real file. The ingestion service will extract chunks, generate embeddings, and store evidence receipts.</p>
              <input type="file" onChange={e => { const f = e.target.files?.[0]; if (f) setUploadFile(f); }} className="w-full mb-4 rounded-xl bg-paper-deep border border-ink-faint/30 px-4 py-3 text-sm text-ink file:mr-4 file:rounded-lg file:border-0 file:bg-gold-soft file:px-3 file:py-1 file:text-xs file:font-bold file:text-gold-deep cursor-pointer" />
              <button onClick={handleRealUpload} disabled={!uploadFile} className="w-full rounded-xl bg-ink text-paper px-4 py-3 text-sm font-bold hover:bg-ink-soft transition-colors shadow-lg shadow-ink/10 disabled:opacity-30 disabled:cursor-not-allowed">
                Ingest with Chunk Extraction
              </button>
            </div>
          </div>
        )}

        {/* Upload result notification */}
        {(uploadResult as { documentId?: string; chunksCreated?: number; receiptId?: string } | null) && (
          <div className="fixed bottom-6 right-6 z-[60] animate-[fadeUp_0.3s_ease-out]">
            <div className="rounded-2xl bg-ink text-paper px-6 py-4 shadow-[0_16px_48px_rgba(10,10,12,0.2)] flex items-center gap-4 max-w-md">
              <Check className="h-6 w-6 text-gold shrink-0" />
              <div>
                <p className="text-sm font-bold">Document ingested</p>
                <p className="text-xs text-paper/70 font-mono">{(uploadResult as { documentId?: string; chunksCreated?: number; receiptId?: string })?.documentId || 'new'} · {(uploadResult as { chunksCreated?: number })?.chunksCreated || 0} chunks · {(uploadResult as { receiptId?: string })?.receiptId}</p>
              </div>
            </div>
          </div>
        )}

        {/* Feature Cards */}
        <section className="mb-36 md:mb-48">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
            {[
              { title: 'Private Workspace', sub: 'Private / Shared Endpoints', desc: 'Encrypted ingestion with endpoint isolation. Every document verified. Every action signed.', link: '/workspace', icon: Lock },
              { title: 'Verified AI', sub: 'Evidence Receipts', desc: 'Every agent response carries a cryptographic receipt: model path, cost history, hash, token count.', link: '/audit', icon: Database },
              { title: 'Publish with Proof', sub: 'Client-Ready Microsites', desc: 'One click generates a verified microsite. Every claim links to source evidence and audit receipts.', link: '/publish', icon: Globe },
              { title: 'Approval Controls', sub: 'Spend Gates', desc: 'Multi-party sign-off before execution. Budget tracking integrated. No agent exceeds its approved spend.', link: '/approvals', icon: Check },
              { title: 'Agent Workflows', sub: 'Orchestration', desc: 'Five-step pipeline with approval gates: ingestion → verification → analysis → approval → report.', link: '/workspace', icon: Sparkles },
              { title: 'Audit Trail', sub: 'Cryptographic Logs', desc: 'Append-only audit records with verification hashes linked to receipts for full chain-of-custody.', link: '/audit', icon: ShieldCheck },
            ].map(item => (
              <a key={item.title} href={item.link} className="glass-card p-8 md:p-10 block hover:-translate-y-1.5 hover:border-gold/25 transition-all duration-300 group">
                <div className="flex items-center gap-2 mb-5">
                  <div className="h-9 w-9 rounded-xl bg-ink/5 border border-ink-faint/15 flex items-center justify-center shadow-inner">
                    <item.icon className="h-4.5 w-4.5 text-gold" strokeWidth={2} />
                  </div>
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-ink-faint">{item.sub}</span>
                </div>
                <h3 className="font-display text-2xl md:text-3xl tracking-tight text-ink mb-3">{item.title}</h3>
                <p className="text-sm text-ink-soft leading-relaxed mb-5">{item.desc}</p>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gold group-hover:translate-x-1 transition-transform">
                  View page <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Stats / Metrics Section */}
        <section className="mb-20 md:mb-28">
          <div className="glass-card p-8 md:p-12 md:px-16">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
              {[
                { value: '5', label: 'Standalone Pages', desc: 'Home, Workspace, Audit, Publish, Approvals' },
                { value: '4', label: 'Verified Docs', desc: 'Private endpoint documents' },
                { value: '3', label: 'Verified Runs', desc: 'AI tasks with evidence' },
                { value: '3', label: 'Revenue Models', desc: 'SaaS, Usage Margin, Publishing, Services' },
              ].map(stat => (
                <div key={stat.label}>
                  <div className="font-display text-4xl md:text-6xl tracking-tight text-ink mb-2">{stat.value}</div>
                  <div className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink-faint">{stat.label}</div>
                  <div className="text-xs text-ink-soft mt-1">{stat.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
