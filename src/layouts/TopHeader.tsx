import { useLocation } from 'react-router';
import { ChevronRight, Menu, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface Crumb {
  label: string;
  active?: boolean;
}

const BREADCRUMB_MAP: Record<string, Crumb[]> = {
  '/admin/dashboard':         [{ label: 'Home' }, { label: 'Dashboard', active: true }],
  '/admin/companies':         [{ label: 'Home' }, { label: 'Companies', active: true }],
  '/admin/subscriptions':     [{ label: 'Home' }, { label: 'Subscriptions', active: true }],
  '/admin/notifications':     [{ label: 'Home' }, { label: 'Notifications', active: true }],
  '/admin/board-users':       [{ label: 'Home' }, { label: 'Users' }, { label: 'Board Users', active: true }],
  '/admin/admin-users':       [{ label: 'Home' }, { label: 'Users' }, { label: 'Admin Users', active: true }],
  '/admin/roles-permissions': [{ label: 'Home' }, { label: 'Security' }, { label: 'Roles & Permissions', active: true }],
};

interface TopHeaderProps {
  onToggleSidebar: () => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

export function TopHeader({ onToggleSidebar }: TopHeaderProps) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const breadcrumbs = BREADCRUMB_MAP[pathname] ?? [{ label: 'Home' }, { label: pathname.split('/').pop() ?? '', active: true }];
  const displayName = user?.full_name || user?.email || 'Account';

  return (
    <header
      className="flex items-center justify-between px-6 h-16 shrink-0"
      style={{ backgroundColor: '#ffffff', borderBottom: '1px solid var(--border)' }}
    >
      {/* Left: menu toggle + breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
          style={{ color: 'var(--muted-foreground)' }}
          title="Toggle sidebar"
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--muted)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--foreground)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted-foreground)';
          }}
        >
          <Menu size={18} />
        </button>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5">
        {breadcrumbs.map((crumb, i) => (
          <div key={i} className="flex items-center gap-1.5">
            {i > 0 && (
              <ChevronRight size={14} style={{ color: 'var(--muted-foreground)', opacity: 0.5 }} />
            )}
            <span
              style={{
                fontSize: '0.82rem',
                fontWeight: crumb.active ? 600 : 400,
                color: crumb.active ? 'var(--foreground)' : 'var(--muted-foreground)',
              }}
            >
              {crumb.label}
            </span>
          </div>
        ))}
      </nav>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
          title={displayName}
          style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}
        >
          <span style={{ color: '#ffffff', fontSize: '0.75rem', fontWeight: 700 }}>{getInitials(displayName)}</span>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          title="Log out"
          className="flex items-center justify-center w-9 h-9 rounded-lg transition-colors"
          style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#FEF2F2';
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#FCA5A5';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--muted)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
          }}
        >
          <LogOut size={16} style={{ color: '#EF4444' }} />
        </button>
      </div>
    </header>
  );
}
