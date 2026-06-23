import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, Loader2, Layers } from 'lucide-react';
import { api, ApiException } from '@/lib/api';
import { DeleteConfirmModal } from '@/components/shared/DeleteConfirmModal';
import { FilterTabs, type TabItem } from '@/components/shared/FilterTabs';

// ── Types ─────────────────────────────────────────────────────────────────────

type Scope = 'platform' | 'company';

interface ApiModule {
  id: string;
  scope: Scope;
  key: string;
  label: string;
  actions: string[];
  system: boolean;
}

interface FormState {
  scope: Scope;
  key: string;
  label: string;
  actions: string[];
}

// ── Config ────────────────────────────────────────────────────────────────────

const ACTION_OPTIONS = ['read', 'create', 'update', 'delete'];

const SCOPE_STYLE: Record<Scope, { bg: string; color: string; border: string }> = {
  platform: { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
  company:  { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' },
};

const EMPTY_FORM: FormState = {
  scope: 'platform',
  key: '',
  label: '',
  actions: ['read', 'create', 'update', 'delete'],
};

// ── Module Modal ──────────────────────────────────────────────────────────────

function ModuleModal({ mode, initial, onClose, onSave }: {
  mode: 'create' | 'edit';
  initial: FormState;
  onClose: () => void;
  onSave: (f: FormState) => Promise<void>;
}) {
  const [form, setForm]               = useState<FormState>(initial);
  const [saving, setSaving]           = useState(false);
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

  function toggleAction(a: string) {
    setForm(f => ({
      ...f,
      actions: f.actions.includes(a)
        ? f.actions.filter(x => x !== a)
        : [...f.actions, a],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.actions.length === 0) {
      setServerError('Select at least one action.');
      return;
    }
    setSaving(true);
    setServerError('');
    try {
      await onSave(form);
    } catch (err) {
      if (err instanceof ApiException) {
        if (err.code === 'conflict')        setServerError('A module with this key already exists in that scope.');
        else if (err.code === 'invalid_key')    setServerError('Module key is invalid.');
        else if (err.code === 'invalid_actions') setServerError('One or more actions are invalid.');
        else setServerError(err.message || 'Something went wrong.');
      } else {
        setServerError('Unable to connect to the server.');
      }
      setSaving(false);
    }
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 40 }}
        onClick={saving ? undefined : onClose} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 50, width: 460, backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)' }}>
            {mode === 'create' ? 'Create Module' : 'Edit Module'}
          </h2>
          <button onClick={onClose} disabled={saving}
            style={{ background: 'none', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', color: 'var(--muted-foreground)', padding: 4, display: 'flex', borderRadius: 6, opacity: saving ? 0.5 : 1 }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.backgroundColor = 'var(--muted)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
            <X size={17} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Scope */}
            <div>
              <label style={lbl}>Scope</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['platform', 'company'] as Scope[]).map(s => {
                  const st = SCOPE_STYLE[s];
                  const active = form.scope === s;
                  return (
                    <button key={s} type="button"
                      onClick={() => setForm(f => ({ ...f, scope: s }))}
                      disabled={saving || mode === 'edit'}
                      style={{ flex: 1, padding: '8px 0', borderRadius: 8, cursor: saving || mode === 'edit' ? 'not-allowed' : 'pointer', fontSize: '0.82rem', fontWeight: 600, backgroundColor: active ? st.bg : 'var(--background)', border: `1px solid ${active ? st.color : 'var(--border)'}`, color: active ? st.color : 'var(--muted-foreground)', opacity: mode === 'edit' ? 0.6 : 1 }}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  );
                })}
              </div>
              {mode === 'edit' && <p style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', marginTop: 5 }}>Scope cannot be changed after creation.</p>}
            </div>

            {/* Key + Label */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>Key <span style={{ color: '#EF4444' }}>*</span></label>
                <input value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))}
                  placeholder="e.g. invoices" style={inp} required disabled={saving || mode === 'edit'} />
                {mode === 'edit' && <p style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', marginTop: 4 }}>Key cannot be changed.</p>}
              </div>
              <div>
                <label style={lbl}>Label <span style={{ color: '#EF4444' }}>*</span></label>
                <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  placeholder="e.g. Invoices" style={inp} required disabled={saving} />
              </div>
            </div>

            {/* Actions */}
            <div>
              <label style={lbl}>Actions <span style={{ color: '#EF4444' }}>*</span></label>
              <div style={{ display: 'flex', gap: 8 }}>
                {ACTION_OPTIONS.map(a => {
                  const active = form.actions.includes(a);
                  return (
                    <button key={a} type="button" onClick={() => toggleAction(a)} disabled={saving}
                      style={{ flex: 1, padding: '8px 0', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.78rem', fontWeight: 600, backgroundColor: active ? '#ECFDF5' : 'var(--background)', border: `1px solid ${active ? '#059669' : 'var(--border)'}`, color: active ? '#059669' : 'var(--muted-foreground)' }}>
                      {a.charAt(0).toUpperCase() + a.slice(1)}
                    </button>
                  );
                })}
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', marginTop: 5 }}>
                Permission keys will be: {form.actions.length > 0 ? form.actions.map(a => `${form.key || '<key>'}.${a}`).join(', ') : '—'}
              </p>
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
              {saving ? 'Saving…' : mode === 'create' ? 'Create Module' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type TabId = 'all' | Scope;

const TABS: TabItem<TabId>[] = [
  { id: 'all',      label: 'All' },
  { id: 'platform', label: 'Platform' },
  { id: 'company',  label: 'Company' },
];

export default function PermissionModulesPage() {
  const [modules, setModules]         = useState<ApiModule[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [loadError, setLoadError]     = useState<string | null>(null);
  const [tab, setTab]                 = useState<TabId>('all');
  const [createOpen, setCreateOpen]   = useState(false);
  const [editTarget, setEditTarget]   = useState<ApiModule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiModule | null>(null);
  const [deleting, setDeleting]       = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchModules = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const raw = await api.get<{ platform: ApiModule[]; company: ApiModule[] }>('/catalog');
      setModules([...raw.platform, ...raw.company]);
    } catch (err) {
      setLoadError(err instanceof ApiException ? err.message : 'Failed to load modules.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchModules(); }, [fetchModules]);

  const filtered = tab === 'all' ? modules : modules.filter(m => m.scope === tab);

  async function handleCreate(f: FormState): Promise<void> {
    const created = await api.post<ApiModule>('/catalog/modules', {
      scope: f.scope, key: f.key, label: f.label, actions: f.actions,
    });
    setModules(p => [...p, created]);
    setCreateOpen(false);
  }

  async function handleEdit(f: FormState): Promise<void> {
    if (!editTarget) return;
    const updated = await api.put<ApiModule>(`/catalog/modules/${editTarget.id}`, {
      scope: f.scope, key: f.key, label: f.label, actions: f.actions,
    });
    setModules(p => p.map(m => m.id === editTarget.id ? updated : m));
    setEditTarget(null);
  }

  async function handleDelete(): Promise<void> {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.delete(`/catalog/modules/${deleteTarget.id}`);
      setModules(p => p.filter(m => m.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      if (err instanceof ApiException) {
        setDeleteError(err.code === 'system_module'
          ? 'System modules cannot be deleted.'
          : err.message || 'Failed to delete module.');
      } else {
        setDeleteError('Unable to connect to the server.');
      }
    } finally {
      setDeleting(false);
    }
  }

  const TH = ({ children }: { children: React.ReactNode }) => (
    <th style={{ textAlign: 'left', padding: '9px 16px', fontSize: '0.68rem', fontWeight: 600, color: 'var(--muted-foreground)', letterSpacing: '0.07em', textTransform: 'uppercase', backgroundColor: 'var(--muted)', whiteSpace: 'nowrap' }}>
      {children}
    </th>
  );

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: 'var(--background)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ color: 'var(--foreground)', fontSize: '1.3rem', fontWeight: 700, lineHeight: 1.2 }}>Permission Modules</h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.83rem', marginTop: 3 }}>
            Define custom permission modules for platform and company roles
          </p>
        </div>
        <button onClick={() => setCreateOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, cursor: 'pointer', background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', border: 'none', color: '#fff', fontSize: '0.82rem', fontWeight: 600 }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}>
          <Plus size={15} /> Create Module
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        {[
          { label: 'Total',    value: modules.length,                                       color: '#2563EB' },
          { label: 'Platform', value: modules.filter(m => m.scope === 'platform').length,   color: '#2563EB' },
          { label: 'Company',  value: modules.filter(m => m.scope === 'company').length,    color: '#7C3AED' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ backgroundColor: 'var(--card)', borderRadius: 14, padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--muted-foreground)', marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: '1.7rem', fontWeight: 700, color: 'var(--foreground)', lineHeight: 1 }}>
                {isLoading ? <Loader2 size={20} className="animate-spin" style={{ color: 'var(--muted-foreground)' }} /> : value}
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <Layers size={19} />
            </div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <FilterTabs<TabId> tabs={TABS} active={tab} onChange={setTab} />
        </div>

        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--muted-foreground)', fontSize: '0.85rem', padding: '48px 16px', justifyContent: 'center' }}>
            <Loader2 size={18} className="animate-spin" /> Loading modules…
          </div>
        )}

        {!isLoading && loadError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, margin: 16, padding: '12px 16px', color: '#DC2626', fontSize: '0.85rem' }}>
            {loadError}
            <button onClick={fetchModules} style={{ marginLeft: 'auto', fontSize: '0.8rem', fontWeight: 600, color: '#DC2626', background: 'none', border: '1px solid #FECACA', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>Retry</button>
          </div>
        )}

        {!isLoading && !loadError && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr><TH>Module</TH><TH>Key</TH><TH>Scope</TH><TH>Actions</TH><TH>Type</TH><th style={{ textAlign: 'right', padding: '9px 16px', fontSize: '0.68rem', fontWeight: 600, color: 'var(--muted-foreground)', letterSpacing: '0.07em', textTransform: 'uppercase', backgroundColor: 'var(--muted)' }}>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => {
                  const ss = SCOPE_STYLE[m.scope];
                  return (
                    <tr key={m.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>

                      {/* Label */}
                      <td style={{ padding: '13px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: ss.bg, border: `1px solid ${ss.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Layers size={15} color={ss.color} />
                          </div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>{m.label}</span>
                        </div>
                      </td>

                      {/* Key */}
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{ fontFamily: "'JetBrains Mono','Courier New',monospace", fontSize: '0.78rem', color: 'var(--muted-foreground)', backgroundColor: 'var(--muted)', padding: '2px 8px', borderRadius: 5 }}>{m.key}</span>
                      </td>

                      {/* Scope */}
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{ display: 'inline-block', backgroundColor: ss.bg, color: ss.color, border: `1px solid ${ss.border}`, fontSize: '0.7rem', fontWeight: 700, padding: '3px 9px', borderRadius: 99 }}>
                          {m.scope}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '13px 16px' }}>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {m.actions.map(a => (
                            <span key={a} style={{ fontSize: '0.68rem', fontWeight: 600, backgroundColor: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0', padding: '2px 7px', borderRadius: 99 }}>
                              {a}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* System badge */}
                      <td style={{ padding: '13px 16px' }}>
                        {m.system
                          ? <span style={{ fontSize: '0.68rem', fontWeight: 700, backgroundColor: '#F1F5F9', color: '#64748B', border: '1px solid #E2E8F0', padding: '2px 8px', borderRadius: 99 }}>System</span>
                          : <span style={{ fontSize: '0.68rem', fontWeight: 700, backgroundColor: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', padding: '2px 8px', borderRadius: 99 }}>Custom</span>
                        }
                      </td>

                      {/* Edit / Delete */}
                      <td style={{ padding: '13px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                          <button onClick={() => setEditTarget(m)} title="Edit module"
                            style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--muted-foreground)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--muted)'; e.currentTarget.style.color = 'var(--foreground)'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--muted-foreground)'; }}>
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => { setDeleteTarget(m); setDeleteError(null); }} title="Delete module"
                            disabled={m.system}
                            style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--muted-foreground)', cursor: m.system ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: m.system ? 0.35 : 1 }}
                            onMouseEnter={e => { if (!m.system) { e.currentTarget.style.backgroundColor = '#FEF2F2'; e.currentTarget.style.color = '#DC2626'; e.currentTarget.style.borderColor = '#FECACA'; } }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--muted-foreground)'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>No modules found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {createOpen && (
        <ModuleModal mode="create" initial={EMPTY_FORM} onClose={() => setCreateOpen(false)} onSave={handleCreate} />
      )}
      {editTarget && (
        <ModuleModal
          mode="edit"
          initial={{ scope: editTarget.scope, key: editTarget.key, label: editTarget.label, actions: [...editTarget.actions] }}
          onClose={() => setEditTarget(null)}
          onSave={handleEdit}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          title="Delete Module"
          description={<>Are you sure you want to delete <strong>{deleteTarget.label}</strong>? All permission keys under <code>{deleteTarget.key}.*</code> will become invalid.</>}
          onConfirm={handleDelete}
          onCancel={() => { setDeleteTarget(null); setDeleteError(null); }}
          loading={deleting}
          error={deleteError ?? undefined}
        />
      )}
    </div>
  );
}
