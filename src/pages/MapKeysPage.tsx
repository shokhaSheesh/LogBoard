import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, Loader2, Map as MapIcon, KeyRound, Radio, Copy, Check, Eye, EyeOff, Power } from 'lucide-react';
import { useEscape } from '@/lib/useEscape';
import { useAuth } from '@/context/AuthContext';
import { api, ApiException } from '@/lib/api';
import { fmtDate } from '@/lib/dates';
import { Kpi } from '@/components/shared/Kpi';
import { Card, Dash, IconButton, KpiRow, Page, PrimaryButton, RowActions, SearchBox, TableState, Toolbar } from '@/components/shared/ui';
import { DeleteConfirmModal } from '@/components/shared/DeleteConfirmModal';

// ── Types ─────────────────────────────────────────────────────────────────────

// A Google Maps JavaScript API browser key (ADR 0036). At most one is live: the one the apps
// get from GET /config to draw maps and search addresses with.
interface MapKey {
  id: string;
  key: string;
  label: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface FormState {
  key: string;
  label: string;
  enabled: boolean;
}

// What the server accepts: "AIza" and 35 more of letters, digits, - and _ (39 in all).
const KEY_SHAPE = /^AIza[0-9A-Za-z_-]{35}$/;

// "AIzaSy…x9Q2" — enough to tell keys apart without putting the whole key on screen.
const masked = (k: string) => (k.length > 12 ? `${k.slice(0, 6)}…${k.slice(-4)}` : k);

function errorText(err: unknown, fallback: string): string {
  if (!(err instanceof ApiException)) return 'Unable to connect to the server.';
  // The server's own sentences are written for this page (invalid_key, key_conflict, …).
  return err.message || fallback;
}

// ── Key Modal ─────────────────────────────────────────────────────────────────

function KeyModal({ mode, initial, otherLive, onClose, onSave }: {
  mode: 'create' | 'edit';
  initial: FormState;
  otherLive: MapKey | null; // the key that goes off if this one is made live
  onClose: () => void;
  onSave: (f: FormState) => Promise<void>;
}) {
  const [form, setForm]               = useState<FormState>(initial);
  const [saving, setSaving]           = useState(false);
  const [serverError, setServerError] = useState('');
  const [touched, setTouched]         = useState(false);
  useEscape(onClose, !saving);

  const key = form.key.trim();
  const keyProblem = !key ? 'Paste the key.' : !KEY_SHAPE.test(key) ? 'A Google API key starts with AIza and is 39 characters long.' : '';
  const lbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 4 };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (keyProblem) return;
    setSaving(true);
    setServerError('');
    try {
      await onSave({ ...form, key, label: form.label.trim() });
    } catch (err) {
      setServerError(errorText(err, 'Something went wrong.'));
      setSaving(false);
    }
  }

  const willReplace = form.enabled && otherLive;
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 40 }}
        onClick={saving ? undefined : onClose} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 50, width: 480, maxWidth: 'calc(100vw - 32px)', backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)' }}>
            {mode === 'create' ? 'Add Map Key' : 'Edit Map Key'}
          </h2>
          <button onClick={onClose} disabled={saving} aria-label="Close"
            style={{ background: 'none', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', color: 'var(--muted-foreground)', padding: 4, display: 'flex', borderRadius: 6, opacity: saving ? 0.5 : 1 }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.backgroundColor = 'var(--muted)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
            <X size={17} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={lbl}>Label</label>
              <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} maxLength={100}
                placeholder="e.g. Production — brelo web" className="field" disabled={saving} autoFocus={mode === 'edit'} />
              <p style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', marginTop: 4 }}>Only for you, to tell the keys apart.</p>
            </div>

            <div>
              <label style={lbl}>Key <span style={{ color: '#EF4444' }}>*</span></label>
              <input value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value }))} onBlur={() => setTouched(true)}
                placeholder="AIza…" className="field" disabled={saving} autoFocus={mode === 'create'} spellCheck={false} autoComplete="off"
                style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', letterSpacing: '0.02em', borderColor: touched && keyProblem ? '#EF4444' : undefined }} />
              {touched && keyProblem
                ? <p style={{ fontSize: '0.72rem', color: '#DC2626', marginTop: 4 }}>{keyProblem}</p>
                : <p style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', marginTop: 4 }}>A Maps JavaScript API browser key from Google Cloud. What protects it is the websites and APIs it's limited to there.</p>}
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 10, border: `1px solid ${form.enabled ? 'var(--primary)' : 'var(--border)'}`, backgroundColor: form.enabled ? 'color-mix(in srgb, var(--primary) 8%, transparent)' : 'transparent', cursor: saving ? 'not-allowed' : 'pointer' }}>
              <input type="checkbox" checked={form.enabled} disabled={saving} onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))}
                style={{ marginTop: 2, accentColor: 'var(--primary)' }} />
              <span>
                <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>Live</span>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: 2 }}>
                  The apps use this key for maps and address search. Only one key is live at a time.
                </span>
              </span>
            </label>
            {willReplace && (
              <div style={{ fontSize: '0.78rem', color: '#B45309', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '8px 12px' }}>
                <strong>{otherLive.label || masked(otherLive.key)}</strong> is live now; saving this as live turns it off.
              </div>
            )}

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
              {saving ? 'Saving…' : mode === 'create' ? 'Add key' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ── The key, hidden until asked for, with a copy button ─────────────────────

function KeyCell({ value }: { value: string }) {
  const [shown, setShown]   = useState(false);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* the browser refused */ }
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: '0.78rem', color: 'var(--foreground)', backgroundColor: 'var(--muted)', padding: '2px 8px', borderRadius: 5, whiteSpace: 'nowrap' }}>
        {shown ? value : masked(value)}
      </span>
      <IconButton title={shown ? 'Hide the key' : 'Show the whole key'} onClick={() => setShown(s => !s)}>{shown ? <EyeOff size={13} /> : <Eye size={13} />}</IconButton>
      <IconButton title={copied ? 'Copied' : 'Copy the key'} onClick={() => { void copy(); }}>{copied ? <Check size={13} /> : <Copy size={13} />}</IconButton>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MapKeysPage() {
  const { can } = useAuth();
  const canCreate = can('map_keys.create');
  const canUpdate = can('map_keys.update');
  const canDelete = can('map_keys.delete');
  const [keys, setKeys]                 = useState<MapKey[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [loadError, setLoadError]       = useState<string | null>(null);
  const [search, setSearch]             = useState('');
  const [createOpen, setCreateOpen]     = useState(false);
  const [editTarget, setEditTarget]     = useState<MapKey | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MapKey | null>(null);
  const [deleting, setDeleting]         = useState(false);
  const [deleteError, setDeleteError]   = useState<string | null>(null);
  const [switching, setSwitching]       = useState<string | null>(null); // the key being made live / off
  const [rowError, setRowError]         = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setKeys(await api.get<MapKey[]>('/admin/map-keys') ?? []);
    } catch (err) {
      setLoadError(errorText(err, 'Failed to load map keys.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const live = keys.find(k => k.enabled) ?? null;
  const q = search.trim().toLowerCase();
  const filtered = keys.filter(k => !q || k.label.toLowerCase().includes(q) || k.key.toLowerCase().includes(q));

  // Making one key live turns the others off on the server; the list is read again so it
  // shows exactly that (and the live key first, as the server orders it).
  async function handleCreate(f: FormState): Promise<void> {
    await api.post<MapKey>('/admin/map-keys', { key: f.key, label: f.label, enabled: f.enabled });
    setCreateOpen(false);
    await fetchKeys();
  }

  async function handleEdit(f: FormState): Promise<void> {
    if (!editTarget) return;
    await api.put<MapKey>(`/admin/map-keys/${editTarget.id}`, { key: f.key, label: f.label, enabled: f.enabled });
    setEditTarget(null);
    await fetchKeys();
  }

  async function setLive(k: MapKey, enabled: boolean): Promise<void> {
    setSwitching(k.id);
    setRowError(null);
    try {
      await api.put<MapKey>(`/admin/map-keys/${k.id}`, { key: k.key, label: k.label, enabled });
      await fetchKeys();
    } catch (err) {
      setRowError(errorText(err, 'Failed to change the live key.'));
    } finally {
      setSwitching(null);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.delete(`/admin/map-keys/${deleteTarget.id}`);
      setKeys(p => p.filter(k => k.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(errorText(err, 'Failed to delete the key.'));
    } finally {
      setDeleting(false);
    }
  }

  const TH = ({ children }: { children?: React.ReactNode }) => (
    <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: '0.68rem', fontWeight: 600, color: 'var(--muted-foreground)', letterSpacing: '0.07em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
      {children}
    </th>
  );

  return (
    <Page>
      <KpiRow>
        <Kpi label="Keys"     value={isLoading ? <Dash /> : keys.length} icon={<KeyRound size={17} />} />
        <Kpi label="Live key" value={isLoading ? <Dash /> : live ? (live.label || masked(live.key)) : 'None'} icon={<Radio size={17} />} />
        <Kpi label="Off"      value={isLoading ? <Dash /> : keys.filter(k => !k.enabled).length} icon={<Power size={17} />} />
      </KpiRow>

      {!isLoading && !loadError && !live && keys.length > 0 && (
        <div style={{ fontSize: '0.82rem', color: '#B45309', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '10px 14px' }}>
          No key is live, so the apps have no map key from the server. Make one live.
        </div>
      )}

      <Card>
        <Toolbar action={canCreate && <PrimaryButton icon={<Plus size={15} />} onClick={() => setCreateOpen(true)}>Add key</PrimaryButton>}>
          <SearchBox value={search} onChange={setSearch} placeholder="Search keys" />
        </Toolbar>

        <TableState loading={isLoading} error={loadError ?? undefined} onRetry={fetchKeys} what="map keys" />
        {rowError && (
          <div style={{ margin: '0 16px 12px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', fontSize: '0.8rem', padding: '8px 12px' }}>{rowError}</div>
        )}

        {!isLoading && !loadError && (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr><TH>Label</TH><TH>Key</TH><TH>Status</TH><TH>Added</TH><TH>Updated</TH><th className="pin" /></tr>
              </thead>
              <tbody>
                {filtered.map((k, i) => (
                  <tr key={k.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: k.enabled ? '#ECFDF5' : 'var(--muted)', border: `1px solid ${k.enabled ? '#A7F3D0' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <MapIcon size={15} color={k.enabled ? '#059669' : 'var(--muted-foreground)'} />
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: k.label ? 'var(--foreground)' : 'var(--muted-foreground)' }}>{k.label || 'No label'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px' }}><KeyCell value={k.key} /></td>
                    <td style={{ padding: '10px 14px' }}>
                      {k.enabled
                        ? <span style={{ fontSize: '0.7rem', fontWeight: 700, backgroundColor: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', padding: '3px 9px', borderRadius: 99 }}>Live</span>
                        : <span style={{ fontSize: '0.7rem', fontWeight: 700, backgroundColor: '#F1F5F9', color: '#64748B', border: '1px solid #E2E8F0', padding: '3px 9px', borderRadius: 99 }}>Off</span>}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '0.8rem', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{fmtDate(k.created_at) || <Dash />}</td>
                    <td style={{ padding: '10px 14px', fontSize: '0.8rem', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{fmtDate(k.updated_at) || <Dash />}</td>
                    <td className="pin">
                      <RowActions>
                        {canUpdate && (
                          <IconButton title={k.enabled ? 'Turn this key off' : 'Make this key live'} busy={switching === k.id} disabled={!!switching}
                            onClick={() => { void setLive(k, !k.enabled); }}>
                            <Power size={13} />
                          </IconButton>
                        )}
                        {canUpdate && <IconButton title="Edit key" onClick={() => setEditTarget(k)}><Pencil size={13} /></IconButton>}
                        {canDelete && <IconButton title="Delete key" danger onClick={() => { setDeleteTarget(k); setDeleteError(null); }}><Trash2 size={13} /></IconButton>}
                        {!canUpdate && !canDelete && <Dash />}
                      </RowActions>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>
                    {keys.length === 0 ? 'No map keys yet. Add the Google Maps key the apps should use.' : 'No keys match your search.'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {createOpen && (
        <KeyModal mode="create" initial={{ key: '', label: '', enabled: !live }} otherLive={live}
          onClose={() => setCreateOpen(false)} onSave={handleCreate} />
      )}
      {editTarget && (
        <KeyModal mode="edit" initial={{ key: editTarget.key, label: editTarget.label, enabled: editTarget.enabled }}
          otherLive={live && live.id !== editTarget.id ? live : null}
          onClose={() => setEditTarget(null)} onSave={handleEdit} />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          title="Delete Map Key"
          description={deleteTarget.enabled
            ? <>Delete <strong>{deleteTarget.label || masked(deleteTarget.key)}</strong>? It's the <strong>live</strong> key: until another one is made live, the apps get no map key from the server.</>
            : <>Delete <strong>{deleteTarget.label || masked(deleteTarget.key)}</strong>? The key itself stays in Google Cloud; this only takes it off the list.</>}
          onConfirm={handleDelete}
          onCancel={() => { setDeleteTarget(null); setDeleteError(null); }}
          loading={deleting}
          error={deleteError ?? undefined}
        />
      )}
    </Page>
  );
}
