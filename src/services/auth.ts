/* ------------------------------------------------------------------ */
/*  Auth Service — Mock JWT tokens for private/shared endpoints        */
/* ------------------------------------------------------------------ */

export interface AuthToken {
  token: string;
  endpoint: 'private' | 'shared';
  roomId: string;
  userId: string;
  issuedAt: string;
  expiresAt: string;
}

export interface User {
  id: string;
  name: string;
  role: 'analyst' | 'lead' | 'cfo' | 'admin';
  email: string;
}

const USERS: User[] = [
  { id: 'usr_01', name: 'Sarah Chen', role: 'lead', email: 'sarah@acme.com' },
  { id: 'usr_02', name: 'Marcus Webb', role: 'analyst', email: 'marcus@acme.com' },
  { id: 'usr_03', name: 'Elena Vasquez', role: 'cfo', email: 'elena@acme.com' },
];

function base64Encode(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

export const AuthService = {
  generateToken: (roomId: string, endpoint: 'private' | 'shared', userId?: string): AuthToken => {
    const user = USERS.find(u => u.id === userId) || USERS[0];
    const token = `prv_${base64Encode(`${user.id}:${roomId}:${Date.now()}`).slice(0, 16)}`;
    return {
      token,
      endpoint,
      roomId,
      userId: user.id,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
  },
  validateToken: (token: string): AuthToken | null => {
    if (!token || !token.startsWith('prv_')) return null;
    try {
      const payloadStr = atob(token.replace('prv_', ''));
      const [uid] = payloadStr.split(':');
      if (!USERS.find(u => u.id === uid)) return null;
      return AuthService.generateToken('r1', 'private', uid);
    } catch {
      return null;
    }
  },
  getCurrentUser: (): User => USERS[0],
  getUsers: (): User[] => USERS,
  isPrivateAccessGranted: (token?: string): boolean => {
    return AuthService.validateToken(token || '') !== null;
  },
};
