/* ------------------------------------------------------------------ */
/*  Real File Ingestion — FileReader + chunk splitting                    */
/* ------------------------------------------------------------------ */

import { DB } from './db';

export interface ChunkData {
  index: number; text: string; embedding: number[];
}

export interface IngestionResult {
  documentId: string; chunksCreated: number; totalTokens: number; verified: boolean; receiptId: string; chunksData: ChunkData[];
}

export const FileIngestionService = {
  ingestFile: async (file: File, endpoint: 'private' | 'shared'): Promise<IngestionResult> => {
    const text = await file.text();
    const chunksCount = Math.max(1, Math.ceil(text.length / 600));
    const chunksData: ChunkData[] = [];
    for (let i = 0; i < chunksCount; i++) {
      const slice = text.slice(i * 600, (i + 1) * 600);
      chunksData.push({ index: i, text: slice, embedding: Array.from({ length: 768 }, () => Math.random()) });
    }
    const result: IngestionResult = {
      documentId: 'doc_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
      chunksCreated: chunksCount,
      totalTokens: Math.round(text.length / 4),
      verified: false,
      receiptId: '#ING-' + Math.floor(Math.random() * 9000 + 1000),
      chunksData,
    };
    DB.insert('documents', {
      _id: result.documentId,
      name: file.name,
      type: file.name.split('.').pop()?.toUpperCase() || 'FILE',
      size: (file.size / 1024).toFixed(1) + ' KB',
      endpoint,
      verified: false,
      chunks: chunksCount,
      timestamp: new Date().toISOString(),
      sourceText: text.slice(0, 500),
      ingestionReceipt: result.receiptId,
      roomId: 'r1',
    });
    return result;
  },
  extractTextFromFile: async (file: File): Promise<string> => {
    return file.text();
  },
};
