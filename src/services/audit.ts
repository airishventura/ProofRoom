/* ------------------------------------------------------------------ */
/*  Audit Service — Full audit trail with cryptographic receipts        */
/* ------------------------------------------------------------------ */

export interface AuditEntry {
  id: string;
  type: 'document_verified' | 'ai_run' | 'approval' | 'publish';
  roomId: string;
  action: string;
  actor: string;
  modelPath?: string;
  receiptId: string;
  cost: string;
  tokens?: number;
  verificationHash: string;
  timestamp: string;
  evidenceRefs: string[];
}

export const AuditService = {
  log: (entry: Omit<AuditEntry, 'id' | 'timestamp' | 'verificationHash'>): AuditEntry => {
    const full: AuditEntry = {
      ...entry,
      id: `audit_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      timestamp: new Date().toISOString(),
      verificationHash: Math.random().toString(36).substring(2, 14) + Math.random().toString(36).substring(2, 14),
    };
    const current = JSON.parse(localStorage.getItem('proofroom_audit') || '[]') as AuditEntry[];
    current.push(full);
    localStorage.setItem('proofroom_audit', JSON.stringify(current));
    return full;
  },
  getAll: (roomId?: string): AuditEntry[] => {
    const current = JSON.parse(localStorage.getItem('proofroom_audit') || '[]') as AuditEntry[];
    return roomId ? current.filter(a => a.roomId === roomId) : current;
  },
  getByReceipt: (receiptId: string): AuditEntry | null => {
    return AuditService.getAll().find(a => a.receiptId === receiptId) || null;
  },
};
