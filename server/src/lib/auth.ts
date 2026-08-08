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

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  orgName?: string;
  inviteToken?: string;
}

/**
 * Public signup: creates org + user + default private room.
 * Optional inviteToken joins existing org instead.
 */
export async function register(input: RegisterInput) {
  const email = input.email.toLowerCase().trim();
  const name = input.name.trim();
  if (!email || !name || input.password.length < 8) return null;

  const exists = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (exists.rows[0]) {
    return { error: 'email_taken' as const };
  }

  let orgId: string;
  let orgRole = 'owner';
  let userRole = 'lead';

  if (input.inviteToken) {
    const inv = await query<{
      id: string;
      org_id: string;
      email: string;
      role: string;
      expires_at: Date;
      accepted_at: Date | null;
    }>(
      `SELECT id, org_id, email, role, expires_at, accepted_at
       FROM org_invites WHERE token = $1`,
      [input.inviteToken]
    );
    const row = inv.rows[0];
    if (!row || row.accepted_at) return { error: 'invalid_invite' as const };
    if (new Date(row.expires_at).getTime() < Date.now()) return { error: 'invite_expired' as const };
    if (row.email.toLowerCase() !== email) return { error: 'invite_email_mismatch' as const };
    orgId = row.org_id;
    orgRole = row.role === 'admin' || row.role === 'owner' ? row.role : 'member';
    userRole = row.role === 'lead' || row.role === 'admin' ? row.role : 'analyst';
  } else {
    const base =
      (input.orgName || name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 28) ||
      'org';
    orgId = `org_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const slug = `${base}-${orgId.slice(-6)}`;
    await query(`INSERT INTO orgs (id, name, slug) VALUES ($1,$2,$3)`, [
      orgId,
      input.orgName?.trim() || `${name}'s workspace`,
      slug,
    ]);
  }

  const userId = `usr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const hash = await bcrypt.hash(input.password, 10);
  await query(
    `INSERT INTO users (id, email, name, role, password_hash, org_id)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [userId, email, name, userRole, hash, orgId]
  );
  await query(
    `INSERT INTO org_members (org_id, user_id, role) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
    [orgId, userId, orgRole]
  );

  if (input.inviteToken) {
    await query(
      `UPDATE org_invites SET accepted_at = NOW() WHERE token = $1 AND accepted_at IS NULL`,
      [input.inviteToken]
    );
  }

  // Default private room for new org owners; invitees join existing rooms via membership
  if (!input.inviteToken) {
    const roomId = `rm_${Date.now().toString(36)}`;
    await query(
      `INSERT INTO rooms (id, name, endpoint, description, owner_id, org_id)
       VALUES ($1,$2,'private',$3,$4,$5)`,
      [roomId, 'Primary workspace', 'Your due diligence workspace', userId, orgId]
    );
    await query(`INSERT INTO room_members (room_id, user_id, role) VALUES ($1,$2,'owner')`, [
      roomId,
      userId,
    ]);
  }

  const jwtUser: JwtUser = {
    sub: userId,
    email,
    name,
    role: userRole,
    orgId,
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
