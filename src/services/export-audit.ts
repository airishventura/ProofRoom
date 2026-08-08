import type { AuditEntry } from './audit';

export function auditToJSON(entries: AuditEntry[]): string {
  return JSON.stringify(entries, null, 2);
}

export function auditToCSV(entries: AuditEntry[]): string {
  const headers = [
    'id', 'type', 'roomId', 'action', 'actor', 'modelPath', 'receiptId',
    'cost', 'tokens', 'verificationHash', 'timestamp', 'evidenceRefs',
  ];
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = entries.map(e =>
    [
      e.id, e.type, e.roomId, e.action, e.actor, e.modelPath || '', e.receiptId,
      e.cost, e.tokens ?? '', e.verificationHash, e.timestamp, (e.evidenceRefs || []).join('|'),
    ].map(esc).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

export function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
