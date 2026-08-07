/* ------------------------------------------------------------------ */
/*  Page: Workspace — Full service integration                           */
/* ------------------------------------------------------------------ */

import { useState, useCallback, useEffect } from 'react';
import { FileText, Send, Bot, Sparkles, ShieldCheck } from 'lucide-react';
import { DocumentService, RunService, ChatService } from '../services/api';
import type { DocumentRecord, AIRunRecord, ChatMessage } from '../services/api';

export default function WorkspacePage() {
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [runs, setRuns] = useState<AIRunRecord[]>([]);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [expandedDoc, setExpandedDoc] = useState<string>('d1');
  const [expandedEvidence, setExpandedEvidence] = useState<string>('run1');

  useEffect(() => {
    setDocs(DocumentService.getAll('r1'));
    setRuns(RunService.getAll());
    setChat(ChatService.getAll());
  }, []);

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    const msg: ChatMessage = { role: 'user', text: input, verified: false, receipt: '' };
    ChatService.add(msg);
    setChat(c => [...c, msg]);
    setInput('');
    setTimeout(() => {
      const resp: ChatMessage = { role: 'agent', text: 'Evidence linked. Audit receipt verified.', verified: true, receipt: '#REC-' + Math.floor(Math.random() * 9000 + 1000) };
      ChatService.add(resp);
      setChat(c => [...c, resp]);
    }, 1200);
  }, [input]);

  const toggleDocVerification = useCallback((id: string) => {
    const doc = docs.find(d => d.id === id);
    if (!doc) return;
    if (!doc.verified) DocumentService.verify(id);
    else DocumentService.unverify(id);
    setDocs(DocumentService.getAll('r1'));
  }, [docs]);



  const verifiedDocs = docs.filter(d => d.verified).length;
  const verifiedRuns = runs.filter(r => r.status === 'verified').length;

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
            <a href="/workspace" className="text-gold">Workspace</a>
            <a href="/audit" className="hover:text-ink transition-colors">Audit</a>
            <a href="/publish" className="hover:text-ink transition-colors">Publish</a>
            <a href="/approvals" className="hover:text-ink transition-colors">Approvals</a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-8 md:px-14 py-14 md:py-20">
        <div className="mb-10 animate-[fadeUp_0.6s_ease-out]">
          <div className="flex items-center gap-3 mb-3">
            <h1 className="font-display text-5xl md:text-7xl tracking-tight text-ink">Workspace</h1>
            <span className="text-[10px] font-extrabold uppercase tracking-[0.15em] px-2.5 py-1 rounded-full bg-gold-soft text-gold-deep border border-gold/15">Private Endpoint</span>
          </div>
          <p className="text-ink-soft text-lg max-w-xl leading-relaxed">Verified {verifiedDocs} documents · {verifiedRuns} runs · Audit chain active.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8 md:gap-10">
          <aside className="space-y-6">
            <section className="glass-card p-7 md:p-8">
              <h2 className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-ink-soft mb-5">Uploaded Documents</h2>
              <div className="space-y-2.5">
                {docs.map(doc => (
                  <button key={doc.id} onClick={() => setExpandedDoc(expandedDoc === doc.id ? '' : doc.id)} className={`w-full text-left rounded-2xl border px-4 py-3.5 transition-all duration-300 ${expandedDoc === doc.id ? 'border-gold/30 bg-gold-soft shadow-[0_4px_16px_rgba(196,123,78,0.08)]' : 'border-ink-faint/30 bg-paper-deep hover:border-ink-faint/50'}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className={`h-4 w-4 shrink-0 ${doc.verified ? 'text-match' : 'text-ink-faint'}`} />
                        <span className="text-sm font-medium text-ink truncate">{doc.name}</span>
                      </div>
                      <button onClick={e => { e.stopPropagation(); toggleDocVerification(doc.id); }} className={`text-[10px] font-mono ${doc.verified ? 'text-match' : 'text-ink-faint'}`}>{doc.verified ? 'Verified' : 'Pending'}</button>
                    </div>
                    <div className={`overflow-hidden transition-all duration-300 ${expandedDoc === doc.id ? 'max-h-40 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                      <div className="rounded-xl bg-ink/5 border border-ink-faint/20 px-3 py-3 text-[11px] font-mono text-ink-soft space-y-1">
                        <div className="flex justify-between"><span>Endpoint</span><span>{doc.endpoint}</span></div>
                        <div className="flex justify-between"><span>Chunks</span><span>{doc.chunks}</span></div>
                        <div className="flex justify-between"><span>Size</span><span>{doc.size}</span></div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className="glass-card p-7 md:p-8">
              <h2 className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-ink-soft mb-5">Evidence & Audit</h2>
              <div className="space-y-2">
                {runs.map(run => (
                  <div key={run.id} className="rounded-xl border border-ink-faint/20 bg-paper-deep overflow-hidden">
                    <button onClick={() => setExpandedEvidence(expandedEvidence === run.id ? '' : run.id)} className="w-full text-left px-4 py-3 hover:bg-paper transition-colors flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`h-2 w-2 rounded-full shrink-0 ${run.status === 'verified' ? 'bg-match' : run.status === 'running' ? 'bg-gold animate-pulse' : 'bg-ink-faint'}`} />
                        <span className="text-sm font-medium text-ink truncate">{run.title}</span>
                      </div>
                      <span className={`text-[10px] font-mono ${run.status === 'verified' ? 'text-match' : 'text-ink-faint'}`}>{run.cost}</span>
                    </button>
                    <div className={`overflow-hidden transition-all duration-300 ${expandedEvidence === run.id ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}>
                      <div className="px-4 pb-4 pt-1 border-t border-ink-faint/10">
                        <div className="rounded-xl bg-ink/5 border border-ink-faint/10 p-3 space-y-2 text-[11px] font-mono text-ink-soft">
                          <div className="flex justify-between"><span>Model Path</span><span className="text-ink truncate max-w-[140px]">{run.evidence.modelPath}</span></div>
                          <div className="flex justify-between"><span>Receipt ID</span><span className="text-ink">{run.evidence.receiptId}</span></div>
                          <div className="flex justify-between"><span>Cost</span><span className="text-ink">{run.evidence.cost}</span></div>
                          <div className="flex justify-between"><span>Hash</span><span className="text-ink truncate max-w-[140px]">{run.evidence.hash}</span></div>
                          <div className="flex justify-between"><span>Tokens</span><span className="text-gold">{run.tokens.toLocaleString()}</span></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </aside>

          <div className="space-y-6">
            {/* Tasks */}
            <section className="glass-card p-7 md:p-9">
              <h2 className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-ink-soft mb-6">AI Tasks</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  { title: 'Summarization', desc: 'Executive summaries from uploaded PDFs and notes.', status: 'ready', cost: '$28.40', meta: '4 docs · 28 chunks' },
                  { title: 'Q&A Across Docs', desc: 'Natural-language questions across files.', status: 'ready', cost: '$12.00', meta: '4 docs · 3 chunks' },
                  { title: 'Data Extraction', desc: 'Pull structured metrics and clauses.', status: 'ready', cost: '$15.60', meta: '2 docs · 8 chunks' },
                  { title: 'Red-Flag Detection', desc: 'Scan contracts for risk language.', status: 'ready', cost: '$45.20', meta: '2 docs · 14 chunks' },
                  { title: 'Memo Drafting', desc: 'Client-ready memos with citations.', status: 'gated', cost: 'Approval gate', meta: 'Awaiting sign-off' },
                ].map(task => (
                  <a key={task.title} href="#" className="group rounded-2xl border border-ink-faint/30 bg-paper-deep px-5 py-5 hover:border-gold/30 hover:-translate-y-0.5 transition-all duration-300 block">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-xl bg-ink/5 border border-ink-faint/20 flex items-center justify-center shadow-inner shrink-0">
                        <Sparkles className="h-5 w-5 text-gold" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-bold text-ink">{task.title}</h4>
                          <span className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${task.status === 'ready' ? 'bg-match-soft text-match' : 'bg-gold-soft text-gold-deep'}`}>{task.status}</span>
                        </div>
                        <p className="text-[11px] text-ink-soft leading-relaxed mb-2">{task.desc}</p>
                        <div className="flex items-center gap-3 text-[10px] font-mono text-ink-faint">
                          <span>{task.meta}</span>
                          <span className="text-gold">{task.cost}</span>
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </section>

            {/* Agent */}
            <section className="glass-card p-7 md:p-9 shadow-xl shadow-ink/5">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="h-8 w-8 rounded-full bg-ink/5 border border-ink-faint/20 flex items-center justify-center shadow-inner">
                  <Bot className="h-4 w-4 text-ink" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink">Agent: ProofEngine v2</h3>
                  <p className="text-[10px] text-ink-faint">Private endpoint active</p>
                </div>
                <span className="ml-auto text-[10px] font-extrabold text-match uppercase tracking-wider">Live</span>
              </div>
              <div className="rounded-2xl bg-paper-deep border border-ink-faint/20 p-5 mb-4 min-h-[200px] max-h-[340px] overflow-y-auto space-y-3">
                {chat.map((msg, i) => (
                  <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 border shadow-inner ${msg.role === 'user' ? 'bg-gold-soft border-gold/20' : 'bg-ink/5 border-ink-faint/20'}`}>
                      {msg.role === 'user' ? <FileText className="h-4 w-4 text-gold" /> : <Bot className="h-4 w-4 text-ink" />}
                    </div>
                    <div className={`max-w-[85%] md:max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-gold-soft border border-gold/10 rounded-tr-sm' : 'bg-ink/5 border border-ink-faint/20 rounded-tl-sm'}`}>
                      <p className={msg.role === 'user' ? 'text-ink' : 'text-ink-soft'}>{msg.text}</p>
                      {msg.verified && <p className="mt-1.5 text-[10px] font-mono text-match">Verified · {msg.receipt}</p>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="Ask about verified documents..." className="flex-1 rounded-xl bg-paper-deep border border-ink-faint/30 px-5 py-3 text-sm text-ink placeholder:text-ink-faint outline-none focus:border-gold/30 transition-colors" />
                <button onClick={handleSend} className="rounded-xl bg-ink text-paper px-5 py-3 text-sm font-bold hover:bg-ink-soft transition-colors shadow-lg shadow-ink/10">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
