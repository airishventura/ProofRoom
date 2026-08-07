/* ------------------------------------------------------------------ */
/*  Audit Service — trail + SHA-256 verification hashes                */
/* ------------------------------------------------------------------ */

import { Store } from './store';
import { evidenceHash } from '../utils/hash';

export type AuditType =
  | 'document_verified'
  | 'ai_run'
  | 'approval'
  | 'publish'
  | 'auth'
  | 'chat';

export interface AuditEntry {
  id: string;
  type: AuditType;
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
    const id = `audit_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const timestamp = new Date().toISOString();
    const verificationHash = evidenceHash({
      id,
      type: entry.type,
      roomId: entry.roomId,
      action: entry.action,
      actor: entry.actor,
      modelPath: entry.modelPath,
      receiptId: entry.receiptId,
      cost: entry.cost,
      tokens: entry.tokens,
      timestamp,
      refs: entry.evidenceRefs.join(','),
    });
    const full: AuditEntry = { ...entry, id, timestamp, verificationHash };
    const current = Store.getAll<AuditEntry>('audit');
    Store.setAll('audit', [...current, full]);
    return full;
  },

  getAll: (roomId?: string): AuditEntry[] => {
    const current = Store.getAll<AuditEntry>('audit');
    return roomId ? current.filter(a => a.roomId === roomId) : current;
  },

  getByReceipt: (receiptId: string): AuditEntry | null =>
    AuditService.getAll().find(a => a.receiptId === receiptId) || null,
};
