import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Plus, Pencil, Trash2, X, Users, Loader2, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { FilterTabs, type TabItem } from '@/components/shared/FilterTabs';
import { Dropdown } from '@/components/shared/Dropdown';
import { DeleteConfirmModal } from '@/components/shared/DeleteConfirmModal';
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
  company_id: string;
  status: Status;
  must_change_password: boolean;
  phone: string;
  telegram: string;
  created_at: string;
  updated_at: string;
}

interface ApiCompany {
  id: string;
  name: string;
  owner_id: string;
}

interface BoardUser {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  login: string;
  email: string;
  companyIds: string[];
  companyNames: string[];
  role: string;
  status: Status;
  mustChangePassword: boolean;
  phone: string;
  telegram: string;
  createdAt: string;
  updatedAt: string;
}

interface FormState {
  name: string;
  email: string;
  phone: string;
  telegram: string;
  role: string;
  status: Status;
  password: string;
}

// ── Config ────────────────────────────────────────────────────────────────────

const PER_PAGE = 10;
const STATUSES: Status[] = ['Active', 'Suspended'];
const BOARD_ROLES = ['owner', 'dispatcher', 'updater'];
const AVATAR_COLORS = ['#6366F1','#10B981','#F59E0B','#EC4899','#2563EB','#8B5CF6','#14B8A6','#F97316','#0EA5E9','#DC2626'];

const STATUS_CONFIG: Record<Status, { dot: string; color: string }> = {
  Active:    { dot: '#22C55E', color: '#15803D' },
  Suspended: { dot: '#EF4444', color: '#B91C1C' },
};

const ROLE_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  owner:      { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
  dispatcher: { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' },
  updater:    { bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' },
};
const DEFAULT_ROLE_STYLE = { bg: '#F1F5F9', color: '#64748B', border: '#E2E8F0' };

// ── Helpers ───────────────────────────────────────────────────────────────────

function colorFromStr(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function toInitials(name: string): string {
  return name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function roleLabel(slug: string): string {
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function toUIUser(u: ApiUser, companies: ApiCompany[]): BoardUser {
  const owned = companies.filter(c => c.owner_id === u.id);
  if (owned.length === 0 && u.company_id) {
    const co = companies.find(c => c.id === u.company_id);
    if (co) owned.push(co);
  }
  return {
    id: u.id,
    name: u.full_name,
    initials: toInitials(u.full_name),
    avatarColor: colorFromStr(u.id),
    login: u.login ?? u.email,
    email: u.email ?? '',
    companyIds: owned.map(c => c.id),
    companyNames: owned.map(c => c.name),
    role: u.role,
    status: u.status,
    mustChangePassword: u.must_change_password,
    phone: u.phone ?? '',
    telegram: u.telegram ?? '',
    createdAt: u.created_at ?? '',
    updatedAt: u.updated_at ?? '',
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
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: 4 }}>User Created</h2>
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

// ── UserModal (Create / Edit) ─────────────────────────────────────────────────

function UserModal({
  mode, initial, onClose, onSave,
}: {
  mode: 'create' | 'edit';
  initial: FormState;
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
        if (err.code === 'login_taken' || err.code === 'email_taken') {
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
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 50, width: 500, backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)' }}>
            {mode === 'create' ? 'Add Board User' : 'Edit Board User'}
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
          <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '65vh', overflowY: 'auto' }}>
            <div>
              <label style={lbl}>Full Name <span style={{ color: '#EF4444' }}>*</span></label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="John Doe" style={inp} required disabled={saving} />
            </div>
            <div>
              <label style={lbl}>Login <span style={{ color: '#EF4444' }}>*</span></label>
              <input type="text" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="user@company.io" style={inp} required disabled={saving} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>Phone</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 (555) 000-0000" style={inp} disabled={saving} />
              </div>
              <div>
                <label style={lbl}>Telegram</label>
                <input value={form.telegram} onChange={e => setForm(f => ({ ...f, telegram: e.target.value }))} placeholder="@username" style={inp} disabled={saving} />
              </div>
            </div>
            {mode === 'edit' && (
              <div>
                <label style={lbl}>Role</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', backgroundColor: 'var(--muted)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  {(() => { const s = ROLE_STYLE[form.role] ?? DEFAULT_ROLE_STYLE; return (
                    <span style={{ backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}`, fontSize: '0.72rem', fontWeight: 700, padding: '2px 9px', borderRadius: 99 }}>{roleLabel(form.role)}</span>
                  ); })()}
                  <span style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)' }}>Role cannot be changed</span>
                </div>
              </div>
            )}
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
              {saving ? 'Saving…' : (mode === 'create' ? 'Add User' : 'Save Changes')}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ── UserDetailModal ───────────────────────────────────────────────────────────

function UserDetailModal({ user, onClose, onEdit, editLoading }: { user: BoardUser; onClose: () => void; onEdit: () => void; editLoading?: boolean }) {
  const rs = ROLE_STYLE[user.role] ?? DEFAULT_ROLE_STYLE;
  const ss = STATUS_CONFIG[user.status];

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
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)' }}>User Details</h2>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-block', backgroundColor: rs.bg, color: rs.color, border: `1px solid ${rs.border}`, fontSize: '0.7rem', fontWeight: 700, padding: '2px 9px', borderRadius: 99 }}>{roleLabel(user.role)}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: ss.dot }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 500, color: ss.color }}>{user.status}</span>
              </div>
              {user.mustChangePassword && (
                <span style={{ fontSize: '0.65rem', fontWeight: 700, backgroundColor: '#FEF9C3', color: '#854D0E', border: '1px solid #FDE68A', padding: '2px 7px', borderRadius: 99 }}>
                  MUST CHANGE PW
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ padding: '20px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Login" value={user.login} mono />
          </div>
          {user.email && (
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Email" value={user.email} mono />
            </div>
          )}
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label={`Compan${user.companyNames.length === 1 ? 'y' : 'ies'}`} value={
              user.companyNames.length === 0 ? '—' :
              user.companyNames.length === 1 ? user.companyNames[0] :
              <ul style={{ margin: 0, padding: '0 0 0 16px', listStyle: 'disc', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {user.companyNames.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            } />
          </div>
          <Field label="Phone"    value={user.phone    || '—'} />
          <Field label="Telegram" value={user.telegram || '—'} />
          <Field label="Created"  value={formatDate(user.createdAt)} />
          <Field label="Updated"  value={formatDate(user.updatedAt)} />
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="User ID" value={user.id} mono />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, padding: '14px 22px', borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} style={{ flex: 1, height: 38, borderRadius: 8, cursor: 'pointer', backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)', fontSize: '0.83rem', fontWeight: 500 }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--background)')}>
            Close
          </button>
          <button onClick={onEdit} disabled={editLoading} style={{ flex: 2, height: 38, borderRadius: 8, cursor: editLoading ? 'not-allowed' : 'pointer', background: editLoading ? 'var(--muted)' : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', border: 'none', color: editLoading ? 'var(--muted-foreground)' : '#fff', fontSize: '0.83rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {editLoading && <Loader2 size={14} className="animate-spin" />}
            {editLoading ? 'Loading…' : 'Edit User'}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type TabId = 'all' | Status;

const TABS: TabItem<TabId>[] = [
  { id: 'all',       label: 'All' },
  { id: 'Active',    label: 'Active' },
  { id: 'Suspended', label: 'Suspended' },
];

const EMPTY_FORM: FormState = { name: '', email: '', phone: '', telegram: '', role: 'owner', status: 'Active', password: '' };

export default function BoardUsersPage() {
  const [rows, setRows]                   = useState<BoardUser[]>([]);
  const [companies, setCompanies]         = useState<ApiCompany[]>([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [loadError, setLoadError]         = useState<string | null>(null);
  const [tab, setTab]                     = useState<TabId>('all');
  const [search, setSearch]               = useState('');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [roleFilter, setRoleFilter]       = useState('all');
  const [page, setPage]                   = useState(1);
  const [allCounts, setAllCounts]         = useState({ total: 0, active: 0, suspended: 0 });

  const [searchInput, setSearchInput]     = useState('');
  const companiesRef                      = useRef<ApiCompany[]>([]);

  const [createOpen, setCreateOpen]       = useState(false);
  const [createdCreds, setCreatedCreds]   = useState<{ name: string; login: string; password: string } | null>(null);
  const [editTarget, setEditTarget]       = useState<BoardUser | null>(null);
  const [editingId, setEditingId]         = useState<string | null>(null);
  const [viewTarget, setViewTarget]       = useState<BoardUser | null>(null);
  const [deleteTarget, setDeleteTarget]   = useState<BoardUser | null>(null);
  const [deleting, setDeleting]           = useState(false);
  const [deleteError, setDeleteError]     = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // One-time: fetch companies for the filter dropdown + global stats
  useEffect(() => {
    Promise.all([
      api.get<ApiCompany[]>('/companies'),
      api.get<ApiUser[]>('/users?kind=board'),
    ]).then(([cos, allUsers]) => {
      companiesRef.current = cos;
      setCompanies(cos);
      setAllCounts({
        total: allUsers.length,
        active: allUsers.filter(u => u.status === 'Active').length,
        suspended: allUsers.filter(u => u.status === 'Suspended').length,
      });
    }).catch(() => {});
  }, []);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const qs = new URLSearchParams({ kind: 'board' });
      if (tab !== 'all')           qs.set('status', tab);
      if (search)                  qs.set('search', search);
      if (companyFilter !== 'all') qs.set('company_id', companyFilter);
      if (roleFilter    !== 'all') qs.set('role', roleFilter);
      const users = await api.get<ApiUser[]>(`/users?${qs.toString()}`);
      setRows(users.map(u => toUIUser(u, companiesRef.current)));
    } catch (err) {
      setLoadError(err instanceof ApiException ? err.message : 'Failed to load board users.');
    } finally {
      setIsLoading(false);
    }
  }, [tab, search, companyFilter, roleFilter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function openEdit(u: BoardUser) {
    setEditingId(u.id);
    try {
      const full = await api.get<ApiUser>(`/users/${u.id}`);
      setEditTarget(toUIUser(full, companiesRef.current));
    } catch {
      setEditTarget(u);
    } finally {
      setEditingId(null);
    }
  }

  async function openView(u: BoardUser) {
    setViewTarget(u);
    try {
      const full = await api.get<ApiUser>(`/users/${u.id}`);
      setViewTarget(prev => prev?.id === u.id ? toUIUser(full, companiesRef.current) : prev);
    } catch { }
  }

  const totalPages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const paginated  = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const start      = rows.length === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const end        = Math.min(page * PER_PAGE, rows.length);
  function goPage(p: number) { setPage(Math.min(Math.max(1, p), totalPages)); }

  async function handleCreate(f: FormState): Promise<void> {
    const created = await api.post<ApiUser>('/users', {
      kind: 'board',
      full_name: f.name,
      login: f.email,
      role: 'owner',
      status: f.status,
      password: f.password,
      phone: f.phone,
      telegram: f.telegram,
    });
    setRows(p => [toUIUser(created, companiesRef.current), ...p]);
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
      phone: f.phone,
      telegram: f.telegram,
    };
    if (f.password.trim()) payload.password = f.password;
    const updated = await api.put<ApiUser>(`/users/${editTarget.id}`, payload);
    setRows(p => p.map(u => u.id === editTarget.id ? toUIUser(updated, companiesRef.current) : u));
    setEditTarget(null);
  }

  async function handleDelete(): Promise<void> {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.delete(`/users/${deleteTarget.id}`);
      const s = deleteTarget.status === 'Active' ? 'active' : 'suspended';
      setAllCounts(c => ({ ...c, total: Math.max(0, c.total - 1), [s]: Math.max(0, c[s] - 1) }));
      setRows(p => p.filter(u => u.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      if (err instanceof ApiException) {
        setDeleteError(err.code === 'owns_companies'
          ? 'This owner still owns companies. Reassign or delete their companies first.'
          : err.message || 'Failed to delete user.');
      } else {
        setDeleteError('Unable to connect to the server.');
      }
    } finally {
      setDeleting(false);
    }
  }

  const companyFilterOptions = [
    { id: 'all', name: 'All Companies' },
    ...companies.map(c => ({ id: c.id, name: c.name })),
  ];
  const roleFilterOptions = [
    { id: 'all', name: 'All Roles' },
    ...BOARD_ROLES.map(r => ({ id: r, name: roleLabel(r) })),
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
        <UserModal mode="create" initial={EMPTY_FORM} onClose={() => setCreateOpen(false)} onSave={handleCreate} />
      )}
      {editTarget && (
        <UserModal
          mode="edit"
          initial={{ name: editTarget.name, email: editTarget.login, phone: editTarget.phone, telegram: editTarget.telegram, role: editTarget.role, status: editTarget.status, password: '' }}
          onClose={() => setEditTarget(null)}
          onSave={handleEdit}
        />
      )}
      {viewTarget && (
        <UserDetailModal
          user={viewTarget}
          onClose={() => setViewTarget(null)}
          editLoading={editingId === viewTarget.id}
          onEdit={() => { const u = viewTarget; setViewTarget(null); openEdit(u); }}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          title="Delete Board User"
          description={<>Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This action cannot be undone.</>}
          onCancel={() => { setDeleteTarget(null); setDeleteError(null); }}
          onConfirm={handleDelete}
          loading={deleting}
          error={deleteError ?? undefined}
        />
      )}

      {createdCreds && <CredsModal name={createdCreds.name} login={createdCreds.login} password={createdCreds.password} onClose={() => setCreatedCreds(null)} />}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        {[
          { label: 'Total',     value: allCounts.total,     iconBg: '#2563EB' },
          { label: 'Active',    value: allCounts.active,    iconBg: '#10B981' },
          { label: 'Suspended', value: allCounts.suspended, iconBg: '#EF4444' },
        ].map(({ label, value, iconBg }) => (
          <div key={label} style={{ backgroundColor: 'var(--card)', borderRadius: 14, padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--muted-foreground)', marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: '1.7rem', fontWeight: 700, color: 'var(--foreground)', lineHeight: 1 }}>
                {isLoading ? <Loader2 size={20} className="animate-spin" style={{ color: 'var(--muted-foreground)' }} /> : value}
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <Users size={19} />
            </div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ color: 'var(--foreground)', fontSize: '1.3rem', fontWeight: 700, lineHeight: 1.2 }}>Board Users</h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.83rem', marginTop: 3 }}>Management of all users within tenant workspaces</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          disabled={isLoading}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, cursor: isLoading ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', border: 'none', color: '#fff', fontSize: '0.82rem', fontWeight: 600, opacity: isLoading ? 0.6 : 1 }}
        >
          <Plus size={15} /> Add Board User
        </button>
      </div>

      {/* Table card */}
      <div style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        {/* Controls */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <FilterTabs<TabId> tabs={TABS} active={tab} onChange={t => { setTab(t); setPage(1); }} />
          <div style={{ flex: 1 }} />
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none' }} />
            <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Search users..." style={{ paddingLeft: 28, paddingRight: 10, height: 34, borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)', fontSize: '0.8rem', outline: 'none', width: 190 }} />
          </div>
          <Dropdown<string>
            label="Company"
            options={companyFilterOptions.map(o => o.id)}
            value={companyFilter}
            onChange={v => { setCompanyFilter(v); setPage(1); }}
            getOptionLabel={id => companyFilterOptions.find(o => o.id === id)?.name ?? id}
          />
          <Dropdown<string>
            label="Role"
            options={roleFilterOptions.map(o => o.id)}
            value={roleFilter}
            onChange={v => { setRoleFilter(v); setPage(1); }}
            getOptionLabel={id => roleFilterOptions.find(o => o.id === id)?.name ?? id}
          />
        </div>

        {/* Loading */}
        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--muted-foreground)', fontSize: '0.85rem', padding: '48px 16px', justifyContent: 'center' }}>
            <Loader2 size={18} className="animate-spin" /> Loading board users…
          </div>
        )}

        {/* Error */}
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
                <tr><TH>User</TH><TH>Login</TH><TH>Company</TH><TH>Role</TH><TH>Status</TH><TH right>Actions</TH></tr>
              </thead>
              <tbody>
                {paginated.map((u, i) => {
                  const rs = ROLE_STYLE[u.role] ?? DEFAULT_ROLE_STYLE;
                  const ss = STATUS_CONFIG[u.status];
                  return (
                    <tr key={u.id} style={{ borderBottom: i < paginated.length - 1 ? '1px solid var(--border)' : 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                      <td style={{ padding: '11px 14px' }}>
                        <button onClick={() => openView(u)} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', backgroundColor: u.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 700 }}>{u.initials}</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3 }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>{u.name}</span>
                            {u.mustChangePassword && (
                              <span style={{ fontSize: '0.6rem', fontWeight: 700, backgroundColor: '#FEF9C3', color: '#854D0E', border: '1px solid #FDE68A', padding: '1px 6px', borderRadius: 99, lineHeight: 1.5 }}>MUST CHANGE PW</span>
                            )}
                          </div>
                        </button>
                      </td>
                      <td style={{ padding: '11px 14px' }}><span style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', fontFamily: 'monospace' }}>{u.login}</span></td>
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {u.companyNames.length === 0
                            ? <span style={{ fontSize: '0.83rem', color: 'var(--muted-foreground)' }}>—</span>
                            : u.companyNames.length === 1
                              ? <span style={{ fontSize: '0.83rem', color: 'var(--foreground)' }}>{u.companyNames[0]}</span>
                              : <>
                                  <span style={{ fontSize: '0.83rem', color: 'var(--foreground)' }}>{u.companyNames[0]}</span>
                                  <span style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)' }}>+{u.companyNames.length - 1} more</span>
                                </>
                          }
                        </div>
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{ display: 'inline-block', backgroundColor: rs.bg, color: rs.color, border: `1px solid ${rs.border}`, fontSize: '0.7rem', fontWeight: 700, padding: '3px 9px', borderRadius: 99 }}>{roleLabel(u.role)}</span>
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: ss.dot }} />
                          <span style={{ fontSize: '0.82rem', fontWeight: 500, color: ss.color }}>{u.status}</span>
                        </div>
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                          <button onClick={() => openEdit(u)} title="Edit" disabled={editingId === u.id}
                            style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)', cursor: editingId === u.id ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: editingId === u.id ? 0.6 : 1 }}
                            onMouseEnter={e => { if (!editingId) e.currentTarget.style.backgroundColor = 'var(--muted)'; }}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--background)')}>
                            {editingId === u.id ? <Loader2 size={13} className="animate-spin" /> : <Pencil size={13} />}
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
                  <tr><td colSpan={6} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>No users match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && !loadError && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)' }}>Showing {start}–{end} of {rows.length} users</span>
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
