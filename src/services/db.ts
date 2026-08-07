/* ------------------------------------------------------------------ */
/*  DB facade — thin wrapper over unified Store                        */
/* ------------------------------------------------------------------ */

import { Store, type Collection } from './store';

export interface DBRecord {
  _id: string;
  collection: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

const COL_MAP: Record<string, Collection> = {
  documents: 'documents',
  runs: 'runs',
  chat: 'chat',
  rooms: 'rooms',
  audit: 'audit',
};

export const DB = {
  initCollections: () => Store.init(),

  insert: (collection: string, doc: Partial<DBRecord>) => {
    const col = COL_MAP[collection] || (collection as Collection);
    const data = Store.getAll<DBRecord>(col);
    const id = (doc._id as string) || `db_${collection}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const full = {
      ...doc,
      _id: id,
      collection,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as DBRecord;
    data.push(full);
    Store.setAll(col, data);
    return full;
  },

  find: <T extends DBRecord>(collection: string, query: Partial<T> = {}): T[] => {
    const col = COL_MAP[collection] || (collection as Collection);
    const data = Store.getAll<T>(col);
    return data.filter(item => Object.entries(query).every(([k, v]) => item[k as string] === v));
  },

  findOne: <T extends DBRecord>(collection: string, query: Partial<T> = {}): T | null => {
    return DB.find<T>(collection, query)[0] || null;
  },

  update: <T extends DBRecord>(collection: string, query: Partial<T>, update: Partial<T>): number => {
    const col = COL_MAP[collection] || (collection as Collection);
    const data = Store.getAll<T>(col);
    let updated = 0;
    const next = data.map(item => {
      const matches = Object.entries(query).every(([k, v]) => item[k as string] === v);
      if (!matches) return item;
      updated++;
      return { ...item, ...update, updatedAt: new Date().toISOString() } as T;
    });
    Store.setAll(col, next);
    return updated;
  },
};
