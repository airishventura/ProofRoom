/* ------------------------------------------------------------------ */
/*  Unified Store — single localStorage namespace for all services      */
/* ------------------------------------------------------------------ */

const NS = 'pr.v1.';
const MIGRATED = 'pr.v1.__migrated';

export type Collection =
  | 'rooms'
  | 'documents'
  | 'runs'
  | 'chat'
  | 'audit'
  | 'revenue'
  | 'published'
  | 'pipelines'
  | 'chunks';

function key(col: Collection) {
  return NS + col;
}

function readRaw(k: string): unknown {
  try {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeRaw(k: string, data: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(data));
  } catch {
    /* quota / private mode */
  }
}

/** One-shot pull from legacy keys into pr.v1.* */
function migrateOnce() {
  if (localStorage.getItem(MIGRATED)) return;
  const map: [string, Collection][] = [
    ['proofroom_rooms', 'rooms'],
    ['proofroom_docs', 'documents'],
    ['proofroom_runs', 'runs'],
    ['proofroom_chat', 'chat'],
    ['proofroom_audit', 'audit'],
    ['proofroom_revenue', 'revenue'],
    ['proofroom_published', 'published'],
    ['proofroom_pipelines', 'pipelines'],
    ['db_documents', 'documents'],
    ['db_runs', 'runs'],
    ['db_chat', 'chat'],
    ['db_audit', 'audit'],
    ['db_rooms', 'rooms'],
  ];
  for (const [legacy, col] of map) {
    const existing = readRaw(key(col));
    if (existing != null) continue;
    const legacyData = readRaw(legacy);
    if (legacyData != null) writeRaw(key(col), legacyData);
  }
  localStorage.setItem(MIGRATED, '1');
}

export const Store = {
  init() {
    migrateOnce();
  },

  getAll<T>(col: Collection): T[] {
    migrateOnce();
    const data = readRaw(key(col));
    return Array.isArray(data) ? (data as T[]) : [];
  },

  setAll<T>(col: Collection, items: T[]) {
    migrateOnce();
    writeRaw(key(col), items);
  },

  /** Single-object collections (published, pipelines map handled separately) */
  getOne<T>(col: Collection): T | null {
    migrateOnce();
    const data = readRaw(key(col));
    if (data == null || Array.isArray(data)) return null;
    return data as T;
  },

  setOne<T>(col: Collection, item: T) {
    migrateOnce();
    writeRaw(key(col), item);
  },

  remove(col: Collection) {
    localStorage.removeItem(key(col));
  },

  /** Object map collections e.g. roomId → pipeline */
  getMap<T>(col: Collection): Record<string, T> {
    migrateOnce();
    const data = readRaw(key(col));
    if (data && typeof data === 'object' && !Array.isArray(data)) return data as Record<string, T>;
    return {};
  },

  setMap<T>(col: Collection, map: Record<string, T>) {
    migrateOnce();
    writeRaw(key(col), map);
  },
};
