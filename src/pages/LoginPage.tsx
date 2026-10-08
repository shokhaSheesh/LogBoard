import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Eye, EyeOff, Loader2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/context/AuthContext';
import { ApiException } from '@/lib/api';

// Static sample rows for the right-hand preview — the companies list this console manages.
const PREVIEW_ROWS = [
  { company: 'Hill Transport LLC',  plan: 'Enterprise',   planBg: '#EFF6FF', planColor: '#2563EB', status: 'Active',    dot: '#22C55E' },
  { company: 'Karimov Freight',     plan: 'Professional', planBg: '#F5F3FF', planColor: '#7C3AED', status: 'Active',    dot: '#22C55E' },
  { company: 'Sousa Logistics',     plan: 'Starter',      planBg: '#ECFDF5', planColor: '#059669', status: 'Pending',   dot: '#F59E0B' },
  { company: 'Banks & Sons Hauling', plan: 'Basic',       planBg: '#FFF7ED', planColor: '#C2410C', status: 'Active',    dot: '#22C55E' },
  { company: 'Peña Carriers',       plan: 'Professional', planBg: '#F5F3FF', planColor: '#7C3AED', status: 'Suspended', dot: '#EF4444' },
  { company: 'Okafor Express',      plan: 'Starter',      planBg: '#ECFDF5', planColor: '#059669', status: 'Active',    dot: '#22C55E' },
  { company: 'Fischer Cargo',       plan: 'Enterprise',   planBg: '#EFF6FF', planColor: '#2563EB', status: 'Active',    dot: '#22C55E' },
  { company: 'Williams Trucking',   plan: 'Basic',        planBg: '#FFF7ED', planColor: '#C2410C', status: 'Pending',   dot: '#F59E0B' },
  { company: 'Aliev Transit',       plan: 'Professional', planBg: '#F5F3FF', planColor: '#7C3AED', status: 'Active',    dot: '#22C55E' },
];

const INPUT_CLASS = 'border-border bg-white focus-visible:border-[#178A4C] focus-visible:ring-[#178A4C]/20';
const INPUT_STYLE = { height: 44, fontSize: '0.875rem', borderRadius: 10 };

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!identifier.trim() || !password.trim()) {
      setError('Please enter your login and password.');
      return;
    }
    setIsLoading(true);
    try {
      await login(identifier.trim(), password, rememberMe);
      navigate('/admin/dashboard');
    } catch (err) {
      if (err instanceof ApiException) {
        if (err.code === 'invalid_credentials') {
          setError('Invalid login or password.');
        } else if (err.code === 'invalid_request') {
          setError('Please check your login and password.');
        } else {
          setError(err.message || 'Something went wrong. Please try again.');
        }
      } else {
        setError('Unable to connect to the server. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-white">

      {/* ── Left: form ────────────────────────────────────────────────── */}
      <div className="flex flex-col justify-between gap-8 w-full lg:w-[46%] px-8 py-7">

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0" style={{ backgroundColor: 'var(--primary)' }}>
            <Zap size={18} color="#fff" />
          </div>
          <div>
            <div style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.2 }}>FleetAdmin</div>
            <div style={{ color: 'var(--muted-foreground)', fontSize: '0.7rem' }}>Super Admin</div>
          </div>
        </div>

        <div className="w-full max-w-sm mx-auto">

          {/* Heading */}
          <div className="mb-7">
            <h1 style={{ color: 'var(--foreground)', fontSize: '1.65rem', fontWeight: 700, lineHeight: 1.25, letterSpacing: '-0.02em', marginBottom: 6 }}>
              Welcome back
            </h1>
            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', lineHeight: 1.5 }}>
              Sign in to your admin account
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">

            {/* Email / Login */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="login" style={{ color: 'var(--foreground)', fontSize: '0.8rem', fontWeight: 600 }}>
                Login
              </Label>
              <Input
                id="login"
                type="text"
                autoComplete="username"
                autoFocus
                placeholder="admin@company.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={isLoading}
                className={INPUT_CLASS}
                style={INPUT_STYLE}
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="password" style={{ color: 'var(--foreground)', fontSize: '0.8rem', fontWeight: 600 }}>
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className={`pr-10 ${INPUT_CLASS}`}
                  style={INPUT_STYLE}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div className="flex items-center gap-2.5">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(v) => setRememberMe(v === true)}
                disabled={isLoading}
                className="border-[#D1D5DB] bg-white data-[state=checked]:bg-[#178A4C] data-[state=checked]:border-[#178A4C]"
              />
              <Label
                htmlFor="remember"
                style={{ color: 'var(--muted-foreground)', fontSize: '0.82rem', fontWeight: 400, cursor: 'pointer' }}
              >
                Keep me signed in on this device
              </Label>
            </div>

            {/* Error */}
            {error && (
              <div
                role="alert"
                style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: 8,
                  color: '#B91C1C',
                  fontSize: '0.8rem',
                  padding: '9px 12px',
                }}
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-xl font-semibold mt-1"
              style={{ backgroundColor: 'var(--primary)', fontSize: '0.9rem', border: 'none' }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>
          © 2026 FleetAdmin
        </p>
      </div>

      {/* ── Right: product preview (hidden on narrow screens) ─────────── */}
      <div
        className="hidden lg:flex flex-col gap-7 flex-1 min-w-0 overflow-hidden text-white"
        style={{ padding: '56px 0 0 56px', background: 'linear-gradient(160deg, #1E9E59 0%, #136F3D 100%)' }}
      >
        <div style={{ paddingRight: 56 }}>
          <h2 style={{ fontSize: '1.9rem', fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em', maxWidth: 420 }}>
            Every company, in one console
          </h2>
          <p style={{ fontSize: '0.92rem', lineHeight: 1.55, color: 'rgba(255,255,255,0.85)', marginTop: 12, maxWidth: 400 }}>
            Companies, subscriptions, users and permissions across the platform.
          </p>
        </div>

        <div
          aria-hidden="true"
          className="flex-1 min-w-0"
          style={{ backgroundColor: '#fff', color: '#111827', borderTopLeftRadius: 14, padding: '16px 0 0 18px', boxShadow: '0 24px 60px rgba(0,0,0,0.28)' }}
        >
          <div style={{ fontSize: '0.9rem', fontWeight: 700, paddingBottom: 12 }}>Companies</div>
          {PREVIEW_ROWS.map((r) => (
            <div
              key={r.company}
              className="grid items-center whitespace-nowrap"
              style={{ gridTemplateColumns: '1.6fr 1fr 1fr', gap: 12, padding: '10px 18px 10px 0', borderTop: '1px solid #E5E7EB', fontSize: '0.8rem' }}
            >
              <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.company}</span>
              <span style={{ justifySelf: 'start', fontSize: '0.68rem', fontWeight: 700, padding: '2px 9px', borderRadius: 5, backgroundColor: r.planBg, color: r.planColor }}>
                {r.plan}
              </span>
              <span className="flex items-center gap-1.5" style={{ color: '#6B7280' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: r.dot }} />
                {r.status}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
