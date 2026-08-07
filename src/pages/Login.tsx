import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BrandMark } from '../components/BrandMark';
import { apiLogin, getApiBase, isApiMode } from '../services/http';
import { setStoredUser } from '../services/remote';

export default function LoginPage() {
  const [email, setEmail] = useState('sarah@acme.com');
  const [password, setPassword] = useState('demo1234');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ssoEnabled, setSsoEnabled] = useState(false);

  useEffect(() => {
    if (!isApiMode()) return;
    const base = getApiBase();
    fetch(`${base}/api/auth/sso/config`)
      .then(r => r.json())
      .then((d: { enabled?: boolean }) => setSsoEnabled(!!d.enabled))
      .catch(() => setSsoEnabled(false));
  }, []);

  if (!isApiMode()) {
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="font-display text-3xl mb-3">API mode off</h1>
        <p className="text-sm text-ink-soft mb-6">
          Set <code className="font-mono">VITE_API_URL</code> and run the server to enable login.
        </p>
        <Link to="/workspace" className="text-gold font-bold">
          Continue with local mock →
        </Link>
      </main>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const data = await apiLogin(email, password);
      setStoredUser(data.user);
      // Full reload so RoomProvider re-bootstraps JWT + rooms from Postgres
      window.location.href = '/workspace';
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Login failed');
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-md px-4 sm:px-6 py-16 sm:py-24">
      <div className="flex justify-center mb-8">
        <BrandMark />
      </div>
      <form onSubmit={submit} className="glass-card p-6 sm:p-8 space-y-4">
        <h1 className="font-display text-3xl mb-2">Sign in</h1>
        <p className="text-xs text-ink-faint mb-4">Demo: sarah@acme.com / demo1234</p>
        <label className="block text-xs font-bold text-ink-soft">
          Email
          <input
            className="mt-1 w-full rounded-xl border border-ink-faint/30 bg-paper-deep px-4 py-3 text-sm outline-none focus:border-gold/40"
            value={email}
            onChange={e => setEmail(e.target.value)}
            type="email"
            required
          />
        </label>
        <label className="block text-xs font-bold text-ink-soft">
          Password
          <input
            className="mt-1 w-full rounded-xl border border-ink-faint/30 bg-paper-deep px-4 py-3 text-sm outline-none focus:border-gold/40"
            value={password}
            onChange={e => setPassword(e.target.value)}
            type="password"
            required
          />
        </label>
        {err && <p className="text-[11px] text-rose">{err}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-ink text-paper py-3 text-sm font-bold hover:bg-ink-soft disabled:opacity-40"
        >
          {busy ? '…' : 'Sign in'}
        </button>
        {ssoEnabled && (
          <p className="text-[11px] text-ink-faint text-center pt-2">
            SSO enabled — exchange an OIDC <code className="font-mono">id_token</code> via{' '}
            <code className="font-mono">POST /api/auth/sso</code>
          </p>
        )}
      </form>
      <p className="mt-4 text-center text-[11px] text-ink-faint">
        <Link to="/" className="hover:text-gold">
          ← Home
        </Link>
      </p>
    </main>
  );
}
