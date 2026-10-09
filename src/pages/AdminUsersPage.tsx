import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, ShieldCheck, ShieldOff, ShieldEllipsis, Eye, EyeOff, Loader2, Copy, Check } from 'lucide-react';
import { Dropdown } from '@/components/shared/Dropdown';
import { DeleteConfirmModal } from '@/components/shared/DeleteConfirmModal';
import { Kpi } from '@/components/shared/Kpi';
import { Card, Dash, IconButton, KpiRow, Page, Pager, PrimaryButton, RowActions, SearchBox, TableState, Toolbar } from '@/components/shared/ui';
import { useEscape } from '@/lib/useEscape';
import { SearchSelect } from '@/components/shared/SearchSelect';
import { FilterTabs, type TabItem } from '@/components/shared/FilterTabs';
import { useAuth } from '@/context/AuthContext';
import { api, ApiException } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type Status = 'Active' | 'Suspended';

interface ApiUser {
  id: string;
  kind: string;
  login: string;
  email: string;
  full_name: string;
  role: string;
  status: Status;
  must_change_password: boolean;
}

interface ApiUsersBody {
  data: ApiUser[];
  stats?: { total?: number; active?: number; suspended?: number };
}

interface ApiRole {
  id: string;
  name: string;
}

interface AdminUser {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  login: string;
  email: string;
  role: string;
  status: Status;
}

interface FormState {
  name: string;
  email: string;
  role: string;
  status: Status;
  password: string;
}

// ── Config ────────────────────────────────────────────────────────────────────

const PER_PAGE = 10;
const STATUSES: Status[] = ['Active', 'Suspended'];
const AVATAR_COLORS = ['#2563EB','#7C3AED','#059669','#C2410C','#64748B','#0891B2','#DB2777','#D97706','#6366F1','#10B981'];

const STATUS_CONFIG: Record<Status, { dot: string; color: string }> = {
  Active:    { dot: '#22C55E', color: '#15803D' },
  Suspended: { dot: '#EF4444', color: '#B91C1C' },
};

// Role style by slug — fallback for unknown custom roles
const ROLE_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  super_admin: { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
  admin:       { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' },
  support:     { bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' },
  billing:     { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
  readonly:    { bg: '#F8FAFC', color: '#64748B', border: '#E2E8F0' },
};
const DEFAULT_ROLE_STYLE = { bg: '#F1F5F9', color: '#64748B', border: '#E2E8F0' };

function colorFromStr(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function toInitials(name: string): string {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

function toUIUser(u: ApiUser): AdminUser {
  return {
    id: u.id,
    name: u.full_name,
    initials: toInitials(u.full_name),
    avatarColor: colorFromStr(u.id),
    login: u.login ?? u.email,
    email: u.email ?? '',
    role: u.role,
    status: u.status,
  };
}

// ── CredsModal ────────────────────────────────────────────────────────────────

function CredsModal({ name, login, password, onClose }: {
  name: string; login: string; password: string; onClose: () => void;
}) {
  useEscape(onClose);
  const [copied, setCopied] = useState<string | null>(null);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 1800);
  }

  const row = (label: string, value: string, key: string) => (
    <div style={{ backgroundColor: 'var(--muted)', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)', wordBreak: 'break-all' }}>{value}</div>
      </div>
      <button type="button" onClick={() => copy(value, key)}
        style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 7, border: '1px solid var(--border)', backgroundColor: copied === key ? '#ECFDF5' : 'var(--background)', color: copied === key ? '#059669' : 'var(--muted-foreground)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {copied === key ? <Check size={13} /> : <Copy size={13} />}
      </button>
    </div>
  );

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 40 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 50, width: 420, backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
        <div style={{ padding: '28px 24px 20px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#ECFDF5', border: '2px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Check size={22} color="#059669" />
          </div>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: 4 }}>Admin Created</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
            Save these credentials — the password won't be shown again.
          </p>
        </div>
        <div style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {row('Name', name, 'name')}
          {row('Login', login, 'login')}
          {row('Password', password, 'pass')}
        </div>
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} style={{ width: '100%', height: 38, borderRadius: 8, cursor: 'pointer', backgroundColor: 'var(--primary)', border: 'none', color: '#fff', fontSize: '0.83rem', fontWeight: 600 }}>
            Done
          </button>
        </div>
      </div>
    </>
  );
}

// ── AdminModal (Create / Edit) ────────────────────────────────────────────────

function AdminModal({
  mode, initial, roles, onClose, onSave,
}: {
  mode: 'create' | 'edit';
  initial: FormState;
  roles: ApiRole[];
  onClose: () => void;
  onSave: (f: FormState) => Promise<void>;
}) {
  const [form, setForm]           = useState<FormState>(initial);
  const [showPass, setShowPass]   = useState(false);
  const [saving, setSaving]       = useState(false);
  useEscape(onClose, !saving);
  const [serverError, setServerError] = useState('');

  const lbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 4 };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === 'create' && !form.password.trim()) return;
    if (form.password.trim() && form.password.trim().length < 8) {
      setServerError('Password must be at least 8 characters.');
      return;
    }
    setSaving(true);
    setServerError('');
    try {
      await onSave(form);
    } catch (err) {
      if (err instanceof ApiException) {
        if (err.code === 'email_taken' || err.code === 'login_taken') {
          setServerError('This login is already in use.');
        } else if (err.code === 'password_too_short' || (err.code === 'invalid_request' && err.message.toLowerCase().includes('password'))) {
          setServerError('Password must be at least 8 characters.');
        } else {
          setServerError(err.message || 'Something went wrong.');
        }
      } else {
        setServerError('Unable to connect to the server.');
      }
      setSaving(false);
    }
  }

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 40 }}
        onClick={saving ? undefined : onClose}
      />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 50, width: 500, backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)' }}>
            {mode === 'create' ? 'Add Admin User' : 'Edit Admin User'}
          </h2>
          <button
            onClick={onClose}
            disabled={saving}
            style={{ background: 'none', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', color: 'var(--muted-foreground)', padding: 4, display: 'flex', borderRadius: 6, opacity: saving ? 0.5 : 1 }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.backgroundColor = 'var(--muted)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <X size={17} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={lbl}>Full Name <span style={{ color: '#EF4444' }}>*</span></label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Jane Smith"
                className="field"
                required
                disabled={saving}
              />
            </div>
            <div>
              <label style={lbl}>Login <span style={{ color: '#EF4444' }}>*</span></label>
              <input
                type="text"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="name@brelo.app"
                className="field"
                required
                disabled={saving}
              />
            </div>
            <div>
              <label style={lbl}>Role <span style={{ color: '#EF4444' }}>*</span></label>
              <SearchSelect value={form.role} options={roles.map(r => ({ value: r.id, label: r.name }))} placeholder="Select a role" onChange={v => setForm(f => ({ ...f, role: v }))} searchable={false} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>Password {mode === 'create' && <span style={{ color: '#EF4444' }}>*</span>}{mode === 'edit' && <span style={{ fontWeight: 400, marginLeft: 4, color: 'var(--muted-foreground)' }}>(leave blank to keep)</span>}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder={mode === 'edit' ? '••••••••' : 'Set password'}
                    className="field" style={{ paddingRight: 36 }}
                    required={mode === 'create'}
                    disabled={saving}
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex', padding: 0 }}>
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <p style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', marginTop: 4 }}>Min 8 characters</p>
              </div>
              <div>
                <label style={lbl}>Status</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {STATUSES.map(s => {
                    const active = form.status === s;
                    const color = s === 'Active' ? '#059669' : '#DC2626';
                    return (
                      <button key={s} type="button" onClick={() => setForm(f => ({ ...f, status: s }))} disabled={saving}
                        style={{ flex: 1, padding: '7px 0', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.78rem', fontWeight: 600, backgroundColor: active ? (s === 'Active' ? '#ECFDF5' : '#FEF2F2') : 'var(--background)', border: `1px solid ${active ? color : 'var(--border)'}`, color: active ? color : 'var(--muted-foreground)' }}>
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {serverError && (
              <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', fontSize: '0.8rem', padding: '8px 12px' }}>
                {serverError}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, padding: '14px 22px', borderTop: '1px solid var(--border)' }}>
            <button type="button" onClick={onClose} disabled={saving}
              style={{ flex: 1, height: 38, borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)', fontSize: '0.83rem', fontWeight: 500, opacity: saving ? 0.6 : 1 }}
              onMouseEnter={e => { if (!saving) e.currentTarget.style.backgroundColor = 'var(--muted)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--background)'; }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ flex: 2, height: 38, borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', background: saving ? 'var(--muted)' : 'var(--primary)', border: 'none', color: saving ? 'var(--muted-foreground)' : '#fff', fontSize: '0.83rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? 'Saving…' : (mode === 'create' ? 'Add Admin' : 'Save Changes')}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ── AdminDetailModal ──────────────────────────────────────────────────────────

function AdminDetailModal({
  user, roles, onClose, onEdit,
}: {
  user: AdminUser;
  roles: ApiRole[];
  onClose: () => void;
  onEdit: () => void;
}) {
  useEscape(onClose);
  const rs   = ROLE_STYLE[user.role] ?? DEFAULT_ROLE_STYLE;
  const ss   = STATUS_CONFIG[user.status];
  const roleName = roles.find(r => r.id === user.role)?.name ?? user.role;

  const Field = ({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <span style={{ fontSize: '0.85rem', color: 'var(--foreground)', wordBreak: 'break-all' }}>{value}</span>
    </div>
  );

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 40 }} onClick={onClose} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 50, width: 460, backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)' }}>Admin Details</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: 4, display: 'flex', borderRadius: 6 }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
            <X size={17} />
          </button>
        </div>

        {/* Avatar + name */}
        <div style={{ padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16, borderBottom: '1px solid var(--border)' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: user.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: '#fff', fontSize: '1rem', fontWeight: 700 }}>{user.initials}</span>
          </div>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--foreground)' }}>{user.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span style={{ display: 'inline-block', backgroundColor: rs.bg, color: rs.color, border: `1px solid ${rs.border}`, fontSize: '0.7rem', fontWeight: 700, padding: '2px 9px', borderRadius: 99 }}>{roleName}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: ss.dot }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 500, color: ss.color }}>{user.status}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Fields */}
        <div style={{ padding: '20px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <Field label="User ID" value={user.id} mono />
          <Field label="Status"  value={user.status} />
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Login" value={user.login} mono />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, padding: '14px 22px', borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} style={{ flex: 1, height: 38, borderRadius: 8, cursor: 'pointer', backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)', fontSize: '0.83rem', fontWeight: 500 }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--background)')}>
            Close
          </button>
          <button onClick={onEdit} style={{ flex: 2, height: 38, borderRadius: 8, cursor: 'pointer', backgroundColor: 'var(--primary)', border: 'none', color: '#fff', fontSize: '0.83rem', fontWeight: 600 }}>
            Edit Admin
          </button>
        </div>
      </div>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const EMPTY_FORM: FormState = { name: '', email: '', role: '', status: 'Active', password: '' };

const STATUS_TABS: TabItem<'all' | 'Active' | 'Suspended'>[] = [
  { id: 'all', label: 'All' }, { id: 'Active', label: 'Active' }, { id: 'Suspended', label: 'Suspended' },
];

export default function AdminUsersPage() {
  const { can } = useAuth();
  const canCreate = can('admin_users.create');
  const canUpdate = can('admin_users.update');
  const canDelete = can('admin_users.delete');
  const [rows, setRows]                 = useState<AdminUser[]>([]);
  const [roles, setRoles]               = useState<ApiRole[]>([]);
  const [availableRoles, setAvailableRoles] = useState<ApiRole[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [loadError, setLoadError]       = useState<string | null>(null);
  const [searchInput, setSearchInput]   = useState('');
  const [search, setSearch]             = useState('');
  const [roleFilter, setRoleFilter]     = useState<string>('all');
  const [tab, setTab]                   = useState<'all' | 'Active' | 'Suspended'>('all');
  const [page, setPage]                 = useState(1);
  const [allCounts, setAllCounts]       = useState({ total: 0, active: 0, suspended: 0 });

  const [createOpen, setCreateOpen]     = useState(false);
  const [createdCreds, setCreatedCreds] = useState<{ name: string; login: string; password: string } | null>(null);
  const [editTarget, setEditTarget]     = useState<AdminUser | null>(null);
  const [viewTarget, setViewTarget]     = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleting, setDeleting]         = useState(false);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // One-time roles fetch
  useEffect(() => { api.get<ApiRole[]>('/roles').then(setRoles).catch(() => {}); }, []);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const qs = new URLSearchParams({ kind: 'admin' });
      if (search)            qs.set('q', search);
      if (roleFilter !== 'all') qs.set('role', roleFilter);
      if (tab !== 'all')        qs.set('status', tab);
      const body = await api.getBody<ApiUsersBody>(`/users?${qs.toString()}`);
      const users = body.data ?? [];
      setRows(users.map(toUIUser));
      setAllCounts({
        total:     body.stats?.total     ?? users.length,
        active:    body.stats?.active    ?? users.filter(u => u.status === 'Active').length,
        suspended: body.stats?.suspended ?? users.filter(u => u.status === 'Suspended').length,
      });
    } catch (err) {
      setLoadError(err instanceof ApiException ? err.message : 'Failed to load admin users.');
    } finally {
      setIsLoading(false);
    }
  }, [search, roleFilter, tab]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Derive available roles from actual users in current response (never collapses while a role is selected)
  useEffect(() => {
    if (roleFilter !== 'all') return;
    const uniqueIds = new Set(rows.map(u => u.role).filter(Boolean));
    setAvailableRoles(roles.filter(r => uniqueIds.has(r.id)));
  }, [rows, roles, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const paginated  = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  function goPage(p: number) { setPage(Math.min(Math.max(1, p), totalPages)); }

  async function handleCreate(f: FormState): Promise<void> {
    const created = await api.post<ApiUser>('/users', {
      kind: 'admin',
      full_name: f.name,
      login: f.email,
      role: f.role,
      status: f.status,
      password: f.password,
    });
    setRows(p => [toUIUser(created), ...p]);
    setCreateOpen(false);
    setCreatedCreds({ name: created.full_name, login: created.login ?? f.email, password: f.password });
    const s = created.status === 'Active' ? 'active' : 'suspended';
    setAllCounts(c => ({ ...c, total: c.total + 1, [s]: c[s] + 1 }));
  }

  async function handleEdit(f: FormState): Promise<void> {
    if (!editTarget) return;
    const payload: Record<string, unknown> = {
      full_name: f.name,
      login: f.email,
      role: f.role,
      status: f.status,
    };
    if (f.password.trim()) payload.password = f.password;
    const updated = await api.put<ApiUser>(`/users/${editTarget.id}`, payload);
    setRows(p => p.map(u => u.id === editTarget.id ? toUIUser(updated) : u));
    setEditTarget(null);
  }

  async function handleDelete(): Promise<void> {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/users/${deleteTarget.id}`);
      const s = deleteTarget.status === 'Active' ? 'active' : 'suspended';
      setAllCounts(c => ({ ...c, total: Math.max(0, c.total - 1), [s]: Math.max(0, c[s] - 1) }));
      setRows(p => p.filter(u => u.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  const defaultRole = roles[0]?.id ?? '';
  const roleFilterOptions = [
    { id: 'all', name: 'All Roles' },
    ...availableRoles.map(r => ({ id: r.id, name: r.name })),
  ];

  const TH = ({ children, right }: { children: React.ReactNode; right?: boolean }) => (
    <th style={{ textAlign: right ? 'right' : 'left', padding: '9px 14px', fontSize: '0.68rem', fontWeight: 600, color: 'var(--muted-foreground)', letterSpacing: '0.07em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
      {children}
    </th>
  );

  return (
    <Page>
      {/* Modals */}
      {createOpen && (
        <AdminModal
          mode="create"
          initial={{ ...EMPTY_FORM, role: defaultRole }}
          roles={roles}
          onClose={() => setCreateOpen(false)}
          onSave={handleCreate}
        />
      )}
      {editTarget && (
        <AdminModal
          mode="edit"
          initial={{ name: editTarget.name, email: editTarget.login, role: editTarget.role, status: editTarget.status, password: '' }}
          roles={roles}
          onClose={() => setEditTarget(null)}
          onSave={handleEdit}
        />
      )}
      {viewTarget && (
        <AdminDetailModal
          user={viewTarget}
          roles={roles}
          onClose={() => setViewTarget(null)}
          onEdit={() => { setEditTarget(viewTarget); setViewTarget(null); }}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          title="Delete Admin"
          description={<>Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This action cannot be undone.</>}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          loading={deleting}
        />
      )}

      {createdCreds && <CredsModal {...createdCreds} onClose={() => setCreatedCreds(null)} />}

      <KpiRow>
        <Kpi label="Total"     value={isLoading && rows.length === 0 ? <Dash /> : allCounts.total}     icon={<ShieldEllipsis size={17} />} />
        <Kpi label="Active"    value={isLoading && rows.length === 0 ? <Dash /> : allCounts.active}    icon={<ShieldCheck size={17} />} />
        <Kpi label="Suspended" value={isLoading && rows.length === 0 ? <Dash /> : allCounts.suspended} icon={<ShieldOff size={17} />} />
      </KpiRow>

      <Card>
        <Toolbar action={canCreate && <PrimaryButton icon={<Plus size={15} />} onClick={() => setCreateOpen(true)} disabled={isLoading}>Add admin</PrimaryButton>}>
          <SearchBox value={searchInput} onChange={setSearchInput} placeholder="Search admins" />
          <FilterTabs<'all' | 'Active' | 'Suspended'> tabs={STATUS_TABS} active={tab} onChange={t => { setTab(t); setPage(1); }} />
          <Dropdown<string>
            label="Role"
            options={roleFilterOptions.map(o => o.id)}
            value={roleFilter}
            onChange={v => { setRoleFilter(v); setPage(1); }}
            getOptionLabel={id => roleFilterOptions.find(o => o.id === id)?.name ?? id}
          />
        </Toolbar>

        <TableState loading={isLoading && rows.length === 0} error={loadError ?? undefined} onRetry={fetchAll} what="admins" />

        {/* Table */}
        {!(isLoading && rows.length === 0) && !loadError && (
          <div style={{ overflowX: 'auto', opacity: isLoading ? 0.55 : 1, transition: 'opacity 0.15s' }}>
            <table className="tbl">
              <thead>
                <tr><TH>User</TH><TH>Email</TH><TH>Role</TH><TH>Status</TH><th className="pin" /></tr>
              </thead>
              <tbody>
                {paginated.map((u, i) => {
                  const rs = ROLE_STYLE[u.role] ?? DEFAULT_ROLE_STYLE;
                  const ss = STATUS_CONFIG[u.status];
                  const roleName = roles.find(r => r.id === u.role)?.name ?? u.role;
                  return (
                    <tr key={u.id} style={{ borderBottom: i < paginated.length - 1 ? '1px solid var(--border)' : 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                      <td style={{ padding: '11px 14px' }}>
                        <button onClick={() => setViewTarget(u)} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', backgroundColor: u.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 700 }}>{u.initials}</span>
                          </div>
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>{u.name}</div>
                          </div>
                        </button>
                      </td>
                      <td style={{ padding: '11px 14px' }}><span style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)' }}>{u.login}</span></td>
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{ display: 'inline-block', backgroundColor: rs.bg, color: rs.color, border: `1px solid ${rs.border}`, fontSize: '0.7rem', fontWeight: 700, padding: '3px 9px', borderRadius: 99 }}>{roleName}</span>
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: ss.dot }} />
                          <span style={{ fontSize: '0.82rem', fontWeight: 500, color: ss.color }}>{u.status}</span>
                        </div>
                      </td>
                      <td className="pin">
                        <RowActions>
                          {canUpdate && <IconButton title="Edit" onClick={() => setEditTarget(u)}><Pencil size={13} /></IconButton>}
                          {canDelete && <IconButton title="Delete" danger onClick={() => setDeleteTarget(u)}><Trash2 size={13} /></IconButton>}
                          {!canUpdate && !canDelete && <Dash />}
                        </RowActions>
                      </td>
                    </tr>
                  );
                })}
                {paginated.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>No admins match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!(isLoading && rows.length === 0) && !loadError && <Pager page={page} totalPages={totalPages} total={rows.length} perPage={PER_PAGE} onPage={goPage} />}
      </Card>
    </Page>
  );
}
