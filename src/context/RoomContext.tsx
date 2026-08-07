import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { RoomService, resetRoom, type RoomRecord, DocumentService, RunService } from '../services/api';
import { AuthService as MockAuth } from '../services/auth';
import { Store } from '../services/store';
import { getToken, isApiMode, setToken } from '../services/http';
import { getStoredUser, isRemoteReady, Remote, setStoredUser, type ApiUser } from '../services/remote';

const ROOM_KEY = 'activeRoomId';

interface RoomCtx {
  roomId: string;
  room: RoomRecord | null;
  rooms: RoomRecord[];
  setRoomId: (id: string) => void;
  token: string | null;
  accessGranted: boolean;
  unlockPrivate: () => boolean;
  refreshRooms: () => void;
  resetCurrentRoom: () => Promise<void>;
  apiMode: boolean;
  remoteReady: boolean;
  user: ApiUser | null;
  loading: boolean;
  authError: string | null;
}

const Ctx = createContext<RoomCtx | null>(null);

function loadRoomId(): string {
  try {
    return localStorage.getItem(ROOM_KEY) || 'r1';
  } catch {
    return 'r1';
  }
}

export function RoomProvider({ children }: { children: ReactNode }) {
  const apiMode = isApiMode();
  const [rooms, setRooms] = useState<RoomRecord[]>([]);
  const [roomId, setRoomIdState] = useState(loadRoomId);
  const [jwt, setJwt] = useState<string | null>(() => (apiMode ? getToken() : null));
  const [user, setUser] = useState<ApiUser | null>(() => (apiMode ? getStoredUser() : null));
  const [loading, setLoading] = useState(apiMode);
  const [authError, setAuthError] = useState<string | null>(null);
  const [localToken, setLocalToken] = useState<string | null>(() => {
    if (apiMode) return null;
    try {
      const existing = localStorage.getItem('pr.session.token');
      if (existing) return existing;
      const t = MockAuth.generateToken('r1', 'private').token;
      localStorage.setItem('pr.session.token', t);
      return t;
    } catch {
      return 'prv_demo';
    }
  });
  const [tick, setTick] = useState(0);

  // Local mock seed (browser-only demo when API is off)
  useEffect(() => {
    if (apiMode) return;
    Store.init();
    DocumentService.getAll();
    RunService.getAll();
    setRooms(RoomService.syncStats());
  }, [apiMode]);

  const room = rooms.find(r => r.id === roomId) || rooms[0] || null;

  const refreshRooms = useCallback(() => {
    if (isRemoteReady()) {
      Remote.rooms()
        .then(list => {
          setRooms(list);
          setAuthError(null);
          setRoomIdState(prev => {
            if (list.some(r => r.id === prev)) return prev;
            const next = list[0]?.id || prev;
            try {
              localStorage.setItem(ROOM_KEY, next);
            } catch { /* */ }
            return next;
          });
        })
        .catch(e => {
          setAuthError(e instanceof Error ? e.message : 'Failed to load rooms');
          if (String(e).includes('401') || String(e).toLowerCase().includes('unauthorized')) {
            setToken(null);
            setStoredUser(null);
            setJwt(null);
            setUser(null);
          }
        });
      return;
    }
    if (!apiMode) {
      setRooms(RoomService.syncStats());
    }
    setTick(t => t + 1);
  }, [apiMode]);

  // Bootstrap API session: validate JWT + load rooms
  useEffect(() => {
    if (!apiMode) {
      setLoading(false);
      return;
    }
    const token = getToken();
    setJwt(token);
    if (!token) {
      setRooms([]);
      setUser(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const me = await Remote.me();
        if (cancelled) return;
        setUser(me);
        const list = await Remote.rooms();
        if (cancelled) return;
        setRooms(list);
        setRoomIdState(prev => {
          if (list.some(r => r.id === prev)) return prev;
          const next = list[0]?.id || prev;
          try {
            localStorage.setItem(ROOM_KEY, next);
          } catch { /* */ }
          return next;
        });
        setAuthError(null);
      } catch (e) {
        if (cancelled) return;
        setAuthError(e instanceof Error ? e.message : 'Auth failed');
        setToken(null);
        setStoredUser(null);
        setJwt(null);
        setUser(null);
        setRooms([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiMode, tick]);

  const setRoomId = useCallback(
    (id: string) => {
      setRoomIdState(id);
      try {
        localStorage.setItem(ROOM_KEY, id);
      } catch { /* */ }
      if (!apiMode) setRooms(RoomService.syncStats());
    },
    [apiMode]
  );

  const unlockPrivate = useCallback(() => {
    if (apiMode) {
      // JWT membership is the gate; private unlock is a no-op when logged in
      return !!getToken();
    }
    const r = rooms.find(x => x.id === roomId) || room;
    if (!r) return false;
    if (r.endpoint === 'shared') return true;
    const t = MockAuth.generateToken(r.id, 'private');
    setLocalToken(t.token);
    try {
      localStorage.setItem('pr.session.token', t.token);
    } catch { /* */ }
    return true;
  }, [apiMode, room, roomId, rooms]);

  const resetCurrentRoom = useCallback(async () => {
    if (apiMode) {
      if (!isRemoteReady()) {
        setAuthError('Sign in to reset room data on the API.');
        return;
      }
      try {
        await Remote.resetRoomData(roomId);
        setAuthError(null);
        refreshRooms();
      } catch (e) {
        setAuthError(e instanceof Error ? e.message : 'Room reset failed');
      }
      return;
    }
    resetRoom(roomId);
    refreshRooms();
  }, [apiMode, roomId, refreshRooms]);

  const accessGranted = apiMode
    ? !!jwt && !!user
    : !room ||
      room.endpoint === 'shared' ||
      (!!localToken && MockAuth.isPrivateAccessGranted(localToken));

  useEffect(() => {
    if (apiMode || !rooms.length) return;
    setRooms(RoomService.syncStats());
  }, [apiMode, roomId, tick, rooms.length]);

  const value: RoomCtx = {
    roomId: room?.id || roomId,
    room,
    rooms,
    setRoomId,
    token: apiMode ? jwt : localToken,
    accessGranted,
    unlockPrivate,
    refreshRooms,
    resetCurrentRoom,
    apiMode,
    remoteReady: isRemoteReady(),
    user,
    loading,
    authError,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRoom() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useRoom outside RoomProvider');
  return v;
}
