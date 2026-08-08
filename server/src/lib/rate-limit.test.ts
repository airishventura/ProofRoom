import { describe, expect, it } from 'vitest';
import { rateLimit, rateLimitAsync } from './rate-limit.js';

describe('rateLimit', () => {
  it('allows up to limit then blocks', () => {
    const key = `test-${Date.now()}-${Math.random()}`;
    const opts = { limit: 3, windowMs: 60_000 };
    expect(rateLimit(key, opts).ok).toBe(true);
    expect(rateLimit(key, opts).ok).toBe(true);
    expect(rateLimit(key, opts).ok).toBe(true);
    const blocked = rateLimit(key, opts);
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it('async memory path matches sync', async () => {
    const key = `async-${Date.now()}-${Math.random()}`;
    const opts = { limit: 2, windowMs: 60_000 };
    expect((await rateLimitAsync(key, opts)).ok).toBe(true);
    expect((await rateLimitAsync(key, opts)).ok).toBe(true);
    expect((await rateLimitAsync(key, opts)).ok).toBe(false);
  });
});
