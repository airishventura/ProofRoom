/**
 * Shared Hono app — used by Node `serve` and Vercel serverless.
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { assertSafeConfig, config } from './config.js';
import type { AppEnv } from './middleware.js';
import { authRoutes } from './routes/auth.js';
import { roomRoutes } from './routes/rooms.js';
import { documentRoutes } from './routes/documents.js';
import { runRoutes } from './routes/runs.js';
import { auditRoutes } from './routes/audit.js';
import { chatRoutes } from './routes/chat.js';
import { publishRoutes } from './routes/publish.js';
import { orgRoutes } from './routes/orgs.js';
import { revenueRoutes } from './routes/revenue.js';
import { pool } from './db/pool.js';
import { initRedis, redisStatus } from './lib/rate-limit.js';
import { ensureSchema } from './db/ensure-schema.js';

assertSafeConfig();

let redisInit = false;
function ensureRedis() {
  if (redisInit) return;
  redisInit = true;
  void initRedis().then(() => {
    const r = redisStatus();
    if (r.configured) {
      console.log(`Redis rate limits: ${r.ready ? 'ready' : 'unavailable (memory fallback)'}`);
    }
  });
}

/** Lazily ensure schema on first request (serverless-friendly). */
let schemaReady: Promise<void> | null = null;
export function ensureDbReady(): Promise<void> {
  if (!schemaReady) {
    schemaReady = ensureSchema().catch(err => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

export const app = new Hono<AppEnv>();

const corsOrigins =
  config.corsOrigin === '*'
    ? '*'
    : config.corsOrigin.includes(',')
      ? config.corsOrigin.split(',').map(s => s.trim()).filter(Boolean)
      : config.corsOrigin;

// Dev: reflect any Origin. Prod: configured list only.
const corsOriginOpt =
  !config.isProd || config.corsOrigin === '*'
    ? (origin: string) => origin || (Array.isArray(corsOrigins) ? corsOrigins[0] : corsOrigins) || '*'
    : corsOrigins;

app.use('*', async (c, next) => {
  ensureRedis();
  // Skip heavy migrate for pure liveness
  if (!c.req.path.endsWith('/api/health/live')) {
    try {
      await ensureDbReady();
    } catch (e) {
      if (c.req.path.includes('/health')) {
        return c.json({ ok: false, db: false, error: String(e) }, 503);
      }
      console.error('schema ensure failed', e);
      return c.json({ error: 'Database unavailable' }, 503);
    }
  }
  await next();
});

app.use(
  '*',
  cors({
    origin: corsOriginOpt,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'Retry-After'],
  })
);

app.get('/api/health', async c => {
  try {
    await pool.query('SELECT 1');
    const redis = redisStatus();
    return c.json({
      ok: true,
      db: true,
      llm: !!config.llmApiKey,
      provider: config.llmProvider,
      model: config.llmModel,
      env: config.nodeEnv,
      seedDemo: config.seedDemo,
      redis: redis.configured ? (redis.ready === false ? 'error' : redis.ready ? 'ready' : 'connecting') : 'off',
      sso: !!(config.oidcIssuer && (config.oidcJwksUrl || config.oidcHsSecret)),
      objectStorage: config.objectStoragePath,
      register: true,
    });
  } catch (e) {
    return c.json({ ok: false, db: false, error: String(e) }, 503);
  }
});

app.get('/api/health/live', c => c.json({ ok: true }));

app.get('/api/health/ready', async c => {
  try {
    await pool.query('SELECT 1');
    return c.json({ ok: true, db: true });
  } catch (e) {
    return c.json({ ok: false, db: false, error: String(e) }, 503);
  }
});

app.route('/api/auth', authRoutes);
app.route('/api/rooms', roomRoutes);
app.route('/api/documents', documentRoutes);
app.route('/api/runs', runRoutes);
app.route('/api/audit', auditRoutes);
app.route('/api/chat', chatRoutes);
app.route('/api/publish', publishRoutes);
app.route('/api/orgs', orgRoutes);
app.route('/api/revenue', revenueRoutes);

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: err.message || 'Internal error' }, 500);
});
