import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2, Plus, Pencil, Trash2, X, Loader2,
  ChevronLeft, ChevronRight, CreditCard, Clock, XCircle, Activity,
} from 'lucide-react';
import { Dropdown } from '@/components/shared/Dropdown';
import { DeleteConfirmModal } from '@/components/shared/DeleteConfirmModal';
import { api, ApiException } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type SubStatus = 'Active' | 'Pending' | 'Suspended';

interface ApiPlan {
  id: string; name: string; color: string; price: number;
  duration: number; features: string[]; popular: boolean;
}

interface ApiCompanyLight { id: string; name: string; mc: string; }

interface ApiSubscription {
  id: string; company_id: string; plan_id: string; plan_name: string;
  amount_paid: number; currency: string;
  period_start: string; period_end: string;
  status: SubStatus; note: string;
  created_at: string; updated_at: string;
}

interface PlanForm {
  name: string; color: string; price: string; duration: string;
  features: string[]; popular: boolean;
}

interface SubForm {
  company_id: string; plan_id: string; amount_paid: string; currency: string;
  period_start: string; period_end: string; status: SubStatus; note: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const COLOR_PRESETS = ['#2563EB', '#7C3AED', '#059669', '#C2410C', '#0891B2', '#DB2777', '#D97706', '#64748B'];

const SUB_STATUS: Record<SubStatus, { dot: string; color: string; bg: string; border: string }> = {
  Active:    { dot: '#22C55E', color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0' },
  Pending:   { dot: '#F59E0B', color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },
  Suspended: { dot: '#EF4444', color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA' },
};

const EMPTY_PLAN_FORM: PlanForm = { name: '', color: COLOR_PRESETS[0], price: '', duration: '', features: ['', '', '', ''], popular: false };
const PER_PAGE = 10;

// ── Helpers ───────────────────────────────────────────────────────────────────

function badgeBg(hex: string) { return hex + '18'; }

function todayYMD(): string { return new Date().toISOString().split('T')[0]; }

function addDays(ymd: string, days: number): string {
  const d = new Date(ymd + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function isExpired(periodEnd: string): boolean {
  return !!periodEnd && new Date(periodEnd) < new Date();
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', height: 38, padding: '0 11px', borderRadius: 8,
  border: '1px solid var(--border)', backgroundColor: 'var(--background)',
  color: 'var(--foreground)', fontSize: '0.83rem', outline: 'none', boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.75rem', fontWeight: 600,
  color: 'var(--muted-foreground)', marginBottom: 5, letterSpacing: '0.03em',
};

// ── PlanModal ─────────────────────────────────────────────────────────────────

function PlanModal({ mode, initial, onClose, onSave }: {
  mode: 'create' | 'edit'; initial: PlanForm;
  onClose: () => void; onSave: (f: PlanForm) => Promise<void>;
}) {
  const [form, setForm]               = useState<PlanForm>(initial);
  const [saving, setSaving]           = useState(false);
  const [serverError, setServerError] = useState('');

  function setFeature(i: number, val: string) {
    setForm(f => { const features = [...f.features]; features[i] = val; return { ...f, features }; });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setServerError('');
    try { await onSave(form); }
    catch (err) {
      if (err instanceof ApiException) {
        setServerError(err.code === 'conflict' ? 'A plan with this name already exists.' : err.message || 'Something went wrong.');
      } else setServerError('Unable to save. Please try again.');
      setSaving(false);
    }
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 40 }} onClick={() => { if (!saving) onClose(); }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 50, width: 480, backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)' }}>{mode === 'create' ? 'Create Plan' : 'Edit Plan'}</h2>
          <button onClick={onClose} disabled={saving} style={{ background: 'none', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', color: 'var(--muted-foreground)', padding: 4, display: 'flex', borderRadius: 6 }}
            onMouseEnter={e => { if (!saving) (e.currentTarget.style.backgroundColor = 'var(--muted)'); }}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          ><X size={17} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
              <div>
                <label style={labelStyle}>Plan Name <span style={{ color: '#EF4444' }}>*</span></label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Professional" style={inputStyle} required />
              </div>
              <div>
                <label style={labelStyle}>Color <span style={{ color: '#EF4444' }}>*</span></label>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', height: 38 }}>
                  {COLOR_PRESETS.map(c => (
                    <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                      style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, backgroundColor: c, border: 'none', cursor: 'pointer', padding: 0, outline: form.color === c ? `3px solid ${c}` : 'none', outlineOffset: 2, boxShadow: form.color === c ? `0 0 0 2px var(--card)` : 'none' }} />
                  ))}
                  <div style={{ position: 'relative', width: 24, height: 24 }}>
                    <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer', border: 'none', padding: 0 }} />
                    <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px dashed var(--border)', background: 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)', pointerEvents: 'none' }} />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)' }}>Preview:</span>
              <span style={{ display: 'inline-block', backgroundColor: badgeBg(form.color), color: form.color, border: `1px solid ${form.color}40`, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', padding: '3px 10px', borderRadius: 99, textTransform: 'uppercase' }}>
                {form.name || 'Plan Name'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Price ($)</label>
                <input type="number" min={0} value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="e.g. 149" style={inputStyle} required />
              </div>
              <div>
                <label style={labelStyle}>Duration (days) <span style={{ color: '#EF4444' }}>*</span></label>
                <input type="number" min={1} value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} placeholder="e.g. 30" style={inputStyle} required />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Features</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {form.features.map((feat, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6 }}>
                    <input value={feat} onChange={e => setFeature(i, e.target.value)} placeholder={`Feature ${i + 1}`} style={{ ...inputStyle, flex: 1 }} />
                    {form.features.length > 1 && (
                      <button type="button" onClick={() => setForm(f => ({ ...f, features: f.features.filter((_, idx) => idx !== i) }))}
                        style={{ width: 38, height: 38, borderRadius: 8, flexShrink: 0, background: 'none', border: '1px solid var(--border)', cursor: 'pointer', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#FEF2F2')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                      ><X size={13} /></button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setForm(f => ({ ...f, features: [...f.features, ''] }))}
                  style={{ width: '100%', padding: '7px 0', borderRadius: 8, cursor: 'pointer', background: 'none', border: '1px dashed var(--border)', color: 'var(--muted-foreground)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                ><Plus size={12} /> Add feature</button>
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <div onClick={() => setForm(f => ({ ...f, popular: !f.popular }))}
                style={{ width: 38, height: 22, borderRadius: 99, flexShrink: 0, backgroundColor: form.popular ? '#2563EB' : 'var(--muted)', position: 'relative', transition: 'background 0.2s', cursor: 'pointer' }}>
                <div style={{ position: 'absolute', top: 3, left: form.popular ? 19 : 3, width: 16, height: 16, borderRadius: '50%', backgroundColor: '#fff', transition: 'left 0.2s' }} />
              </div>
              <span style={{ fontSize: '0.82rem', color: 'var(--foreground)', fontWeight: 500 }}>Mark as Most Popular</span>
            </label>

            {serverError && (
              <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#B91C1C', fontSize: '0.78rem', padding: '8px 12px' }}>{serverError}</div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, padding: '14px 22px', borderTop: '1px solid var(--border)' }}>
            <button type="button" onClick={onClose} disabled={saving}
              style={{ flex: 1, height: 38, borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)', fontSize: '0.83rem', fontWeight: 500, opacity: saving ? 0.6 : 1 }}
              onMouseEnter={e => { if (!saving) (e.currentTarget.style.backgroundColor = 'var(--muted)'); }}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--background)')}
            >Cancel</button>
            <button type="submit" disabled={saving}
              style={{ flex: 2, height: 38, borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', border: 'none', color: '#fff', fontSize: '0.83rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: saving ? 0.8 : 1 }}
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {mode === 'create' ? 'Create Plan' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ── SubscriptionModal ─────────────────────────────────────────────────────────

function SubscriptionModal({ mode, initial, companies, plans, onClose, onSave }: {
  mode: 'create' | 'edit'; initial: SubForm;
  companies: ApiCompanyLight[]; plans: ApiPlan[];
  onClose: () => void; onSave: (f: SubForm) => Promise<void>;
}) {
  const [form, setForm]               = useState<SubForm>(initial);
  const [saving, setSaving]           = useState(false);
  const [serverError, setServerError] = useState('');

  function handlePlanChange(planId: string) {
    const plan = plans.find(p => p.id === planId);
    setForm(f => ({
      ...f, plan_id: planId,
      amount_paid: plan ? String(plan.price) : f.amount_paid,
      period_end:  plan ? addDays(f.period_start || todayYMD(), plan.duration) : f.period_end,
    }));
  }

  function handleStartChange(date: string) {
    const plan = plans.find(p => p.id === form.plan_id);
    setForm(f => ({
      ...f, period_start: date,
      period_end: plan ? addDays(date, plan.duration) : f.period_end,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setServerError('');
    try { await onSave(form); }
    catch (err) {
      if (err instanceof ApiException) {
        if (err.code === 'invalid_company') setServerError('Company not found.');
        else if (err.code === 'invalid_plan') setServerError('Plan not found or deleted.');
        else setServerError(err.message || 'Something went wrong.');
      } else setServerError('Unable to save. Please try again.');
      setSaving(false);
    }
  }

  const sel: React.CSSProperties = { ...inputStyle, paddingRight: 8, cursor: 'pointer', appearance: 'auto' };

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 40 }} onClick={() => { if (!saving) onClose(); }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 50, width: 520, maxHeight: '90vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)' }}>{mode === 'create' ? 'Record Payment' : 'Edit Subscription'}</h2>
          <button onClick={onClose} disabled={saving} style={{ background: 'none', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', color: 'var(--muted-foreground)', padding: 4, display: 'flex', borderRadius: 6 }}
            onMouseEnter={e => { if (!saving) (e.currentTarget.style.backgroundColor = 'var(--muted)'); }}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          ><X size={17} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>

            {/* Company */}
            <div>
              <label style={labelStyle}>Company <span style={{ color: '#EF4444' }}>*</span></label>
              {mode === 'edit' ? (
                <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', backgroundColor: 'var(--muted)', cursor: 'not-allowed', opacity: 0.7 }}>
                  {companies.find(c => c.id === form.company_id)?.name ?? form.company_id}
                </div>
              ) : (
                <select value={form.company_id} onChange={e => setForm(f => ({ ...f, company_id: e.target.value }))} style={sel} required>
                  <option value="">Select a company…</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name} — MC #{c.mc}</option>)}
                </select>
              )}
            </div>

            {/* Plan */}
            <div>
              <label style={labelStyle}>Plan <span style={{ color: '#EF4444' }}>*</span></label>
              <select value={form.plan_id} onChange={e => handlePlanChange(e.target.value)} style={sel} required>
                <option value="">Select a plan…</option>
                {plans.map(p => <option key={p.id} value={p.id}>{p.name} — ${p.price} / {p.duration}d</option>)}
              </select>
            </div>

            {/* Amount + Currency */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 12 }}>
              <div>
                <label style={labelStyle}>Amount Paid ($)</label>
                <input type="number" min={0} step="0.01" value={form.amount_paid} onChange={e => setForm(f => ({ ...f, amount_paid: e.target.value }))} placeholder="0.00" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Currency</label>
                <input value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} placeholder="USD" style={inputStyle} />
              </div>
            </div>

            {/* Period */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Period Start</label>
                <input type="date" value={form.period_start} onChange={e => handleStartChange(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Period End</label>
                <input type="date" value={form.period_end} onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))} style={inputStyle} />
              </div>
            </div>

            {/* Status */}
            <div>
              <label style={labelStyle}>Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as SubStatus }))} style={sel}>
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>

            {/* Note */}
            <div>
              <label style={labelStyle}>Note</label>
              <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="e.g. Invoice #INV-001 or external payment ref" style={inputStyle} />
            </div>

            {serverError && (
              <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#B91C1C', fontSize: '0.78rem', padding: '8px 12px' }}>{serverError}</div>
            )}
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
              {saving && <Loader2 size={14} className="animate-spin" />}
              {mode === 'create' ? 'Record Payment' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SubscriptionsPage() {
  const [section, setSection] = useState<'plans' | 'ledger'>('plans');

  // ── Shared ──
  const [plans, setPlans]         = useState<ApiPlan[]>([]);
  const [companies, setCompanies] = useState<ApiCompanyLight[]>([]);

  // ── Plans tab ──
  const [planLoading, setPlanLoading]   = useState(true);
  const [planError, setPlanError]       = useState('');
  const [planModal, setPlanModal]       = useState<'create' | 'edit' | null>(null);
  const [editPlan, setEditPlan]         = useState<ApiPlan | null>(null);
  const [deletePlan, setDeletePlan]     = useState<ApiPlan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState(false);

  // ── Ledger tab ──
  const [subs, setSubs]               = useState<ApiSubscription[]>([]);
  const [subLoading, setSubLoading]   = useState(false);
  const [subError, setSubError]       = useState('');
  const [subPage, setSubPage]         = useState(1);
  const [subCounts, setSubCounts]     = useState({ total: 0, active: 0, pending: 0, suspended: 0 });
  const [companyFilter, setCompanyFilter]   = useState('all');
  const [planIdFilter, setPlanIdFilter]     = useState('all');
  const [statusFilter, setStatusFilter]     = useState<'all' | SubStatus>('all');
  const [subModal, setSubModal]             = useState<'create' | 'edit' | null>(null);
  const [editSub, setEditSub]               = useState<ApiSubscription | null>(null);
  const [deleteSub, setDeleteSub]           = useState<ApiSubscription | null>(null);
  const [deletingSub, setDeletingSub]       = useState(false);

  // On mount: fetch plans + companies
  useEffect(() => {
    setPlanLoading(true);
    api.get<ApiPlan[]>('/plans')
      .then(data => { setPlans(data); setPlanLoading(false); })
      .catch(() => { setPlanError('Failed to load plans.'); setPlanLoading(false); });
    api.get<ApiCompanyLight[]>('/companies').then(setCompanies).catch(() => {});
  }, []);

  // Fetch subscriptions when on ledger or filters change
  const fetchSubs = useCallback(async () => {
    setSubLoading(true); setSubError('');
    try {
      const qs = new URLSearchParams();
      if (statusFilter !== 'all')  qs.set('status',     statusFilter);
      if (planIdFilter !== 'all')  qs.set('plan_id',    planIdFilter);
      if (companyFilter !== 'all') qs.set('company_id', companyFilter);
      const q = qs.toString();
      const body = await api.getBody<{ data: ApiSubscription[]; stats?: { total?: number; active?: number; pending?: number; suspended?: number } }>(`/subscriptions${q ? `?${q}` : ''}`);
      const data = body.data ?? [];
      setSubs(data);
      setSubCounts({
        total:     body.stats?.total     ?? data.length,
        active:    body.stats?.active    ?? data.filter(s => s.status === 'Active').length,
        pending:   body.stats?.pending   ?? data.filter(s => s.status === 'Pending').length,
        suspended: body.stats?.suspended ?? data.filter(s => s.status === 'Suspended').length,
      });
    } catch {
      setSubError('Failed to load subscriptions. Please refresh.');
    } finally {
      setSubLoading(false);
    }
  }, [statusFilter, planIdFilter, companyFilter]);

  useEffect(() => {
    if (section === 'ledger') { setSubPage(1); fetchSubs(); }
  }, [section, fetchSubs]);

  // ── Plans handlers ──
  async function handlePlanSave(f: PlanForm): Promise<void> {
    const price    = parseInt(f.price)    || 0;
    const duration = parseInt(f.duration) || 30;
    const features = f.features.filter(ft => ft.trim() !== '');
    const payload  = { name: f.name, color: f.color, price, duration, features, popular: f.popular };
    if (planModal === 'create') {
      const created = await api.post<ApiPlan>('/plans', payload);
      setPlans(p => [...p, created]);
    } else if (editPlan) {
      const updated = await api.put<ApiPlan>(`/plans/${editPlan.id}`, payload);
      setPlans(p => p.map(pl => pl.id === editPlan.id ? updated : pl));
    }
    setPlanModal(null);
  }

  async function handlePlanDelete(id: string) {
    setDeletingPlan(true);
    try { await api.delete(`/plans/${id}`); setPlans(p => p.filter(pl => pl.id !== id)); setDeletePlan(null); }
    finally { setDeletingPlan(false); }
  }

  // ── Subscription handlers ──
  async function handleSubSave(f: SubForm): Promise<void> {
    const payload = {
      company_id:  f.company_id,
      plan_id:     f.plan_id,
      amount_paid: parseFloat(f.amount_paid) || 0,
      currency:    f.currency || 'USD',
      period_start: f.period_start ? f.period_start + 'T00:00:00Z' : undefined,
      period_end:   f.period_end   ? f.period_end   + 'T00:00:00Z' : undefined,
      status:      f.status,
      note:        f.note,
    };
    if (subModal === 'create') {
      const created = await api.post<ApiSubscription>('/subscriptions', payload);
      setSubs(s => [created, ...s]);
      setSubCounts(c => ({ ...c, total: c.total + 1, [created.status.toLowerCase()]: (c as Record<string, number>)[created.status.toLowerCase()] + 1 }));
    } else if (editSub) {
      const { company_id: _, ...updatePayload } = payload;
      const updated = await api.put<ApiSubscription>(`/subscriptions/${editSub.id}`, updatePayload);
      setSubs(s => s.map(sub => sub.id === editSub.id ? updated : sub));
    }
    setSubModal(null);
  }

  async function handleSubDelete(id: string) {
    setDeletingSub(true);
    try {
      await api.delete(`/subscriptions/${id}`);
      const removed = subs.find(s => s.id === id);
      setSubs(s => s.filter(sub => sub.id !== id));
      if (removed) setSubCounts(c => ({ ...c, total: Math.max(0, c.total - 1), [removed.status.toLowerCase()]: Math.max(0, (c as Record<string, number>)[removed.status.toLowerCase()] - 1) }));
      setDeleteSub(null);
    } finally { setDeletingSub(false); }
  }

  function openCreateSub() {
    setEditSub(null);
    setSubModal('create');
  }

  function openEditSub(sub: ApiSubscription) {
    setEditSub(sub);
    setSubModal('edit');
  }

  const planInitial: PlanForm = editPlan
    ? { name: editPlan.name, color: editPlan.color, price: String(editPlan.price), duration: String(editPlan.duration), features: [...editPlan.features, ''], popular: editPlan.popular }
    : EMPTY_PLAN_FORM;

  const subInitial: SubForm = editSub
    ? { company_id: editSub.company_id, plan_id: editSub.plan_id, amount_paid: String(editSub.amount_paid), currency: editSub.currency, period_start: editSub.period_start?.split('T')[0] ?? '', period_end: editSub.period_end?.split('T')[0] ?? '', status: editSub.status, note: editSub.note ?? '' }
    : { company_id: '', plan_id: '', amount_paid: '', currency: 'USD', period_start: todayYMD(), period_end: '', status: 'Active', note: '' };

  // Ledger pagination
  const subTotalPages = Math.max(1, Math.ceil(subs.length / PER_PAGE));
  const subRows = subs.slice((subPage - 1) * PER_PAGE, subPage * PER_PAGE);

  // Company name lookup
  const companyName = (id: string) => companies.find(c => c.id === id)?.name ?? id;

  // Plan color lookup
  const planColor = (planId: string) => plans.find(p => p.id === planId)?.color ?? '#64748B';

  // Filter options
  const companyFilterOpts = ['all', ...companies.map(c => c.id)] as string[];
  const planIdFilterOpts  = ['all', ...plans.map(p => p.id)] as string[];

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: 'var(--background)' }}>

      {/* Modals */}
      {planModal && (
        <PlanModal mode={planModal} initial={planInitial} onClose={() => setPlanModal(null)} onSave={handlePlanSave} />
      )}
      {subModal && (
        <SubscriptionModal mode={subModal} initial={subInitial} companies={companies} plans={plans} onClose={() => setSubModal(null)} onSave={handleSubSave} />
      )}
      {deletePlan && (
        <DeleteConfirmModal title="Delete Plan?" description={<>Permanently delete the <strong style={{ color: 'var(--foreground)' }}>{deletePlan.name}</strong> plan. This cannot be undone.</>} onConfirm={() => handlePlanDelete(deletePlan.id)} onCancel={() => setDeletePlan(null)} loading={deletingPlan} />
      )}
      {deleteSub && (
        <DeleteConfirmModal title="Delete Subscription?" description={<>Remove this subscription record for <strong style={{ color: 'var(--foreground)' }}>{companyName(deleteSub.company_id)}</strong>. This may affect the company's plan status.</>} onConfirm={() => handleSubDelete(deleteSub.id)} onCancel={() => setDeleteSub(null)} loading={deletingSub} />
      )}

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ color: 'var(--foreground)', fontSize: '1.3rem', fontWeight: 700, lineHeight: 1.2 }}>Subscriptions</h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.83rem', marginTop: 3 }}>
            {section === 'plans' ? 'Manage subscription plan tiers' : 'Payment ledger — record and track carrier subscriptions'}
          </p>
        </div>
        {section === 'plans' ? (
          <button onClick={() => { setEditPlan(null); setPlanModal('create'); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, cursor: 'pointer', background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', border: 'none', color: '#fff', fontSize: '0.82rem', fontWeight: 600 }}>
            <Plus size={15} /> Create Plan
          </button>
        ) : (
          <button onClick={openCreateSub}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, cursor: 'pointer', background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', border: 'none', color: '#fff', fontSize: '0.82rem', fontWeight: 600 }}>
            <Plus size={15} /> Record Payment
          </button>
        )}
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 24, borderBottom: '2px solid var(--border)' }}>
        {(['plans', 'ledger'] as const).map(s => (
          <button key={s} onClick={() => setSection(s)}
            style={{ padding: '8px 18px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', background: 'none', border: 'none', borderBottom: `2px solid ${section === s ? '#2563EB' : 'transparent'}`, marginBottom: -2, color: section === s ? '#2563EB' : 'var(--muted-foreground)', transition: 'color 0.15s', borderRadius: 0 }}
          >
            {s === 'plans' ? 'Plans' : 'Payment Ledger'}
          </button>
        ))}
      </div>

      {/* ── Plans section ─────────────────────────────────────────────────── */}
      {section === 'plans' && (
        <>
          {planLoading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '80px 0', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>
              <Loader2 size={18} className="animate-spin" /> Loading plans…
            </div>
          )}
          {!planLoading && planError && (
            <div style={{ textAlign: 'center', padding: '80px 0', color: '#B91C1C', fontSize: '0.85rem' }}>{planError}</div>
          )}
          {!planLoading && !planError && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
              {plans.map(plan => (
                <div key={plan.id}
                  style={{ position: 'relative', backgroundColor: 'var(--card)', border: `1px solid ${plan.popular ? plan.color : 'var(--border)'}`, borderRadius: 14, padding: '22px 22px 20px', boxShadow: plan.popular ? `0 4px 20px ${plan.color}15` : undefined }}>
                  {plan.popular && (
                    <div style={{ position: 'absolute', top: 14, right: 14, backgroundColor: plan.color, color: '#fff', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.04em', padding: '3px 8px', borderRadius: 99 }}>MOST POPULAR</div>
                  )}
                  <div style={{ marginBottom: 14 }}>
                    <span style={{ display: 'inline-block', backgroundColor: badgeBg(plan.color), color: plan.color, border: `1px solid ${plan.color}40`, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', padding: '3px 10px', borderRadius: 99, textTransform: 'uppercase', marginBottom: 10 }}>{plan.name}</span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--foreground)', lineHeight: 1 }}>${plan.price}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: 4 }}>{plan.duration} day{plan.duration !== 1 ? 's' : ''} billing cycle</div>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {plan.features.map(f => (
                      <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.8rem', color: 'var(--foreground)' }}>
                        <CheckCircle2 size={14} color="#22C55E" style={{ flexShrink: 0 }} />{f}
                      </li>
                    ))}
                  </ul>
                  <div style={{ paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
                    <button onClick={() => { setEditPlan(plan); setPlanModal('edit'); }}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 0', borderRadius: 8, cursor: 'pointer', backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)', fontSize: '0.78rem', fontWeight: 500 }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--background)')}
                    ><Pencil size={13} /> Edit</button>
                    <button onClick={() => setDeletePlan(plan)}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 0', borderRadius: 8, cursor: 'pointer', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.78rem', fontWeight: 500 }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#FEE2E2')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FEF2F2')}
                    ><Trash2 size={13} /> Delete</button>
                  </div>
                </div>
              ))}
              {plans.length === 0 && (
                <div style={{ gridColumn: '1 / -1', backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '48px 24px', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>
                  No plans yet. Click "Create Plan" to add one.
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Ledger section ────────────────────────────────────────────────── */}
      {section === 'ledger' && (
        <>
          {/* KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
            {[
              { label: 'Total',     value: subCounts.total,     icon: <Activity size={18} />,   iconBg: '#EFF6FF', iconColor: '#2563EB' },
              { label: 'Active',    value: subCounts.active,    icon: <CreditCard size={18} />, iconBg: '#F0FDF4', iconColor: '#16A34A' },
              { label: 'Pending',   value: subCounts.pending,   icon: <Clock size={18} />,      iconBg: '#FFFBEB', iconColor: '#D97706' },
              { label: 'Suspended', value: subCounts.suspended, icon: <XCircle size={18} />,    iconBg: '#FEF2F2', iconColor: '#DC2626' },
            ].map(card => (
              <div key={card.label} style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: card.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: card.iconColor }}>{card.icon}</div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--foreground)', lineHeight: 1 }}>{card.value}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: 3 }}>{card.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Filter bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Dropdown
              label="Status"
              options={['all', 'Active', 'Pending', 'Suspended'] as ('all' | SubStatus)[]}
              value={statusFilter}
              onChange={v => { setStatusFilter(v); setSubPage(1); }}
              getOptionLabel={v => v === 'all' ? 'All Statuses' : v}
            />
            <Dropdown
              label="Plan"
              options={planIdFilterOpts as string[]}
              value={planIdFilter}
              onChange={v => { setPlanIdFilter(v); setSubPage(1); }}
              getOptionLabel={id => id === 'all' ? 'All Plans' : (plans.find(p => p.id === id)?.name ?? id)}
            />
            <Dropdown
              label="Company"
              options={companyFilterOpts as string[]}
              value={companyFilter}
              onChange={v => { setCompanyFilter(v); setSubPage(1); }}
              getOptionLabel={id => id === 'all' ? 'All Companies' : companyName(id)}
            />
          </div>

          {/* Loading */}
          {subLoading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '80px 0', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>
              <Loader2 size={18} className="animate-spin" /> Loading subscriptions…
            </div>
          )}

          {/* Error */}
          {!subLoading && subError && (
            <div style={{ textAlign: 'center', padding: '80px 0', color: '#B91C1C', fontSize: '0.85rem' }}>{subError}</div>
          )}

          {/* Table */}
          {!subLoading && !subError && (
            <div style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--muted)' }}>
                    {['Company', 'Plan', 'Amount', 'Period', 'Status', 'Note', ''].map(h => (
                      <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted-foreground)', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {subRows.map((sub, i) => {
                    const ss  = SUB_STATUS[sub.status];
                    const col = planColor(sub.plan_id);
                    const exp = isExpired(sub.period_end);
                    return (
                      <tr key={sub.id}
                        style={{ borderBottom: i < subRows.length - 1 ? '1px solid var(--border)' : 'none', backgroundColor: 'var(--card)' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--card)')}
                      >
                        {/* Company */}
                        <td style={{ padding: '13px 16px' }}>
                          <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--foreground)' }}>{companyName(sub.company_id)}</span>
                        </td>

                        {/* Plan */}
                        <td style={{ padding: '13px 16px' }}>
                          <span style={{ display: 'inline-block', backgroundColor: badgeBg(col), color: col, border: `1px solid ${col}40`, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em', padding: '2px 9px', borderRadius: 99, textTransform: 'uppercase' }}>
                            {sub.plan_name}
                          </span>
                        </td>

                        {/* Amount */}
                        <td style={{ padding: '13px 16px' }}>
                          <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--foreground)' }}>${sub.amount_paid.toLocaleString()}</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', marginLeft: 4 }}>{sub.currency}</span>
                        </td>

                        {/* Period */}
                        <td style={{ padding: '13px 16px' }}>
                          <div style={{ fontSize: '0.78rem', color: 'var(--foreground)' }}>{fmtDate(sub.period_start)} → {fmtDate(sub.period_end)}</div>
                          {exp && (
                            <span style={{ display: 'inline-block', marginTop: 3, backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.63rem', fontWeight: 700, padding: '1px 6px', borderRadius: 4, letterSpacing: '0.03em' }}>EXPIRED</span>
                          )}
                        </td>

                        {/* Status */}
                        <td style={{ padding: '13px 16px' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, backgroundColor: ss.bg, border: `1px solid ${ss.border}`, borderRadius: 99, padding: '3px 10px' }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: ss.dot, flexShrink: 0 }} />
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: ss.color }}>{sub.status}</span>
                          </div>
                        </td>

                        {/* Note */}
                        <td style={{ padding: '13px 16px', maxWidth: 160 }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }} title={sub.note}>{sub.note || '—'}</span>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '13px 16px' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button onClick={() => openEditSub(sub)}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, border: '1px solid var(--border)', backgroundColor: 'var(--background)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500, color: 'var(--foreground)', whiteSpace: 'nowrap' }}
                              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
                              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--background)')}
                            ><Pencil size={12} /> Edit</button>
                            <button onClick={() => setDeleteSub(sub)}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, border: '1px solid #FECACA', backgroundColor: '#FEF2F2', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500, color: '#DC2626', whiteSpace: 'nowrap' }}
                              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#FEE2E2')}
                              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FEF2F2')}
                            ><Trash2 size={12} /> Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {subs.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>
                        No subscriptions recorded. Click "Record Payment" to add one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              {subTotalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)' }}>
                    Showing {(subPage - 1) * PER_PAGE + 1}–{Math.min(subPage * PER_PAGE, subs.length)} of {subs.length}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setSubPage(p => Math.max(1, p - 1))} disabled={subPage === 1}
                      style={{ display: 'flex', alignItems: 'center', padding: '5px 10px', borderRadius: 7, border: '1px solid var(--border)', backgroundColor: 'var(--background)', cursor: subPage === 1 ? 'not-allowed' : 'pointer', color: 'var(--foreground)', opacity: subPage === 1 ? 0.4 : 1, fontSize: '0.78rem', gap: 4 }}>
                      <ChevronLeft size={13} /> Prev
                    </button>
                    <button onClick={() => setSubPage(p => Math.min(subTotalPages, p + 1))} disabled={subPage === subTotalPages}
                      style={{ display: 'flex', alignItems: 'center', padding: '5px 10px', borderRadius: 7, border: '1px solid var(--border)', backgroundColor: 'var(--background)', cursor: subPage === subTotalPages ? 'not-allowed' : 'pointer', color: 'var(--foreground)', opacity: subPage === subTotalPages ? 0.4 : 1, fontSize: '0.78rem', gap: 4 }}>
                      Next <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
