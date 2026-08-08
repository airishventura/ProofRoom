import { Hono } from 'hono';
import { userCanAccessRoom } from '../lib/auth.js';
import { formatUsd, PRICING } from '../lib/pricing.js';
import {
  ensureRoomSubscription,
  listRevenue,
  roomSpendUsd,
  spendByModel,
} from '../services/revenue.js';
import type { AppEnv } from '../middleware.js';
import { requireAuth } from '../middleware.js';

export const revenueRoutes = new Hono<AppEnv>();
revenueRoutes.use('*', requireAuth);

/** Room spend ledger + model breakdown (A/B/C/D). */
revenueRoutes.get('/', async c => {
  const user = c.get('user');
  const roomId = c.req.query('roomId') || 'r1';
  if (!(await userCanAccessRoom(user.sub, roomId))) return c.json({ error: 'Forbidden' }, 403);

  await ensureRoomSubscription(roomId);
  const [total, byModel, events] = await Promise.all([
    roomSpendUsd(roomId),
    spendByModel(roomId),
    listRevenue(roomId),
  ]);

  return c.json({
    roomId,
    total,
    totalFormatted: formatUsd(total),
    byModel,
    rates: {
      subscriptionRoomMonthUsd: PRICING.subscriptionRoomMonthUsd,
      runUsdPer1kTokens: PRICING.runUsdPer1kTokens,
      chatUsdPer1kTokens: PRICING.chatUsdPer1kTokens,
      publishUsd: PRICING.publishUsd,
    },
    events,
  });
});
