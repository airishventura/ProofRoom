/**
 * Idempotent schema apply + optional seed/bootstrap.
 * Safe to call on every cold start (CREATE IF NOT EXISTS / ON CONFLICT).
 */
import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { pool, query } from './pool.js';
import { SCHEMA_SQL } from './schema-embed.js';

async function seedDemo(): Promise<void> {
  if (!config.seedDemo) {
    return;
  }

  await query(
    `INSERT INTO orgs (id, name, slug) VALUES ('org_acme', 'Acme Corp', 'acme')
     ON CONFLICT (id) DO NOTHING`
  );

  const existing = await query('SELECT id FROM users LIMIT 1');
  if (existing.rowCount && existing.rowCount > 0) {
    await query(`UPDATE users SET org_id = 'org_acme' WHERE org_id IS NULL AND email LIKE '%@acme.com'`);
    await query(`UPDATE rooms SET org_id = 'org_acme' WHERE org_id IS NULL AND id IN ('r1','r2','r3')`);
    await query(
      `INSERT INTO org_members (org_id, user_id, role)
       SELECT 'org_acme', id, CASE WHEN role IN ('lead','cfo','admin') THEN 'admin' ELSE 'member' END
       FROM users WHERE email LIKE '%@acme.com'
       ON CONFLICT DO NOTHING`
    );
    return;
  }

  const users = [
    { id: 'usr_01', email: 'sarah@acme.com', name: 'Sarah Chen', role: 'lead', pass: 'demo1234' },
    { id: 'usr_02', email: 'marcus@acme.com', name: 'Marcus Webb', role: 'analyst', pass: 'demo1234' },
    { id: 'usr_03', email: 'elena@acme.com', name: 'Elena Vasquez', role: 'cfo', pass: 'demo1234' },
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.pass, 10);
    await query(
      `INSERT INTO users (id, email, name, role, password_hash, org_id)
       VALUES ($1,$2,$3,$4,$5,'org_acme') ON CONFLICT (id) DO NOTHING`,
      [u.id, u.email, u.name, u.role, hash]
    );
    await query(
      `INSERT INTO org_members (org_id, user_id, role)
       VALUES ('org_acme',$1,$2) ON CONFLICT DO NOTHING`,
      [u.id, u.role === 'lead' || u.role === 'cfo' ? 'admin' : 'member']
    );
  }

  const rooms = [
    {
      id: 'r1',
      name: 'Acme Corp — Q3 Deal Review',
      endpoint: 'private',
      description: 'Private endpoint for due diligence.',
      owner: 'usr_01',
    },
    {
      id: 'r2',
      name: 'Market Landscape — Energy',
      endpoint: 'shared',
      description: 'Shared endpoint for team collaboration.',
      owner: 'usr_01',
    },
    {
      id: 'r3',
      name: 'Proposal — Westbridge',
      endpoint: 'private',
      description: 'Client proposal workspace.',
      owner: 'usr_02',
    },
  ];

  for (const r of rooms) {
    await query(
      `INSERT INTO rooms (id, name, endpoint, description, owner_id, org_id)
       VALUES ($1,$2,$3,$4,$5,'org_acme') ON CONFLICT (id) DO NOTHING`,
      [r.id, r.name, r.endpoint, r.description, r.owner]
    );
    for (const u of users) {
      await query(
        `INSERT INTO room_members (room_id, user_id, role)
         VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
        [r.id, u.id, u.id === r.owner ? 'owner' : 'member']
      );
    }
  }

  await query(
    `INSERT INTO documents (id, room_id, name, type, size, verified, chunks, endpoint, source_text, content_hash)
     VALUES ($1,$2,$3,$4,$5,true,1,'private',$6,$7) ON CONFLICT DO NOTHING`,
    [
      'd1',
      'r1',
      'Q3_Due_Diligence.md',
      'MD',
      '12 KB',
      'Revenue trajectory stable at +12% YoY. EBITDA margin expanded to 28%. Key driver: enterprise contract renewals.',
      'seed',
    ]
  );
  await query(
    `INSERT INTO chunks (id, document_id, room_id, idx, text)
     VALUES ($1,$2,$3,0,$4) ON CONFLICT DO NOTHING`,
    [
      'd1_c0',
      'd1',
      'r1',
      'Revenue trajectory stable at +12% YoY. EBITDA margin expanded to 28%. Key driver: enterprise contract renewals.',
    ]
  );

  console.log('Seeded demo users (password: demo1234). Disable with SEED_DEMO=false.');
}

/**
 * Production bootstrap: first admin from env when no users exist.
 * BOOTSTRAP_EMAIL + BOOTSTRAP_PASSWORD (≥8 chars).
 */
async function bootstrapAdmin(): Promise<void> {
  const email = (process.env.BOOTSTRAP_EMAIL || '').trim().toLowerCase();
  const password = process.env.BOOTSTRAP_PASSWORD || '';
  const name = (process.env.BOOTSTRAP_NAME || 'Admin').trim() || 'Admin';
  if (!email || password.length < 8) return;

  const existing = await query('SELECT id FROM users LIMIT 1');
  if (existing.rowCount && existing.rowCount > 0) return;

  const orgId = 'org_bootstrap';
  const slug = email.split('@')[0]?.replace(/[^a-z0-9-]/gi, '-').slice(0, 32) || 'org';
  await query(
    `INSERT INTO orgs (id, name, slug) VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING`,
    [orgId, `${name}'s Org`, `${slug}-org`]
  );

  const userId = `usr_${Date.now().toString(36)}`;
  const hash = await bcrypt.hash(password, 10);
  await query(
    `INSERT INTO users (id, email, name, role, password_hash, org_id)
     VALUES ($1,$2,$3,'admin',$4,$5) ON CONFLICT (email) DO NOTHING`,
    [userId, email, name, hash, orgId]
  );

  const u = await query<{ id: string }>('SELECT id FROM users WHERE email = $1', [email]);
  const uid = u.rows[0]?.id;
  if (!uid) return;

  await query(
    `INSERT INTO org_members (org_id, user_id, role) VALUES ($1,$2,'owner') ON CONFLICT DO NOTHING`,
    [orgId, uid]
  );

  const roomId = `rm_${Date.now().toString(36)}`;
  await query(
    `INSERT INTO rooms (id, name, endpoint, description, owner_id, org_id)
     VALUES ($1,$2,'private',$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
    [roomId, 'Primary workspace', 'Due diligence workspace', uid, orgId]
  );
  await query(
    `INSERT INTO room_members (room_id, user_id, role) VALUES ($1,$2,'owner') ON CONFLICT DO NOTHING`,
    [roomId, uid]
  );

  console.log(`Bootstrap admin created: ${email}`);
}

let ensured = false;
let ensuring: Promise<void> | null = null;

export async function ensureSchema(): Promise<void> {
  if (ensured) return;
  if (ensuring) return ensuring;

  ensuring = (async () => {
    await pool.query(SCHEMA_SQL);

    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS org_id TEXT`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS sso_sub TEXT`);
    await pool.query(`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS org_id TEXT`);
    await pool.query(
      `ALTER TABLE published_reports ADD COLUMN IF NOT EXISTS snapshot JSONB NOT NULL DEFAULT '{}'::jsonb`
    );
    await pool.query(`ALTER TABLE published_reports ADD COLUMN IF NOT EXISTS pdf_object_key TEXT`);
    await pool.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_sso_sub ON users(sso_sub) WHERE sso_sub IS NOT NULL`
    );
    await pool.query(`
      CREATE TABLE IF NOT EXISTS revenue_events (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        model TEXT NOT NULL CHECK (model IN ('A', 'B', 'C', 'D')),
        amount NUMERIC(12, 2) NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_revenue_room ON revenue_events(room_id, created_at DESC)`
    );
    try {
      await pool.query(`ALTER TABLE users ALTER COLUMN password_hash SET DEFAULT ''`);
    } catch {
      /* older PG */
    }

    await seedDemo();
    await bootstrapAdmin();
    ensured = true;
    console.log('Schema ready.');
  })();

  try {
    await ensuring;
  } finally {
    ensuring = null;
  }
}
