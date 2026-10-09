import { useLocation } from 'react-router';
import { ChevronRight, Menu, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

// The header names the page, so the pages themselves carry no title row.
const CRUMBS: Record<string, string[]> = {
  '/admin/dashboard':          ['Dashboard'],
  '/admin/companies':          ['Companies'],
  '/admin/subscriptions':      ['Subscriptions'],
  '/admin/notifications':      ['Notifications'],
  '/admin/board-users':        ['Users', 'Board Users'],
  '/admin/admin-users':        ['Users', 'Admin Users'],
  '/admin/roles-permissions':  ['Access', 'Roles & Permissions'],
  '/admin/permission-modules': ['Access', 'Permission Modules'],
};

interface TopHeaderProps {
  onToggleSidebar: () => void;
}

export function TopHeader({ onToggleSidebar }: TopHeaderProps) {
  const { pathname } = useLocation();
  const { logout } = useAuth();
  const crumbs = CRUMBS[pathname] ?? [pathname.split('/').pop() ?? ''];

  const quiet = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = 'transparent';
    e.currentTarget.style.color = 'var(--muted-foreground)';
  };

  return (
    <header
      className="flex items-center justify-between shrink-0"
      style={{ height: 56, padding: '0 16px', backgroundColor: 'var(--card)', borderBottom: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSidebar}
          title="Toggle sidebar"
          aria-label="Toggle sidebar"
          className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
          style={{ color: 'var(--muted-foreground)' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--muted)'; e.currentTarget.style.color = 'var(--foreground)'; }}
          onMouseLeave={quiet}
        >
          <Menu size={18} />
        </button>

        <nav className="flex items-center gap-1.5" aria-label="Breadcrumb">
          {crumbs.map((label, i) => {
            const last = i === crumbs.length - 1;
            return (
              <div key={label} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight size={14} style={{ color: 'var(--muted-foreground)', opacity: 0.5 }} />}
                <span style={{ fontSize: 14, fontWeight: last ? 600 : 400, color: last ? 'var(--foreground)' : 'var(--muted-foreground)' }}>{label}</span>
              </div>
            );
          })}
        </nav>
      </div>

      <button
        onClick={logout}
        className="flex items-center gap-1.5 rounded-lg transition-colors"
        style={{ height: 34, padding: '0 10px', fontSize: 13, fontWeight: 500, color: 'var(--muted-foreground)' }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FEF2F2'; e.currentTarget.style.color = '#DC2626'; }}
        onMouseLeave={quiet}
      >
        <LogOut size={15} /> Sign out
      </button>
    </header>
  );
}
