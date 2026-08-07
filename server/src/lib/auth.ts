import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { config } from '../config.js';
import { query } from '../db/pool.js';
import type { OidcClaims } from './oidc.js';

const secret = new TextEncoder().encode(config.jwtSecret);

export interface JwtUser {
  sub: string;
  email: string;
  name: string;
  role: string;
  orgId?: string;
}

export async function signToken(user: JwtUser): Promise<string> {
  return new SignJWT({
    email: user.email,
    name: user.name,
    role: user.role,
    orgId: user.orgId || null,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.sub)
    .setIssuedAt()
    .setExpirationTime(config.jwtTtl)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JwtUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      email: String(payload.email || ''),
      name: String(payload.name || ''),
      role: String(payload.role || 'analyst'),
      orgId: payload.orgId ? String(payload.orgId) : undefined,
    };
  } catch {
    return null;
  }
}

export async function login(email: string, password: string) {
  const res = await query<{
    id: string;
    email: string;
    name: string;
    role: string;
    password_hash: string;
    org_id: string | null;
  }>(
    'SELECT id, email, name, role, password_hash, org_id FROM users WHERE email = $1',
    [email.toLowerCase()]
  );
  const user = res.rows[0];
  if (!user) return null;
  if (!user.password_hash) return null;
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return null;
  const jwtUser: JwtUser = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    orgId: user.org_id || undefined,
  };
  const token = await signToken(jwtUser);
  return { token, user: jwtUser };
}

/** Provision or update user from verified OIDC claims; issue app JWT. */
export async function loginWithSso(claims: OidcClaims) {
  const orgId = claims.orgId || config.oidcDefaultOrgId || 'org_acme';

  // ensure org
  await query(
    `INSERT INTO orgs (id, name, slug) VALUES ($1,$2,$3)
     ON CONFLICT (id) DO NOTHING`,
    [orgId, orgId.replace(/^org_/, '').toUpperCase() || 'Org', orgId.replace(/^org_/, '') || orgId]
  );

  const bySso = await query<{
    id: string;
    email: string;
    name: string;
    role: string;
    org_id: string | null;
  }>('SELECT id, email, name, role, org_id FROM users WHERE sso_sub = $1', [claims.sub]);

  let user = bySso.rows[0];

  if (!user) {
    const byEmail = await query<{
      id: string;
      email: string;
      name: string;
      role: string;
      org_id: string | null;
    }>('SELECT id, email, name, role, org_id FROM users WHERE email = $1', [claims.email]);
    user = byEmail.rows[0];
    if (user) {
      await query('UPDATE users SET sso_sub = $2, org_id = COALESCE(org_id, $3), name = $4 WHERE id = $1', [
        user.id,
        claims.sub,
        orgId,
        claims.name || user.name,
      ]);
      user.org_id = user.org_id || orgId;
    }
  }

  if (!user) {
    const id = `usr_sso_${claims.sub.slice(0, 24).replace(/[^a-zA-Z0-9_]/g, '_')}`;
    await query(
      `INSERT INTO users (id, email, name, role, password_hash, org_id, sso_sub)
       VALUES ($1,$2,$3,$4,'',$5,$6)
       ON CONFLICT (email) DO UPDATE SET sso_sub = EXCLUDED.sso_sub, org_id = COALESCE(users.org_id, EXCLUDED.org_id)
       RETURNING id, email, name, role, org_id`,
      [id, claims.email, claims.name, claims.role || 'analyst', orgId, claims.sub]
    );
    const again = await query<{
      id: string;
      email: string;
      name: string;
      role: string;
      org_id: string | null;
    }>('SELECT id, email, name, role, org_id FROM users WHERE email = $1', [claims.email]);
    user = again.rows[0];
  }

  if (!user) return null;

  await query(
    `INSERT INTO org_members (org_id, user_id, role) VALUES ($1,$2,$3)
     ON CONFLICT DO NOTHING`,
    [orgId, user.id, claims.role || 'member']
  );

  const jwtUser: JwtUser = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    orgId: user.org_id || orgId,
  };
  const token = await signToken(jwtUser);
  return { token, user: jwtUser };
}

export async function userCanAccessRoom(userId: string, roomId: string): Promise<boolean> {
  const room = await query<{ endpoint: string; owner_id: string | null; org_id: string | null }>(
    'SELECT endpoint, owner_id, org_id FROM rooms WHERE id = $1',
    [roomId]
  );
  const r = room.rows[0];
  if (!r) return false;

  // same-org members can access shared rooms in their org
  if (r.endpoint === 'shared') {
    if (!r.org_id) return true; // legacy shared
    const mem = await query(
      `SELECT 1 FROM users u
       WHERE u.id = $1 AND (u.org_id = $2 OR EXISTS (
         SELECT 1 FROM org_members om WHERE om.user_id = u.id AND om.org_id = $2
       ))`,
      [userId, r.org_id]
    );
    if ((mem.rowCount || 0) > 0) return true;
    // also allow room_members
  }

  const mem = await query(
    'SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2',
    [roomId, userId]
  );
  if ((mem.rowCount || 0) > 0) return true;

  // org owner access to private rooms in org
  if (r.org_id) {
    const orgMem = await query(
      `SELECT 1 FROM org_members WHERE org_id = $1 AND user_id = $2 AND role IN ('owner','admin')`,
      [r.org_id, userId]
    );
    if ((orgMem.rowCount || 0) > 0) return true;
  }

  return false;
}
