import { useState } from 'react';
import { NavLink } from 'react-router';
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Users,
  ShieldCheck,
  Lock,
  ChevronRight,
  Zap,
} from 'lucide-react';

interface NavItemDef {
  path: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

const NAV_ITEMS: NavItemDef[] = [
  { path: '/admin/dashboard',         label: 'Dashboard',           icon: <LayoutDashboard size={18} /> },
  { path: '/admin/companies',         label: 'Companies',           icon: <Building2 size={18} /> },
  { path: '/admin/subscriptions',     label: 'Subscriptions',       icon: <CreditCard size={18} /> },
  { path: '/admin/board-users',       label: 'Board Users',         icon: <Users size={18} /> },
  { path: '/admin/admin-users',       label: 'Admin Users',         icon: <ShieldCheck size={18} /> },
  { path: '/admin/roles-permissions', label: 'Roles & Permissions', icon: <Lock size={18} /> },
];

function NavItem({ item, collapsed }: { item: NavItemDef; collapsed: boolean }) {
  const [hovered, setHovered] = useState(false);

  return (
    <li>
      <NavLink
        to={item.path}
        title={collapsed ? item.label : undefined}
        className="block"
        style={{ textDecoration: 'none' }}
        onClick={(e) => e.stopPropagation()}
      >
        {({ isActive }) => (
          <div
            className={`w-full flex items-center rounded-lg transition-all duration-150 cursor-pointer ${
              collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'
            }`}
            style={{
              backgroundColor: isActive ? '#2563EB' : hovered ? 'var(--sidebar-accent)' : 'transparent',
              color: isActive ? '#ffffff' : 'var(--sidebar-foreground)',
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            <span style={{ opacity: isActive ? 1 : 0.7 }}>{item.icon}</span>

            {!collapsed && (
              <>
                <span style={{ fontSize: '0.85rem', fontWeight: isActive ? 600 : 400, flex: 1 }}>
                  {item.label}
                </span>
                {item.badge && (
                  <span
                    className="flex items-center justify-center rounded-full min-w-[20px] h-5 px-1.5"
                    style={{
                      backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(59,130,246,0.25)',
                      color: isActive ? '#ffffff' : '#93C5FD',
                      fontSize: '0.65rem',
                      fontWeight: 600,
                    }}
                  >
                    {item.badge}
                  </span>
                )}
                {isActive && <ChevronRight size={14} style={{ opacity: 0.6 }} />}
              </>
            )}

            {collapsed && item.badge && (
              <span
                className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: '#3B82F6' }}
              />
            )}
          </div>
        )}
      </NavLink>
    </li>
  );
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={`relative flex flex-col h-full shrink-0 select-none overflow-hidden transition-[width] duration-300 ease-in-out ${
        collapsed ? 'w-16 cursor-pointer' : 'w-64 cursor-default'
      }`}
      style={{
        backgroundColor: 'var(--sidebar)',
        borderRight: '1px solid var(--sidebar-border)',
      }}
      onClick={() => { if (collapsed) onToggle(); }}
    >
      {/* ── Header: logo ────────────────────────────────────────────── */}
      <div
        className={`flex items-center border-b shrink-0 px-4 py-4 ${
          collapsed ? 'justify-center' : ''
        }`}
        style={{ borderColor: 'var(--sidebar-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
          style={{ backgroundColor: 'var(--sidebar-primary)' }}
        >
          <Zap size={18} color="#fff" />
        </div>

        {!collapsed && (
          <div className="ml-3">
            <div style={{ color: '#F1F5F9', fontWeight: 600, fontSize: '0.9rem', lineHeight: 1.2 }}>
              FleetAdmin
            </div>
            <div style={{ color: 'var(--sidebar-foreground)', fontSize: '0.7rem', opacity: 0.6 }}>
              Super Admin
            </div>
          </div>
        )}
      </div>

      {/* ── Navigation ──────────────────────────────────────────────── */}
      <nav className={`flex-1 py-4 overflow-y-auto ${collapsed ? 'px-2' : 'px-3'}`}>
        {!collapsed && (
          <div
            style={{
              color: 'var(--sidebar-foreground)',
              fontSize: '0.65rem',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              opacity: 0.45,
              padding: '0 8px 8px',
            }}
          >
            Main Menu
          </div>
        )}

        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.path} item={item} collapsed={collapsed} />
          ))}
        </ul>
      </nav>

      {/* ── User Profile ────────────────────────────────────────────── */}
      <div
        className={`pb-4 shrink-0 ${collapsed ? 'px-2' : 'px-3'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {collapsed ? (
          <div className="flex justify-center">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              title="Sarah Adams"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)', cursor: 'default' }}
            >
              <span style={{ color: '#ffffff', fontSize: '0.8rem', fontWeight: 700 }}>SA</span>
            </div>
          </div>
        ) : (
          <div
            className="rounded-xl p-3 flex items-center gap-3"
            style={{ backgroundColor: 'var(--sidebar-accent)' }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}
            >
              <span style={{ color: '#ffffff', fontSize: '0.8rem', fontWeight: 700 }}>SA</span>
            </div>
            <div className="flex-1 min-w-0">
              <div
                style={{
                  color: '#F1F5F9',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                Sarah Adams
              </div>
              <div
                style={{
                  color: 'var(--sidebar-foreground)',
                  fontSize: '0.7rem',
                  opacity: 0.6,
                  lineHeight: 1.3,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                sarah@fleetadmin.io
              </div>
            </div>
            <ChevronRight size={14} className="shrink-0" style={{ color: 'var(--sidebar-foreground)', opacity: 0.5 }} />
          </div>
        )}
      </div>
    </aside>
  );
}
