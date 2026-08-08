import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BrandMark } from '../components/BrandMark';
import { apiLogin, apiRegister, isApiMode } from '../services/http';
import { setStoredUser } from '../services/remote';

type Mode = 'signin' | 'signup';

export default function LoginPage() {
  const [params] = useSearchParams();
  const invite = params.get('invite') || '';
  const [mode, setMode] = useState<Mode>(invite ? 'signup' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ssoEnabled, setSsoEnabled] = useState(false);

  useEffect(() => {
    if (!isApiMode()) return;
    // same-origin or absolute API
    import('../services/http').then(({ getApiBase }) => {
      const base = getApiBase();
      fetch(`${base}/api/auth/sso/config`)
        .then(r => r.json())
        .then((d: { enabled?: boolean }) => setSsoEnabled(!!d.enabled))
        .catch(() => setSsoEnabled(false));
    });
  }, []);

  if (!isApiMode()) {
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="font-display text-3xl mb-3">Offline demo</h1>
        <p className="text-sm text-ink-soft mb-6">
          API mode is off. Local mock uses browser storage only — not shared or durable.
        </p>
        <Link to="/workspace" className="text-gold font-bold">
          Open local workspace →
        </Link>
        <p className="mt-6 text-[11px] text-ink-faint">
          Production uses sign-in at this page when the API is connected.
        </p>
      </main>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const data =
        mode === 'signup'
          ? await apiRegister({
              email,
              password,
              name: name || email.split('@')[0] || 'User',
              orgName: orgName || undefined,
              inviteToken: invite || undefined,
            })
          : await apiLogin(email, password);
      setStoredUser(data.user);
      window.location.href = '/workspace';
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : mode === 'signup' ? 'Sign up failed' : 'Login failed');
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-md px-4 sm:px-6 py-16 sm:py-24">
      <div className="flex justify-center mb-8">
        <BrandMark />
      </div>
      <form onSubmit={submit} className="glass-card p-6 sm:p-8 space-y-4">
        <h1 className="font-display text-3xl mb-2">{mode === 'signup' ? 'Create account' : 'Sign in'}</h1>
        <p className="text-xs text-ink-faint mb-4">
          {mode === 'signup'
            ? invite
              ? 'Accept your invite and set a password.'
              : 'Creates your org and a private workspace.'
            : 'Use the email and password for your ProofRoom account.'}
        </p>

        {mode === 'signup' && (
          <>
            <label className="block text-xs font-bold text-ink-soft">
              Name
              <input
                className="mt-1 w-full rounded-xl border border-ink-faint/30 bg-paper-deep px-4 py-3 text-sm outline-none focus:border-gold/40"
                value={name}
                onChange={e => setName(e.target.value)}
                type="text"
                autoComplete="name"
                required
              />
            </label>
            {!invite && (
              <label className="block text-xs font-bold text-ink-soft">
                Organization (optional)
                <input
                  className="mt-1 w-full rounded-xl border border-ink-faint/30 bg-paper-deep px-4 py-3 text-sm outline-none focus:border-gold/40"
                  value={orgName}
                  onChange={e => setOrgName(e.target.value)}
                  type="text"
                  placeholder="Acme Corp"
                />
              </label>
            )}
          </>
        )}

        <label className="block text-xs font-bold text-ink-soft">
          Email
          <input
            className="mt-1 w-full rounded-xl border border-ink-faint/30 bg-paper-deep px-4 py-3 text-sm outline-none focus:border-gold/40"
            value={email}
            onChange={e => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
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
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            minLength={mode === 'signup' ? 8 : 4}
            required
          />
        </label>
        {err && <p className="text-[11px] text-rose">{err}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-ink text-paper py-3 text-sm font-bold hover:bg-ink-soft disabled:opacity-40"
        >
          {busy ? '…' : mode === 'signup' ? 'Create account' : 'Sign in'}
        </button>

        <button
          type="button"
          className="w-full text-[11px] text-ink-faint hover:text-gold pt-1"
          onClick={() => {
            setMode(m => (m === 'signin' ? 'signup' : 'signin'));
            setErr(null);
          }}
        >
          {mode === 'signup' ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
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
