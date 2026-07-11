import { useRouteError, isRouteErrorResponse, useNavigate, Link } from 'react-router';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react';

export default function ErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();

  let code = '404';
  let title = 'Page not found';
  let message = "The page you're looking for doesn't exist or may have been moved.";

  if (isRouteErrorResponse(error)) {
    code = String(error.status);
    if (error.status === 404) {
      title = 'Page not found';
      message = "The page you're looking for doesn't exist or may have been moved.";
    } else {
      title = error.statusText || 'Something went wrong';
      message = (error.data as string) || 'An unexpected error occurred while loading this page.';
    }
  } else if (error instanceof Error) {
    code = 'Error';
    title = 'Something went wrong';
    message = error.message || 'An unexpected error occurred.';
  }

  return (
    <div style={{ minHeight: '100vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: 'var(--background)' }}>
      <div style={{ width: '100%', maxWidth: 440, textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
          <AlertTriangle size={28} color="#DC2626" />
        </div>

        <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--foreground)', lineHeight: 1, letterSpacing: '-0.02em', marginBottom: 8 }}>
          {code}
        </div>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: 8 }}>
          {title}
        </h1>
        <p style={{ fontSize: '0.88rem', color: 'var(--muted-foreground)', lineHeight: 1.5, marginBottom: 28 }}>
          {message}
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={() => navigate(-1)}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 9, cursor: 'pointer', backgroundColor: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)', fontSize: '0.85rem', fontWeight: 500 }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--card)')}
          >
            <RotateCcw size={15} /> Go back
          </button>
          <Link
            to="/admin/dashboard"
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 9, cursor: 'pointer', background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', border: 'none', color: '#fff', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}
          >
            <Home size={15} /> Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
