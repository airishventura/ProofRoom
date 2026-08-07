import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Lock, Unlock, Menu, X, RotateCcw, Users, Server } from 'lucide-react';
import { useRoom } from '../context/RoomContext';
import { apiHealth, getToken, isApiMode, setToken } from '../services/http';
import { isDarkShellPath } from '../theme/darkShellRoutes';
import { BrandMark } from './BrandMark';
import { Modal } from './lib-ary/modal/Modal';
import { Button } from './lib-ary/button/Button';
import { Dropdown } from './lib-ary/dropdown/Dropdown';
import { Tooltip } from './lib-ary/tooltip/Tooltip';

const links = [
  { to: '/workspace', label: 'Workspace' },
  { to: '/audit', label: 'Audit' },
  { to: '/publish', label: 'Publish' },
  { to: '/approvals', label: 'Approvals' },
];

export default function Layout() {
  const {
    room,
    rooms,
    roomId,
    setRoomId,
    accessGranted,
    unlockPrivate,
    resetCurrentRoom,
    refreshRooms,
    apiMode,
    user,
  } = useRoom();
  const { pathname } = useLocation();
  const darkShell = isDarkShellPath(pathname);
  const [open, setOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [llm, setLlm] = useState(false);
  const [apiDetail, setApiDetail] = useState('');
  const loggedIn = !!getToken();

  // Document-level theme so body/overscroll match dark shell (cleared on light routes)
  useEffect(() => {
    const root = document.documentElement;
    if (darkShell) {
      root.classList.add('pr-theme-dark');
    } else {
      root.classList.remove('pr-theme-dark');
    }
    return () => {
      root.classList.remove('pr-theme-dark');
    };
  }, [darkShell]);

  useEffect(() => {
    if (!isApiMode()) {
      setApiOk(null);
      return;
    }
    let cancelled = false;
    const check = () => {
      apiHealth().then(h => {
        if (cancelled) return;
        setApiOk(!!h?.ok);
        setLlm(!!h?.llm);
        setApiDetail(
          h?.ok
            ? h.llm
              ? `${h.provider || 'llm'}/${h.model || ''}`
              : 'API up · no LLM key'
            : h?.error || 'API unreachable'
        );
      });
    };
    check();
    const id = window.setInterval(check, 15_000);
    const onFocus = () => check();
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const openReset = () => setResetOpen(true);

  const confirmReset = () => {
    setResetting(true);
    void resetCurrentRoom()
      .then(() => {
        refreshRooms();
        setOpen(false);
        setResetOpen(false);
        window.dispatchEvent(new Event('proofroom:room-reset'));
      })
      .finally(() => setResetting(false));
  };

  const shellWidth = darkShell ? 'max-w-[1600px]' : 'max-w-6xl';
  const scope = apiMode ? 'on the server (Postgres)' : 'locally';

  const roomOptions = rooms.map(r => ({
    value: r.id,
    label: `${r.id} · ${r.endpoint} · ${r.docs}d/${r.runs}r`,
  }));

  return (
    <div className={`min-h-screen bg-paper flex flex-col${darkShell ? ' pr-shell--dark' : ''}`}>
      <header className="glass-nav sticky top-0 z-50">
        <div
          className={`mx-auto ${shellWidth} px-3 sm:px-4 md:px-14 min-h-[4rem] sm:min-h-[4.25rem] py-2 flex items-center justify-between gap-2 sm:gap-3`}
        >
          <BrandMark onNavigate={() => setOpen(false)} />

          <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-[13px] font-medium text-ink-soft">
            {links.map(l => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) => (isActive ? 'text-gold' : 'hover:text-ink transition-colors')}
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            {darkShell && roomOptions.length > 0 ? (
              <div
                className="pr-nav-dropdown max-w-[7.5rem] sm:max-w-[12rem] md:max-w-[14rem]"
                title={room ? `${room.name} · ${room.docs} docs · ${room.runs} runs · ${room.spend}` : roomId}
              >
                <Dropdown
                  options={roomOptions}
                  value={roomId}
                  onChange={setRoomId}
                  placeholder="Room"
                />
              </div>
            ) : (
              <select
                value={roomId}
                onChange={e => setRoomId(e.target.value)}
                className="max-w-[7.5rem] sm:max-w-[12rem] md:max-w-[14rem] truncate rounded-lg border border-ink-faint/30 bg-paper-deep px-1.5 sm:px-2 py-1.5 text-[10px] sm:text-[11px] font-mono text-ink outline-none focus:border-gold/40"
                title={room ? `${room.name} · ${room.docs} docs · ${room.runs} runs · ${room.spend}` : roomId}
              >
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.id} · {r.endpoint} · {r.docs}d/{r.runs}r
                  </option>
                ))}
              </select>
            )}

            {apiMode ? (
              loggedIn && user ? (
                <span
                  className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-match/20 bg-match-soft px-2 py-1.5 text-[10px] font-bold text-match max-w-[8rem] truncate"
                  title={user.email}
                >
                  {user.name.split(' ')[0]}
                </span>
              ) : null
            ) : room?.endpoint === 'shared' ? (
              <span
                className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-match/20 bg-match-soft px-2 py-1.5 text-[10px] font-bold text-match"
                title="Shared room — no unlock required"
              >
                <Users className="h-3 w-3" /> Shared
              </span>
            ) : (
              <button
                type="button"
                onClick={() => unlockPrivate()}
                className={`hidden sm:inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] font-bold ${
                  accessGranted
                    ? 'border-match/20 bg-match-soft text-match'
                    : 'border-gold/20 bg-gold-soft text-gold-deep'
                }`}
                title={accessGranted ? 'Private access granted' : 'Unlock private endpoint'}
              >
                {accessGranted ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                {accessGranted ? 'Open' : 'Unlock'}
              </button>
            )}

            {(!apiMode || loggedIn) && (
              <Tooltip content={apiMode ? 'Reset room data (API)' : 'Reset room data (local)'}>
                <button
                  type="button"
                  onClick={openReset}
                  className="hidden md:inline-flex items-center gap-1 rounded-lg border border-ink-faint/30 px-2 py-1.5 text-[10px] font-bold text-ink-soft hover:text-rose hover:border-rose/30"
                  aria-label="Reset room"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              </Tooltip>
            )}

            {isApiMode() && (
              <span
                className={`hidden sm:inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] font-bold ${
                  apiOk === null
                    ? 'border-ink-faint/30 text-ink-faint'
                    : apiOk
                      ? 'border-match/20 bg-match-soft text-match'
                      : 'border-rose/30 bg-rose-soft text-rose'
                }`}
                title={apiDetail || (apiOk ? (llm ? 'API + LLM' : 'API up') : 'API unreachable')}
              >
                <Server className="h-3 w-3" />
                {apiOk === null ? '…' : apiOk ? (llm ? 'API+LLM' : 'API') : 'offline'}
              </span>
            )}

            {isApiMode() &&
              (loggedIn ? (
                <button
                  type="button"
                  onClick={() => {
                    setToken(null);
                    window.location.href = '/login';
                  }}
                  className="hidden sm:inline-flex rounded-lg border border-ink-faint/30 px-2 py-1.5 text-[10px] font-bold text-ink-soft"
                >
                  Logout
                </button>
              ) : (
                <Link
                  to="/login"
                  className="hidden sm:inline-flex rounded-lg bg-ink text-paper px-2 py-1.5 text-[10px] font-bold"
                >
                  Login
                </Link>
              ))}

            <button
              type="button"
              className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg border border-ink-faint/30 bg-paper-deep"
              onClick={() => setOpen(o => !o)}
              aria-label="Menu"
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="md:hidden border-t border-ink-faint/20 bg-paper/95 backdrop-blur-xl px-4 py-4 space-y-1">
            {links.map(l => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `block rounded-xl px-4 py-3 text-sm font-medium ${isActive ? 'bg-gold-soft text-gold-deep' : 'text-ink-soft hover:bg-paper-deep'}`
                }
              >
                {l.label}
              </NavLink>
            ))}
            <div className="pt-2 flex flex-wrap gap-2">
              {!apiMode && room?.endpoint === 'private' && (
                <button
                  type="button"
                  onClick={() => {
                    unlockPrivate();
                    setOpen(false);
                  }}
                  className="rounded-lg border border-gold/20 bg-gold-soft px-3 py-2 text-[11px] font-bold text-gold-deep"
                >
                  {accessGranted ? 'Session open' : 'Unlock private'}
                </button>
              )}
              {(!apiMode || loggedIn) && (
                <button
                  type="button"
                  onClick={openReset}
                  className="rounded-lg border border-ink-faint/30 px-3 py-2 text-[11px] font-bold text-ink-soft"
                >
                  Reset room
                </button>
              )}
              {apiMode && !loggedIn && (
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="rounded-lg bg-ink text-paper px-3 py-2 text-[11px] font-bold"
                >
                  Login
                </Link>
              )}
            </div>
            {room && (
              <p className="text-[10px] font-mono text-ink-faint pt-2">
                {room.name} · {room.docs} docs · {room.runs} runs · {room.spend}
              </p>
            )}
            <p className="text-[10px] text-ink-muted pt-3 border-t border-ink-faint/15 mt-2">
              <a
                href="https://x.com/airishventura"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gold underline decoration-gold/30 underline-offset-2"
              >
                by Airish Ventura
              </a>
              <span className="text-ink-faint mx-1.5" aria-hidden>
                ·
              </span>
              <a href="https://proofroom.site" className="font-mono hover:text-gold" target="_blank" rel="noopener noreferrer">
                proofroom.site
              </a>
            </p>
          </div>
        )}
      </header>

      <div className="flex-1 min-w-0">
        <Outlet />
      </div>

      <footer className="border-t border-ink-faint/20 mt-auto">
        <div
          className={`mx-auto ${shellWidth} px-4 md:px-14 py-5 sm:py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-ink-muted`}
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-display text-sm text-ink tracking-tight">
              Proof<span className="text-gold">Room</span>
            </span>
            <span className="text-ink-faint" aria-hidden>
              ·
            </span>
            <a
              href="https://x.com/airishventura"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gold transition-colors underline decoration-gold/30 underline-offset-2"
            >
              by Airish Ventura
            </a>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] sm:text-[11px]">
            <a
              href="https://proofroom.site"
              className="hover:text-gold transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              proofroom.site
            </a>
            <span className="text-ink-faint" aria-hidden>
              ·
            </span>
            <span className="text-ink-faint">Verifiable AI workspace</span>
          </div>
        </div>
      </footer>

      <Modal
        open={resetOpen}
        onClose={() => !resetting && setResetOpen(false)}
        title="Reset room data?"
        closeOnBackdrop={!resetting}
      >
        <p className="text-sm text-ink-soft leading-relaxed mb-4">
          Clear all data for room <span className="font-mono text-ink">{roomId}</span> {scope}? Documents,
          runs, chat, audit, and publish will be removed. This cannot be undone.
        </p>
        <div className="flex flex-wrap gap-2 justify-end">
          <Button type="button" variant="ghost" disabled={resetting} onClick={() => setResetOpen(false)}>
            Cancel
          </Button>
          <Button type="button" variant="primary" disabled={resetting} onClick={confirmReset}>
            {resetting ? 'Resetting…' : 'Reset room'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
