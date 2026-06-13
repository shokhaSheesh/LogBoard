import { useState } from 'react';
import { Plus, Shield, Save, Trash2, X } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type Action = 'read' | 'create' | 'update' | 'delete';
type PermKey = `${string}.${Action}`;

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Set<PermKey>;
}

interface PermCategory {
  id: string;
  label: string;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const ACTIONS: Action[] = ['read', 'create', 'update', 'delete'];

const CATEGORIES: PermCategory[] = [
  { id: 'companies',     label: 'Companies' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'board_users',   label: 'Board Users' },
  { id: 'admin_users',   label: 'Admin Users' },
  { id: 'roles',         label: 'Roles & Permissions' },
];

const ALL_KEYS: PermKey[] = CATEGORIES.flatMap(c =>
  ACTIONS.map(a => `${c.id}.${a}` as PermKey)
);

function readKeys(): PermKey[] {
  return CATEGORIES.map(c => `${c.id}.read` as PermKey);
}

// ── Seed Roles ────────────────────────────────────────────────────────────────

const SEED_ROLES: Role[] = [
  {
    id: 'super_admin', name: 'Super Admin',
    description: 'Full unrestricted access to all modules.',
    permissions: new Set(ALL_KEYS),
  },
  {
    id: 'admin', name: 'Admin',
    description: 'Full access except role and admin user deletion.',
    permissions: new Set(ALL_KEYS.filter(k => !['roles.delete', 'admin_users.delete'].includes(k))),
  },
  {
    id: 'support', name: 'Support',
    description: 'Read-only access across all modules.',
    permissions: new Set(readKeys()),
  },
  {
    id: 'billing', name: 'Billing',
    description: 'Full access to subscriptions; read-only elsewhere.',
    permissions: new Set([
      ...readKeys(),
      'subscriptions.create', 'subscriptions.update', 'subscriptions.delete',
    ] as PermKey[]),
  },
  {
    id: 'readonly', name: 'Read-Only',
    description: 'View-only. No write access anywhere.',
    permissions: new Set(readKeys()),
  },
];

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
  onSave: (name: string, description: string) => void;
}) {
  const [name, setName]     = useState('');
  const [desc, setDesc]     = useState('');

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 38, padding: '0 11px', borderRadius: 8,
    border: '1px solid var(--border)', backgroundColor: 'var(--background)',
    color: 'var(--foreground)', fontSize: '0.83rem', outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 40 }} onClick={onClose} />
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
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: 4, display: 'flex', borderRadius: 6 }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <X size={17} />
          </button>
        </div>

        {/* Body */}
        <form
          onSubmit={e => { e.preventDefault(); if (name.trim()) onSave(name.trim(), desc.trim()); }}
          style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}
        >
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
            />
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, height: 38, borderRadius: 8, cursor: 'pointer',
                backgroundColor: 'var(--background)', border: '1px solid var(--border)',
                color: 'var(--foreground)', fontSize: '0.83rem', fontWeight: 500,
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--background)')}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                flex: 2, height: 38, borderRadius: 8, cursor: 'pointer',
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                border: 'none', color: '#fff', fontSize: '0.83rem', fontWeight: 600,
              }}
            >
              Create Role
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RolesPermissionsPage() {
  const [roles, setRoles]           = useState<Role[]>(SEED_ROLES);
  const [selectedId, setSelectedId] = useState('support');
  const [dirty, setDirty]           = useState(false);
  const [addOpen, setAddOpen]       = useState(false);

  const selected = roles.find(r => r.id === selectedId) ?? roles[0];

  function toggle(key: PermKey) {
    setRoles(prev => prev.map(r => {
      if (r.id !== selectedId) return r;
      const p = new Set(r.permissions);
      p.has(key) ? p.delete(key) : p.add(key);
      return { ...r, permissions: p };
    }));
    setDirty(true);
  }

  function toggleRow(catId: string) {
    const rowKeys = ACTIONS.map(a => `${catId}.${a}` as PermKey);
    const allOn   = rowKeys.every(k => selected.permissions.has(k));
    setRoles(prev => prev.map(r => {
      if (r.id !== selectedId) return r;
      const p = new Set(r.permissions);
      rowKeys.forEach(k => allOn ? p.delete(k) : p.add(k));
      return { ...r, permissions: p };
    }));
    setDirty(true);
  }

  function toggleAll() {
    const allOn = ALL_KEYS.every(k => selected.permissions.has(k));
    setRoles(prev => prev.map(r => {
      if (r.id !== selectedId) return r;
      return { ...r, permissions: allOn ? new Set() : new Set(ALL_KEYS) };
    }));
    setDirty(true);
  }

  function selectRole(id: string) {
    setSelectedId(id);
    setDirty(false);
  }

  function deleteRole(id: string) {
    const remaining = roles.filter(r => r.id !== id);
    setRoles(remaining);
    if (selectedId === id) setSelectedId(remaining[0]?.id ?? '');
    setDirty(false);
  }

  function addRole(name: string, description: string) {
    const newRole: Role = {
      id: `role_${Date.now()}`,
      name,
      description: description || `Custom role: ${name}`,
      permissions: new Set(),
    };
    setRoles(p => [...p, newRole]);
    setSelectedId(newRole.id);
    setAddOpen(false);
    setDirty(false);
  }

  const allOn  = ALL_KEYS.every(k => selected.permissions.has(k));
  const COL_W  = 88;

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
                      width: '100%', textAlign: 'left', padding: '10px 40px 10px 16px',
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
                      </div>
                    </div>
                  </button>

                  {/* Delete button */}
                  <button
                    onClick={e => { e.stopPropagation(); deleteRole(role.id); }}
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
                {selected.description}
              </p>
            </div>

            {/* Global select all */}
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
          </div>

          {/* Matrix table */}
          <div style={{ overflowX: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '10px 22px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>
                    Module
                  </th>
                  {ACTIONS.map(a => (
                    <th key={a} style={{ width: COL_W, padding: '10px 0', textAlign: 'center', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>
                      {a.charAt(0).toUpperCase() + a.slice(1)}
                    </th>
                  ))}
                  {/* Row select-all column */}
                  <th style={{ width: 80, padding: '10px 16px 10px 0', textAlign: 'center', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>
                    All
                  </th>
                </tr>
              </thead>
              <tbody>
                {CATEGORIES.map((cat, ci) => {
                  const rowKeys = ACTIONS.map(a => `${cat.id}.${a}` as PermKey);
                  const rowAllOn = rowKeys.every(k => selected.permissions.has(k));

                  return (
                    <tr
                      key={cat.id}
                      style={{ borderBottom: ci < CATEGORIES.length - 1 ? '1px solid var(--border)' : 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '16px 22px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>
                        {cat.label}
                      </td>
                      {ACTIONS.map(action => {
                        const key = `${cat.id}.${action}` as PermKey;
                        return (
                          <td key={action} style={{ width: COL_W, textAlign: 'center', padding: '16px 0' }}>
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                              <Toggle checked={selected.permissions.has(key)} onChange={() => toggle(key)} />
                            </div>
                          </td>
                        );
                      })}
                      {/* Row toggle-all */}
                      <td style={{ width: 80, textAlign: 'center', padding: '16px 16px 16px 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <Toggle checked={rowAllOn} onChange={() => toggleRow(cat.id)} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8, backgroundColor: 'var(--card)', position: 'sticky', bottom: 0 }}>
            <button
              onClick={() => { setRoles(SEED_ROLES); setDirty(false); }}
              style={{
                padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                backgroundColor: 'var(--background)', border: '1px solid var(--border)',
                color: 'var(--foreground)', fontSize: '0.82rem', fontWeight: 500,
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--background)')}
            >
              Reset
            </button>
            <button
              onClick={() => setDirty(false)}
              disabled={!dirty}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 18px', borderRadius: 8, cursor: dirty ? 'pointer' : 'default',
                background: dirty ? 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' : 'var(--muted)',
                border: 'none', color: dirty ? '#fff' : 'var(--muted-foreground)',
                fontSize: '0.82rem', fontWeight: 600, transition: 'background 0.2s',
              }}
            >
              <Save size={14} />
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {addOpen && <AddRoleModal onClose={() => setAddOpen(false)} onSave={addRole} />}
    </div>
  );
}
