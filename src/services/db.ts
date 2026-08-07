/* ------------------------------------------------------------------ */
/*  Real Database Layer — Structured collections                       */
/* ------------------------------------------------------------------ */

export interface DBRecord {
  _id: string; collection: string; createdAt: string; updatedAt: string; [key: string]: unknown;
}

export interface DocumentDB {
  _id: string; collection: 'documents'; name: string; type: string; size: string; endpoint: 'private' | 'shared'; verified: boolean; chunks: number; timestamp: string; sourceText?: string; chunksData?: { index: number; text: string; embedding?: number[] }[]; roomId: string; ingestionReceipt?: string;
}

export interface AIRunDB {
  _id: string; collection: 'runs'; title: string; model: string; status: 'pending' | 'running' | 'verified' | 'rejected'; cost: string; receipt: string; tokens: number; chunks: number; meta: string; evidence: { modelPath: string; receiptId: string; cost: string; timestamp: string; hash: string }; roomId: string;
}

export interface ChatDB {
  _id: string; collection: 'chat'; role: 'agent' | 'user'; text: string; verified?: boolean; receipt?: string; timestamp: string; roomId: string;
}

export const DB = {
  initCollections: () => {
    if (!localStorage.getItem('db_init')) {
      localStorage.setItem('db_init', 'true');
      localStorage.setItem('db_documents', '[]');
      localStorage.setItem('db_runs', '[]');
      localStorage.setItem('db_chat', '[]');
      localStorage.setItem('db_rooms', '[]');
      localStorage.setItem('db_audit', '[]');
    }
  },
  insert: (collection: string, doc: Partial<DBRecord>) => {
    DB.initCollections();
    const data = JSON.parse(localStorage.getItem('db_' + collection) || '[]') as unknown[];
    const id = 'db_' + collection + '_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    const full = { ...doc, _id: id, collection, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as unknown;
    data.push(full);
    localStorage.setItem('db_' + collection, JSON.stringify(data));
    return full as DBRecord;
  },
  find: <T extends DBRecord>(collection: string, query: Partial<T> = {}): T[] => {
    DB.initCollections();
    const data = JSON.parse(localStorage.getItem('db_' + collection) || '[]') as T[];
    return data.filter(item => Object.entries(query).every(([k, v]) => item[k as string] === v));
  },
  findOne: <T extends DBRecord>(collection: string, query: Partial<T> = {}): T | null => {
    const results = DB.find<T>(collection, query);
    return results[0] || null;
  },
  update: <T extends DBRecord>(collection: string, query: Partial<T>, update: Partial<T>): number => {
    DB.initCollections();
    const data = JSON.parse(localStorage.getItem('db_' + collection) || '[]') as T[];
    let updated = 0;
    const newData = data.map(item => {
      const matches = Object.entries(query).every(([k, v]) => item[k as string] === v);
      if (matches) {
        updated++;
        return { ...item, ...update, updatedAt: new Date().toISOString() } as T;
      }
      return item;
    });
    localStorage.setItem('db_' + collection, JSON.stringify(newData));
    return updated;
  },
};
