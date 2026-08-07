import { serve } from '@hono/node-server';
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

assertSafeConfig();
void initRedis().then(() => {
  const r = redisStatus();
  if (r.configured) console.log(`Redis rate limits: ${r.ready ? 'ready' : 'unavailable (memory fallback)'}`);
});

const app = new Hono<AppEnv>();

const corsOrigins =
  config.corsOrigin === '*'
    ? '*'
    : config.corsOrigin.includes(',')
      ? config.corsOrigin.split(',').map(s => s.trim()).filter(Boolean)
      : config.corsOrigin;

// Dev: reflect any Origin (Codespace / LAN / localhost). Prod: configured list only.
const corsOriginOpt =
  !config.isProd || config.corsOrigin === '*'
    ? (origin: string) => origin || (Array.isArray(corsOrigins) ? corsOrigins[0] : corsOrigins) || '*'
    : corsOrigins;

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
    });
  } catch (e) {
    return c.json({ ok: false, db: false, error: String(e) }, 503);
  }
});

/** Liveness — process up (no DB). */
app.get('/api/health/live', c => c.json({ ok: true }));

/** Readiness — DB reachable. */
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

serve({ fetch: app.fetch, port: config.port }, info => {
  console.log(`ProofRoom API http://localhost:${info.port} (${config.nodeEnv})`);
  console.log(
    `LLM: ${config.llmApiKey ? `${config.llmProvider}/${config.llmModel}` : 'local-retrieval fallback (set MISTRAL_API_KEY)'}`
  );
  console.log(
    `Seed demo: ${config.seedDemo} · login limit ${config.rateLimitLogin.limit}/${config.rateLimitLogin.windowMs}ms`
  );
});
