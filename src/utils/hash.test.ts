import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { sha256Hex, evidenceHash } from './hash';

describe('frontend sha256', () => {
  it('matches node crypto', () => {
    for (const s of ['', 'abc', 'hello']) {
      expect(sha256Hex(s)).toBe(createHash('sha256').update(s).digest('hex'));
    }
  });
  it('stable evidence hash', () => {
    expect(evidenceHash({ z: 1, a: 'b' })).toBe(evidenceHash({ a: 'b', z: 1 }));
  });
});
