import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';

// Load root then server/.env (server wins). Never commit real keys.
loadEnv({ path: resolve(process.cwd(), '../.env') });
loadEnv({ path: resolve(process.cwd(), '.env') });
loadEnv({ path: resolve(process.cwd(), '../.env.local') });

export type LlmProvider = 'mistral' | 'xai' | 'none';

function detectProvider(): LlmProvider {
  const explicit = (process.env.LLM_PROVIDER || '').toLowerCase();
  if (explicit === 'mistral' || explicit === 'xai' || explicit === 'none') return explicit;
  if (process.env.MISTRAL_API_KEY) return 'mistral';
  if (process.env.XAI_API_KEY) return 'xai';
  return 'none';
}

const provider = detectProvider();

const llmDefaults: Record<Exclude<LlmProvider, 'none'>, { baseUrl: string; model: string; keyEnv: string }> = {
  mistral: {
    baseUrl: 'https://api.mistral.ai/v1',
    model: 'mistral-small-latest',
    keyEnv: 'MISTRAL_API_KEY',
  },
  xai: {
    baseUrl: 'https://api.x.ai/v1',
    model: 'grok-4.5',
    keyEnv: 'XAI_API_KEY',
  },
};

const defaults = provider === 'none' ? null : llmDefaults[provider];

const nodeEnv = (process.env.NODE_ENV || 'development').toLowerCase();
const isProd = nodeEnv === 'production';

/** Weak / default secrets that must never ship in production. */
const WEAK_JWT = new Set([
  '',
  'change-me-in-production',
  'dev-proofroom-secret-change-me',
  'ci-test-secret',
  'secret',
  'jwt-secret',
]);

function resolveSeedDemo(): boolean {
  if (process.env.SEED_DEMO === 'true') return true;
  if (process.env.SEED_DEMO === 'false') return false;
  // default: seed only outside production
  return !isProd;
}

const jwtSecret = process.env.JWT_SECRET || 'dev-proofroom-secret-change-me';

export const config = {
  nodeEnv,
  isProd,
  port: Number(process.env.PORT || 8787),
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgresql://proofroom:proofroom@localhost:5432/proofroom',
  jwtSecret,
  jwtTtl: process.env.JWT_TTL || '7d',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  /** Base URL for published microsite links (frontend origin). */
  publicAppUrl:
    process.env.PUBLIC_APP_URL ||
    process.env.CORS_ORIGIN?.split(',')[0]?.trim() ||
    'http://localhost:5173',

  /** Seed demo users/rooms (sarah@acme.com / demo1234). Off by default in production. */
  seedDemo: resolveSeedDemo(),

  /** Rate limits (per IP unless noted). */
  rateLimitLogin: {
    limit: Number(process.env.RATE_LIMIT_LOGIN || (isProd ? 10 : 60)),
    windowMs: Number(process.env.RATE_LIMIT_LOGIN_WINDOW_MS || 15 * 60 * 1000),
  },
  rateLimitChat: {
    limit: Number(process.env.RATE_LIMIT_CHAT || (isProd ? 30 : 120)),
    windowMs: Number(process.env.RATE_LIMIT_CHAT_WINDOW_MS || 60 * 1000),
  },

  /** Redis for multi-instance rate limits (optional). */
  redisUrl: process.env.REDIS_URL || '',

  /** Local object storage root for publish PDFs etc. */
  objectStoragePath:
    process.env.OBJECT_STORAGE_PATH ||
    resolve(process.cwd(), 'data', 'objects'),

  /**
   * OIDC / SSO (optional).
   * When OIDC_ISSUER + OIDC_AUDIENCE set, POST /api/auth/sso accepts an id_token.
   * OIDC_JWKS_URL defaults to {issuer}/.well-known/jwks.json style if unset —
   * for HS256 demo use OIDC_HS_SECRET instead of JWKS.
   */
  oidcIssuer: process.env.OIDC_ISSUER || '',
  oidcAudience: process.env.OIDC_AUDIENCE || '',
  oidcJwksUrl: process.env.OIDC_JWKS_URL || '',
  oidcHsSecret: process.env.OIDC_HS_SECRET || '',
  /** Default org for SSO auto-provision when claim org missing. */
  oidcDefaultOrgId: process.env.OIDC_DEFAULT_ORG_ID || 'org_acme',

  llmProvider: provider,
  llmApiKey:
    provider === 'mistral'
      ? process.env.MISTRAL_API_KEY || ''
      : provider === 'xai'
        ? process.env.XAI_API_KEY || ''
        : '',
  llmBaseUrl:
    process.env.LLM_BASE_URL ||
    process.env.MISTRAL_BASE_URL ||
    process.env.XAI_BASE_URL ||
    defaults?.baseUrl ||
    '',
  llmModel:
    process.env.LLM_MODEL ||
    process.env.MISTRAL_MODEL ||
    process.env.XAI_MODEL ||
    defaults?.model ||
    'mistral-small-latest',
};

/**
 * Fail fast on unsafe production config.
 * Call once at process start (index.ts / migrate).
 */
export function assertSafeConfig(): void {
  if (!config.isProd) return;

  if (WEAK_JWT.has(config.jwtSecret) || config.jwtSecret.length < 32) {
    throw new Error(
      'Production requires JWT_SECRET ≥ 32 chars and not a known default. See deploy/SECRETS.md'
    );
  }

  if (config.corsOrigin === '*') {
    throw new Error('Production forbids CORS_ORIGIN=*. Set explicit origins.');
  }

  if (config.seedDemo) {
    console.warn(
      '[security] SEED_DEMO=true in production — demo passwords will be seeded. Prefer SEED_DEMO=false.'
    );
  }

  const db = config.databaseUrl;
  if (db.includes('proofroom:proofroom@') || db.includes('localhost') || db.includes('127.0.0.1')) {
    console.warn(
      '[security] DATABASE_URL looks like a local/demo connection string in production.'
    );
  }
}
