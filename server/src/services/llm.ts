import OpenAI from 'openai';
import { config } from '../config.js';
import { query } from '../db/pool.js';

function client(): OpenAI | null {
  if (!config.llmApiKey || !config.llmBaseUrl) return null;
  return new OpenAI({
    apiKey: config.llmApiKey,
    baseURL: config.llmBaseUrl,
  });
}

export async function retrieveContext(roomId: string, question: string, limit = 4) {
  const res = await query<{ text: string; name: string; document_id: string }>(
    `SELECT c.text, d.name, c.document_id
     FROM chunks c
     JOIN documents d ON d.id = c.document_id
     WHERE c.room_id = $1 AND d.verified = true
     ORDER BY c.idx ASC
     LIMIT 50`,
    [roomId]
  );
  const q = question.toLowerCase().split(/\W+/).filter(t => t.length > 3);
  const scored = res.rows
    .map(r => {
      const lower = r.text.toLowerCase();
      const score = q.reduce((s, t) => s + (lower.includes(t) ? 1 : 0), 0);
      return { ...r, score };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  if (!scored.length && res.rows.length) {
    return res.rows.slice(0, limit).map(r => ({ ...r, score: 0 }));
  }
  return scored;
}

export async function* streamChat(roomId: string, question: string) {
  const ctx = await retrieveContext(roomId, question);
  const contextBlock = ctx.map((c, i) => `[${i + 1}] (${c.name}) ${c.text}`).join('\n\n');
  const system =
    'You are ProofEngine v2, a due-diligence assistant. Answer only from the provided verified sources. Cite document names. If unknown, say so. Be concise and professional.';

  const openai = client();
  if (!openai) {
    const text = ctx.length
      ? `Retrieved ${ctx.length} passage(s):\n\n${contextBlock}\n\nSources: ${[...new Set(ctx.map(c => c.name))].join(' · ')}\n\n(Note: no LLM API key — local retrieval only. Set MISTRAL_API_KEY in server/.env)`
      : 'No verified document chunks in this room. Upload and verify sources first.';
    for (const word of text.split(/(\s+)/)) {
      yield word;
      await new Promise(r => setTimeout(r, 8));
    }
    return { citations: ctx.map(c => c.document_id), model: 'local-retrieval' };
  }

  const stream = await openai.chat.completions.create({
    model: config.llmModel,
    stream: true,
    messages: [
      { role: 'system', content: system },
      {
        role: 'user',
        content: `Verified sources:\n${contextBlock || '(none)'}\n\nQuestion: ${question}`,
      },
    ],
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
  return {
    citations: ctx.map(c => c.document_id),
    model: `${config.llmProvider}:${config.llmModel}`,
  };
}
