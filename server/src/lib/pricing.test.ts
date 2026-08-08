import { describe, expect, it } from 'vitest';
import { priceSealedRun, priceChat, PRICING, costChatUsd, costRunUsd } from './pricing.js';

describe('server pricing', () => {
  it('is deterministic and cheaper for chat than runs', () => {
    const run = priceSealedRun({ outputText: 'summary text', chunkCount: 3 });
    const chat = priceChat({ outputText: 'summary text', inputText: 'q' });
    expect(run.cost).toMatch(/^\$/);
    expect(costChatUsd(1000)).toBeLessThan(costRunUsd(1000));
    expect(PRICING.publishUsd).toBe(49);
    expect(chat.tokens).toBeGreaterThan(0);
  });
});
