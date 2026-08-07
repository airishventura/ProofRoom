/* ------------------------------------------------------------------ */
/*  Revenue Service — Usage tracking & billing projection                */
/* ------------------------------------------------------------------ */

export interface RevenueRecord {
  roomId: string;
  model: 'A' | 'B' | 'C' | 'D';
  amount: number;
  currency: string;
  timestamp: string;
  description: string;
}

export const RevenueService = {
  getUsage: (roomId: string) => {
    const current = JSON.parse(localStorage.getItem('proofroom_revenue') || '[]') as RevenueRecord[];
    return current.filter(r => r.roomId === roomId);
  },
  getTotal: (roomId: string): number => {
    return RevenueService.getUsage(roomId).reduce((sum, r) => sum + r.amount, 0);
  },
  add: (record: RevenueRecord) => {
    const current = JSON.parse(localStorage.getItem('proofroom_revenue') || '[]') as RevenueRecord[];
    current.push(record);
    localStorage.setItem('proofroom_revenue', JSON.stringify(current));
  },
};
