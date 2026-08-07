import { query } from '../db/pool.js';

export interface ResetCounts {
  documents: number;
  chunks: number;
  runs: number;
  chat: number;
  audit: number;
  published: number;
  revenue: number;
}

/** Clear room workspace data; keep room row + memberships. */
export async function resetRoomData(roomId: string): Promise<ResetCounts> {
  // Order respects FKs (chunks → documents, etc.)
  const chunks = await query('DELETE FROM chunks WHERE room_id = $1', [roomId]);
  const documents = await query('DELETE FROM documents WHERE room_id = $1', [roomId]);
  const runs = await query('DELETE FROM runs WHERE room_id = $1', [roomId]);
  const chat = await query('DELETE FROM chat_messages WHERE room_id = $1', [roomId]);
  const audit = await query('DELETE FROM audit_log WHERE room_id = $1', [roomId]);
  const published = await query('DELETE FROM published_reports WHERE room_id = $1', [roomId]);
  // Usage ledger resets with room; subscription can re-accrue on next activity
  const revenue = await query('DELETE FROM revenue_events WHERE room_id = $1', [roomId]);

  return {
    documents: documents.rowCount || 0,
    chunks: chunks.rowCount || 0,
    runs: runs.rowCount || 0,
    chat: chat.rowCount || 0,
    audit: audit.rowCount || 0,
    published: published.rowCount || 0,
    revenue: revenue.rowCount || 0,
  };
}
