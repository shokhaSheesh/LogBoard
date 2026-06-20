import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, Plus, Pencil, Trash2, X, Loader2 } from 'lucide-react';
import { api, ApiException } from '@/lib/api';
import { DeleteConfirmModal } from '@/components/shared/DeleteConfirmModal';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Plan {
  id: string;
  name: string;
  color: string;
  price: number;
  duration: number;
  features: string[];
  popular: boolean;
}

interface FormState {
  name: string;
  color: string;
  price: string;
  duration: string;
  features: string[];
  popular: boolean;
}

// ── Config ────────────────────────────────────────────────────────────────────

const COLOR_PRESETS = [
  '#2563EB', '#7C3AED', '#059669', '#C2410C',
  '#0891B2', '#DB2777', '#D97706', '#64748B',
];

function badgeBg(hex: string) {
  return hex + '18';
}

const EMPTY_FORM: FormState = {
  name: '',
  color: COLOR_PRESETS[0],
  price: '',
  duration: '',
  features: ['', '', '', ''],
  popular: false,
};

// ── PlanModal ─────────────────────────────────────────────────────────────────

function PlanModal({
  mode,
  initial,
  onClose,
  onSave,
}: {
  mode: 'create' | 'edit';
  initial: FormState;
  onClose: () => void;
  onSave: (f: FormState) => Promise<void>;
}) {
  const [form, setForm]               = useState<FormState>(initial);
  const [saving, setSaving]           = useState(false);
  const [serverError, setServerError] = useState('');

  function setFeature(i: number, val: string) {
    setForm(f => {
      const features = [...f.features];
      features[i] = val;
      return { ...f, features };
    });
  }

  function addFeature() {
    setForm(f => ({ ...f, features: [...f.features, ''] }));
  }

  function removeFeature(i: number) {
    setForm(f => ({ ...f, features: f.features.filter((_, idx) => idx !== i) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setServerError('');
    try {
      await onSave(form);
    } catch (err) {
      if (err instanceof ApiException) {
        if (err.code === 'conflict') setServerError('A plan with this name already exists.');
        else setServerError(err.message || 'Something went wrong.');
      } else {
        setServerError('Unable to save. Please try again.');
      }
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 38, padding: '0 11px', borderRadius: 8,
    border: '1px solid var(--border)', backgroundColor: 'var(--background)',
    color: 'var(--foreground)', fontSize: '0.83rem', outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.75rem', fontWeight: 600,
    color: 'var(--muted-foreground)', marginBottom: 5, letterSpacing: '0.03em',
  };

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 40 }}
        onClick={() => { if (!saving) onClose(); }}
      />
      <div
        style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 50, width: 480,
          backgroundColor: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)' }}>
            {mode === 'create' ? 'Create Plan' : 'Edit Plan'}
          </h2>
          <button
            onClick={onClose}
            disabled={saving}
            style={{ background: 'none', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', color: 'var(--muted-foreground)', padding: 4, display: 'flex', borderRadius: 6 }}
            onMouseEnter={e => { if (!saving) (e.currentTarget.style.backgroundColor = 'var(--muted)'); }}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <X size={17} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Name + Color */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
              <div>
                <label style={labelStyle}>Plan Name</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Professional"
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Color</label>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', height: 38 }}>
                  {COLOR_PRESETS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, color: c }))}
                      style={{
                        width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                        backgroundColor: c, border: 'none', cursor: 'pointer', padding: 0,
                        outline: form.color === c ? `3px solid ${c}` : 'none',
                        outlineOffset: 2,
                        boxShadow: form.color === c ? `0 0 0 2px var(--card)` : 'none',
                      }}
                    />
                  ))}
                  <div style={{ position: 'relative', width: 24, height: 24 }}>
                    <input
                      type="color"
                      value={form.color}
                      onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                      style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer', border: 'none', padding: 0 }}
                    />
                    <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px dashed var(--border)', background: `conic-gradient(red,yellow,lime,cyan,blue,magenta,red)`, pointerEvents: 'none' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Preview badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)' }}>Preview:</span>
              <span style={{ display: 'inline-block', backgroundColor: badgeBg(form.color), color: form.color, border: `1px solid ${form.color}40`, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', padding: '3px 10px', borderRadius: 99, textTransform: 'uppercase' }}>
                {form.name || 'Plan Name'}
              </span>
            </div>

            {/* Price + Duration */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Price ($)</label>
                <input type="number" min={0} value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="e.g. 149" style={inputStyle} required />
              </div>
              <div>
                <label style={labelStyle}>Duration (days)</label>
                <input type="number" min={1} value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} placeholder="e.g. 30" style={inputStyle} required />
              </div>
            </div>

            {/* Features */}
            <div>
              <label style={labelStyle}>Features</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {form.features.map((feat, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6 }}>
                    <input value={feat} onChange={e => setFeature(i, e.target.value)} placeholder={`Feature ${i + 1}`} style={{ ...inputStyle, flex: 1 }} />
                    {form.features.length > 1 && (
                      <button type="button" onClick={() => removeFeature(i)}
                        style={{ width: 38, height: 38, borderRadius: 8, flexShrink: 0, background: 'none', border: '1px solid var(--border)', cursor: 'pointer', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#FEF2F2')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addFeature}
                  style={{ width: '100%', padding: '7px 0', borderRadius: 8, cursor: 'pointer', background: 'none', border: '1px dashed var(--border)', color: 'var(--muted-foreground)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Plus size={12} /> Add feature
                </button>
              </div>
            </div>

            {/* Popular toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <div
                onClick={() => setForm(f => ({ ...f, popular: !f.popular }))}
                style={{ width: 38, height: 22, borderRadius: 99, flexShrink: 0, backgroundColor: form.popular ? '#2563EB' : 'var(--muted)', position: 'relative', transition: 'background 0.2s', cursor: 'pointer' }}
              >
                <div style={{ position: 'absolute', top: 3, left: form.popular ? 19 : 3, width: 16, height: 16, borderRadius: '50%', backgroundColor: '#fff', transition: 'left 0.2s' }} />
              </div>
              <span style={{ fontSize: '0.82rem', color: 'var(--foreground)', fontWeight: 500 }}>
                Mark as Most Popular
              </span>
            </label>

            {/* Server error */}
            {serverError && (
              <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#B91C1C', fontSize: '0.78rem', padding: '8px 12px' }}>
                {serverError}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', gap: 8, padding: '14px 22px', borderTop: '1px solid var(--border)' }}>
            <button type="button" onClick={onClose} disabled={saving}
              style={{ flex: 1, height: 38, borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)', fontSize: '0.83rem', fontWeight: 500, opacity: saving ? 0.6 : 1 }}
              onMouseEnter={e => { if (!saving) (e.currentTarget.style.backgroundColor = 'var(--muted)'); }}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--background)')}
            >
              Cancel
            </button>
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SubscriptionsPage() {
  const [plans, setPlans]           = useState<Plan[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [loadError, setLoadError]   = useState('');
  const [modalMode, setModalMode]   = useState<'create' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<Plan | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);
  const [deleting, setDeleting]     = useState(false);

  const fetchPlans = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const data = await api.get<Plan[]>('/plans');
      setPlans(data);
    } catch {
      setLoadError('Failed to load plans. Please refresh.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  function openCreate() {
    setEditTarget(null);
    setModalMode('create');
  }

  function openEdit(plan: Plan) {
    setEditTarget(plan);
    setModalMode('edit');
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      await api.delete(`/plans/${id}`);
      setPlans(p => p.filter(plan => plan.id !== id));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  async function handleSave(f: FormState): Promise<void> {
    const price    = parseInt(f.price)    || 0;
    const duration = parseInt(f.duration) || 30;
    const features = f.features.filter(ft => ft.trim() !== '');
    const payload  = { name: f.name, color: f.color, price, duration, features, popular: f.popular };

    if (modalMode === 'create') {
      const created = await api.post<Plan>('/plans', payload);
      setPlans(p => [...p, created]);
    } else if (editTarget) {
      const updated = await api.put<Plan>(`/plans/${editTarget.id}`, payload);
      setPlans(p => p.map(plan => plan.id === editTarget.id ? updated : plan));
    }
    setModalMode(null);
  }

  const initialForm: FormState = editTarget
    ? { name: editTarget.name, color: editTarget.color, price: String(editTarget.price), duration: String(editTarget.duration), features: [...editTarget.features, ''], popular: editTarget.popular }
    : EMPTY_FORM;

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: 'var(--background)' }}>

      {/* Delete confirm */}
      {deleteTarget && (
        <DeleteConfirmModal
          title="Delete Plan?"
          description={<>You are about to permanently delete the <strong style={{ color: 'var(--foreground)' }}>{deleteTarget.name}</strong> plan. This cannot be undone.</>}
          onConfirm={() => handleDelete(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: 'var(--foreground)', fontSize: '1.3rem', fontWeight: 700, lineHeight: 1.2 }}>
            Subscriptions
          </h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.83rem', marginTop: 3 }}>
            Subscription plan management
          </p>
        </div>
        <button
          onClick={openCreate}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, cursor: 'pointer', background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', border: 'none', color: '#fff', fontSize: '0.82rem', fontWeight: 600 }}
        >
          <Plus size={15} />
          Create Plan
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '80px 0', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>
          <Loader2 size={18} className="animate-spin" /> Loading plans…
        </div>
      )}

      {/* Error */}
      {!isLoading && loadError && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#B91C1C', fontSize: '0.85rem' }}>
          {loadError}
        </div>
      )}

      {/* Plan cards */}
      {!isLoading && !loadError && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {plans.map(plan => (
            <div
              key={plan.id}
              style={{
                position: 'relative',
                backgroundColor: 'var(--card)',
                border: `1px solid ${plan.popular ? plan.color : 'var(--border)'}`,
                borderRadius: 14,
                padding: '22px 22px 20px',
                boxShadow: plan.popular ? `0 4px 20px ${plan.color}15` : undefined,
              }}
            >
              {plan.popular && (
                <div style={{ position: 'absolute', top: 14, right: 14, backgroundColor: plan.color, color: '#fff', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.04em', padding: '3px 8px', borderRadius: 99 }}>
                  MOST POPULAR
                </div>
              )}

              <div style={{ marginBottom: 14 }}>
                <span style={{ display: 'inline-block', backgroundColor: badgeBg(plan.color), color: plan.color, border: `1px solid ${plan.color}40`, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', padding: '3px 10px', borderRadius: 99, textTransform: 'uppercase', marginBottom: 10 }}>
                  {plan.name}
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--foreground)', lineHeight: 1 }}>
                    ${plan.price}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: 4 }}>
                  {plan.duration} day{plan.duration !== 1 ? 's' : ''} duration
                </div>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.8rem', color: 'var(--foreground)' }}>
                    <CheckCircle2 size={14} color="#22C55E" style={{ flexShrink: 0 }} />
                    {f}
                  </li>
                ))}
              </ul>

              <div style={{ paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
                <button onClick={() => openEdit(plan)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 0', borderRadius: 8, cursor: 'pointer', backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)', fontSize: '0.78rem', fontWeight: 500 }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--background)')}
                >
                  <Pencil size={13} /> Edit
                </button>
                <button onClick={() => setDeleteTarget(plan)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 0', borderRadius: 8, cursor: 'pointer', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.78rem', fontWeight: 500 }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#FEE2E2')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FEF2F2')}
                >
                  <Trash2 size={13} /> Delete
                </button>
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

      {modalMode && (
        <PlanModal
          mode={modalMode}
          initial={initialForm}
          onClose={() => setModalMode(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
