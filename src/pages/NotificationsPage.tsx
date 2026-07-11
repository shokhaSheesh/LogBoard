import { useState, useEffect, useCallback } from 'react';
import {
  Bell, Plus, X, Loader2, Send, Eye, ChevronLeft, ChevronRight,
  User as UserIcon, Users as UsersIcon, Building2, CheckCheck, Check,
} from 'lucide-react';
import { Dropdown } from '@/components/shared/Dropdown';
import { SearchSelect, type SearchSelectOption } from '@/components/shared/SearchSelect';
import { useAuth } from '@/context/AuthContext';
import { api, ApiException } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type AudienceKind = 'user' | 'role' | 'company';

interface Audience { kind: AudienceKind; id: string }

interface BatchRow {
  batch_id: string;
  kind: string;
  audience: Audience;
  title: string;
  body: string;
  sender_id: string;
  recipients: number;
  read: number;
  sent_at: string;
}

interface RecipientRow {
  id: string;
  user_id: string;
  read: boolean;
  created_at: string;
}

interface ListMeta { page: number; page_size: number; total: number }

// The API may return the audience nested ({ audience: {kind,id} }, as in the
// send response) or flattened ({ audience_kind, audience_id }). Accept both.
type RawBatch = Partial<BatchRow> & { audience_kind?: AudienceKind; audience_id?: string; company_id?: string };

function normalizeBatch(r: RawBatch): BatchRow {
  const audience: Audience = r.audience ?? { kind: (r.audience_kind ?? 'role') as AudienceKind, id: r.audience_id ?? r.company_id ?? '' };
  return {
    batch_id:   r.batch_id ?? '',
    kind:       r.kind ?? 'admin_message',
    audience,
    title:      r.title ?? '',
    body:       r.body ?? '',
    sender_id:  r.sender_id ?? '',
    recipients: r.recipients ?? 0,
    read:       r.read ?? 0,
    sent_at:    r.sent_at ?? '',
  };
}

interface ApiUserLight { id: string; full_name: string; login: string; email: string; kind: string; role: string }
interface ApiCompanyLight { id: string; name: string; mc: string }
interface ApiRole { id: string; name: string }

// ── Constants ─────────────────────────────────────────────────────────────────

const PER_PAGE = 10;

const BOARD_ROLES: { value: string; label: string }[] = [
  { value: 'owner',      label: 'Owner' },
  { value: 'dispatcher', label: 'Dispatcher' },
  { value: 'updater',    label: 'Updater' },
];

const AUDIENCE_META: Record<AudienceKind, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  user:    { label: 'User',    icon: <UserIcon size={12} />,   color: '#2563EB', bg: '#EFF6FF' },
  role:    { label: 'Role',    icon: <UsersIcon size={12} />,  color: '#7C3AED', bg: '#F5F3FF' },
  company: { label: 'Company', icon: <Building2 size={12} />,  color: '#0891B2', bg: '#ECFEFF' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.75rem', fontWeight: 600,
  color: 'var(--muted-foreground)', marginBottom: 5, letterSpacing: '0.03em',
};

// ── Compose modal ─────────────────────────────────────────────────────────────

function ComposeModal({ users, companies, adminRoles, onClose, onSent }: {
  users: ApiUserLight[];
  companies: ApiCompanyLight[];
  adminRoles: ApiRole[];
  onClose: () => void;
  onSent: (batch: BatchRow) => void;
}) {
  const [title, setTitle]         = useState('');
  const [body, setBody]           = useState('');
  const [kind, setKind]           = useState<AudienceKind>('role');
  const [targetId, setTargetId]   = useState('');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const inp: React.CSSProperties = { width: '100%', padding: '8px 11px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--foreground)', fontSize: '0.83rem', outline: 'none', boxSizing: 'border-box' };

  const roleOptions: SearchSelectOption[] = [
    ...BOARD_ROLES.map(r => ({ value: r.value, label: r.label, sublabel: 'Board role' })),
    ...adminRoles.map(r => ({ value: r.id, label: r.name, sublabel: 'Admin role' })),
  ];
  const userOptions: SearchSelectOption[] = users.map(u => ({ value: u.id, label: u.full_name || u.login, sublabel: u.login || u.email }));
  const companyOptions: SearchSelectOption[] = companies.map(c => ({ value: c.id, label: c.name, sublabel: `MC #${c.mc}` }));

  const targetOptions = kind === 'user' ? userOptions : kind === 'company' ? companyOptions : roleOptions;
  const targetPlaceholder = kind === 'user' ? 'Select a user…' : kind === 'company' ? 'Select a company…' : 'Select a role…';

  function changeKind(k: AudienceKind) { setKind(k); setTargetId(''); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!title.trim() || !body.trim()) { setError('Title and message are both required.'); return; }
    if (!targetId) { setError('Choose who should receive this notification.'); return; }
    setSaving(true);
    try {
      const batch = await api.post<RawBatch>('/admin/notifications', {
        title: title.trim(),
        body: body.trim(),
        audience: { kind, id: targetId },
      });
      onSent(normalizeBatch(batch));
    } catch (err) {
      if (err instanceof ApiException) {
        if (err.code === 'empty_audience') setError('That audience matched no active users — nothing was sent.');
        else if (err.code === 'invalid_audience') setError('Invalid audience selection.');
        else setError(err.message || 'Something went wrong.');
      } else setError('Unable to send. Please try again.');
      setSaving(false);
    }
  }

  const kindTab = (k: AudienceKind) => {
    const m = AUDIENCE_META[k];
    const active = kind === k;
    return (
      <button key={k} type="button" onClick={() => changeKind(k)}
        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0', borderRadius: 8, cursor: 'pointer', border: `1px solid ${active ? m.color : 'var(--border)'}`, backgroundColor: active ? m.bg : 'var(--card)', color: active ? m.color : 'var(--muted-foreground)', fontSize: '0.8rem', fontWeight: active ? 600 : 500 }}>
        {m.icon} {m.label}
      </button>
    );
  };

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 40 }} onClick={() => { if (!saving) onClose(); }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 50, width: 500, maxHeight: '90vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)' }}>Send Notification</h2>
          <button onClick={onClose} disabled={saving} style={{ background: 'none', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', color: 'var(--muted-foreground)', padding: 4, display: 'flex', borderRadius: 6 }}
            onMouseEnter={e => { if (!saving) (e.currentTarget.style.backgroundColor = 'var(--muted)'); }}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          ><X size={17} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>

            <div>
              <label style={labelStyle}>Title <span style={{ color: '#EF4444' }}>*</span></label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Scheduled maintenance" style={inp} autoFocus />
            </div>

            <div>
              <label style={labelStyle}>Message <span style={{ color: '#EF4444' }}>*</span></label>
              <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="e.g. The board will be briefly unavailable Sunday 02:00 UTC." rows={3} style={{ ...inp, resize: 'vertical', minHeight: 72, fontFamily: 'inherit' }} />
            </div>

            <div>
              <label style={labelStyle}>Audience <span style={{ color: '#EF4444' }}>*</span></label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                {(['role', 'company', 'user'] as AudienceKind[]).map(kindTab)}
              </div>
              <SearchSelect
                value={targetId}
                options={targetOptions}
                placeholder={targetPlaceholder}
                onChange={setTargetId}
              />
              <p style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', marginTop: 6 }}>
                {kind === 'role'    && 'Everyone holding this role across all tenants. Only active users are notified.'}
                {kind === 'company' && "The company's board users and its owner."}
                {kind === 'user'    && 'One specific user.'}
              </p>
            </div>

            {error && <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#B91C1C', fontSize: '0.78rem', padding: '8px 12px' }}>{error}</div>}
          </div>

          <div style={{ display: 'flex', gap: 8, padding: '14px 22px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            <button type="button" onClick={onClose} disabled={saving}
              style={{ flex: 1, height: 38, borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)', fontSize: '0.83rem', fontWeight: 500, opacity: saving ? 0.6 : 1 }}
              onMouseEnter={e => { if (!saving) (e.currentTarget.style.backgroundColor = 'var(--muted)'); }}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--background)')}
            >Cancel</button>
            <button type="submit" disabled={saving}
              style={{ flex: 2, height: 38, borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', border: 'none', color: '#fff', fontSize: '0.83rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: saving ? 0.8 : 1 }}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {saving ? 'Sending…' : 'Send Notification'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ── Detail modal ──────────────────────────────────────────────────────────────

function DetailModal({ batch, audienceLabel, userName, onClose }: {
  batch: BatchRow;
  audienceLabel: (a: Audience) => string;
  userName: (id: string) => string;
  onClose: () => void;
}) {
  const [recipients, setRecipients] = useState<RecipientRow[]>([]);
  const [meta, setMeta]             = useState<ListMeta | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  useEffect(() => {
    setLoading(true); setError('');
    api.getBody<{ data: { batch: BatchRow; recipients: RecipientRow[] }; meta: ListMeta }>(`/admin/notifications/${batch.batch_id}?page=1&page_size=100`)
      .then(res => { setRecipients(res.data?.recipients ?? []); setMeta(res.meta ?? null); })
      .catch(() => setError('Failed to load recipients.'))
      .finally(() => setLoading(false));
  }, [batch.batch_id]);

  const m = AUDIENCE_META[batch.audience.kind];
  const readPct = batch.recipients > 0 ? Math.round((batch.read / batch.recipients) * 100) : 0;

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 40 }} onClick={onClose} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 50, width: 540, maxHeight: '90vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)' }}>Notification Detail</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: 4, display: 'flex', borderRadius: 6 }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          ><X size={17} /></button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {/* Summary */}
          <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: 4 }}>{batch.title}</div>
            <div style={{ fontSize: '0.83rem', color: 'var(--muted-foreground)', lineHeight: 1.5, marginBottom: 12 }}>{batch.body}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, backgroundColor: m.bg, color: m.color, border: `1px solid ${m.color}30`, borderRadius: 99, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 600 }}>
                {m.icon} {audienceLabel(batch.audience)}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{fmtDateTime(batch.sent_at)}</span>
            </div>
            {/* Read progress */}
            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 5 }}>
                <span style={{ color: 'var(--muted-foreground)' }}>Read receipts</span>
                <span style={{ color: 'var(--foreground)', fontWeight: 600 }}>{batch.read} / {batch.recipients} read ({readPct}%)</span>
              </div>
              <div style={{ height: 7, borderRadius: 99, backgroundColor: 'var(--muted)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${readPct}%`, backgroundColor: '#22C55E', borderRadius: 99, transition: 'width 0.3s' }} />
              </div>
            </div>
          </div>

          {/* Recipients */}
          <div style={{ padding: '14px 22px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted-foreground)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>
              Recipients {meta ? `(${meta.total})` : ''}
            </div>
            {loading && <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '20px 0', color: 'var(--muted-foreground)', fontSize: '0.82rem' }}><Loader2 size={16} className="animate-spin" /> Loading…</div>}
            {!loading && error && <div style={{ color: '#B91C1C', fontSize: '0.82rem', padding: '10px 0' }}>{error}</div>}
            {!loading && !error && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {recipients.map(r => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 10px', borderRadius: 8, backgroundColor: 'var(--background)' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--foreground)' }}>{userName(r.user_id)}</span>
                    {r.read ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#15803D', fontSize: '0.72rem', fontWeight: 600 }}><CheckCheck size={13} /> Read</span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--muted-foreground)', fontSize: '0.72rem', fontWeight: 500 }}><Check size={13} /> Delivered</span>
                    )}
                  </div>
                ))}
                {recipients.length === 0 && <div style={{ color: 'var(--muted-foreground)', fontSize: '0.82rem', padding: '10px 0' }}>No recipient rows.</div>}
                {meta && meta.total > recipients.length && (
                  <div style={{ fontSize: '0.74rem', color: 'var(--muted-foreground)', paddingTop: 8, textAlign: 'center' }}>
                    Showing first {recipients.length} of {meta.total}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const { can } = useAuth();
  const [rows, setRows]         = useState<BatchRow[]>([]);
  const [meta, setMeta]         = useState<ListMeta | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [loadError, setError]   = useState('');
  const [page, setPage]         = useState(1);
  const [kindFilter, setKindFilter] = useState<'all' | AudienceKind>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch]     = useState('');

  const [composeOpen, setComposeOpen] = useState(false);
  const [detail, setDetail]           = useState<BatchRow | null>(null);

  // Reference data for audience labels + compose picker
  const [users, setUsers]         = useState<ApiUserLight[]>([]);
  const [companies, setCompanies] = useState<ApiCompanyLight[]>([]);
  const [adminRoles, setRoles]    = useState<ApiRole[]>([]);

  useEffect(() => {
    Promise.all([
      api.get<ApiUserLight[]>('/users?kind=board').catch(() => []),
      api.get<ApiUserLight[]>('/users?kind=admin').catch(() => []),
    ]).then(([board, admin]) => setUsers([...board, ...admin]));
    api.get<ApiCompanyLight[]>('/companies').then(setCompanies).catch(() => {});
    api.get<ApiRole[]>('/roles').then(setRoles).catch(() => {});
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchList = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const qs = new URLSearchParams({ page: String(page), page_size: String(PER_PAGE) });
      if (kindFilter !== 'all') qs.set('audience_kind', kindFilter);
      if (search)               qs.set('q', search);
      const res = await api.getBody<{ data: RawBatch[]; meta: ListMeta }>(`/admin/notifications?${qs.toString()}`);
      setRows((res.data ?? []).map(normalizeBatch));
      setMeta(res.meta ?? null);
    } catch {
      setError('Failed to load notifications. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [page, kindFilter, search]);

  useEffect(() => { fetchList(); }, [fetchList]);

  // Label helpers
  const userName = (id: string) => {
    const u = users.find(x => x.id === id);
    return u ? (u.full_name || u.login) : id.slice(0, 8) + '…';
  };
  const roleName = (id: string) => {
    const board = BOARD_ROLES.find(r => r.value === id);
    if (board) return board.label;
    return adminRoles.find(r => r.id === id)?.name ?? id;
  };
  const companyName = (id: string) => companies.find(c => c.id === id)?.name ?? id;
  const audienceLabel = (a: Audience) => {
    if (a.kind === 'user')    return userName(a.id);
    if (a.kind === 'company') return companyName(a.id);
    return roleName(a.id);
  };

  function handleSent(batch: BatchRow) {
    setComposeOpen(false);
    setPage(1);
    fetchList();
    // optimistic: if we're on page 1 with no filters, show it immediately
    if (page === 1 && kindFilter === 'all' && !search) setRows(r => [batch, ...r]);
  }

  const totalPages = meta ? Math.max(1, Math.ceil(meta.total / PER_PAGE)) : 1;

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: 'var(--background)' }}>

      {composeOpen && <ComposeModal users={users} companies={companies} adminRoles={adminRoles} onClose={() => setComposeOpen(false)} onSent={handleSent} />}
      {detail && <DetailModal batch={detail} audienceLabel={audienceLabel} userName={userName} onClose={() => setDetail(null)} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ color: 'var(--foreground)', fontSize: '1.3rem', fontWeight: 700, lineHeight: 1.2 }}>Notifications</h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.83rem', marginTop: 3 }}>Send platform announcements and review delivery</p>
        </div>
        {can('notifications.create') && (
          <button onClick={() => setComposeOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, cursor: 'pointer', background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', border: 'none', color: '#fff', fontSize: '0.82rem', fontWeight: 600 }}>
            <Plus size={15} /> Send Notification
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Search title or message…"
            style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--foreground)', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
            onFocus={e => (e.currentTarget.style.borderColor = '#93C5FD')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          />
        </div>
        <Dropdown
          label="Audience"
          options={['all', 'role', 'company', 'user'] as ('all' | AudienceKind)[]}
          value={kindFilter}
          onChange={v => { setKindFilter(v); setPage(1); }}
          getOptionLabel={v => v === 'all' ? 'All Audiences' : AUDIENCE_META[v as AudienceKind].label}
        />
      </div>

      {isLoading && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '80px 0', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}><Loader2 size={18} className="animate-spin" /> Loading notifications…</div>}
      {!isLoading && loadError && <div style={{ textAlign: 'center', padding: '80px 0', color: '#B91C1C', fontSize: '0.85rem' }}>{loadError}</div>}

      {!isLoading && !loadError && (
        <div style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--muted)' }}>
                {['Notification', 'Audience', 'Recipients', 'Read', 'Sent', ''].map(h => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted-foreground)', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((b, i) => {
                const m = AUDIENCE_META[b.audience.kind];
                const readPct = b.recipients > 0 ? Math.round((b.read / b.recipients) * 100) : 0;
                return (
                  <tr key={b.batch_id} style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none', backgroundColor: 'var(--card)' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--card)')}
                  >
                    <td style={{ padding: '13px 16px', maxWidth: 280 }}>
                      <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.body}</div>
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, backgroundColor: m.bg, color: m.color, border: `1px solid ${m.color}30`, borderRadius: 99, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {m.icon} {audienceLabel(b.audience)}
                      </span>
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--foreground)' }}>{b.recipients}</span>
                    </td>
                    <td style={{ padding: '13px 16px', minWidth: 120 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, maxWidth: 70, height: 6, borderRadius: 99, backgroundColor: 'var(--muted)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${readPct}%`, backgroundColor: '#22C55E', borderRadius: 99 }} />
                        </div>
                        <span style={{ fontSize: '0.74rem', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{b.read}/{b.recipients}</span>
                      </div>
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{fmtDateTime(b.sent_at)}</span>
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={() => setDetail(b)}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, border: '1px solid var(--border)', backgroundColor: 'var(--background)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500, color: 'var(--foreground)', whiteSpace: 'nowrap' }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--background)')}
                        ><Eye size={12} /> View</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={6} style={{ padding: '56px 24px', textAlign: 'center' }}>
                  <Bell size={28} style={{ color: 'var(--muted-foreground)', opacity: 0.4, margin: '0 auto 10px' }} />
                  <div style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>
                    {search || kindFilter !== 'all' ? 'No notifications match your filters.' : 'No notifications sent yet. Click "Send Notification" to announce something.'}
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>

          {meta && meta.total > PER_PAGE && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)' }}>
                Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, meta.total)} of {meta.total}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, border: '1px solid var(--border)', backgroundColor: 'var(--background)', cursor: page === 1 ? 'not-allowed' : 'pointer', color: 'var(--foreground)', opacity: page === 1 ? 0.4 : 1, fontSize: '0.78rem' }}>
                  <ChevronLeft size={13} /> Prev
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, border: '1px solid var(--border)', backgroundColor: 'var(--background)', cursor: page >= totalPages ? 'not-allowed' : 'pointer', color: 'var(--foreground)', opacity: page >= totalPages ? 0.4 : 1, fontSize: '0.78rem' }}>
                  Next <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
