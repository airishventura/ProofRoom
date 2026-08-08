import { query } from '../db/pool.js';
import { evidenceHash } from '../lib/hash.js';

export interface AuditInput {
  roomId: string;
  type: 'document_verified' | 'ai_run' | 'approval' | 'publish' | 'auth' | 'chat';
  action: string;
  actor: string;
  modelPath?: string;
  receiptId: string;
  cost?: string;
  tokens?: number;
  evidenceRefs?: string[];
}

export async function writeAudit(entry: AuditInput) {
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
    cost: entry.cost || '$0.00',
    tokens: entry.tokens,
    timestamp,
    refs: (entry.evidenceRefs || []).join(','),
  });

  await query(
    `INSERT INTO audit_log
      (id, room_id, type, action, actor, model_path, receipt_id, cost, tokens, verification_hash, evidence_refs, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12)`,
    [
      id,
      entry.roomId,
      entry.type,
      entry.action,
      entry.actor,
      entry.modelPath || null,
      entry.receiptId,
      entry.cost || '$0.00',
      entry.tokens ?? null,
      verificationHash,
      JSON.stringify(entry.evidenceRefs || []),
      timestamp,
    ]
  );

  return {
    id,
    roomId: entry.roomId,
    type: entry.type,
    action: entry.action,
    actor: entry.actor,
    modelPath: entry.modelPath,
    receiptId: entry.receiptId,
    cost: entry.cost || '$0.00',
    tokens: entry.tokens,
    verificationHash,
    evidenceRefs: entry.evidenceRefs || [],
    timestamp,
  };
}

export async function listAudit(roomId: string) {
  const res = await query(
    `SELECT id, room_id, type, action, actor, model_path, receipt_id, cost, tokens,
            verification_hash, evidence_refs, created_at
     FROM audit_log WHERE room_id = $1 ORDER BY created_at DESC LIMIT 500`,
    [roomId]
  );
  return res.rows.map(r => ({
    id: r.id as string,
    roomId: r.room_id as string,
    type: r.type as string,
    action: r.action as string,
    actor: r.actor as string,
    modelPath: (r.model_path as string | null) || undefined,
    receiptId: r.receipt_id as string,
    cost: (r.cost as string) || '$0.00',
    tokens: (r.tokens as number | null) ?? undefined,
    verificationHash: r.verification_hash as string,
    evidenceRefs: Array.isArray(r.evidence_refs)
      ? (r.evidence_refs as unknown[]).map(String)
      : [],
    timestamp:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : new Date(r.created_at as string).toISOString(),
  }));
}
