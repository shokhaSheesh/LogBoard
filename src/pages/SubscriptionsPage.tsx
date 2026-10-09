import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CheckCircle2, Plus, Pencil, Trash2, X, Loader2,
  CreditCard, Clock, XCircle, ReceiptText, Users,
} from 'lucide-react';
import { Dropdown } from '@/components/shared/Dropdown';
import { DeleteConfirmModal } from '@/components/shared/DeleteConfirmModal';
import { Kpi } from '@/components/shared/Kpi';
import { NumberField } from '@/components/shared/NumberField';
import { Card, Dash, IconButton, KpiRow, Page, Pager, PrimaryButton, RowActions, SearchBox, TableState, Toolbar } from '@/components/shared/ui';
import { DatePicker } from '@/components/shared/DatePicker';
import { ALL_TIME, PeriodFilter, type Period } from '@/components/shared/PeriodFilter';
import { SearchSelect } from '@/components/shared/SearchSelect';
import { addDays, dayOf, dayToStamp, fmtDateRange, isoDay } from '@/lib/dates';
import { useEscape } from '@/lib/useEscape';
import { useAuth } from '@/context/AuthContext';
import { api, ApiException } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type SubStatus = 'Active' | 'Pending' | 'Suspended';

interface ApiPlan {
  id: string; name: string; color: string; price: number;
  duration: number; max_drivers: number; features: string[]; popular: boolean;
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
  max_drivers: string; features: string[]; popular: boolean;
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

const EMPTY_PLAN_FORM: PlanForm = { name: '', color: COLOR_PRESETS[0], price: '', duration: '', max_drivers: '', features: ['', '', '', ''], popular: false };
const PER_PAGE = 10;

// ── Date helpers ──────────────────────────────────────────────────────────────

// A period ends at the close of its last day.
function isExpired(periodEnd: string): boolean {
  return !!periodEnd && dayOf(periodEnd) < isoDay(new Date());
}

// ── Shared styles ─────────────────────────────────────────────────────────────


const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 4 };

function PlanModal({ mode, initial, onClose, onSave }: {
  mode: 'create' | 'edit'; initial: PlanForm;
  onClose: () => void; onSave: (f: PlanForm) => Promise<void>;
}) {
  const [form, setForm]               = useState<PlanForm>(initial);
  const [saving, setSaving]           = useState(false);
  const [serverError, setServerError] = useState('');
  useEscape(onClose, !saving);


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setServerError('');
    try { await onSave(form); }
    catch (err) {
      if (err instanceof ApiException) setServerError(err.code === 'conflict' ? 'A plan with this name already exists.' : err.message || 'Something went wrong.');
      else setServerError('Unable to save. Please try again.');
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
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Professional" className="field" required />
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
              <span style={{ display: 'inline-block', backgroundColor: form.color + '18', color: form.color, border: `1px solid ${form.color}40`, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', padding: '3px 10px', borderRadius: 99, textTransform: 'uppercase' }}>
                {form.name || 'Plan Name'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
              <div>
                <label style={labelStyle}>Price</label>
                <NumberField label="Price" prefix="$" decimals={0} value={Number(form.price) || undefined} onChange={n => setForm(f => ({ ...f, price: String(n) }))} />
              </div>
              <div>
                <label style={labelStyle}>Duration <span style={{ color: '#EF4444' }}>*</span></label>
                <NumberField label="Duration" suffix="days" decimals={0} placeholder="30" value={Number(form.duration) || undefined} onChange={n => setForm(f => ({ ...f, duration: n ? String(n) : '' }))} />
              </div>
              <div>
                <label style={labelStyle}>Max Drivers</label>
                <NumberField label="Max drivers" decimals={0} placeholder="Unlimited" value={Number(form.max_drivers) || undefined} onChange={n => setForm(f => ({ ...f, max_drivers: String(n) }))} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Features</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {form.features.map((feat, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6 }}>
                    <input value={feat} onChange={e => { const features = [...form.features]; features[i] = e.target.value; setForm(f => ({ ...f, features })); }} placeholder={`Feature ${i + 1}`} className="field" style={{ flex: 1 }} />
                    {form.features.length > 1 && (
                      <button type="button" onClick={() => setForm(f => ({ ...f, features: f.features.filter((_, idx) => idx !== i) }))}
                        style={{ width: 38, height: 38, borderRadius: 8, flexShrink: 0, background: 'none', border: '1px solid var(--border)', cursor: 'pointer', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#FEF2F2')}
                        onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent')}
                      ><X size={13} /></button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setForm(f => ({ ...f, features: [...f.features, ''] }))}
                  style={{ width: '100%', padding: '7px 0', borderRadius: 8, cursor: 'pointer', background: 'none', border: '1px dashed var(--border)', color: 'var(--muted-foreground)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                  onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--muted)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent')}
                ><Plus size={12} /> Add feature</button>
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <div onClick={() => setForm(f => ({ ...f, popular: !f.popular }))}
                style={{ width: 38, height: 22, borderRadius: 99, flexShrink: 0, backgroundColor: form.popular ? '#178A4C' : 'var(--muted)', position: 'relative', transition: 'background 0.2s', cursor: 'pointer' }}>
                <div style={{ position: 'absolute', top: 3, left: form.popular ? 19 : 3, width: 16, height: 16, borderRadius: '50%', backgroundColor: '#fff', transition: 'left 0.2s' }} />
              </div>
              <span style={{ fontSize: '0.82rem', color: 'var(--foreground)', fontWeight: 500 }}>Mark as Most Popular</span>
            </label>

            {serverError && <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#B91C1C', fontSize: '0.78rem', padding: '8px 12px' }}>{serverError}</div>}
          </div>

          <div style={{ display: 'flex', gap: 8, padding: '14px 22px', borderTop: '1px solid var(--border)' }}>
            <button type="button" onClick={onClose} disabled={saving}
              style={{ flex: 1, height: 38, borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)', fontSize: '0.83rem', fontWeight: 500, opacity: saving ? 0.6 : 1 }}
              onMouseEnter={e => { if (!saving) (e.currentTarget.style.backgroundColor = 'var(--muted)'); }}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--background)')}
            >Cancel</button>
            <button type="submit" disabled={saving}
              style={{ flex: 2, height: 38, borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', backgroundColor: 'var(--primary)', border: 'none', color: '#fff', fontSize: '0.83rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: saving ? 0.8 : 1 }}
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
  useEscape(onClose, !saving);


  const companyOpts = companies.map(c => ({ value: c.id, label: c.name, sublabel: `MC ${c.mc}` }));
  const planOpts    = plans.map(p => ({ value: p.id, label: p.name, sublabel: `$${p.price} · ${p.duration} days` }));

  function handlePlanChange(planId: string) {
    const plan = plans.find(p => p.id === planId);
    setForm(f => ({
      ...f, plan_id: planId,
      amount_paid: plan ? String(plan.price) : f.amount_paid,
      period_end:  plan ? addDays(f.period_start || isoDay(new Date()), plan.duration) : f.period_end,
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
    if (!form.company_id) { setServerError('Pick a company.'); return; }
    if (!form.plan_id) { setServerError('Pick a plan.'); return; }
    if (form.period_start && form.period_end && form.period_end < form.period_start) { setServerError('The period ends before it starts.'); return; }
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

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 40 }} onClick={() => { if (!saving) onClose(); }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 50, width: 520, maxHeight: '90vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)' }}>{mode === 'create' ? 'Record payment' : 'Edit payment'}</h2>
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
                <div className="field" style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--muted)', cursor: 'not-allowed', opacity: 0.7 }}>
                  {companies.find(c => c.id === form.company_id)?.name ?? form.company_id}
                </div>
              ) : (
                <SearchSelect value={form.company_id} options={companyOpts} placeholder="Select a company" onChange={v => setForm(f => ({ ...f, company_id: v }))} />
              )}
            </div>

            {/* Plan */}
            <div>
              <label style={labelStyle}>Plan <span style={{ color: '#EF4444' }}>*</span></label>
              <SearchSelect value={form.plan_id} options={planOpts} placeholder="Select a plan" onChange={handlePlanChange} searchable={false} />
            </div>

            {/* Amount + Currency */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 90px', gap: 12 }}>
              <div>
                <label style={labelStyle}>Amount paid</label>
                <NumberField label="Amount paid" prefix="$" value={Number(form.amount_paid) || undefined} onChange={n => setForm(f => ({ ...f, amount_paid: String(n) }))} />
              </div>
              <div>
                <label style={labelStyle}>Currency</label>
                <input value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} placeholder="USD" className="field" />
              </div>
            </div>

            {/* Period */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Period start</label>
                <DatePicker label="Period start" value={form.period_start} onChange={handleStartChange} />
              </div>
              <div>
                <label style={labelStyle}>Period end</label>
                <DatePicker label="Period end" value={form.period_end} min={form.period_start || undefined} onChange={v => setForm(f => ({ ...f, period_end: v }))} />
              </div>
            </div>

            {/* Status */}
            <div>
              <label style={labelStyle}>Status</label>
              <SearchSelect value={form.status} options={['Active', 'Pending', 'Suspended'].map(o => ({ value: o, label: o }))} placeholder="Active" onChange={v => setForm(f => ({ ...f, status: v as SubStatus }))} searchable={false} />
            </div>

            {/* Note */}
            <div>
              <label style={labelStyle}>Note</label>
              <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Invoice or payment reference" className="field" />
            </div>

            {serverError && <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#B91C1C', fontSize: '0.78rem', padding: '8px 12px' }}>{serverError}</div>}
          </div>

          <div style={{ display: 'flex', gap: 8, padding: '14px 22px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            <button type="button" onClick={onClose} disabled={saving}
              style={{ flex: 1, height: 38, borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)', fontSize: '0.83rem', fontWeight: 500, opacity: saving ? 0.6 : 1 }}
              onMouseEnter={e => { if (!saving) (e.currentTarget.style.backgroundColor = 'var(--muted)'); }}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--background)')}
            >Cancel</button>
            <button type="submit" disabled={saving}
              style={{ flex: 2, height: 38, borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', backgroundColor: 'var(--primary)', border: 'none', color: '#fff', fontSize: '0.83rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: saving ? 0.8 : 1 }}
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {mode === 'create' ? 'Record payment' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SubscriptionsPage() {
  const { can } = useAuth();
  const canCreate = can('subscriptions.create');
  const canUpdate = can('subscriptions.update');
  const canDelete = can('subscriptions.delete');
  const [section, setSection] = useState<'plans' | 'ledger'>('plans');

  const [plans, setPlans]         = useState<ApiPlan[]>([]);
  const [companies, setCompanies] = useState<ApiCompanyLight[]>([]);

  const [planLoading, setPlanLoading]   = useState(true);
  const [planError, setPlanError]       = useState('');
  const [planModal, setPlanModal]       = useState<'create' | 'edit' | null>(null);
  const [editPlan, setEditPlan]         = useState<ApiPlan | null>(null);
  const [deletePlan, setDeletePlan]     = useState<ApiPlan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState(false);

  const [subs, setSubs]               = useState<ApiSubscription[]>([]);
  const [subLoading, setSubLoading]   = useState(false);
  const [subError, setSubError]       = useState('');
  const [subPage, setSubPage]         = useState(1);
  const [subSearch, setSubSearch]     = useState('');
  const [period, setPeriod]           = useState<Period>(ALL_TIME);
  const [deleteError, setDeleteError] = useState('');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [planIdFilter, setPlanIdFilter]   = useState('all');
  const [statusFilter, setStatusFilter]   = useState<'all' | SubStatus>('all');
  const [subModal, setSubModal]           = useState<'create' | 'edit' | null>(null);
  const [editSub, setEditSub]             = useState<ApiSubscription | null>(null);
  const [deleteSub, setDeleteSub]         = useState<ApiSubscription | null>(null);
  const [deletingSub, setDeletingSub]     = useState(false);

  useEffect(() => {
    setPlanLoading(true);
    api.get<ApiPlan[]>('/plans')
      .then(data => { setPlans(data); setPlanLoading(false); })
      .catch(() => { setPlanError('Failed to load plans.'); setPlanLoading(false); });
    api.get<ApiCompanyLight[]>('/companies').then(setCompanies).catch(() => {});
  }, []);

  // The whole ledger comes down once; the filters work on it in the browser.
  const fetchSubs = useCallback(async () => {
    setSubLoading(true); setSubError('');
    try { setSubs((await api.get<ApiSubscription[]>('/subscriptions')) ?? []); }
    catch { setSubError('Failed to load payments. Please refresh.'); }
    finally { setSubLoading(false); }
  }, []);

  useEffect(() => { if (section === 'ledger') fetchSubs(); }, [section, fetchSubs]);
  useEffect(() => { setSubPage(1); }, [statusFilter, planIdFilter, companyFilter, subSearch, period]);

  async function handlePlanSave(f: PlanForm): Promise<void> {
    const price       = parseInt(f.price)    || 0;
    const duration    = parseInt(f.duration) || 30;
    const max_drivers = parseInt(f.max_drivers) || 0;
    const features    = f.features.filter(ft => ft.trim() !== '');
    const payload     = { name: f.name, color: f.color, price, duration, max_drivers, features, popular: f.popular };
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
    setDeletingPlan(true); setDeleteError('');
    try { await api.delete(`/plans/${id}`); setPlans(p => p.filter(pl => pl.id !== id)); setDeletePlan(null); }
    catch (err) { setDeleteError(err instanceof ApiException ? (err.message || 'Could not delete the plan.') : 'Unable to connect to the server.'); }
    finally { setDeletingPlan(false); }
  }

  async function handleSubSave(f: SubForm): Promise<void> {
    const payload = {
      company_id:   f.company_id,
      plan_id:      f.plan_id,
      amount_paid:  parseFloat(f.amount_paid) || 0,
      currency:     f.currency || 'USD',
      period_start: f.period_start ? dayToStamp(f.period_start) : undefined,
      period_end:   f.period_end   ? dayToStamp(f.period_end)   : undefined,
      status:       f.status,
      note:         f.note,
    };
    if (subModal === 'create') {
      const created = await api.post<ApiSubscription>('/subscriptions', payload);
      setSubs(s => [created, ...s]);
    } else if (editSub) {
      const { company_id: _cid, ...rest } = payload;
      const updated = await api.put<ApiSubscription>(`/subscriptions/${editSub.id}`, rest);
      setSubs(s => s.map(sub => sub.id === editSub.id ? updated : sub));
    }
    setSubModal(null);
  }

  async function handleSubDelete(id: string) {
    setDeletingSub(true); setDeleteError('');
    try { await api.delete(`/subscriptions/${id}`); setSubs(s => s.filter(sub => sub.id !== id)); setDeleteSub(null); }
    catch (err) { setDeleteError(err instanceof ApiException ? (err.message || 'Could not delete the payment.') : 'Unable to connect to the server.'); }
    finally { setDeletingSub(false); }
  }

  const planInitial: PlanForm = editPlan
    ? { name: editPlan.name, color: editPlan.color, price: String(editPlan.price), duration: String(editPlan.duration), max_drivers: String(editPlan.max_drivers ?? 0), features: [...editPlan.features, ''], popular: editPlan.popular }
    : EMPTY_PLAN_FORM;

  const subInitial: SubForm = editSub
    ? { company_id: editSub.company_id, plan_id: editSub.plan_id, amount_paid: String(editSub.amount_paid), currency: editSub.currency, period_start: dayOf(editSub.period_start), period_end: dayOf(editSub.period_end), status: editSub.status, note: editSub.note ?? '' }
    : { company_id: '', plan_id: '', amount_paid: '', currency: 'USD', period_start: isoDay(new Date()), period_end: '', status: 'Active', note: '' };

  const companyName = (id: string) => companies.find(c => c.id === id)?.name ?? id;
  const planColor   = (planId: string) => plans.find(p => p.id === planId)?.color ?? '#64748B';

  // Everything but the status filter — the KPI cards count within this set. A payment is
  // in a period when the time it covers overlaps it.
  const matched = useMemo(() => {
    const q = subSearch.trim().toLowerCase();
    return subs.filter(sub =>
      (!q || companyName(sub.company_id).toLowerCase().includes(q) || (sub.note ?? '').toLowerCase().includes(q)) &&
      (planIdFilter === 'all' || sub.plan_id === planIdFilter) &&
      (companyFilter === 'all' || sub.company_id === companyFilter) &&
      (!period.from || dayOf(sub.period_end) >= period.from) &&
      (!period.to || dayOf(sub.period_start) <= period.to));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subs, companies, subSearch, planIdFilter, companyFilter, period]);
  const subCounts = {
    total:     matched.length,
    active:    matched.filter(x => x.status === 'Active').length,
    pending:   matched.filter(x => x.status === 'Pending').length,
    suspended: matched.filter(x => x.status === 'Suspended').length,
  };
  const shown         = statusFilter === 'all' ? matched : matched.filter(x => x.status === statusFilter);
  const subTotalPages = Math.max(1, Math.ceil(shown.length / PER_PAGE));
  const subRows       = shown.slice((subPage - 1) * PER_PAGE, subPage * PER_PAGE);

  const companyFilterOpts = ['all', ...companies.map(c => c.id)];
  const planIdFilterOpts  = ['all', ...plans.map(p => p.id)];

  return (
    <Page>

      {planModal && <PlanModal mode={planModal} initial={planInitial} onClose={() => setPlanModal(null)} onSave={handlePlanSave} />}
      {subModal  && <SubscriptionModal mode={subModal} initial={subInitial} companies={companies} plans={plans} onClose={() => setSubModal(null)} onSave={handleSubSave} />}
      {deletePlan && <DeleteConfirmModal title="Delete Plan?" description={<>Permanently delete the <strong style={{ color: 'var(--foreground)' }}>{deletePlan.name}</strong> plan. This cannot be undone.</>} onConfirm={() => handlePlanDelete(deletePlan.id)} onCancel={() => { setDeletePlan(null); setDeleteError(''); }} loading={deletingPlan} error={deleteError || undefined} />}
      {deleteSub  && <DeleteConfirmModal title="Delete payment?" description={<>Remove this payment for <strong style={{ color: 'var(--foreground)' }}>{companyName(deleteSub.company_id)}</strong>. This may affect the company's plan status.</>} onConfirm={() => handleSubDelete(deleteSub.id)} onCancel={() => { setDeleteSub(null); setDeleteError(''); }} loading={deletingSub} error={deleteError || undefined} />}

      {/* Sections on their own row; the action for the open section sits at its right. */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 2 }}>
          {(['plans', 'ledger'] as const).map(s => (
            <button key={s} onClick={() => setSection(s)}
              style={{ padding: '9px 14px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', background: 'none', border: 'none', borderBottom: `2px solid ${section === s ? 'var(--primary)' : 'transparent'}`, marginBottom: -1, color: section === s ? 'var(--primary)' : 'var(--muted-foreground)', transition: 'color 0.15s' }}
            >
              {s === 'plans' ? 'Plans' : 'Payments'}
            </button>
          ))}
        </div>
        {section === 'plans' && canCreate && (
          <div style={{ paddingBottom: 6 }}>
            <PrimaryButton icon={<Plus size={15} />} onClick={() => { setEditPlan(null); setPlanModal('create'); }}>Create plan</PrimaryButton>
          </div>
        )}
      </div>

      {/* ── Plans ─────────────────────────────────────────────────────────── */}
      {section === 'plans' && (
        <>
          {planLoading && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '80px 0', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}><Loader2 size={18} className="animate-spin" /> Loading plans…</div>}
          {!planLoading && planError && <div style={{ textAlign: 'center', padding: '80px 0', color: '#B91C1C', fontSize: '0.85rem' }}>{planError}</div>}
          {!planLoading && !planError && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
              {plans.map(plan => (
                <div key={plan.id} style={{ position: 'relative', backgroundColor: 'var(--card)', border: `1px solid ${plan.popular ? plan.color : 'var(--border)'}`, borderRadius: 12, padding: 18 }}>
                  {plan.popular && <div style={{ position: 'absolute', top: 14, right: 14, backgroundColor: plan.color, color: '#fff', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.04em', padding: '3px 8px', borderRadius: 99 }}>MOST POPULAR</div>}
                  <div style={{ marginBottom: 14 }}>
                    <span style={{ display: 'inline-block', backgroundColor: plan.color + '18', color: plan.color, border: `1px solid ${plan.color}40`, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', padding: '3px 10px', borderRadius: 99, textTransform: 'uppercase', marginBottom: 10 }}>{plan.name}</span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--foreground)', lineHeight: 1 }}>${plan.price}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: 4 }}>{plan.duration} day{plan.duration !== 1 ? 's' : ''} billing cycle</div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 6, backgroundColor: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 8px' }}>
                      <Users size={12} style={{ color: 'var(--muted-foreground)' }} />
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--foreground)' }}>{plan.max_drivers === 0 ? 'Unlimited drivers' : `Up to ${plan.max_drivers} driver${plan.max_drivers !== 1 ? 's' : ''}`}</span>
                    </div>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {plan.features.map(f => (
                      <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.8rem', color: 'var(--foreground)' }}>
                        <CheckCircle2 size={14} color="#22C55E" style={{ flexShrink: 0 }} />{f}
                      </li>
                    ))}
                  </ul>
                  {(canUpdate || canDelete) && (
                  <div style={{ paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
                    {canUpdate && (
                    <button onClick={() => { setEditPlan(plan); setPlanModal('edit'); }}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 0', borderRadius: 8, cursor: 'pointer', backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)', fontSize: '0.78rem', fontWeight: 500 }}
                      onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--muted)')}
                      onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--background)')}
                    ><Pencil size={13} /> Edit</button>
                    )}
                    {canDelete && (
                    <button onClick={() => setDeletePlan(plan)}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 0', borderRadius: 8, cursor: 'pointer', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.78rem', fontWeight: 500 }}
                      onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#FEE2E2')}
                      onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#FEF2F2')}
                    ><Trash2 size={13} /> Delete</button>
                    )}
                  </div>
                  )}
                </div>
              ))}
              {plans.length === 0 && (
                <div style={{ gridColumn: '1 / -1', backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '48px 24px', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>
                  No plans yet.
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Ledger ────────────────────────────────────────────────────────── */}
      {section === 'ledger' && (
        <>
          <KpiRow cols={4}>
            <Kpi label="Total"     value={subCounts.total}     icon={<ReceiptText size={17} />} />
            <Kpi label="Active"    value={subCounts.active}    icon={<CreditCard size={17} />} />
            <Kpi label="Pending"   value={subCounts.pending}   icon={<Clock size={17} />} />
            <Kpi label="Suspended" value={subCounts.suspended} icon={<XCircle size={17} />} />
          </KpiRow>

          <Card>
            <Toolbar action={canCreate && <PrimaryButton icon={<Plus size={15} />} onClick={() => { setEditSub(null); setSubModal('create'); }}>Record payment</PrimaryButton>}>
              <SearchBox value={subSearch} onChange={setSubSearch} placeholder="Search company or note" />
              <Dropdown label="Status" options={['all', 'Active', 'Pending', 'Suspended'] as ('all' | SubStatus)[]} value={statusFilter} onChange={setStatusFilter} getOptionLabel={v => v === 'all' ? 'All Statuses' : v} />
              <Dropdown label="Plan" options={planIdFilterOpts as string[]} value={planIdFilter} onChange={setPlanIdFilter} getOptionLabel={id => id === 'all' ? 'All Plans' : (plans.find(p => p.id === id)?.name ?? id)} />
              <Dropdown label="Company" options={companyFilterOpts as string[]} value={companyFilter} onChange={setCompanyFilter} getOptionLabel={id => id === 'all' ? 'All Companies' : companyName(id)} />
              <PeriodFilter value={period} onChange={setPeriod} weekStartDay={1} future />
            </Toolbar>

            <TableState loading={subLoading} error={subError || undefined} onRetry={fetchSubs} what="payments" />

            {!subLoading && !subError && (
              <div style={{ overflowX: 'auto' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    {['Company', 'Plan', 'Amount', 'Period', 'Status', 'Note'].map(h => <th key={h}>{h}</th>)}
                    <th className="pin" />
                  </tr>
                </thead>
                <tbody>
                  {subRows.map((sub) => {
                    const ss  = SUB_STATUS[sub.status];
                    const col = planColor(sub.plan_id);
                    const exp = isExpired(sub.period_end);
                    return (
                      <tr key={sub.id}>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--foreground)' }}>{companyName(sub.company_id)}</span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ display: 'inline-block', backgroundColor: col + '18', color: col, border: `1px solid ${col}40`, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em', padding: '2px 9px', borderRadius: 99, textTransform: 'uppercase' }}>{sub.plan_name}</span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--foreground)' }}>${sub.amount_paid.toLocaleString('en-US')}</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', marginLeft: 4 }}>{sub.currency}</span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--foreground)' }}>{fmtDateRange(dayOf(sub.period_start), dayOf(sub.period_end)) || <Dash />}</span>
                            {exp && <span style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 99 }}>Expired</span>}
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, backgroundColor: ss.bg, border: `1px solid ${ss.border}`, borderRadius: 99, padding: '3px 10px' }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: ss.dot, flexShrink: 0 }} />
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: ss.color }}>{sub.status}</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px', maxWidth: 160 }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }} title={sub.note}>{sub.note || '—'}</span>
                        </td>
                        <td className="pin">
                          <RowActions>
                            {canUpdate && <IconButton title="Edit" onClick={() => { setEditSub(sub); setSubModal('edit'); }}><Pencil size={13} /></IconButton>}
                            {canDelete && <IconButton title="Delete" danger onClick={() => setDeleteSub(sub)}><Trash2 size={13} /></IconButton>}
                            {!canUpdate && !canDelete && <Dash />}
                          </RowActions>
                        </td>
                      </tr>
                    );
                  })}
                  {shown.length === 0 && (
                    <tr><td colSpan={7} style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>
                      {subs.length === 0 ? 'No payments recorded.' : 'No payments match your filters.'}
                    </td></tr>
                  )}
                </tbody>
              </table>
              </div>
            )}
            {!subLoading && !subError && <Pager page={subPage} totalPages={subTotalPages} total={shown.length} perPage={PER_PAGE} onPage={setSubPage} />}
          </Card>
        </>
      )}
    </Page>
  );
}
