/**
 * ProofRoom pricing (v1) — deterministic, token-based usage.
 *
 * A Subscription — room/month base (mock ledger)
 * B Usage margin — sealed AI runs + chat ($ / 1k tokens)
 * C Publishing   — fixed add-on when report is sealed
 * D Services     — manual only (not auto-metered)
 */

export type RevenueModel = 'A' | 'B' | 'C' | 'D';

export const PRICING = {
  /** Model A — mock room subscription (USD / room / month) */
  subscriptionRoomMonthUsd: 99,

  /** Model B — sealed AI run usage ($ per 1k tokens, incl. estimated prompt) */
  runUsdPer1kTokens: 2.5,
  runMinUsd: 0.05,
  /** Fixed prompt overhead for a task run (system + retrieval stub) */
  runPromptTokensBase: 400,
  /** Extra prompt tokens per verified chunk consulted */
  runPromptTokensPerChunk: 80,

  /** Model B — chat stream ($ per 1k output tokens; cheaper than sealed runs) */
  chatUsdPer1kTokens: 0.8,
  chatMinUsd: 0.01,
  chatPromptTokensBase: 200,

  /** Model C — publish microsite / sealed report */
  publishUsd: 49,
} as const;

export function estimateTokensFromText(text: string): number {
  return Math.max(1, Math.round((text || '').length / 4));
}

export function estimateRunTokens(opts: {
  outputText: string;
  chunkCount?: number;
}): number {
  const out = estimateTokensFromText(opts.outputText);
  const prompt =
    PRICING.runPromptTokensBase +
    Math.max(0, opts.chunkCount || 0) * PRICING.runPromptTokensPerChunk;
  return out + prompt;
}

export function estimateChatTokens(opts: {
  outputText: string;
  inputText?: string;
}): number {
  return (
    estimateTokensFromText(opts.outputText) +
    (opts.inputText ? estimateTokensFromText(opts.inputText) : 0) +
    PRICING.chatPromptTokensBase
  );
}

/** USD amount from tokens at $/1k rate, with a floor. */
export function usdFromTokens(
  tokens: number,
  usdPer1k: number,
  minUsd: number
): number {
  const raw = (Math.max(0, tokens) / 1000) * usdPer1k;
  const amount = Math.max(minUsd, raw);
  return Math.round(amount * 100) / 100;
}

export function costRunUsd(tokens: number): number {
  return usdFromTokens(tokens, PRICING.runUsdPer1kTokens, PRICING.runMinUsd);
}

export function costChatUsd(tokens: number): number {
  return usdFromTokens(tokens, PRICING.chatUsdPer1kTokens, PRICING.chatMinUsd);
}

export function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function parseUsd(cost: string | null | undefined): number {
  if (!cost || cost === '—' || cost === '…') return 0;
  const n = parseFloat(String(cost).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/** Price a sealed run end-to-end. */
export function priceSealedRun(opts: {
  outputText: string;
  chunkCount?: number;
}): { tokens: number; amountUsd: number; cost: string } {
  const tokens = estimateRunTokens(opts);
  const amountUsd = costRunUsd(tokens);
  return { tokens, amountUsd, cost: formatUsd(amountUsd) };
}

/** Price a chat turn. */
export function priceChat(opts: {
  outputText: string;
  inputText?: string;
}): { tokens: number; amountUsd: number; cost: string } {
  const tokens = estimateChatTokens(opts);
  const amountUsd = costChatUsd(tokens);
  return { tokens, amountUsd, cost: formatUsd(amountUsd) };
}
