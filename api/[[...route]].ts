/**
 * Vercel serverless entry — all /api/* traffic.
 * Bundles the Hono app from server/src.
 */
import { handle } from 'hono/vercel';
import { app } from '../server/src/app.js';

export const config = {
  runtime: 'nodejs',
  // Chat SSE can run longer than default
  maxDuration: 60,
};

export default handle(app);
