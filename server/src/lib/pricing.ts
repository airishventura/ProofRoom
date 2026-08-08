/**
 * Server pricing — keep rates aligned with src/utils/pricing.ts
 */

export type RevenueModel = 'A' | 'B' | 'C' | 'D';

export const PRICING = {
  subscriptionRoomMonthUsd: 99,
  runUsdPer1kTokens: 2.5,
  runMinUsd: 0.05,
  runPromptTokensBase: 400,
  runPromptTokensPerChunk: 80,
  chatUsdPer1kTokens: 0.8,
  chatMinUsd: 0.01,
  chatPromptTokensBase: 200,
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

export function usdFromTokens(tokens: number, usdPer1k: number, minUsd: number): number {
  const raw = (Math.max(0, tokens) / 1000) * usdPer1k;
  return Math.round(Math.max(minUsd, raw) * 100) / 100;
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

export function priceSealedRun(opts: {
  outputText: string;
  chunkCount?: number;
}): { tokens: number; amountUsd: number; cost: string } {
  const tokens = estimateRunTokens(opts);
  const amountUsd = costRunUsd(tokens);
  return { tokens, amountUsd, cost: formatUsd(amountUsd) };
}

export function priceChat(opts: {
  outputText: string;
  inputText?: string;
}): { tokens: number; amountUsd: number; cost: string } {
  const tokens = estimateChatTokens(opts);
  const amountUsd = costChatUsd(tokens);
  return { tokens, amountUsd, cost: formatUsd(amountUsd) };
}
