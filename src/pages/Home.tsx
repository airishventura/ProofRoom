import { ArrowRight, Sparkles, Lock, Database, Check, Globe, X } from 'lucide-react';
import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FileIngestionService, IngestError } from '../services/ingestion-real';
import { useRoom } from '../context/RoomContext';

export default function HomePage() {
  const { roomId } = useRoom();
  const [showDemo, setShowDemo] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<{ documentId?: string; chunksCreated?: number; receiptId?: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const handleRealUpload = useCallback(async () => {
    if (!uploadFile) return;
    setErr(null);
    try {
      const result = await FileIngestionService.ingestFile(uploadFile, 'private', roomId);
      setUploadResult(result);
      setShowDemo(false);
      setTimeout(() => setUploadResult(null), 6000);
    } catch (e) {
      setErr(e instanceof IngestError ? e.message : 'Ingest failed');
    }
  }, [uploadFile, roomId]);

  return (
    <div className="hero-pattern relative overflow-hidden">
      <div className="absolute -top-40 -right-20 w-[600px] h-[600px] rounded-full border border-gold/5 pointer-events-none" />
      <div className="absolute top-[40%] -left-32 w-[400px] h-[400px] rounded-full border border-gold/5 pointer-events-none" />

      <main className="mx-auto max-w-6xl px-4 sm:px-8 md:px-14 pt-14 sm:pt-20 md:pt-28 pb-16 sm:pb-20 md:pb-32">
        <section className="max-w-4xl animate-[fadeUp_0.9s_ease-out] mb-20 sm:mb-32 md:mb-44">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-ink-faint bg-paper-deep px-3 sm:px-4 py-1.5 mb-8 sm:mb-10 text-[10px] sm:text-[11px] font-medium tracking-[0.12em] text-ink-muted max-w-full">
            <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse shrink-0" />
            <span className="truncate">End-to-end workspace · Business-grade verification</span>
          </div>
          <h1 className="font-display text-[2.75rem] leading-[0.9] sm:text-6xl md:text-8xl lg:text-9xl sm:leading-[0.88] tracking-tight text-ink mb-6 sm:mb-8">
            Create a room.<br />
            <span className="italic text-ink-faint">Run verified AI.</span><br />
            Publish with proof.
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-ink-soft leading-relaxed max-w-2xl mb-8 sm:mb-12 font-light">
            Private endpoints. Verified AI runs with cryptographic receipts. Approval gates. Client-ready microsites.
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
            <Link to="/workspace" className="inline-flex items-center justify-center gap-2.5 rounded-full bg-ink text-paper px-6 sm:px-8 py-3.5 sm:py-4 text-sm font-bold shadow-[0_12px_40px_rgba(10,10,12,0.15)] hover:-translate-y-0.5 transition-all duration-300">
              Enter Workspace <ArrowRight className="h-4 w-4" />
            </Link>
            <button onClick={() => setShowDemo(true)} className="inline-flex items-center justify-center gap-2.5 rounded-full border border-ink-faint bg-paper-deep px-6 sm:px-8 py-3.5 sm:py-4 text-sm font-medium text-ink hover:border-gold/30 hover:-translate-y-0.5 transition-all duration-300">
              <Sparkles className="h-4 w-4 text-gold" /> Upload Demo Document
            </button>
          </div>
        </section>

        {showDemo && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-void-deep/70 backdrop-blur-xl p-6" onClick={() => setShowDemo(false)}>
            <div className="glass-card rounded-3xl p-8 md:p-10 max-w-md w-full shadow-[0_32px_80px_rgba(0,0,0,0.25)] animate-[fadeUp_0.3s_ease-out]" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display text-2xl">Real Document Ingestion</h3>
                <button onClick={() => setShowDemo(false)} className="h-8 w-8 rounded-full bg-ink text-paper flex items-center justify-center hover:bg-ink-soft transition-colors"><X className="h-4 w-4" /></button>
              </div>
              <p className="text-sm text-ink-soft mb-4">Text files only (.txt .md .csv .json). Room: {roomId}</p>
              <input
                type="file"
                accept=".txt,.md,.markdown,.csv,.json,.jsonl,.xml,.yaml,.yml,.log"
                onChange={e => { const f = e.target.files?.[0]; if (f) setUploadFile(f); setErr(null); }}
                className="w-full mb-3 rounded-xl bg-paper-deep border border-ink-faint/30 px-4 py-3 text-sm text-ink file:mr-4 file:rounded-lg file:border-0 file:bg-gold-soft file:px-3 file:py-1 file:text-xs file:font-bold file:text-gold-deep cursor-pointer"
              />
              {err && <p className="text-[11px] text-rose mb-3">{err}</p>}
              <button onClick={handleRealUpload} disabled={!uploadFile} className="w-full rounded-xl bg-ink text-paper px-4 py-3 text-sm font-bold hover:bg-ink-soft transition-colors shadow-lg shadow-ink/10 disabled:opacity-30 disabled:cursor-not-allowed">
                Ingest with Chunk Extraction
              </button>
            </div>
          </div>
        )}

        {uploadResult && (
          <div className="fixed bottom-6 right-6 z-[60] animate-[fadeUp_0.3s_ease-out]">
            <div className="rounded-2xl bg-ink text-paper px-6 py-4 shadow-[0_16px_48px_rgba(10,10,12,0.2)] flex items-center gap-4 max-w-md">
              <Check className="h-6 w-6 text-gold shrink-0" />
              <div>
                <p className="text-sm font-bold">Document ingested</p>
                <p className="text-xs text-paper/70 font-mono">{uploadResult.documentId} · {uploadResult.chunksCreated} chunks · {uploadResult.receiptId}</p>
              </div>
            </div>
          </div>
        )}

        <section className="mb-36 md:mb-48">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
            {[
              { title: 'Private Workspace', sub: 'Private / Shared Endpoints', desc: 'Encrypted ingestion with endpoint isolation. Every document verified. Every action signed.', link: '/workspace', icon: Lock },
              { title: 'Agent Workflows', sub: 'Orchestration', desc: 'Five-step pipeline with approval gates: ingestion → verification → analysis → approval → report.', link: '/workspace', icon: Sparkles },
              { title: 'Audit + Publish', sub: 'Evidence trail', desc: 'SHA-256 sealed runs. Publish read-only microsites with citations.', link: '/audit', icon: Database },
            ].map(f => (
              <Link key={f.title} to={f.link} className="glass-card p-8 block hover:-translate-y-1 transition-all">
                <f.icon className="h-6 w-6 text-gold mb-4" />
                <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-ink-faint mb-2">{f.sub}</p>
                <h3 className="font-display text-2xl tracking-tight mb-2">{f.title}</h3>
                <p className="text-sm text-ink-soft leading-relaxed">{f.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="glass-card p-10 md:p-14 text-center">
          <Globe className="h-8 w-8 text-gold mx-auto mb-4" />
          <h2 className="font-display text-3xl md:text-4xl mb-3">Ship client-ready proof</h2>
          <p className="text-ink-soft max-w-lg mx-auto mb-6">Switch rooms in the nav. Unlock private endpoints. Run tasks. Approve. Publish.</p>
          <Link to="/workspace" className="inline-flex items-center gap-2 rounded-full bg-ink text-paper px-6 py-3 text-sm font-bold">
            Open workspace <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </main>
    </div>
  );
}
