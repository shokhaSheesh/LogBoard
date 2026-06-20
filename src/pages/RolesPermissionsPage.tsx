import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Shield, Save, Trash2, X, Loader2 } from 'lucide-react';
import { api, ApiException } from '@/lib/api';
import { DeleteConfirmModal } from '@/components/shared/DeleteConfirmModal';

// ── Types ─────────────────────────────────────────────────────────────────────

type Action = string;
type PermKey = string;

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Set<PermKey>;
  system: boolean;
}

interface ApiRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  system: boolean;
}

interface ApiCatalog {
  modules: { id: string; label: string }[];
  actions: Action[];
  permissions: string[];
}

// ── Toggle Switch ─────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div
      onClick={onChange}
      style={{
        width: 36, height: 20, borderRadius: 99, flexShrink: 0,
        backgroundColor: checked ? '#2563EB' : 'var(--muted)',
        position: 'relative', cursor: 'pointer',
        transition: 'background-color 0.2s',
      }}
    >
      <div
        style={{
          position: 'absolute', top: 3,
          left: checked ? 19 : 3,
          width: 14, height: 14, borderRadius: '50%',
          backgroundColor: '#fff',
          transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}
      />
    </div>
  );
}

// ── Add Role Modal ────────────────────────────────────────────────────────────

function AddRoleModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (name: string, description: string) => Promise<void>;
}) {
  const [name, setName]           = useState('');
  const [desc, setDesc]           = useState('');
  const [saving, setSaving]       = useState(false);
  const [serverError, setServerError] = useState('');

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 38, padding: '0 11px', borderRadius: 8,
    border: '1px solid var(--border)', backgroundColor: 'var(--background)',
    color: 'var(--foreground)', fontSize: '0.83rem', outline: 'none',
    boxSizing: 'border-box',
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setServerError('');
    try {
      await onSave(name.trim(), desc.trim());
    } catch (err) {
      if (err instanceof ApiException) {
        if (err.code === 'conflict') {
          setServerError('A role with this name already exists.');
        } else if (err.code === 'invalid_name') {
          setServerError('Role name is invalid.');
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
      <div
        style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          zIndex: 50, width: 420,
          backgroundColor: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)' }}>Add New Role</h2>
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

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 5 }}>
              Role Name
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Manager"
              style={inputStyle}
              autoFocus
              required
              disabled={saving}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 5 }}>
              Description
            </label>
            <input
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Short description of this role"
              style={inputStyle}
              disabled={saving}
            />
          </div>

          {serverError && (
            <div style={{ backgroundColor: 'var(--destructive-subtle, #FEF2F2)', border: '1px solid var(--destructive-border, #FECACA)', borderRadius: 8, color: '#DC2626', fontSize: '0.8rem', padding: '8px 12px' }}>
              {serverError}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                flex: 1, height: 38, borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer',
                backgroundColor: 'var(--background)', border: '1px solid var(--border)',
                color: 'var(--foreground)', fontSize: '0.83rem', fontWeight: 500,
                opacity: saving ? 0.6 : 1,
              }}
              onMouseEnter={e => { if (!saving) e.currentTarget.style.backgroundColor = 'var(--muted)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--background)'; }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 2, height: 38, borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer',
                background: saving ? 'var(--muted)' : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                border: 'none', color: saving ? 'var(--muted-foreground)' : '#fff',
                fontSize: '0.83rem', fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? 'Creating…' : 'Create Role'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RolesPermissionsPage() {
  const [roles, setRoles]           = useState<Role[]>([]);
  const [catalog, setCatalog]       = useState<ApiCatalog | null>(null);
  const [isLoading, setIsLoading]   = useState(true);
  const [loadError, setLoadError]   = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [dirty, setDirty]           = useState(false);
  const [addOpen, setAddOpen]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [deleting, setDeleting]         = useState(false);
  const [deleteError, setDeleteError]   = useState<string | null>(null);

  // Keep a snapshot of server state for Reset
  const serverRolesRef = useRef<Role[]>([]);

  function toUIRole(r: ApiRole): Role {
    return { ...r, permissions: new Set(r.permissions) };
  }

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [cat, roleList] = await Promise.all([
        api.get<ApiCatalog>('/roles/permissions'),
        api.get<ApiRole[]>('/roles'),
      ]);
      setCatalog(cat);
      const uiRoles = roleList.map(toUIRole);
      serverRolesRef.current = uiRoles;
      setRoles(uiRoles);
      setSelectedId(uiRoles[0]?.id ?? '');
    } catch (err) {
      setLoadError(err instanceof ApiException ? err.message : 'Failed to load roles.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const modules = catalog?.modules ?? [];
  const actions = catalog?.actions ?? [];

  const allKeys: PermKey[] = modules.flatMap(m => actions.map(a => `${m.id}.${a}`));
  const selected = roles.find(r => r.id === selectedId) ?? roles[0];

  function toggle(key: PermKey) {
    setRoles(prev => prev.map(r => {
      if (r.id !== selectedId) return r;
      const p = new Set(r.permissions);
      p.has(key) ? p.delete(key) : p.add(key);
      return { ...r, permissions: p };
    }));
    setDirty(true);
    setSaveError(null);
  }

  function toggleRow(moduleId: string) {
    const rowKeys = actions.map(a => `${moduleId}.${a}`);
    const allOn   = rowKeys.every(k => selected.permissions.has(k));
    setRoles(prev => prev.map(r => {
      if (r.id !== selectedId) return r;
      const p = new Set(r.permissions);
      rowKeys.forEach(k => allOn ? p.delete(k) : p.add(k));
      return { ...r, permissions: p };
    }));
    setDirty(true);
    setSaveError(null);
  }

  function toggleAll() {
    const allOn = allKeys.every(k => selected.permissions.has(k));
    setRoles(prev => prev.map(r => {
      if (r.id !== selectedId) return r;
      return { ...r, permissions: allOn ? new Set() : new Set(allKeys) };
    }));
    setDirty(true);
    setSaveError(null);
  }

  function selectRole(id: string) {
    setSelectedId(id);
    setDirty(false);
    setSaveError(null);
  }

  function resetChanges() {
    const original = serverRolesRef.current.find(r => r.id === selectedId);
    if (!original) return;
    setRoles(prev => prev.map(r => r.id === selectedId ? { ...original, permissions: new Set(original.permissions) } : r));
    setDirty(false);
    setSaveError(null);
  }

  async function saveChanges() {
    if (!selected || !dirty) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await api.put<ApiRole>(`/roles/${selected.id}`, {
        name: selected.name,
        description: selected.description,
        permissions: [...selected.permissions],
      });
      const uiUpdated = toUIRole(updated);
      setRoles(prev => prev.map(r => r.id === selected.id ? uiUpdated : r));
      serverRolesRef.current = serverRolesRef.current.map(r => r.id === selected.id ? uiUpdated : r);
      setDirty(false);
    } catch (err) {
      if (err instanceof ApiException) {
        if (err.code === 'invalid_permission') {
          setSaveError('One or more permissions are invalid.');
        } else if (err.code === 'system_role') {
          setSaveError('System roles cannot be modified.');
        } else {
          setSaveError(err.message || 'Failed to save changes.');
        }
      } else {
        setSaveError('Unable to connect to the server.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleAddRole(name: string, description: string): Promise<void> {
    const created = await api.post<ApiRole>('/roles', { name, description, permissions: [] });
    const uiRole = toUIRole(created);
    setRoles(p => [...p, uiRole]);
    serverRolesRef.current = [...serverRolesRef.current, uiRole];
    setSelectedId(uiRole.id);
    setDirty(false);
    setAddOpen(false);
  }

  async function handleDeleteRole() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.delete(`/roles/${deleteTarget.id}`);
      const remaining = roles.filter(r => r.id !== deleteTarget.id);
      serverRolesRef.current = serverRolesRef.current.filter(r => r.id !== deleteTarget.id);
      setRoles(remaining);
      if (selectedId === deleteTarget.id) {
        setSelectedId(remaining[0]?.id ?? '');
        setDirty(false);
      }
      setDeleteTarget(null);
    } catch (err) {
      if (err instanceof ApiException) {
        setDeleteError(err.message || 'Failed to delete role.');
      } else {
        setDeleteError('Unable to connect to the server.');
      }
    } finally {
      setDeleting(false);
    }
  }

  const allOn = allKeys.length > 0 && allKeys.every(k => selected?.permissions.has(k));
  const COL_W = 88;

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: 'var(--background)' }}>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: 'var(--foreground)', fontSize: '1.3rem', fontWeight: 700, lineHeight: 1.2 }}>
          Roles & Permissions
        </h1>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.83rem', marginTop: 3 }}>
          Access control management for internal staff and tenant admins
        </p>
      </div>

      {/* ── Loading / Error states ────────────────────────────────────── */}
      {isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--muted-foreground)', fontSize: '0.85rem', padding: '48px 0', justifyContent: 'center' }}>
          <Loader2 size={18} className="animate-spin" />
          Loading roles…
        </div>
      )}

      {!isLoading && loadError && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '16px 20px', color: '#DC2626', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 10 }}>
          {loadError}
          <button
            onClick={fetchAll}
            style={{ marginLeft: 'auto', fontSize: '0.8rem', fontWeight: 600, color: '#DC2626', background: 'none', border: '1px solid #FECACA', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading && !loadError && selected && (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20, alignItems: 'start' }}>

          {/* ── Left: Roles List ──────────────────────────────────────── */}
          <div style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--foreground)' }}>Roles</span>
            </div>

            <ul style={{ listStyle: 'none', padding: '6px 0', margin: 0 }}>
              {roles.map(role => {
                const active = role.id === selectedId;
                return (
                  <li key={role.id} style={{ position: 'relative' }}>
                    <button
                      onClick={() => selectRole(role.id)}
                      style={{
                        width: '100%', textAlign: 'left',
                        padding: role.system ? '10px 16px' : '10px 40px 10px 16px',
                        background: 'none', border: 'none', cursor: 'pointer',
                        borderLeft: `3px solid ${active ? '#2563EB' : 'transparent'}`,
                        backgroundColor: active ? '#EFF6FF' : 'transparent',
                        display: 'flex', alignItems: 'center', gap: 10,
                      }}
                      onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = 'var(--muted)'; }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <Shield size={15} style={{ flexShrink: 0, color: active ? '#2563EB' : 'var(--muted-foreground)' }} />
                      <div>
                        <div style={{ fontSize: '0.83rem', fontWeight: active ? 600 : 400, color: active ? '#1D4ED8' : 'var(--foreground)', lineHeight: 1.3 }}>
                          {role.name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', marginTop: 1 }}>
                          {role.permissions.size} permission{role.permissions.size !== 1 ? 's' : ''}
                          {role.system && <span style={{ marginLeft: 4, color: '#9CA3AF' }}>· system</span>}
                        </div>
                      </div>
                    </button>

                    {/* Delete button — only for non-system roles */}
                    {!role.system && (
                      <button
                        onClick={e => { e.stopPropagation(); setDeleteTarget(role); }}
                        title="Delete role"
                        style={{
                          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', cursor: 'pointer', padding: 5, borderRadius: 6,
                          color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center',
                          opacity: 0.5,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.backgroundColor = '#FEF2F2'; }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.color = 'var(--muted-foreground)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>

            <div style={{ padding: '8px 10px', borderTop: '1px solid var(--border)' }}>
              <button
                onClick={() => setAddOpen(true)}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: '0.78rem', fontWeight: 500, color: 'var(--muted-foreground)',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Plus size={14} />
                Add New Role
              </button>
            </div>
          </div>

          {/* ── Right: Matrix ─────────────────────────────────────────── */}
          <div style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

            {/* Role header */}
            <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--foreground)' }}>
                    Editing: {selected.name} Role
                  </span>
                  {dirty && (
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.04em', backgroundColor: '#FEF9C3', color: '#854D0E', border: '1px solid #FDE68A', padding: '2px 7px', borderRadius: 99 }}>
                      UNSAVED
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', margin: 0 }}>
                  {selected.description || 'No description.'}
                </p>
              </div>

              {/* Global select all */}
              {!selected.system && (
                <button
                  onClick={toggleAll}
                  style={{
                    padding: '6px 14px', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap',
                    backgroundColor: allOn ? '#EFF6FF' : 'var(--background)',
                    border: `1px solid ${allOn ? '#93C5FD' : 'var(--border)'}`,
                    color: allOn ? '#2563EB' : 'var(--foreground)',
                    fontSize: '0.78rem', fontWeight: 600,
                  }}
                >
                  {allOn ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>

            {/* Matrix table */}
            <div style={{ overflowX: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '10px 22px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>
                      Module
                    </th>
                    {actions.map(a => (
                      <th key={a} style={{ width: COL_W, padding: '10px 0', textAlign: 'center', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>
                        {a.charAt(0).toUpperCase() + a.slice(1)}
                      </th>
                    ))}
                    {/* Row select-all column — only when editable */}
                    {!selected.system && (
                      <th style={{ width: 80, padding: '10px 16px 10px 0', textAlign: 'center', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>
                        All
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {modules.map((mod, ci) => {
                    const rowKeys  = actions.map(a => `${mod.id}.${a}`);
                    const rowAllOn = rowKeys.every(k => selected.permissions.has(k));

                    return (
                      <tr
                        key={mod.id}
                        style={{ borderBottom: ci < modules.length - 1 ? '1px solid var(--border)' : 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <td style={{ padding: '16px 22px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>
                          {mod.label}
                        </td>
                        {actions.map(action => {
                          const key = `${mod.id}.${action}`;
                          return (
                            <td key={action} style={{ width: COL_W, textAlign: 'center', padding: '16px 0' }}>
                              <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <Toggle
                                  checked={selected.permissions.has(key)}
                                  onChange={selected.system ? () => {} : () => toggle(key)}
                                />
                              </div>
                            </td>
                          );
                        })}
                        {!selected.system && (
                          <td style={{ width: 80, textAlign: 'center', padding: '16px 16px 16px 0' }}>
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                              <Toggle checked={rowAllOn} onChange={() => toggleRow(mod.id)} />
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, backgroundColor: 'var(--card)', position: 'sticky', bottom: 0 }}>
              {saveError && (
                <span style={{ fontSize: '0.78rem', color: '#DC2626', marginRight: 'auto' }}>{saveError}</span>
              )}
              {!selected.system && (
                <>
                  <button
                    onClick={resetChanges}
                    disabled={!dirty || saving}
                    style={{
                      padding: '8px 16px', borderRadius: 8, cursor: dirty && !saving ? 'pointer' : 'default',
                      backgroundColor: 'var(--background)', border: '1px solid var(--border)',
                      color: 'var(--foreground)', fontSize: '0.82rem', fontWeight: 500,
                      opacity: !dirty || saving ? 0.5 : 1,
                    }}
                    onMouseEnter={e => { if (dirty && !saving) e.currentTarget.style.backgroundColor = 'var(--muted)'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--background)'; }}
                  >
                    Reset
                  </button>
                  <button
                    onClick={saveChanges}
                    disabled={!dirty || saving}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 18px', borderRadius: 8, cursor: dirty && !saving ? 'pointer' : 'default',
                      background: dirty && !saving ? 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' : 'var(--muted)',
                      border: 'none', color: dirty && !saving ? '#fff' : 'var(--muted-foreground)',
                      fontSize: '0.82rem', fontWeight: 600, transition: 'background 0.2s',
                    }}
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </>
              )}
              {selected.system && (
                <span style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', fontStyle: 'italic' }}>
                  System roles are read-only.
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {addOpen && (
        <AddRoleModal
          onClose={() => setAddOpen(false)}
          onSave={handleAddRole}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          title="Delete Role"
          description={
            <>
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This action cannot be undone and will affect all users assigned this role.
            </>
          }
          confirmLabel="Yes, Delete"
          onConfirm={handleDeleteRole}
          onCancel={() => { setDeleteTarget(null); setDeleteError(null); }}
          loading={deleting}
          error={deleteError ?? undefined}
        />
      )}
    </div>
  );
}
