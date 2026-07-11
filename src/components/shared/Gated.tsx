import { Loader2, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

/** Full-page "you don't have access" panel. */
export function NoAccess() {
  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: 'var(--background)' }}>
      <div style={{ maxWidth: 420, margin: '80px auto 0', textAlign: 'center' }}>
        <div style={{ width: 60, height: 60, borderRadius: 14, margin: '0 auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <ShieldAlert size={26} color="#D97706" />
        </div>
        <h1 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: 8 }}>Access restricted</h1>
        <p style={{ fontSize: '0.86rem', color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
          Your role doesn't have permission to view this page. Contact a Super Admin if you believe this is a mistake.
        </p>
      </div>
    </div>
  );
}

/** Gates its children behind a "module.action" permission key. */
export function Gated({ permission, children }: { permission: string; children: React.ReactNode }) {
  const { can, permsLoaded } = useAuth();

  if (!permsLoaded) {
    return (
      <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: 'var(--background)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '120px 0', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>
          <Loader2 size={20} className="animate-spin" /> Checking access…
        </div>
      </div>
    );
  }

  if (!can(permission)) return <NoAccess />;
  return <>{children}</>;
}
