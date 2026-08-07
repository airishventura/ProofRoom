/* ------------------------------------------------------------------ */
/*  IndexedDB Persistence Layer — Survives browser restarts            */
/* ------------------------------------------------------------------ */

const DB_NAME = 'ProofRoomDB';
const DB_VERSION = 1;

interface StoreConfig {
  name: string; keyPath: string; indexes?: { name: string; key: string; unique?: boolean }[];
}

const STORES: StoreConfig[] = [
  { name: 'documents', keyPath: '_id', indexes: [{ name: 'endpoint', key: 'endpoint', unique: false }, { name: 'verified', key: 'verified', unique: false }] },
  { name: 'runs', keyPath: '_id', indexes: [{ name: 'status', key: 'status', unique: false }] },
  { name: 'chat', keyPath: '_id', indexes: [{ name: 'timestamp', key: 'timestamp', unique: false }] },
  { name: 'audit', keyPath: 'id', indexes: [{ name: 'roomId', key: 'roomId', unique: false }] },
  { name: 'rooms', keyPath: 'id', indexes: [{ name: 'endpoint', key: 'endpoint', unique: false }] },
  { name: 'revenue', keyPath: 'timestamp' },
];

export const PersistentDB = {
  init: (): Promise<boolean> => new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      STORES.forEach(s => {
        if (!db.objectStoreNames.contains(s.name)) {
          const store = db.createObjectStore(s.name, { keyPath: s.keyPath, autoIncrement: false });
          (s.indexes || []).forEach(idx => store.createIndex(idx.name, idx.key, { unique: !!idx.unique }));
        }
      });
    };
    req.onsuccess = () => resolve(true);
    req.onerror = () => resolve(false);
  }),
  insert: async <T>(storeName: string, item: T): Promise<T> => {
    return new Promise(async (resolve, reject) => {
      const ok = await PersistentDB.init();
      if (!ok) { resolve(item); return; }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.put(item);
        tx.oncomplete = () => resolve(item);
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    });
  },
  getAll: async <T>(storeName: string): Promise<T[]> => {
    return new Promise(async (resolve) => {
      try {
        const ok = await PersistentDB.init();
        if (!ok) { resolve([]); return; }
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(storeName, 'readonly');
          const store = tx.objectStore(storeName);
          const cursorReq = store.openCursor();
          const results: T[] = [];
          cursorReq.onsuccess = () => {
            const cursor = cursorReq.result;
            if (cursor) { results.push(cursor.value); cursor.continue(); }
            else { resolve(results); }
          };
        };
        req.onerror = () => resolve([]);
      } catch { resolve([]); }
    });
  },
  update: async <T>(storeName: string, query: Partial<T>, update: Partial<T>): Promise<number> => {
    const all = await PersistentDB.getAll<T>(storeName);
    let updated = 0;
    for (const item of all) {
      const matches = Object.entries(query).every(([k, v]) => (item as Record<string, unknown>)[k] === v);
      if (matches) {
        await PersistentDB.insert(storeName, { ...item, ...update, updatedAt: new Date().toISOString() } as T);
        updated++;
      }
    }
    return updated;
  },
  find: async <T>(storeName: string, query: Partial<T>): Promise<T[]> => {
    const all = await PersistentDB.getAll<T>(storeName);
    return all.filter(item => Object.entries(query).every(([k, v]) => (item as Record<string, unknown>)[k] === v));
  },
};
