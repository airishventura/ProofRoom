/**
 * OIDC id_token verification (JWKS or HS256 demo secret).
 */

import { createRemoteJWKSet, jwtVerify } from 'jose';
import { config } from '../config.js';

export interface OidcClaims {
  sub: string;
  email: string;
  name: string;
  orgId?: string;
  role?: string;
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (!config.oidcJwksUrl) return null;
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(config.oidcJwksUrl));
  }
  return jwks;
}

export async function verifyOidcIdToken(idToken: string): Promise<OidcClaims | null> {
  if (!config.oidcIssuer) return null;

  try {
    const opts = {
      issuer: config.oidcIssuer,
      audience: config.oidcAudience || undefined,
    };

    let payload: Record<string, unknown>;

    if (config.oidcHsSecret) {
      const secret = new TextEncoder().encode(config.oidcHsSecret);
      const verified = await jwtVerify(idToken, secret, opts);
      payload = verified.payload as Record<string, unknown>;
    } else {
      const set = getJwks();
      if (!set) {
        console.warn('[oidc] neither OIDC_HS_SECRET nor OIDC_JWKS_URL configured');
        return null;
      }
      const verified = await jwtVerify(idToken, set, opts);
      payload = verified.payload as Record<string, unknown>;
    }

    const sub = String(payload.sub || '');
    const email = String(payload.email || payload.preferred_username || '').toLowerCase();
    if (!sub || !email) return null;

    const name =
      String(payload.name || '') ||
      [payload.given_name, payload.family_name].filter(Boolean).join(' ') ||
      email.split('@')[0];

    const orgClaim =
      (payload.org_id as string) ||
      (payload.org as string) ||
      (payload['https://proofroom.dev/org'] as string) ||
      undefined;

    return {
      sub,
      email,
      name,
      orgId: orgClaim || config.oidcDefaultOrgId || undefined,
      role: String(payload.role || 'analyst'),
    };
  } catch (e) {
    console.warn('[oidc] verify failed:', e instanceof Error ? e.message : e);
    return null;
  }
}
