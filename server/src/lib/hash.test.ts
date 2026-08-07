import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { sha256Hex, evidenceHash } from './hash.js';

describe('sha256Hex', () => {
  it('matches node crypto for empty/abc/hello', () => {
    for (const s of ['', 'abc', 'hello']) {
      const ref = createHash('sha256').update(s).digest('hex');
      expect(sha256Hex(s)).toBe(ref);
    }
  });

  it('evidenceHash is stable', () => {
    const a = evidenceHash({ b: 1, a: 'x' });
    const b = evidenceHash({ a: 'x', b: 1 });
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });
});
