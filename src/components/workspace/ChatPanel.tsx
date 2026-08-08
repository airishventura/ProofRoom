import type { CSSProperties } from 'react';
import { FileText, Send, Bot, ClipboardPaste } from 'lucide-react';
import type { ChatMessage } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../lib-ary/card/Card';
import { Input } from '../lib-ary/input/Input';
import { Button } from '../lib-ary/button/Button';

const cardStyle = {
  width: '100%',
  maxWidth: 'none',
  '--lib-card-radius': '16px',
  '--lib-card-padding': '20px',
} as CSSProperties;

export function ChatPanel(props: {
  roomId: string;
  apiMode: boolean;
  chat: ChatMessage[];
  input: string;
  setInput: (v: string) => void;
  streaming: boolean;
  onSend: () => void;
  onChatFromClipboard: () => void;
}) {
  const { roomId, apiMode, chat, input, setInput, streaming, onSend, onChatFromClipboard } = props;
  return (
    <Card className="pr-card-full" style={cardStyle}>
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-ink/5 border border-ink-faint/20 flex items-center justify-center">
            <Bot className="h-4 w-4 text-ink" />
          </div>
          <div className="min-w-0">
            <CardTitle>Agent: ProofEngine v2</CardTitle>
            <CardDescription>
              {apiMode ? 'Mistral stream · verified chunks' : 'Local retrieval'} · {roomId}
            </CardDescription>
          </div>
          <span className="ml-auto text-[10px] font-extrabold text-match uppercase tracking-wider">
            {streaming ? '…' : 'Live'}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-2xl bg-paper-deep border border-ink-faint/20 p-5 mb-4 min-h-[200px] max-h-[340px] overflow-y-auto space-y-3">
          {chat.length === 0 && <p className="text-sm text-ink-soft">Ask a question about verified documents.</p>}
          {chat.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 border ${
                  msg.role === 'user' ? 'bg-gold-soft border-gold/20' : 'bg-ink/5 border-ink-faint/20'
                }`}
              >
                {msg.role === 'user' ? (
                  <FileText className="h-4 w-4 text-gold" />
                ) : (
                  <Bot className="h-4 w-4 text-ink" />
                )}
              </div>
              <div
                className={`max-w-[85%] md:max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-gold-soft border border-gold/10 rounded-tr-sm'
                    : 'bg-ink/5 border border-ink-faint/20 rounded-tl-sm'
                }`}
              >
                <p className={`whitespace-pre-wrap ${msg.role === 'user' ? 'text-ink' : 'text-ink-soft'}`}>
                  {msg.text || (streaming && i === chat.length - 1 ? '…' : '')}
                </p>
                {msg.verified && (
                  <p className="mt-1.5 text-[10px] font-mono text-match">Verified · {msg.receipt}</p>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 items-stretch">
          <Button
            type="button"
            variant="icon"
            onClick={onChatFromClipboard}
            disabled={streaming}
            title="Fill input from last copied clipboard text"
            aria-label="Paste from clipboard into chat"
          >
            <ClipboardPaste className="h-4 w-4" />
          </Button>
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onSend()}
            placeholder="Ask about verified documents… or paste last copied"
            disabled={streaming}
            className="pr-input-full flex-1"
            style={{ width: '100%', maxWidth: 'none' }}
          />
          <Button
            type="button"
            variant="primary"
            onClick={onSend}
            disabled={streaming}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
