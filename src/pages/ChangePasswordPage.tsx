import { useState } from 'react';
import { Eye, EyeOff, Loader2, KeyRound, Check } from 'lucide-react';
import { BRAND_NAME, BrandMark } from '@/components/shared/Brand';
import { useAuth } from '@/context/AuthContext';
import { api, ApiException } from '@/lib/api';

export default function ChangePasswordPage() {
  const { user, logout, refreshUser } = useAuth();

  const [current, setCurrent]   = useState('');
  const [next, setNext]         = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext]       = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [done, setDone]         = useState(false);

  const inp = (extra?: React.CSSProperties): React.CSSProperties => ({
    width: '100%',
    height: 44,
    padding: '0 40px 0 12px',
    borderRadius: 10,
    border: '1px solid var(--border)',
    backgroundColor: '#fff',
    color: 'var(--foreground)',
    fontSize: '0.875rem',
    outline: 'none',
    boxSizing: 'border-box',
    ...extra,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!current.trim()) { setError('Current password is required.'); return; }
    if (next.trim().length < 8) { setError('New password must be at least 8 characters.'); return; }
    if (next !== confirm) { setError('New passwords do not match.'); return; }
    if (next === current) { setError('New password must differ from current password.'); return; }

    setSaving(true);
    try {
      await api.put('/auth/password', { current_password: current, new_password: next });
      // Don't refresh the user yet: once must_change_password flips, the route guard
      // redirects away and this confirmation would never be seen.
      setDone(true);
    } catch (err) {
      if (err instanceof ApiException) {
        if (err.code === 'invalid_credentials' || err.code === 'wrong_password') {
          setError('Current password is incorrect.');
        } else if (err.code === 'invalid_request' && err.message.toLowerCase().includes('password')) {
          setError('New password must be at least 8 characters.');
        } else {
          setError(err.message || 'Something went wrong.');
        }
      } else {
        setError('Unable to connect to the server. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%', backgroundColor: 'var(--background)', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>
      <div style={{ width: '100%', maxWidth: 440, backgroundColor: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: '30px 28px', boxShadow: '0 12px 32px rgba(17,24,39,0.06)' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <BrandMark />
          <span style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: '0.95rem' }}>{BRAND_NAME}</span>
        </div>

        {done ? (
          /* ── Success state ──────────────────────────────── */
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', backgroundColor: '#ECF7F0', border: '2px solid #8FD3AE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Check size={26} color="#178A4C" />
            </div>
            <h1 style={{ color: 'var(--foreground)', fontSize: '1.4rem', fontWeight: 700, marginBottom: 10 }}>Password updated</h1>
            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', marginBottom: 28 }}>
              Your password has been changed successfully.
            </p>
            <button
              onClick={() => { refreshUser().catch(() => window.location.replace('/admin/dashboard')); }}
              style={{ width: '100%', height: 44, borderRadius: 10, border: 'none', backgroundColor: 'var(--primary)', color: '#fff', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Go to dashboard
            </button>
          </div>
        ) : (
          /* ── Form ───────────────────────────────────────── */
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: '#ECF7F0', border: '1px solid #8FD3AE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <KeyRound size={20} color="#178A4C" />
              </div>
              <div>
                <h1 style={{ color: 'var(--foreground)', fontSize: '1.3rem', fontWeight: 700, lineHeight: 1.2 }}>Change your password</h1>
                <p style={{ color: 'var(--muted-foreground)', fontSize: '0.8rem', marginTop: 3 }}>
                  Hi <strong style={{ color: 'var(--foreground)' }}>{user?.full_name}</strong> — you must set a new password to continue.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Current password */}
              <div>
                <label style={{ display: 'block', color: 'var(--foreground)', fontSize: '0.8rem', fontWeight: 600, marginBottom: 7 }}>
                  Current Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={current}
                    onChange={e => { setCurrent(e.target.value); setError(''); }}
                    placeholder="••••••••"
                    style={inp()}
                    disabled={saving}
                    autoFocus
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowCurrent(v => !v)} disabled={saving}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex', padding: 0 }} aria-label={showCurrent ? 'Hide password' : 'Show password'}>
                    {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* New password */}
              <div>
                <label style={{ display: 'block', color: 'var(--foreground)', fontSize: '0.8rem', fontWeight: 600, marginBottom: 7 }}>
                  New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNext ? 'text' : 'password'}
                    value={next}
                    onChange={e => { setNext(e.target.value); setError(''); }}
                    placeholder="Min 8 characters"
                    style={inp()}
                    disabled={saving}
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowNext(v => !v)} disabled={saving}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex', padding: 0 }} aria-label={showNext ? 'Hide password' : 'Show password'}>
                    {showNext ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <p style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', marginTop: 5 }}>At least 8 characters</p>
              </div>

              {/* Confirm */}
              <div>
                <label style={{ display: 'block', color: 'var(--foreground)', fontSize: '0.8rem', fontWeight: 600, marginBottom: 7 }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => { setConfirm(e.target.value); setError(''); }}
                  placeholder="Repeat new password"
                  style={inp({ paddingRight: 12 })}
                  disabled={saving}
                  autoComplete="new-password"
                />
              </div>

              {/* Error */}
              {error && (
                <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#B91C1C', fontSize: '0.8rem', padding: '9px 12px' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                style={{ width: '100%', height: 44, borderRadius: 10, border: 'none', background: saving ? 'var(--muted)' : 'var(--primary)', color: saving ? 'var(--muted-foreground)' : '#fff', fontSize: '0.9rem', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                {saving ? 'Saving…' : 'Set new password'}
              </button>
            </form>

            <button
              onClick={logout}
              style={{ display: 'block', width: '100%', marginTop: 16, background: 'none', border: 'none', color: 'var(--muted-foreground)', fontSize: '0.8rem', cursor: 'pointer', textAlign: 'center' }}
            >
              Sign out instead
            </button>
          </>
        )}
      </div>
    </div>
  );
}
