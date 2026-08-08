import { Hono } from 'hono';
import { z } from 'zod';
import { login, loginWithSso, type JwtUser } from '../lib/auth.js';
import { writeAudit } from '../services/audit.js';
import { clientKey, rateLimitAsync } from '../lib/rate-limit.js';
import { config } from '../config.js';
import { query } from '../db/pool.js';
import type { AppEnv } from '../middleware.js';
import { requireAuth } from '../middleware.js';
import { verifyOidcIdToken } from '../lib/oidc.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4).max(200),
});

const ssoSchema = z.object({
  idToken: z.string().min(20),
});

export const authRoutes = new Hono<AppEnv>();

authRoutes.post('/login', async c => {
  const ip = clientKey(c);
  const rl = await rateLimitAsync(`login:${ip}`, config.rateLimitLogin);
  c.header('X-RateLimit-Limit', String(rl.limit));
  c.header('X-RateLimit-Remaining', String(rl.remaining));
  if (!rl.ok) {
    c.header('Retry-After', String(rl.retryAfterSec));
    return c.json({ error: 'Too many login attempts. Try again later.' }, 429);
  }

  const body = loginSchema.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: 'Invalid payload' }, 400);
  const result = await login(body.data.email, body.data.password);
  if (!result) return c.json({ error: 'Invalid credentials' }, 401);

  await writeAudit({
    roomId: 'r1',
    type: 'auth',
    action: `Login ${result.user.email}`,
    actor: result.user.name,
    receiptId: `#AUTH-${Date.now().toString(36).toUpperCase()}`,
    cost: '$0.00',
    evidenceRefs: [result.user.sub, result.user.orgId || ''].filter(Boolean),
  });

  return c.json(result);
});

/** Public SSO config for the login page (no secrets). */
authRoutes.get('/sso/config', c => {
  const enabled = !!(config.oidcIssuer && (config.oidcJwksUrl || config.oidcHsSecret));
  return c.json({
    enabled,
    issuer: enabled ? config.oidcIssuer : null,
    audience: enabled ? config.oidcAudience || null : null,
  });
});

/**
 * Exchange OIDC id_token for a ProofRoom JWT.
 * Production: verify against JWKS. Dev: OIDC_HS_SECRET HS256 tokens.
 */
authRoutes.post('/sso', async c => {
  const ip = clientKey(c);
  const rl = await rateLimitAsync(`login:${ip}`, config.rateLimitLogin);
  c.header('X-RateLimit-Limit', String(rl.limit));
  c.header('X-RateLimit-Remaining', String(rl.remaining));
  if (!rl.ok) {
    c.header('Retry-After', String(rl.retryAfterSec));
    return c.json({ error: 'Too many login attempts. Try again later.' }, 429);
  }

  if (!config.oidcIssuer) {
    return c.json({ error: 'SSO not configured (set OIDC_ISSUER)' }, 501);
  }

  const body = ssoSchema.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: 'Invalid payload' }, 400);

  const claims = await verifyOidcIdToken(body.data.idToken);
  if (!claims) return c.json({ error: 'Invalid id_token' }, 401);

  const result = await loginWithSso(claims);
  if (!result) return c.json({ error: 'SSO user provision failed' }, 401);

  await writeAudit({
    roomId: 'r1',
    type: 'auth',
    action: `SSO login ${result.user.email}`,
    actor: result.user.name,
    receiptId: `#SSO-${Date.now().toString(36).toUpperCase()}`,
    cost: '$0.00',
    evidenceRefs: [result.user.sub, result.user.orgId || 'sso'].filter(Boolean),
  });

  return c.json(result);
});

authRoutes.get('/me', requireAuth, async c => {
  const user = c.get('user') as JwtUser;
  let org: { id: string; name: string; slug: string } | null = null;
  if (user.orgId) {
    const res = await query<{ id: string; name: string; slug: string }>(
      'SELECT id, name, slug FROM orgs WHERE id = $1',
      [user.orgId]
    );
    org = res.rows[0] || null;
  }
  return c.json({ user, org });
});
