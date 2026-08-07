/* ------------------------------------------------------------------ */
/*  Publish Service — Report microsite generation                       */
/* ------------------------------------------------------------------ */

export interface ReportRecord {
  roomId: string;
  url: string;
  hash: string;
  timestamp: string;
  citations: { title: string; sourceDoc: string; receipt: string; hash: string }[];
  verified: boolean;
}

export const PublishService = {
  publish: (roomId: string, citations?: ReportRecord['citations']): ReportRecord => {
    const record: ReportRecord = {
      roomId,
      url: `https://proofroom.app/r/${roomId}`,
      hash: Math.random().toString(36).substring(2, 14) + Math.random().toString(36).substring(2, 14),
      timestamp: new Date().toISOString(),
      citations: citations || [
        { title: 'Executive Summary', sourceDoc: 'Q3_Due_Diligence.pdf', receipt: '#REC-4821', hash: 'a1b2c3d4e5f6789a' },
        { title: 'Red-Flag Analysis', sourceDoc: 'Board_Deck_Final.pdf', receipt: '#REC-4822', hash: 'b2c3d4e5f6789a1b' },
      ],
      verified: true,
    };
    localStorage.setItem('proofroom_published', JSON.stringify(record));
    return record;
  },
  getRecord: (): ReportRecord | null => {
    try {
      const raw = localStorage.getItem('proofroom_published');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  revoke: () => localStorage.removeItem('proofroom_published'),
};
