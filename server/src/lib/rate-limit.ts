/**
 * Sliding-window rate limiter.
 * - Memory: default (single process)
 * - Redis: when REDIS_URL is set (multi-instance)
 */

import { Redis } from 'ioredis';
import { config } from '../config.js';

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
  limit: number;
}

interface Bucket {
  hits: number[];
}

const memory = new Map<string, Bucket>();
let redis: Redis | null = null;
let redisReady: boolean | null = null;

function getRedis(): Redis | null {
  if (!config.redisUrl) return null;
  if (redis) return redis;
  try {
    redis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      lazyConnect: true,
      connectTimeout: 2000,
    });
    redis.on('error', (err: Error) => {
      console.warn('[rate-limit] redis error:', err.message);
      redisReady = false;
    });
    redis.on('ready', () => {
      redisReady = true;
    });
    void redis.connect().catch((err: Error) => {
      console.warn('[rate-limit] redis connect failed, falling back to memory:', err.message);
      redisReady = false;
    });
    return redis;
  } catch (e) {
    console.warn('[rate-limit] redis init failed:', e);
    return null;
  }
}

/** Whether Redis backend is configured and currently usable. */
export function redisStatus(): { configured: boolean; ready: boolean | null } {
  return { configured: !!config.redisUrl, ready: config.redisUrl ? redisReady : null };
}

/** Connect early so health + first request use Redis. */
export async function initRedis(): Promise<void> {
  const client = getRedis();
  if (!client) return;
  try {
    if (client.status !== 'ready') {
      await client.connect().catch(() => undefined);
    }
    // ping to confirm
    await client.ping();
    redisReady = true;
  } catch (e) {
    redisReady = false;
    console.warn('[rate-limit] redis init ping failed:', e instanceof Error ? e.message : e);
  }
}

function memoryLimit(key: string, opts: { limit: number; windowMs: number }): RateLimitResult {
  const now = Date.now();
  const windowStart = now - opts.windowMs;
  let bucket = memory.get(key);
  if (!bucket) {
    bucket = { hits: [] };
    memory.set(key, bucket);
  }
  bucket.hits = bucket.hits.filter(t => t > windowStart);
  if (bucket.hits.length >= opts.limit) {
    const oldest = bucket.hits[0] || now;
    const retryAfterSec = Math.max(1, Math.ceil((oldest + opts.windowMs - now) / 1000));
    return { ok: false, remaining: 0, retryAfterSec, limit: opts.limit };
  }
  bucket.hits.push(now);
  return {
    ok: true,
    remaining: Math.max(0, opts.limit - bucket.hits.length),
    retryAfterSec: 0,
    limit: opts.limit,
  };
}

/**
 * Redis sorted-set sliding window.
 * ZADD member=timestamp score=timestamp; ZREMRANGEBYSCORE old; ZCARD.
 */
async function redisLimit(
  client: Redis,
  key: string,
  opts: { limit: number; windowMs: number }
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - opts.windowMs;
  const rkey = `rl:${key}`;
  const member = `${now}:${Math.random().toString(36).slice(2, 8)}`;

  const multi = client.multi();
  multi.zremrangebyscore(rkey, 0, windowStart);
  multi.zadd(rkey, now, member);
  multi.zcard(rkey);
  multi.pexpire(rkey, opts.windowMs);
  const results = await multi.exec();
  if (!results) {
    return memoryLimit(key, opts);
  }
  const card = Number(results[2]?.[1] ?? 0);
  if (card > opts.limit) {
    // remove the hit we just added and block
    await client.zrem(rkey, member);
    // ioredis v6 types require string/Buffer for stop when WITHSCORES is used
    const oldest = await client.zrange(rkey, 0, '0', 'WITHSCORES');
    const oldestTs = oldest.length >= 2 ? Number(oldest[1]) : now;
    const retryAfterSec = Math.max(1, Math.ceil((oldestTs + opts.windowMs - now) / 1000));
    return { ok: false, remaining: 0, retryAfterSec, limit: opts.limit };
  }
  return {
    ok: true,
    remaining: Math.max(0, opts.limit - card),
    retryAfterSec: 0,
    limit: opts.limit,
  };
}

/** Sync API used by routes — Redis is fire-and-forget async under the hood via wait. */
export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number }
): RateLimitResult {
  // Prefer async path via deasync-free pattern: routes call rateLimitAsync when available.
  // Keep sync for unit tests + fallback.
  return memoryLimit(key, opts);
}

export async function rateLimitAsync(
  key: string,
  opts: { limit: number; windowMs: number }
): Promise<RateLimitResult> {
  const client = getRedis();
  if (client && redisReady !== false) {
    try {
      if (redisReady === null && client.status !== 'ready') {
        // not ready yet — memory for this request
        return memoryLimit(key, opts);
      }
      return await redisLimit(client, key, opts);
    } catch (e) {
      console.warn('[rate-limit] redis path failed, memory fallback:', e instanceof Error ? e.message : e);
      return memoryLimit(key, opts);
    }
  }
  return memoryLimit(key, opts);
}

/** Client IP from common proxy headers, fallback to unknown. */
export function clientKey(c: {
  req: { header: (name: string) => string | undefined };
}): string {
  const xff = c.req.header('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return (
    c.req.header('x-real-ip') ||
    c.req.header('cf-connecting-ip') ||
    'unknown'
  );
}

export function pruneRateLimitStore(maxAgeMs = 60 * 60 * 1000) {
  const cutoff = Date.now() - maxAgeMs;
  for (const [k, b] of memory) {
    b.hits = b.hits.filter(t => t > cutoff);
    if (!b.hits.length) memory.delete(k);
  }
}

setInterval(() => pruneRateLimitStore(), 10 * 60 * 1000).unref?.();
