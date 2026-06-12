import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Eye, EyeOff, Loader2, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      navigate('/admin/dashboard');
    }, 1000);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">

      {/* ── Left: Form ───────────────────────────────────────────────── */}
      <div className="flex flex-col justify-center items-center w-1/2 bg-white px-16">
        <div className="w-full max-w-md">

          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <div
              className="flex items-center justify-center rounded-xl shrink-0"
              style={{
                width: 44,
                height: 44,
                background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
              }}
            >
              <Truck size={22} color="#fff" />
            </div>
            <div>
              <p style={{ color: '#111827', fontSize: '1.1rem', fontWeight: 700, lineHeight: 1.2 }}>
                FleetAdmin
              </p>
              <p style={{ color: '#9CA3AF', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Super Admin Portal
              </p>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 style={{ color: '#111827', fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.25, marginBottom: 8 }}>
              Welcome back
            </h1>
            <p style={{ color: '#6B7280', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Sign in to your admin account to continue.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">

            {/* Email */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" style={{ color: '#374151', fontSize: '0.82rem' }}>
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="admin@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                style={{ height: 42, fontSize: '0.875rem' }}
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" style={{ color: '#374151', fontSize: '0.82rem' }}>
                  Password
                </Label>
                <button
                  type="button"
                  style={{
                    color: '#2563EB',
                    fontSize: '0.78rem',
                    fontWeight: 500,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="pr-10"
                  style={{ height: 42, fontSize: '0.875rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}
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
              />
              <Label
                htmlFor="remember"
                style={{ color: '#6B7280', fontSize: '0.82rem', fontWeight: 400, cursor: 'pointer' }}
              >
                Remember me for 30 days
              </Label>
            </div>

            {/* Error */}
            {error && (
              <div
                style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: 8,
                  color: '#DC2626',
                  fontSize: '0.82rem',
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
              className="w-full h-11 text-sm font-semibold rounded-xl mt-1"
              style={{ fontSize: '0.9rem' }}
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

          {/* Footer */}
          <p style={{ color: '#D1D5DB', fontSize: '0.75rem', textAlign: 'center', marginTop: 36 }}>
            © 2026 FleetAdmin. All rights reserved.
          </p>
        </div>
      </div>

      {/* ── Right: Branded graphic ────────────────────────────────────── */}
      <div className="relative w-1/2 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1485575301924-6891ef935dcd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cnVja2luZyUyMGxvZ2lzdGljcyUyMGhpZ2h3YXklMjB0cnVjayUyMGRhcmslMjBkcmFtYXRpY3xlbnwxfHx8fDE3ODEyNjg0MTh8MA&ixlib=rb-4.1.0&q=80&w=1080"
          alt="Trucking logistics"
          className="w-full h-full object-cover"
        />

        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(15,23,42,0.3) 0%, rgba(15,23,42,0.15) 50%, rgba(15,23,42,0.65) 100%)',
          }}
        />

        {/* Top-left brand mark */}
        <div className="absolute top-8 left-8 flex items-center gap-2.5">
          <div
            className="flex items-center justify-center rounded-lg"
            style={{ width: 34, height: 34, background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' }}
          >
            <Truck size={17} color="#fff" />
          </div>
          <span style={{ color: '#F8FAFC', fontSize: '0.95rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
            FleetAdmin
          </span>
        </div>

        {/* Bottom quote card */}
        <div className="absolute bottom-10 left-8 right-8">
          <div
            style={{
              backgroundColor: 'rgba(15,23,42,0.72)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: 14,
              padding: '20px 24px',
              maxWidth: 380,
            }}
          >
            <p style={{ color: '#F1F5F9', fontSize: '1rem', fontWeight: 600, lineHeight: 1.45, marginBottom: 8 }}>
              Manage your fleet with confidence
            </p>
            <p style={{ color: '#94A3B8', fontSize: '0.82rem', lineHeight: 1.55 }}>
              Oversee companies, drivers, and loads across every route — all from one powerful dashboard.
            </p>

            {/* Stats row */}
            <div
              className="flex items-center gap-5 mt-5 pt-4"
              style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
            >
              {[
                { value: '1,200+', label: 'Companies' },
                { value: '9,000+', label: 'Active Drivers' },
                { value: '60k+',   label: 'Monthly Loads' },
              ].map((s) => (
                <div key={s.label}>
                  <p style={{ color: '#F1F5F9', fontSize: '1rem', fontWeight: 700, lineHeight: 1 }}>{s.value}</p>
                  <p style={{ color: '#64748B', fontSize: '0.72rem', marginTop: 3 }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
