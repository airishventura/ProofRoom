import pg from 'pg';
import { config } from '../config.js';

const { Pool } = pg;

/** Neon / managed PG often require SSL; local Docker does not. */
function needsSsl(url: string): boolean | { rejectUnauthorized: boolean } {
  if (process.env.PGSSL === 'false' || process.env.DATABASE_SSL === 'false') return false;
  if (process.env.PGSSL === 'true' || process.env.DATABASE_SSL === 'true') {
    return { rejectUnauthorized: false };
  }
  if (/sslmode=require|neon\.tech|supabase\.co|amazonaws\.com|render\.com/i.test(url)) {
    return { rejectUnauthorized: false };
  }
  if (config.isProd && !/localhost|127\.0\.0\.1/.test(url)) {
    return { rejectUnauthorized: false };
  }
  return false;
}

const connectionString = config.databaseUrl;
const ssl = needsSsl(connectionString);

export const pool = new Pool({
  connectionString,
  max: process.env.VERCEL ? 1 : 10,
  ssl: ssl || undefined,
  // Serverless: don't keep idle clients forever
  idleTimeoutMillis: process.env.VERCEL ? 5_000 : 30_000,
  connectionTimeoutMillis: 15_000,
});

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
) {
  return pool.query<T>(text, params);
}
