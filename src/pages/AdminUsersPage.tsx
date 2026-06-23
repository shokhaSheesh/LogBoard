import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Search, Plus, Pencil, Trash2, X, ShieldCheck, Eye, EyeOff, ChevronDown, Loader2, Copy, Check } from 'lucide-react';
import { Dropdown } from '@/components/shared/Dropdown';
import { DeleteConfirmModal } from '@/components/shared/DeleteConfirmModal';
import { api, ApiException } from '@/lib/api';

// ── CustomSelect ──────────────────────────────────────────────────────────────

function CustomSelect({ value, options, onChange }: {
  value: string;
  options: { id: string; name: string }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen]   = useState(false);
  const containerRef      = useRef<HTMLDivElement>(null);
  const display           = options.find(o => o.id === value)?.name ?? value;

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', height: 38, padding: '0 11px', borderRadius: 8,
          border: `1px solid ${open ? '#93C5FD' : 'var(--border)'}`,
          fontSize: '0.83rem', color: 'var(--foreground)', backgroundColor: 'var(--background)',
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 6, outline: 'none', boxSizing: 'border-box',
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.borderColor = '#93C5FD'; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.borderColor = 'var(--border)'; }}
      >
        <span>{display}</span>
        <ChevronDown size={13} style={{ flexShrink: 0, opacity: 0.5, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100,
          backgroundColor: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
          overflow: 'hidden', maxHeight: 220, overflowY: 'auto',
        }}>
          {options.map(o => (
            <button key={o.id} type="button" onClick={() => { onChange(o.id); setOpen(false); }}
              style={{
                width: '100%', padding: '8px 12px', textAlign: 'left', fontSize: '0.82rem',
                border: 'none', cursor: 'pointer', display: 'block',
                backgroundColor: o.id === value ? '#EFF6FF' : 'transparent',
                color: o.id === value ? '#2563EB' : 'var(--foreground)',
                fontWeight: o.id === value ? 600 : 400,
              }}
              onMouseEnter={e => { if (o.id !== value) e.currentTarget.style.backgroundColor = 'var(--muted)'; }}
              onMouseLeave={e => { if (o.id !== value) e.currentTarget.style.backgroundColor = 'transparent'; }}
            >{o.name}</button>
          ))}
        </div>
      )}
    </div>
  );
}

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
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)', fontFamily: key === 'pass' ? 'monospace' : undefined, wordBreak: 'break-all' }}>{value}</div>
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
          <button onClick={onClose} style={{ width: '100%', height: 38, borderRadius: 8, cursor: 'pointer', background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', border: 'none', color: '#fff', fontSize: '0.83rem', fontWeight: 600 }}>
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
  const [serverError, setServerError] = useState('');

  const inp: React.CSSProperties = {
    width: '100%', height: 38, padding: '0 11px', borderRadius: 8,
    border: '1px solid var(--border)', backgroundColor: 'var(--background)',
    color: 'var(--foreground)', fontSize: '0.83rem', outline: 'none', boxSizing: 'border-box',
  };
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: '0.75rem', fontWeight: 600,
    color: 'var(--muted-foreground)', marginBottom: 5,
  };

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
                style={inp}
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
                placeholder="admin@fleetadmin.io"
                style={inp}
                required
                disabled={saving}
              />
            </div>
            <div>
              <label style={lbl}>Role <span style={{ color: '#EF4444' }}>*</span></label>
              <CustomSelect
                value={form.role}
                options={roles}
                onChange={v => setForm(f => ({ ...f, role: v }))}
              />
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
                    style={{ ...inp, paddingRight: 36 }}
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
              style={{ flex: 2, height: 38, borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', background: saving ? 'var(--muted)' : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', border: 'none', color: saving ? 'var(--muted-foreground)' : '#fff', fontSize: '0.83rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
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
  const rs   = ROLE_STYLE[user.role] ?? DEFAULT_ROLE_STYLE;
  const ss   = STATUS_CONFIG[user.status];
  const roleName = roles.find(r => r.id === user.role)?.name ?? user.role;

  const Field = ({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <span style={{ fontSize: '0.85rem', color: 'var(--foreground)', fontFamily: mono ? 'monospace' : undefined, wordBreak: 'break-all' }}>{value}</span>
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
          <button onClick={onEdit} style={{ flex: 2, height: 38, borderRadius: 8, cursor: 'pointer', background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', border: 'none', color: '#fff', fontSize: '0.83rem', fontWeight: 600 }}>
            Edit Admin
          </button>
        </div>
      </div>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const EMPTY_FORM: FormState = { name: '', email: '', role: '', status: 'Active', password: '' };

export default function AdminUsersPage() {
  const [rows, setRows]                 = useState<AdminUser[]>([]);
  const [roles, setRoles]               = useState<ApiRole[]>([]);
  const [availableRoles, setAvailableRoles] = useState<ApiRole[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [loadError, setLoadError]       = useState<string | null>(null);
  const [searchInput, setSearchInput]   = useState('');
  const [search, setSearch]             = useState('');
  const [roleFilter, setRoleFilter]     = useState<string>('all');
  const [page, setPage]                 = useState(1);

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
      if (search)            qs.set('search', search);
      if (roleFilter !== 'all') qs.set('role', roleFilter);
      const users = await api.get<ApiUser[]>(`/users?${qs.toString()}`);
      setRows(users.map(toUIUser));
    } catch (err) {
      setLoadError(err instanceof ApiException ? err.message : 'Failed to load admin users.');
    } finally {
      setIsLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Derive available roles from actual users in current response (never collapses while a role is selected)
  useEffect(() => {
    if (roleFilter !== 'all') return;
    const uniqueIds = new Set(rows.map(u => u.role).filter(Boolean));
    setAvailableRoles(roles.filter(r => uniqueIds.has(r.id)));
  }, [rows, roles, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const paginated  = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const start      = rows.length === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const end        = Math.min(page * PER_PAGE, rows.length);
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
    <th style={{ textAlign: right ? 'right' : 'left', padding: '9px 14px', fontSize: '0.68rem', fontWeight: 600, color: 'var(--muted-foreground)', letterSpacing: '0.07em', textTransform: 'uppercase', backgroundColor: 'var(--muted)', whiteSpace: 'nowrap' }}>
      {children}
    </th>
  );

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: 'var(--background)' }}>
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

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        {[
          { label: 'Total',     value: rows.length,                                       iconBg: '#2563EB' },
          { label: 'Active',    value: rows.filter(u => u.status === 'Active').length,    iconBg: '#10B981' },
          { label: 'Suspended', value: rows.filter(u => u.status === 'Suspended').length, iconBg: '#EF4444' },
        ].map(({ label, value, iconBg }) => (
          <div key={label} style={{ backgroundColor: 'var(--card)', borderRadius: 14, padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--muted-foreground)', marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: '1.7rem', fontWeight: 700, color: 'var(--foreground)', lineHeight: 1 }}>
                {isLoading ? <Loader2 size={20} className="animate-spin" style={{ color: 'var(--muted-foreground)' }} /> : value}
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <ShieldCheck size={19} />
            </div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ color: 'var(--foreground)', fontSize: '1.3rem', fontWeight: 700, lineHeight: 1.2 }}>Admin Users</h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.83rem', marginTop: 3 }}>Manage internal super admin staff</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          disabled={isLoading}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, cursor: isLoading ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', border: 'none', color: '#fff', fontSize: '0.82rem', fontWeight: 600, opacity: isLoading ? 0.6 : 1 }}
        >
          <Plus size={15} /> Add Admin
        </button>
      </div>

      {/* Table card */}
      <div style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        {/* Controls */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 260 }}>
            <Search size={14} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none' }} />
            <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Search admins..." style={{ paddingLeft: 28, paddingRight: 10, height: 34, borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)', fontSize: '0.8rem', outline: 'none', width: '100%' }} />
          </div>
          <Dropdown<string>
            label="Role"
            options={roleFilterOptions.map(o => o.id)}
            value={roleFilter}
            onChange={v => { setRoleFilter(v); setPage(1); }}
            getOptionLabel={id => roleFilterOptions.find(o => o.id === id)?.name ?? id}
          />
        </div>

        {/* Loading / Error */}
        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--muted-foreground)', fontSize: '0.85rem', padding: '48px 16px', justifyContent: 'center' }}>
            <Loader2 size={18} className="animate-spin" /> Loading admin users…
          </div>
        )}

        {!isLoading && loadError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, margin: 16, padding: '12px 16px', color: '#DC2626', fontSize: '0.85rem' }}>
            {loadError}
            <button onClick={fetchAll} style={{ marginLeft: 'auto', fontSize: '0.8rem', fontWeight: 600, color: '#DC2626', background: 'none', border: '1px solid #FECACA', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
              Retry
            </button>
          </div>
        )}

        {/* Table */}
        {!isLoading && !loadError && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr><TH>User</TH><TH>Email</TH><TH>Role</TH><TH>Status</TH><TH right>Actions</TH></tr>
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
                      <td style={{ padding: '11px 14px' }}><span style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', fontFamily: 'monospace' }}>{u.login}</span></td>
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{ display: 'inline-block', backgroundColor: rs.bg, color: rs.color, border: `1px solid ${rs.border}`, fontSize: '0.7rem', fontWeight: 700, padding: '3px 9px', borderRadius: 99 }}>{roleName}</span>
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: ss.dot }} />
                          <span style={{ fontSize: '0.82rem', fontWeight: 500, color: ss.color }}>{u.status}</span>
                        </div>
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                          <button onClick={() => setEditTarget(u)} title="Edit"
                            style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--background)')}>
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => setDeleteTarget(u)} title="Delete"
                            style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid #FECACA', backgroundColor: '#FEF2F2', color: '#DC2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#FEE2E2')}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FEF2F2')}>
                            <Trash2 size={13} />
                          </button>
                        </div>
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

        {/* Pagination */}
        {!isLoading && !loadError && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)' }}>Showing {start}–{end} of {rows.length} admins</span>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <button onClick={() => goPage(page - 1)} disabled={page === 1} style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: page === 1 ? 'var(--muted-foreground)' : 'var(--foreground)', fontSize: '0.78rem', fontWeight: 500, cursor: page === 1 ? 'default' : 'pointer' }}>Prev</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1).map((p, idx, arr) => (
                <span key={p} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && <span style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', padding: '0 2px' }}>…</span>}
                  <button onClick={() => goPage(p)} style={{ width: 30, height: 30, borderRadius: 7, border: 'none', backgroundColor: p === page ? '#2563EB' : 'transparent', color: p === page ? '#fff' : 'var(--muted-foreground)', fontSize: '0.78rem', fontWeight: p === page ? 600 : 400, cursor: 'pointer' }}>{p}</button>
                </span>
              ))}
              <button onClick={() => goPage(page + 1)} disabled={page === totalPages} style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: page === totalPages ? 'var(--muted-foreground)' : 'var(--foreground)', fontSize: '0.78rem', fontWeight: 500, cursor: page === totalPages ? 'default' : 'pointer' }}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
