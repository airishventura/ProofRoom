import type { Context, Next } from 'hono';
import { verifyToken, type JwtUser } from './lib/auth.js';

export type AppEnv = {
  Variables: {
    user: JwtUser;
  };
};

export async function requireAuth(c: Context<AppEnv>, next: Next) {
  const header = c.req.header('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return c.json({ error: 'Unauthorized' }, 401);
  const user = await verifyToken(token);
  if (!user) return c.json({ error: 'Invalid token' }, 401);
  c.set('user', user);
  await next();
}
