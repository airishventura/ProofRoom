/* ------------------------------------------------------------------ */
/*  Ingestion Service — Document ingestion with chunk extraction        */
/* ------------------------------------------------------------------ */

export interface Chunk {
  id: string;
  documentId: string;
  index: number;
  text: string;
  embedding: number[]; // simulated vector
  timestamp: string;
}

export interface IngestionResult {
  documentId: string;
  chunksCreated: number;
  totalTokens: number;
  verified: boolean;
  receiptId: string;
}

export const IngestionService = {
  ingestDocument: (documentId: string, text: string): IngestionResult => {
    const chunks = Math.ceil(text.length / 500) || 1;
    const chunksArray: Chunk[] = [];
    for (let i = 0; i < chunks; i++) {
      chunksArray.push({
        id: `chk_${documentId}_${i}`,
        documentId,
        index: i,
        text: text.slice(i * 500, (i + 1) * 500),
        embedding: Array.from({ length: 768 }, () => Math.random()),
        timestamp: new Date().toISOString(),
      });
    }
    return {
      documentId,
      chunksCreated: chunks,
      totalTokens: Math.round(text.length / 4),
      verified: false,
      receiptId: `#ING-${Math.floor(Math.random() * 9000 + 1000)}`,
    };
  },
  verifyChunks: (_documentId: string): Chunk[] => {
    // Simulates chunk verification
    return [];
  },
};
