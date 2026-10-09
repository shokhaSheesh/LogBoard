import { NavLink } from 'react-router';
import { useAuth } from '@/context/AuthContext';
import { SCREEN_READ } from '@/lib/permissions';
import { BRAND_NAME, BrandMark } from '@/components/shared/Brand';
import { ChartPie, Building2, CreditCard, Bell, Users, ShieldCheck, KeyRound, Blocks } from 'lucide-react';

interface NavItemDef { path: string; label: string; icon: React.ElementType }
interface NavSection { title: string; items: NavItemDef[] }

// Grouped the same way the Brelo app groups its sidebar: the overview alone at the top,
// then the platform's customers, the people, and who is allowed to do what.
const NAV_SECTIONS: NavSection[] = [
  { title: 'Overview', items: [
    { path: '/admin/dashboard',          label: 'Dashboard',           icon: ChartPie },
  ] },
  { title: 'Platform', items: [
    { path: '/admin/companies',          label: 'Companies',           icon: Building2 },
    { path: '/admin/subscriptions',      label: 'Subscriptions',       icon: CreditCard },
    { path: '/admin/notifications',      label: 'Notifications',       icon: Bell },
  ] },
  { title: 'Users', items: [
    { path: '/admin/board-users',        label: 'Board Users',         icon: Users },
    { path: '/admin/admin-users',        label: 'Admin Users',         icon: ShieldCheck },
  ] },
  { title: 'Access', items: [
    { path: '/admin/roles-permissions',  label: 'Roles & Permissions', icon: KeyRound },
    { path: '/admin/permission-modules', label: 'Permission Modules',  icon: Blocks },
  ] },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, can, permsLoaded } = useAuth();
  const displayName  = user?.full_name || user?.email || 'Account';
  const displayEmail = user?.email || '';
  // Until permissions resolve, show everything (avoids a flash of an empty menu);
  // once loaded, hide any screen the role can't read, and any section left empty.
  const sections = NAV_SECTIONS
    .map((sec) => ({ ...sec, items: permsLoaded ? sec.items.filter((i) => { const key = SCREEN_READ[i.path]; return !key || can(key); }) : sec.items }))
    .filter((sec) => sec.items.length > 0);

  return (
    <aside
      className="h-full flex flex-col overflow-hidden shrink-0 select-none"
      style={{
        backgroundColor: 'var(--sidebar)',
        borderRight: '1px solid var(--sidebar-border)',
        width: collapsed ? 64 : 220,
        minWidth: collapsed ? 64 : 220,
        transition: 'width 300ms ease-in-out, min-width 300ms ease-in-out',
        cursor: collapsed ? 'pointer' : 'default',
      }}
      aria-label="Main navigation"
      onClick={() => { if (collapsed) onToggle(); }}
    >
      {/* Brand */}
      <NavLink
        to="/admin/dashboard"
        onClick={(e) => e.stopPropagation()}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: collapsed ? '14px 0' : '14px 16px', justifyContent: collapsed ? 'center' : 'flex-start', borderBottom: '1px solid var(--sidebar-border)', textDecoration: 'none' }}
      >
        <BrandMark />
        {!collapsed && (
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 7, minWidth: 0 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--sidebar-accent-foreground)', letterSpacing: '-0.01em' }}>{BRAND_NAME}</span>
            <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--primary)' }}>Admin</span>
          </span>
        )}
      </NavLink>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 flex flex-col overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {sections.map((section, si) => (
          <div key={section.title} className="flex flex-col gap-0.5" style={{ marginTop: si === 0 ? 0 : 14 }}>
            {!collapsed ? (
              <div className="px-2 pt-1 pb-1" style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--sidebar-foreground)', opacity: 0.45 }}>
                {section.title}
              </div>
            ) : si > 0 ? (
              <div style={{ height: 1, backgroundColor: 'var(--sidebar-border)', margin: '6px 12px 8px' }} />
            ) : null}
            {section.items.map(({ icon: Icon, label, path }) => (
              <NavLink key={path} to={path} title={collapsed ? label : undefined} style={{ textDecoration: 'none' }}>
                {({ isActive }) => (
                  <span
                    className="flex items-center gap-3 rounded-lg w-full transition-all duration-150"
                    style={{
                      padding: collapsed ? '10px 0' : '9px 12px',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      fontSize: 13,
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? 'var(--sidebar-primary-foreground)' : 'var(--sidebar-foreground)',
                      backgroundColor: isActive ? 'var(--sidebar-primary)' : 'transparent',
                    }}
                    onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = 'var(--sidebar-accent)'; e.currentTarget.style.color = 'var(--sidebar-accent-foreground)'; } }}
                    onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--sidebar-foreground)'; } }}
                  >
                    <Icon size={16} strokeWidth={isActive ? 2.5 : 2} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.75 }} />
                    {!collapsed && <span className="flex-1" style={{ whiteSpace: 'nowrap' }}>{label}</span>}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Who is signed in */}
      <div
        className="mx-2 mb-3"
        onClick={(e) => e.stopPropagation()}
        title={collapsed ? displayName : undefined}
        style={{ display: 'flex', alignItems: 'center', gap: 10, backgroundColor: 'var(--sidebar-accent)', borderRadius: 12, padding: collapsed ? '10px 0' : 12, justifyContent: collapsed ? 'center' : 'flex-start' }}
      >
        <div style={{ width: 34, height: 34, borderRadius: '50%', backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#fff', flexShrink: 0 }}>
          {getInitials(displayName)}
        </div>
        {!collapsed && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--sidebar-accent-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
            {displayEmail && displayEmail !== displayName && (
              <div style={{ fontSize: 11, color: 'var(--sidebar-foreground)', opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayEmail}</div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
