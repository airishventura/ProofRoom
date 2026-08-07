import { describe, expect, it } from 'vitest';
import {
  costChatUsd,
  costRunUsd,
  formatUsd,
  parseUsd,
  priceChat,
  priceSealedRun,
  PRICING,
} from './pricing';

describe('pricing', () => {
  it('run cost scales with tokens and floors at min', () => {
    expect(costRunUsd(0)).toBe(PRICING.runMinUsd);
    expect(costRunUsd(1000)).toBe(PRICING.runUsdPer1kTokens);
    expect(costRunUsd(4000)).toBe(PRICING.runUsdPer1kTokens * 4);
  });

  it('chat is cheaper per token than runs', () => {
    expect(costChatUsd(1000)).toBeLessThan(costRunUsd(1000));
  });

  it('priceSealedRun is deterministic for same output/chunks', () => {
    const a = priceSealedRun({ outputText: 'hello world result', chunkCount: 2 });
    const b = priceSealedRun({ outputText: 'hello world result', chunkCount: 2 });
    expect(a).toEqual(b);
    expect(a.cost).toMatch(/^\$\d+\.\d{2}$/);
    expect(a.tokens).toBeGreaterThan(0);
  });

  it('more chunks increases run price', () => {
    const few = priceSealedRun({ outputText: 'x'.repeat(400), chunkCount: 1 });
    const many = priceSealedRun({ outputText: 'x'.repeat(400), chunkCount: 20 });
    expect(many.amountUsd).toBeGreaterThanOrEqual(few.amountUsd);
  });

  it('publish fee is fixed SKU', () => {
    expect(PRICING.publishUsd).toBe(49);
    expect(formatUsd(PRICING.publishUsd)).toBe('$49.00');
  });

  it('parseUsd handles dash placeholders', () => {
    expect(parseUsd('—')).toBe(0);
    expect(parseUsd('$12.50')).toBe(12.5);
  });

  it('priceChat includes prompt base', () => {
    const p = priceChat({ outputText: 'hi', inputText: 'q' });
    expect(p.tokens).toBeGreaterThan(PRICING.chatPromptTokensBase);
  });
});
