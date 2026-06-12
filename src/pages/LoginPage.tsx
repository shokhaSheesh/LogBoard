import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Eye, EyeOff, Truck } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!login || !password) {
      setError('Please enter your login and password.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate('/admin/dashboard');
    }, 900);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Left: form half */}
      <div
        className="flex flex-col justify-center items-center w-1/2 px-16"
        style={{ backgroundColor: '#0F172A' }}
      >
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <div
              className="flex items-center justify-center rounded-xl"
              style={{
                width: 44,
                height: 44,
                background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
              }}
            >
              <Truck size={22} color="#fff" />
            </div>
            <div>
              <div style={{ color: '#F8FAFC', fontSize: '1.1rem', fontWeight: 700, lineHeight: 1.2 }}>
                FleetAdmin
              </div>
              <div style={{ color: '#64748B', fontSize: '0.72rem', fontWeight: 500, letterSpacing: '0.05em' }}>
                SUPER ADMIN PORTAL
              </div>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 style={{ color: '#F8FAFC', fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.2, marginBottom: 6 }}>
              Welcome back
            </h1>
            <p style={{ color: '#64748B', fontSize: '0.875rem' }}>
              Sign in to your admin account to continue.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Login field */}
            <div className="flex flex-col gap-1.5">
              <label style={{ color: '#94A3B8', fontSize: '0.8rem', fontWeight: 500, letterSpacing: '0.03em' }}>
                Login
              </label>
              <input
                type="text"
                autoComplete="username"
                placeholder="admin@company.com"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                style={{
                  backgroundColor: '#1E293B',
                  border: '1px solid #334155',
                  borderRadius: 10,
                  color: '#F1F5F9',
                  fontSize: '0.875rem',
                  padding: '11px 14px',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#3B82F6')}
                onBlur={(e) => (e.target.style.borderColor = '#334155')}
              />
            </div>

            {/* Password field */}
            <div className="flex flex-col gap-1.5">
              <label style={{ color: '#94A3B8', fontSize: '0.8rem', fontWeight: 500, letterSpacing: '0.03em' }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    backgroundColor: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: 10,
                    color: '#F1F5F9',
                    fontSize: '0.875rem',
                    padding: '11px 42px 11px 14px',
                    outline: 'none',
                    width: '100%',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#3B82F6')}
                  onBlur={(e) => (e.target.style.borderColor = '#334155')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Forgot password */}
            <div className="flex justify-end" style={{ marginTop: -8 }}>
              <button
                type="button"
                style={{ color: '#3B82F6', fontSize: '0.8rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Forgot password?
              </button>
            </div>

            {/* Error */}
            {error && (
              <div
                style={{
                  backgroundColor: '#450A0A',
                  border: '1px solid #7F1D1D',
                  borderRadius: 8,
                  color: '#FCA5A5',
                  fontSize: '0.8rem',
                  padding: '9px 12px',
                }}
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                background: loading ? '#1D4ED8' : 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                border: 'none',
                borderRadius: 10,
                color: '#fff',
                fontSize: '0.9rem',
                fontWeight: 600,
                padding: '12px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.8 : 1,
                marginTop: 4,
                transition: 'opacity 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {loading ? (
                <>
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff',
                      borderRadius: '50%',
                      display: 'inline-block',
                      animation: 'spin 0.7s linear infinite',
                    }}
                  />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Footer */}
          <p style={{ color: '#334155', fontSize: '0.75rem', textAlign: 'center', marginTop: 32 }}>
            © 2026 FleetAdmin. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right: image half */}
      <div className="relative w-1/2 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1485575301924-6891ef935dcd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cnVja2luZyUyMGxvZ2lzdGljcyUyMGhpZ2h3YXklMjB0cnVjayUyMGRhcmslMjBkcmFtYXRpY3xlbnwxfHx8fDE3ODEyNjg0MTh8MA&ixlib=rb-4.1.0&q=80&w=1080"
          alt="Trucking logistics"
          className="w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to right, rgba(15,23,42,0.55) 0%, rgba(15,23,42,0.1) 60%, rgba(15,23,42,0.0) 100%)',
          }}
        />
        <div className="absolute bottom-10 left-10 right-10">
          <div
            style={{
              backgroundColor: 'rgba(15,23,42,0.72)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14,
              padding: '20px 24px',
              maxWidth: 360,
            }}
          >
            <div style={{ color: '#F1F5F9', fontSize: '1rem', fontWeight: 600, lineHeight: 1.4, marginBottom: 6 }}>
              Manage your fleet with confidence
            </div>
            <div style={{ color: '#94A3B8', fontSize: '0.8rem', lineHeight: 1.5 }}>
              Oversee companies, drivers, and loads across every route — all from one powerful dashboard.
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
