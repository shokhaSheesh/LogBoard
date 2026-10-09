import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Building2, CheckCircle2, Clock, XCircle,
  Plus, Pencil, Trash2, X,
  Phone, Send, Shield, Loader2,
} from 'lucide-react';
import { Dropdown } from '@/components/shared/Dropdown';
import { DeleteConfirmModal } from '@/components/shared/DeleteConfirmModal';
import { Kpi } from '@/components/shared/Kpi';
import { Card, Dash, IconButton, KpiRow, Page, Pager, PrimaryButton, RowActions, SearchBox, TableState, Toolbar } from '@/components/shared/ui';
import { DatePicker } from '@/components/shared/DatePicker';
import { ALL_TIME, PeriodFilter, type Period } from '@/components/shared/PeriodFilter';
import { SearchSelect } from '@/components/shared/SearchSelect';
import { addDays, dayOf, dayToStamp, fmtDate, inPeriod, isoDay } from '@/lib/dates';
import { useEscape } from '@/lib/useEscape';
import { useAuth } from '@/context/AuthContext';
import { api, ApiException } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type Status = 'Active' | 'Pending' | 'Suspended';

interface ApiCompany {
  id: string;
  mc: string;
  name: string;
  owner: string;
  owner_phone: string;
  owner_telegram: string;
  owner_id: string;
  plan: string;
  plan_expiry: string;
  eld: string;
  status: Status;
  created_at: string;
  updated_at: string;
}

interface Company {
  id: string;
  mc: string;
  name: string;
  initials: string;
  logoColor: string;
  ownerId: string;
  owner: string;
  ownerPhone: string;
  ownerTelegram: string;
  ownerInitials: string;
  ownerColor: string;
  plan: string;
  planExpiry: string;      // YYYY-MM-DD, or ''
  createdAt: string;
  status: Status;
  eld: string;
}

interface FetchedPlan {
  id: string;
  name: string;
  color: string;
  duration: number;
}

// ── Config ────────────────────────────────────────────────────────────────────

const PLAN_STYLE: Record<string, { bg: string; color: string }> = {
  Basic:        { bg: '#F0FDF4', color: '#15803D' },
  Starter:      { bg: '#EFF6FF', color: '#2563EB' },
  Professional: { bg: '#F5F3FF', color: '#7C3AED' },
  Enterprise:   { bg: '#FFF7ED', color: '#C2410C' },
};
const DEFAULT_PLAN_STYLE = { bg: '#F1F5F9', color: '#64748B' };

function planStyle(planName: string, plans?: FetchedPlan[]) {
  if (plans) {
    const hex = plans.find(p => p.name === planName)?.color;
    if (hex) return { bg: hex + '18', color: hex };
  }
  return PLAN_STYLE[planName] ?? DEFAULT_PLAN_STYLE;
}

const STATUS_CONFIG: Record<Status, { dot: string; color: string }> = {
  Active:    { dot: '#22C55E', color: '#15803D' },
  Pending:   { dot: '#F59E0B', color: '#B45309' },
  Suspended: { dot: '#EF4444', color: '#B91C1C' },
};

const ELD_COLOR: Record<string, string> = {
  Samsara:     '#2563EB',
  Motive:      '#7C3AED',
  Omnitracs:   '#059669',
  PeopleNet:   '#B45309',
  KeepTruckin: '#0891B2',
  None:        '#94A3B8',
};

const COLORS = ['#2563EB','#8B5CF6','#10B981','#F59E0B','#EC4899','#14B8A6','#6366F1','#F97316'];

type TabId = 'all' | Status;
const ELD_OPTIONS = ['None', 'Samsara', 'Motive', 'Omnitracs', 'PeopleNet', 'KeepTruckin'];

const PER_PAGE = 10;

// ── Helpers ───────────────────────────────────────────────────────────────────

function colorFromStr(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return COLORS[Math.abs(h) % COLORS.length];
}

function toUICompany(a: ApiCompany): Company {
  const initials      = a.name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const ownerInitials = a.owner.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return {
    id: a.id, mc: a.mc, name: a.name, initials,
    logoColor: colorFromStr(a.id),
    ownerId: a.owner_id ?? '',
    owner: a.owner,
    ownerPhone: a.owner_phone,
    ownerTelegram: a.owner_telegram,
    ownerInitials,
    ownerColor: colorFromStr(a.id + '_owner'),
    plan: a.plan, planExpiry: dayOf(a.plan_expiry),
    createdAt: a.created_at, status: a.status, eld: a.eld,
  };
}

function toApiPayload(f: FormState) {
  return {
    mc: f.mc,
    name: f.name,
    owner_id: f.ownerId,
    owner: f.owner,
    owner_phone: f.ownerPhone,
    owner_telegram: f.ownerTelegram,
    plan: f.plan,
    plan_expiry: dayToStamp(f.planExpiry),
    eld: f.eld,
    status: f.status,
  };
}

// ── Tiny inline SVG icons ─────────────────────────────────────────────────────

function CreditCardIcon() {
  return <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect width={20} height={14} x={2} y={5} rx={2}/><line x1={2} x2={22} y1={10} y2={10}/></svg>;
}
function CalendarIcon() {
  return <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect width={18} height={18} x={3} y={4} rx={2} ry={2}/><line x1={16} x2={16} y1={2} y2={6}/><line x1={8} x2={8} y1={2} y2={6}/><line x1={3} x2={21} y1={10} y2={10}/></svg>;
}
function TruckIcon() {
  return <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/><rect width={7} height={7} x={14} y={10} rx={1}/><circle cx={7.5} cy={17.5} r={2.5}/><circle cx={17.5} cy={17.5} r={2.5}/></svg>;
}

// ── Detail modal ──────────────────────────────────────────────────────────────

function CompanyDetailModal({ company, plans, onClose }: {
  company: Company;
  plans: FetchedPlan[];
  onClose: () => void;
}) {
  useEscape(onClose);
  const plan     = planStyle(company.plan, plans);
  const status   = STATUS_CONFIG[company.status];
  const eldColor = ELD_COLOR[company.eld] ?? '#94A3B8';

  interface RowProps { icon: React.ReactNode; label: string; value: React.ReactNode; last?: boolean; }
  const Row = ({ icon, label, value, last = false }: RowProps) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '11px 0', borderBottom: last ? 'none' : '1px solid var(--border)' }}>
      <span style={{ marginTop: 2, color: 'var(--muted-foreground)', flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>
          {label}
        </div>
        <div style={{ fontSize: '0.83rem', color: 'var(--foreground)', fontWeight: 500 }}>
          {value}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="rounded-2xl shadow-2xl w-full"
        style={{ backgroundColor: 'var(--card)', maxWidth: 520, border: '1px solid var(--border)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)' }}>Company Details</h2>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg"
            style={{ color: 'var(--muted-foreground)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--muted)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-4 flex-1">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, padding: 16, borderRadius: 12, backgroundColor: 'var(--muted)' }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: company.logoColor + '22', color: company.logoColor }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>{company.initials}</span>
            </div>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--foreground)', lineHeight: 1.2, marginBottom: 6 }}>{company.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', backgroundColor: 'var(--card)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 6 }}>
                  {company.mc}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, backgroundColor: plan.bg, color: plan.color }}>
                  {company.plan}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.7rem', fontWeight: 500, color: status.color }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: status.dot, display: 'inline-block' }} />
                  {company.status}
                </span>
              </div>
            </div>
          </div>

          <Row icon={<Shield size={14} />}       label="MC number"           value={company.mc} />
          <Row icon={<Building2 size={14} />}    label="Company Name"        value={company.name} />
          <Row
            icon={
              <div style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: company.ownerColor + '33', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.45rem', fontWeight: 700, color: company.ownerColor }}>{company.ownerInitials}</span>
              </div>
            }
            label="Owner Name"
            value={company.owner}
          />
          <Row icon={<Phone size={14} />}        label="Owner phone"         value={company.ownerPhone || <Dash />} />
          <Row icon={<Send size={14} />}         label="Owner Telegram"      value={company.ownerTelegram || <Dash />} />
          <Row
            icon={<CreditCardIcon />}
            label="Plan"
            value={<span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, backgroundColor: plan.bg, color: plan.color }}>{company.plan}</span>}
          />
          <Row icon={<CalendarIcon />}           label="Plan expires"        value={fmtDate(company.planExpiry) || <Dash />} />
          <Row
            icon={<TruckIcon />}
            label="ELD"
            value={<span style={{ fontWeight: 600, color: eldColor }}>{company.eld}</span>}
            last
          />
        </div>

        <div className="px-6 py-4 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose}
            className="w-full py-2 rounded-lg"
            style={{ fontSize: '0.83rem', fontWeight: 500, color: 'var(--foreground)', backgroundColor: 'var(--muted)', border: '1px solid var(--border)', cursor: 'pointer' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#E5E7EB'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--muted)'; }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Company form modal (create / edit) ────────────────────────────────────────

interface FormState {
  mc: string; name: string;
  ownerId: string; owner: string; ownerPhone: string; ownerTelegram: string;
  plan: string; planExpiry: string; eld: string; status: Status;
}
const EMPTY_FORM: FormState = {
  mc: '', name: '',
  ownerId: '', owner: '', ownerPhone: '', ownerTelegram: '',
  plan: '', planExpiry: '', eld: 'None', status: 'Active',
};

interface BoardUser {
  id: string;
  full_name: string;
  login: string;
  email: string;
  phone: string;
  telegram: string;
}

const fieldLabel: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 4 };

function CompanyModal({ mode, initial, plans, onClose, onSave }: {
  mode: 'create' | 'edit';
  initial?: Partial<FormState>;
  plans: FetchedPlan[];
  onClose: () => void;
  onSave: (f: FormState) => Promise<void>;
}) {
  const [form, setForm]         = useState<FormState>({ ...EMPTY_FORM, ...initial });
  const [errors, setErrors]     = useState<Partial<Record<keyof FormState, string>>>({});
  const [saving, setSaving]     = useState(false);
  const [serverError, setServerError] = useState('');
  const [users, setUsers]       = useState<BoardUser[]>([]);
  useEscape(onClose, !saving);

  useEffect(() => {
    api.get<BoardUser[]>('/users?kind=board').then(setUsers).catch(() => {});
  }, []);

  // A plan's length sets the expiry; picking a plan fills it in, and it stays editable.
  function pickPlan(name: string) {
    const matched = plans.find(p => p.name === name);
    setForm(f => ({ ...f, plan: name, planExpiry: matched ? addDays(isoDay(new Date()), matched.duration) : f.planExpiry }));
    setErrors(e => ({ ...e, plan: undefined, planExpiry: undefined }));
  }

  function pickOwner(id: string) {
    const u = users.find(x => x.id === id);
    if (!u) return;
    setForm(f => ({ ...f, ownerId: u.id, owner: u.full_name, ownerPhone: u.phone, ownerTelegram: u.telegram }));
    setErrors(e => ({ ...e, ownerId: undefined }));
  }

  function validate() {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.mc.trim())      e.mc         = 'Required';
    if (!form.name.trim())    e.name       = 'Required';
    if (!form.ownerId.trim()) e.ownerId    = 'Required';
    if (!form.plan)           e.plan       = 'Required';
    if (!form.planExpiry)     e.planExpiry = 'Required';
    return e;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    setServerError('');
    try {
      await onSave(form);
    } catch (err) {
      if (err instanceof ApiException) {
        if (err.code === 'conflict') setServerError('A company with this MC number already exists.');
        else setServerError(err.message || 'Something went wrong.');
      } else {
        setServerError('Unable to save. Please try again.');
      }
      setSaving(false);
    }
  }

  const req = <span style={{ color: '#EF4444', marginLeft: 2 }}>*</span>;
  const errorText = (key: keyof FormState) => errors[key] && <span style={{ fontSize: 11.5, color: '#EF4444', marginTop: 2, display: 'block' }}>{errors[key]}</span>;

  const textField = (label: string, key: 'mc' | 'name', placeholder: string) => (
    <div>
      <label style={fieldLabel}>{label}{req}</label>
      <input
        className="field"
        value={form[key]}
        placeholder={placeholder}
        aria-invalid={!!errors[key]}
        onChange={(e) => { setForm(f => ({ ...f, [key]: e.target.value })); setErrors(er => ({ ...er, [key]: undefined })); }}
      />
      {errorText(key)}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
      <div className="rounded-2xl shadow-2xl w-full"
        style={{ backgroundColor: 'var(--card)', maxWidth: 520, maxHeight: '90vh', display: 'flex', flexDirection: 'column', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)' }}>
            {mode === 'create' ? 'New company' : 'Edit company'}
          </h2>
          <button onClick={onClose} disabled={saving} aria-label="Close" className="w-7 h-7 flex items-center justify-center rounded-lg"
            style={{ color: 'var(--muted-foreground)', backgroundColor: 'transparent', border: 'none', cursor: saving ? 'not-allowed' : 'pointer' }}
            onMouseEnter={(e) => { if (!saving) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--muted)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            {textField('MC number', 'mc', '000000')}
            {textField('Company name', 'name', 'Acme Freight LLC')}
          </div>

          <div>
            <label style={fieldLabel}>Owner{req}</label>
            <SearchSelect
              value={form.ownerId}
              options={users.map(u => ({ value: u.id, label: u.full_name, sublabel: u.login || u.email }))}
              placeholder={form.owner || 'Select a board user'}
              onChange={pickOwner}
            />
            {errorText('ownerId')}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={fieldLabel}>Plan{req}</label>
              <SearchSelect value={form.plan} options={plans.map(p => ({ value: p.name, label: p.name }))} placeholder="Select a plan" onChange={pickPlan} searchable={false} />
              {errorText('plan')}
            </div>
            <div>
              <label style={fieldLabel}>Plan expires{req}</label>
              <DatePicker label="Plan expires" value={form.planExpiry} invalid={!!errors.planExpiry}
                onChange={(day) => { setForm(f => ({ ...f, planExpiry: day })); setErrors(e => ({ ...e, planExpiry: undefined })); }} />
              {errorText('planExpiry')}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={fieldLabel}>ELD provider</label>
              <SearchSelect value={form.eld} options={ELD_OPTIONS.map(o => ({ value: o, label: o }))} placeholder="None" onChange={(v) => setForm(f => ({ ...f, eld: v }))} searchable={false} />
            </div>
            <div>
              <label style={fieldLabel}>Status</label>
              <SearchSelect value={form.status} options={(['Active', 'Pending', 'Suspended'] as Status[]).map(o => ({ value: o, label: o }))} placeholder="Active" onChange={(v) => setForm(f => ({ ...f, status: v as Status }))} searchable={false} />
            </div>
          </div>

          {serverError && (
            <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#B91C1C', fontSize: '0.78rem', padding: '8px 12px' }}>
              {serverError}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={saving}
              className="flex-1 py-2 rounded-lg"
              style={{ fontSize: '0.83rem', fontWeight: 500, color: 'var(--foreground)', backgroundColor: 'var(--card)', border: '1px solid var(--border)', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}
            >
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 rounded-lg flex items-center justify-center gap-2"
              style={{ fontSize: '0.83rem', fontWeight: 600, color: '#fff', backgroundColor: 'var(--primary)', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.8 : 1 }}
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {mode === 'create' ? 'Add company' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CompaniesPage() {
  const { can } = useAuth();
  const canCreate = can('companies.create');
  const canUpdate = can('companies.update');
  const canDelete = can('companies.delete');
  const [rows, setRows]                 = useState<Company[]>([]);
  const [plans, setPlans]               = useState<FetchedPlan[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [loadError, setLoadError]       = useState('');
  const [tab, setTab]           = useState<TabId>('all');
  const [search, setSearch]     = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [eldFilter, setEldFilter]   = useState<string>('all');
  const [period, setPeriod]     = useState<Period>(ALL_TIME);
  const [page, setPage]         = useState(1);

  const [createOpen,   setCreateOpen]   = useState(false);
  const [editTarget,   setEditTarget]   = useState<Company | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const [viewTarget,   setViewTarget]   = useState<Company | null>(null);
  const [deleting,     setDeleting]     = useState(false);
  const [deleteError,  setDeleteError]  = useState<string | null>(null);

  useEffect(() => {
    api.get<FetchedPlan[]>('/plans').then(setPlans).catch(() => {});
  }, []);

  // The whole list comes down once; every filter below works on it in the browser, so
  // changing one never reloads the table.
  const fetchCompanies = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const companies = await api.get<ApiCompany[]>('/companies');
      setRows((companies ?? []).map(toUICompany));
    } catch {
      setLoadError('Failed to load companies. Please refresh.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);
  useEffect(() => { setPage(1); }, [tab, search, planFilter, eldFilter, period]);

  // Everything but the status tab — the tabs and KPI cards count within this set.
  const matched = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(c =>
      (!q || c.name.toLowerCase().includes(q) || c.mc.toLowerCase().includes(q) || c.owner.toLowerCase().includes(q)) &&
      (planFilter === 'all' || c.plan === planFilter) &&
      (eldFilter === 'all' || c.eld === eldFilter) &&
      inPeriod(c.createdAt, period.from, period.to));
  }, [rows, search, planFilter, eldFilter, period]);
  const counts = useMemo(() => ({
    total:     matched.length,
    active:    matched.filter(c => c.status === 'Active').length,
    pending:   matched.filter(c => c.status === 'Pending').length,
    suspended: matched.filter(c => c.status === 'Suspended').length,
  }), [matched]);
  const shown = tab === 'all' ? matched : matched.filter(c => c.status === tab);

  const eldOptions = ['all', ...Array.from(new Set([...ELD_OPTIONS, ...rows.map(c => c.eld).filter(Boolean)]))];

  const totalPages = Math.max(1, Math.ceil(shown.length / PER_PAGE));
  const paginated  = shown.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  function goPage(p: number) { setPage(Math.min(Math.max(1, p), totalPages)); }

  async function handleCreate(f: FormState): Promise<void> {
    const created = await api.post<ApiCompany>('/companies', toApiPayload(f));
    setRows(prev => [toUICompany(created), ...prev]);
    setCreateOpen(false);
  }

  async function handleEdit(f: FormState): Promise<void> {
    if (!editTarget) return;
    const updated = await api.put<ApiCompany>(`/companies/${editTarget.id}`, toApiPayload(f));
    setRows(prev => prev.map(c => c.id === editTarget.id ? toUICompany(updated) : c));
    setEditTarget(null);
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.delete(`/companies/${id}`);
      setRows(prev => prev.filter(c => c.id !== id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof ApiException ? (err.message || 'Failed to delete company.') : 'Unable to connect to the server.');
    } finally {
      setDeleting(false);
    }
  }

  const TH = ({ children }: { children: React.ReactNode }) => (
    <th style={{ textAlign: 'left', padding: '9px 14px', fontSize: '0.68rem', fontWeight: 600, color: 'var(--muted-foreground)', letterSpacing: '0.07em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
      {children}
    </th>
  );

  return (
    <Page>

      {/* Modals */}
      {viewTarget   && <CompanyDetailModal company={viewTarget} plans={plans} onClose={() => setViewTarget(null)} />}
      {createOpen   && <CompanyModal mode="create" plans={plans} initial={EMPTY_FORM} onClose={() => setCreateOpen(false)} onSave={handleCreate} />}
      {editTarget   && (
        <CompanyModal
          mode="edit"
          plans={plans}
          initial={{
            mc: editTarget.mc, name: editTarget.name,
            ownerId: editTarget.ownerId ?? '', owner: editTarget.owner,
            ownerPhone: editTarget.ownerPhone, ownerTelegram: editTarget.ownerTelegram,
            plan: editTarget.plan, planExpiry: editTarget.planExpiry,
            status: editTarget.status, eld: editTarget.eld,
          }}
          onClose={() => setEditTarget(null)}
          onSave={handleEdit}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          title="Delete Company?"
          description={<>You are about to permanently delete <strong style={{ color: 'var(--foreground)' }}>{deleteTarget.name}</strong>. This cannot be undone.</>}
          onConfirm={() => handleDelete(deleteTarget.id)}
          onCancel={() => { setDeleteTarget(null); setDeleteError(null); }}
          loading={deleting}
          error={deleteError ?? undefined}
        />
      )}

      <KpiRow cols={4}>
        <Kpi label="Total"     value={isLoading ? <Dash /> : counts.total}     icon={<Building2 size={17} />} />
        <Kpi label="Active"    value={isLoading ? <Dash /> : counts.active}    icon={<CheckCircle2 size={17} />} />
        <Kpi label="Pending"   value={isLoading ? <Dash /> : counts.pending}   icon={<Clock size={17} />} />
        <Kpi label="Suspended" value={isLoading ? <Dash /> : counts.suspended} icon={<XCircle size={17} />} />
      </KpiRow>

      <Card>
        <Toolbar action={canCreate && <PrimaryButton icon={<Plus size={15} />} onClick={() => setCreateOpen(true)}>New company</PrimaryButton>}>
          <SearchBox value={search} onChange={setSearch} placeholder="Search name, MC or owner" />
          <Dropdown<TabId> label="Status" options={['all', 'Active', 'Pending', 'Suspended']} value={tab} onChange={setTab} getOptionLabel={v => v === 'all' ? 'All statuses' : v} />
          <Dropdown<string> label="Plan" options={['all', ...plans.map(p => p.name)]} value={planFilter} onChange={setPlanFilter} getOptionLabel={v => v === 'all' ? 'All plans' : v} />
          <Dropdown<string> label="ELD" options={eldOptions} value={eldFilter} onChange={setEldFilter} getOptionLabel={v => v === 'all' ? 'All ELDs' : v} />
          <PeriodFilter value={period} onChange={setPeriod} weekStartDay={1} />
        </Toolbar>

        <TableState loading={isLoading} error={loadError || undefined} onRetry={fetchCompanies} what="companies" />

        {/* Table */}
        {!isLoading && !loadError && (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <TH>MC</TH>
                  <TH>Name</TH>
                  <TH>Owner</TH>
                  <TH>Plan</TH>
                  <TH>Plan expires</TH>
                  <TH>Registered</TH>
                  <TH>Status</TH>
                  <TH>ELD</TH>
                  <th className="pin" />
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '56px 0', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>
                      {rows.length === 0 ? 'No companies yet.' : 'No companies match your filters.'}
                    </td>
                  </tr>
                ) : paginated.map((c, i) => {
                  const plan     = planStyle(c.plan, plans);
                  const status   = STATUS_CONFIG[c.status];
                  const eldColor = ELD_COLOR[c.eld] ?? '#94A3B8';
                  return (
                    <tr key={c.id}
                      style={{ borderBottom: i < paginated.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'default' }}
                    >
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', letterSpacing: '0.02em' }}>
                          {c.mc}
                        </span>
                      </td>

                      <td style={{ padding: '11px 14px' }}>
                        <button onClick={() => setViewTarget(c)} style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: c.logoColor + '1A', color: c.logoColor }}>
                            <span style={{ fontSize: '0.6rem', fontWeight: 700 }}>{c.initials}</span>
                          </div>
                          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--foreground)', whiteSpace: 'nowrap' }}>{c.name}</span>
                        </button>
                      </td>

                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: c.ownerColor + '22', color: c.ownerColor }}>
                            <span style={{ fontSize: '0.55rem', fontWeight: 700 }}>{c.ownerInitials}</span>
                          </div>
                          <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--foreground)', whiteSpace: 'nowrap' }}>{c.owner}</span>
                        </div>
                      </td>

                      <td style={{ padding: '11px 14px' }}>
                        <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, backgroundColor: plan.bg, color: plan.color, whiteSpace: 'nowrap' }}>
                          {c.plan}
                        </span>
                      </td>

                      <td style={{ padding: '11px 14px' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{fmtDate(c.planExpiry) || <Dash />}</span>
                      </td>

                      <td style={{ padding: '11px 14px' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{fmtDate(c.createdAt)}</span>
                      </td>

                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: status.dot, flexShrink: 0, display: 'inline-block' }} />
                          <span style={{ fontSize: '0.78rem', fontWeight: 500, color: status.color, whiteSpace: 'nowrap' }}>{c.status}</span>
                        </div>
                      </td>

                      <td style={{ padding: '11px 14px' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: eldColor, whiteSpace: 'nowrap' }}>{c.eld}</span>
                      </td>

                      <td className="pin">
                        <RowActions>
                          {canUpdate && <IconButton title="Edit" onClick={() => setEditTarget(c)}><Pencil size={13} /></IconButton>}
                          {canDelete && <IconButton title="Delete" danger onClick={() => setDeleteTarget(c)}><Trash2 size={13} /></IconButton>}
                          {!canUpdate && !canDelete && <Dash />}
                        </RowActions>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && !loadError && <Pager page={page} totalPages={totalPages} total={shown.length} perPage={PER_PAGE} onPage={goPage} />}
      </Card>
    </Page>
  );
}
