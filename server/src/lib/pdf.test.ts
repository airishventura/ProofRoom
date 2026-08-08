import { describe, expect, it } from 'vitest';
import { buildReportPdf } from './pdf.js';

describe('buildReportPdf', () => {
  it('produces a PDF header and non-trivial size', () => {
    const buf = buildReportPdf({
      title: 'Acme Report',
      roomId: 'r1',
      hash: 'abc123def456',
      url: 'http://localhost/r/r1',
      timestamp: '2026-01-01T00:00:00.000Z',
      citations: [
        { title: 'Summary', receipt: '#REC-1', hash: 'h'.repeat(64), sourceDoc: 'brief.md' },
      ],
      bodyLines: ['Doc A', 'Run B'],
    });
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buf.length).toBeGreaterThan(200);
    expect(buf.toString('latin1')).toContain('%%EOF');
  });
});
