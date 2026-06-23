import { useLocation } from 'react-router';
import { Bell, Search, ChevronRight, Menu, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface Crumb {
  label: string;
  active?: boolean;
}

const BREADCRUMB_MAP: Record<string, Crumb[]> = {
  '/admin/dashboard':         [{ label: 'Home' }, { label: 'Dashboard', active: true }],
  '/admin/companies':         [{ label: 'Home' }, { label: 'Companies', active: true }],
  '/admin/subscriptions':     [{ label: 'Home' }, { label: 'Subscriptions', active: true }],
  '/admin/board-users':       [{ label: 'Home' }, { label: 'Users' }, { label: 'Board Users', active: true }],
  '/admin/admin-users':       [{ label: 'Home' }, { label: 'Users' }, { label: 'Admin Users', active: true }],
  '/admin/roles-permissions': [{ label: 'Home' }, { label: 'Security' }, { label: 'Roles & Permissions', active: true }],
};

interface TopHeaderProps {
  onToggleSidebar: () => void;
}

export function TopHeader({ onToggleSidebar }: TopHeaderProps) {
  const { pathname } = useLocation();
  const { logout } = useAuth();
  const breadcrumbs = BREADCRUMB_MAP[pathname] ?? [{ label: 'Home' }, { label: pathname.split('/').pop() ?? '', active: true }];

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
        {/* Search */}
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-colors"
          style={{
            backgroundColor: 'var(--muted)',
            border: '1px solid var(--border)',
            minWidth: 220,
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLDivElement).style.borderColor = '#93C5FD')
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)')
          }
        >
          <Search size={15} style={{ color: 'var(--muted-foreground)' }} />
          <span style={{ fontSize: '0.82rem', color: 'var(--muted-foreground)', flex: 1 }}>
            Search...
          </span>
          <kbd
            className="flex items-center gap-0.5 rounded px-1.5 py-0.5"
            style={{
              backgroundColor: 'var(--border)',
              fontSize: '0.65rem',
              color: 'var(--muted-foreground)',
              fontFamily: 'inherit',
              lineHeight: 1.4,
            }}
          >
            ⌘K
          </kbd>
        </div>

        {/* Notification Bell */}
        <button
          className="relative flex items-center justify-center w-9 h-9 rounded-lg transition-colors"
          style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--accent)')
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--muted)')
          }
        >
          <Bell size={17} style={{ color: 'var(--muted-foreground)' }} />
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
            style={{ backgroundColor: '#EF4444', boxShadow: '0 0 0 2px #ffffff' }}
          />
        </button>

        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
          style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}
        >
          <span style={{ color: '#ffffff', fontSize: '0.75rem', fontWeight: 700 }}>SA</span>
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
