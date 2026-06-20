import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Plus, Pencil, Trash2, X, ShieldCheck, Eye, EyeOff, ChevronDown } from 'lucide-react';
import { Dropdown } from '@/components/shared/Dropdown';
import { DeleteConfirmModal } from '@/components/shared/DeleteConfirmModal';

// ── CustomSelect ──────────────────────────────────────────────────────────────
// Uses position:absolute (not fixed) so it works correctly inside modals that
// have a CSS transform, which breaks fixed positioning in Chrome/Safari.

function CustomSelect({ value, options, onChange }: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen]   = useState(false);
  const containerRef      = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', height: 38, padding: '0 11px', borderRadius: 8,
          border: `1px solid ${open ? '#93C5FD' : 'var(--border)'}`,
          fontSize: '0.83rem', color: 'var(--foreground)', backgroundColor: 'var(--background)',
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 6, outline: 'none', boxSizing: 'border-box',
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.borderColor = '#93C5FD'; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.borderColor = 'var(--border)'; }}
      >
        <span>{value}</span>
        <ChevronDown size={13} style={{ flexShrink: 0, opacity: 0.5, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100,
          backgroundColor: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
          overflow: 'hidden', maxHeight: 220, overflowY: 'auto',
        }}>
          {options.map(o => (
            <button key={o} type="button" onClick={() => { onChange(o); setOpen(false); }}
              style={{
                width: '100%', padding: '8px 12px', textAlign: 'left', fontSize: '0.82rem',
                border: 'none', cursor: 'pointer', display: 'block',
                backgroundColor: o === value ? '#EFF6FF' : 'transparent',
                color: o === value ? '#2563EB' : 'var(--foreground)',
                fontWeight: o === value ? 600 : 400,
              }}
              onMouseEnter={e => { if (o !== value) e.currentTarget.style.backgroundColor = 'var(--muted)'; }}
              onMouseLeave={e => { if (o !== value) e.currentTarget.style.backgroundColor = 'transparent'; }}
            >{o}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Status    = 'Active' | 'Suspended';
type AdminRole = 'Super Admin' | 'Admin' | 'Support' | 'Billing' | 'Read-Only';

interface AdminUser {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  email: string;
  phone: string;
  role: AdminRole;
  lastActive: string;
  status: Status;
  password: string;
}

interface FormState {
  name: string; email: string; phone: string;
  role: AdminRole; status: Status; password: string;
}

// ── Config ────────────────────────────────────────────────────────────────────

const PER_PAGE = 10;

const STATUS_CONFIG: Record<Status, { dot: string; color: string }> = {
  Active:    { dot: '#22C55E', color: '#15803D' },
  Suspended: { dot: '#EF4444', color: '#B91C1C' },
};

const ROLE_STYLE: Record<AdminRole, { bg: string; color: string; border: string }> = {
  'Super Admin': { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
  'Admin':       { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' },
  'Support':     { bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' },
  'Billing':     { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
  'Read-Only':   { bg: '#F8FAFC', color: '#64748B', border: '#E2E8F0' },
};

const ADMIN_ROLES: AdminRole[] = ['Super Admin', 'Admin', 'Support', 'Billing', 'Read-Only'];
const STATUSES: Status[] = ['Active', 'Suspended'];
const AVATAR_COLORS = ['#2563EB','#7C3AED','#059669','#C2410C','#64748B','#0891B2','#DB2777','#D97706','#6366F1','#10B981'];

// ── Seed Data ─────────────────────────────────────────────────────────────────

const SEED: AdminUser[] = [
  { id:'ADM-001', name:'Sarah Adams',    initials:'SA', avatarColor:'#2563EB', email:'sarah.adams@fleetadmin.io',    phone:'+1 (415) 555-0101', role:'Super Admin', lastActive:'Jun 13, 2026', status:'Active',    password:'S@rahAdm!n#1'   },
  { id:'ADM-002', name:'Michael Torres', initials:'MT', avatarColor:'#7C3AED', email:'m.torres@fleetadmin.io',       phone:'+1 (212) 555-0202', role:'Admin',       lastActive:'Jun 12, 2026', status:'Active',    password:'M!ch@elT0rr3s'  },
  { id:'ADM-003', name:'Chloe Bennett',  initials:'CB', avatarColor:'#059669', email:'c.bennett@fleetadmin.io',      phone:'+1 (617) 555-0303', role:'Support',     lastActive:'Jun 13, 2026', status:'Active',    password:'Chl03B3nn3tt!'  },
  { id:'ADM-004', name:'Daniel Kim',     initials:'DK', avatarColor:'#C2410C', email:'d.kim@fleetadmin.io',          phone:'+1 (310) 555-0404', role:'Billing',     lastActive:'Jun 11, 2026', status:'Active',    password:'D@n!3lK!m2024'  },
  { id:'ADM-005', name:'Ines Dubois',    initials:'ID', avatarColor:'#64748B', email:'i.dubois@fleetadmin.io',       phone:'+33 1 555-0505',    role:'Read-Only',   lastActive:'Jun 8, 2026',  status:'Active',    password:'!n3sDub0!s99'   },
  { id:'ADM-006', name:'Omar Farouk',    initials:'OF', avatarColor:'#0891B2', email:'o.farouk@fleetadmin.io',       phone:'+20 10 555-0606',   role:'Support',     lastActive:'Jun 10, 2026', status:'Active',    password:'0m@rFar0uk#6'   },
  { id:'ADM-007', name:'Lena Müller',    initials:'LM', avatarColor:'#DB2777', email:'l.muller@fleetadmin.io',       phone:'+49 89 555-0707',   role:'Admin',       lastActive:'Jun 7, 2026',  status:'Suspended', password:'L3n@Mull3r!7'   },
  { id:'ADM-008', name:'Tariq Hassan',   initials:'TH', avatarColor:'#D97706', email:'t.hassan@fleetadmin.io',       phone:'+971 50 555-0808',  role:'Billing',     lastActive:'Jun 12, 2026', status:'Active',    password:'T@r!qH@ss@n8'   },
  { id:'ADM-009', name:'Grace Okonkwo',  initials:'GO', avatarColor:'#6366F1', email:'g.okonkwo@fleetadmin.io',      phone:'+234 80 555-0909',  role:'Support',     lastActive:'Jun 9, 2026',  status:'Active',    password:'Gr@c30k0nkw0!'  },
  { id:'ADM-010', name:'Felix Andersen', initials:'FA', avatarColor:'#10B981', email:'f.andersen@fleetadmin.io',     phone:'+45 20 555-1010',   role:'Read-Only',   lastActive:'May 30, 2026', status:'Active',    password:'F3l!xAnd3rs3n'  },
  { id:'ADM-011', name:'Yuki Tanaka',    initials:'YT', avatarColor:'#EC4899', email:'y.tanaka@fleetadmin.io',       phone:'+81 90 555-1111',   role:'Super Admin', lastActive:'Jun 13, 2026', status:'Active',    password:'Yuk!T@n@k@#11'  },
  { id:'ADM-012', name:'Ravi Patel',     initials:'RP', avatarColor:'#F97316', email:'r.patel@fleetadmin.io',        phone:'+91 98 555-1212',   role:'Admin',       lastActive:'Jun 11, 2026', status:'Active',    password:'R@v!P@t3l2024'  },
  { id:'ADM-013', name:'Nora Johansson', initials:'NJ', avatarColor:'#8B5CF6', email:'n.johansson@fleetadmin.io',   phone:'+46 70 555-1313',   role:'Billing',     lastActive:'Jun 6, 2026',  status:'Suspended', password:'N0r@J0h@nss0n!'  },
  { id:'ADM-014', name:'Carlos Medina',  initials:'CM', avatarColor:'#14B8A6', email:'c.medina@fleetadmin.io',       phone:'+34 62 555-1414',   role:'Support',     lastActive:'Jun 13, 2026', status:'Active',    password:'C@rl0sM3d!n@14' },
];

let _nextId = SEED.length + 1;

// ── AdminModal (Create / Edit) ────────────────────────────────────────────────

function AdminModal({
  mode, initial, onClose, onSave,
}: {
  mode: 'create' | 'edit';
  initial: FormState;
  onClose: () => void;
  onSave: (f: FormState) => void;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const [showPass, setShowPass] = useState(false);

  const inp: React.CSSProperties = {
    width: '100%', height: 38, padding: '0 11px', borderRadius: 8,
    border: '1px solid var(--border)', backgroundColor: 'var(--background)',
    color: 'var(--foreground)', fontSize: '0.83rem', outline: 'none', boxSizing: 'border-box',
  };
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: '0.75rem', fontWeight: 600,
    color: 'var(--muted-foreground)', marginBottom: 5,
  };

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 40 }} onClick={onClose} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 50, width: 500, backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)' }}>
            {mode === 'create' ? 'Add Admin User' : 'Edit Admin User'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: 4, display: 'flex', borderRadius: 6 }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
            <X size={17} />
          </button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave(form); }}>
          <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>Full Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" style={inp} required />
              </div>
              <div>
                <label style={lbl}>Phone</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 (555) 000-0000" style={inp} />
              </div>
            </div>
            <div>
              <label style={lbl}>Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="admin@fleetadmin.io" style={inp} required />
            </div>
            <div>
              <label style={lbl}>Role</label>
              <CustomSelect
                value={form.role}
                options={ADMIN_ROLES}
                onChange={v => setForm(f => ({ ...f, role: v as AdminRole }))}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" style={{ ...inp, paddingRight: 36 }} required />
                  <button type="button" onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex', padding: 0 }}>
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label style={lbl}>Status</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {STATUSES.map(s => {
                    const active = form.status === s;
                    const color = s === 'Active' ? '#059669' : '#DC2626';
                    return (
                      <button key={s} type="button" onClick={() => setForm(f => ({ ...f, status: s }))}
                        style={{ flex: 1, padding: '7px 0', borderRadius: 8, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, backgroundColor: active ? (s === 'Active' ? '#ECFDF5' : '#FEF2F2') : 'var(--background)', border: `1px solid ${active ? color : 'var(--border)'}`, color: active ? color : 'var(--muted-foreground)' }}>
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, padding: '14px 22px', borderTop: '1px solid var(--border)' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, height: 38, borderRadius: 8, cursor: 'pointer', backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)', fontSize: '0.83rem', fontWeight: 500 }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--background)')}>
              Cancel
            </button>
            <button type="submit" style={{ flex: 2, height: 38, borderRadius: 8, cursor: 'pointer', background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', border: 'none', color: '#fff', fontSize: '0.83rem', fontWeight: 600 }}>
              {mode === 'create' ? 'Add Admin' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ── AdminDetailModal ──────────────────────────────────────────────────────────

function AdminDetailModal({ user, onClose, onEdit }: { user: AdminUser; onClose: () => void; onEdit: () => void }) {
  const [showPass, setShowPass] = useState(false);
  const rs = ROLE_STYLE[user.role];
  const ss = STATUS_CONFIG[user.status];

  const Field = ({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <span style={{ fontSize: '0.85rem', color: 'var(--foreground)', fontFamily: mono ? 'monospace' : undefined }}>{value}</span>
    </div>
  );

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 40 }} onClick={onClose} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 50, width: 460, backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)' }}>Admin Details</h2>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span style={{ display: 'inline-block', backgroundColor: rs.bg, color: rs.color, border: `1px solid ${rs.border}`, fontSize: '0.7rem', fontWeight: 700, padding: '2px 9px', borderRadius: 99 }}>{user.role}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: ss.dot }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 500, color: ss.color }}>{user.status}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Fields */}
        <div style={{ padding: '20px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <Field label="Admin ID"    value={user.id} mono />
          <Field label="Last Active" value={user.lastActive} />
          <Field label="Email"       value={user.email} mono />
          <Field label="Phone"       value={user.phone} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Password</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--foreground)', fontFamily: 'monospace' }}>
                {showPass ? user.password : '••••••••••'}
              </span>
              <button type="button" onClick={() => setShowPass(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex', padding: 0 }}>
                {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, padding: '14px 22px', borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} style={{ flex: 1, height: 38, borderRadius: 8, cursor: 'pointer', backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)', fontSize: '0.83rem', fontWeight: 500 }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--background)')}>
            Close
          </button>
          <button onClick={onEdit} style={{ flex: 2, height: 38, borderRadius: 8, cursor: 'pointer', background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', border: 'none', color: '#fff', fontSize: '0.83rem', fontWeight: 600 }}>
            Edit Admin
          </button>
        </div>
      </div>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type RoleFilter = 'all' | AdminRole;

const EMPTY_FORM: FormState = { name: '', email: '', phone: '', role: 'Support', status: 'Active', password: '' };

export default function AdminUsersPage() {
  const [rows, setRows]                 = useState<AdminUser[]>(SEED);
  const [search, setSearch]             = useState('');
  const [roleFilter, setRoleFilter]     = useState<RoleFilter>('all');
  const [page, setPage]                 = useState(1);

  const [createOpen, setCreateOpen]     = useState(false);
  const [editTarget, setEditTarget]     = useState<AdminUser | null>(null);
  const [viewTarget, setViewTarget]     = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

  const filtered = useMemo(() => {
    let r = rows;
    if (roleFilter !== 'all') r = r.filter(u => u.role === roleFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    return r;
  }, [rows, search, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const start      = filtered.length === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const end        = Math.min(page * PER_PAGE, filtered.length);
  function goPage(p: number) { setPage(Math.min(Math.max(1, p), totalPages)); }

  function handleCreate(f: FormState) {
    const ini = f.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    const newUser: AdminUser = {
      id: `ADM-${String(_nextId++).padStart(3, '0')}`,
      name: f.name, initials: ini,
      avatarColor: AVATAR_COLORS[_nextId % AVATAR_COLORS.length],
      email: f.email, phone: f.phone,
      role: f.role, status: f.status, password: f.password,
      lastActive: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };
    setRows(p => [newUser, ...p]);
    setCreateOpen(false);
  }

  function handleEdit(f: FormState) {
    if (!editTarget) return;
    const ini = f.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    setRows(p => p.map(u => u.id === editTarget.id ? { ...u, ...f, initials: ini } : u));
    setEditTarget(null);
  }

  function handleDelete(id: string) {
    setRows(p => p.filter(u => u.id !== id));
    setDeleteTarget(null);
  }

  const TH = ({ children, right }: { children: React.ReactNode; right?: boolean }) => (
    <th style={{ textAlign: right ? 'right' : 'left', padding: '9px 14px', fontSize: '0.68rem', fontWeight: 600, color: 'var(--muted-foreground)', letterSpacing: '0.07em', textTransform: 'uppercase', backgroundColor: 'var(--muted)', whiteSpace: 'nowrap' }}>
      {children}
    </th>
  );

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: 'var(--background)' }}>
      {/* Modals */}
      {createOpen   && <AdminModal mode="create" initial={EMPTY_FORM} onClose={() => setCreateOpen(false)} onSave={handleCreate} />}
      {editTarget   && <AdminModal mode="edit" initial={{ name: editTarget.name, email: editTarget.email, phone: editTarget.phone, role: editTarget.role, status: editTarget.status, password: editTarget.password }} onClose={() => setEditTarget(null)} onSave={handleEdit} />}
      {viewTarget   && <AdminDetailModal user={viewTarget} onClose={() => setViewTarget(null)} onEdit={() => { setEditTarget(viewTarget); setViewTarget(null); }} />}
      {deleteTarget && <DeleteConfirmModal title="Delete Admin" description={<>Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This action cannot be undone.</>} onCancel={() => setDeleteTarget(null)} onConfirm={() => handleDelete(deleteTarget.id)} />}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        {[
          { label: 'Total',     value: rows.length,                                       iconBg: '#2563EB' },
          { label: 'Active',    value: rows.filter(u => u.status === 'Active').length,    iconBg: '#10B981' },
          { label: 'Suspended', value: rows.filter(u => u.status === 'Suspended').length, iconBg: '#EF4444' },
        ].map(({ label, value, iconBg }) => (
          <div key={label} style={{ backgroundColor: 'var(--card)', borderRadius: 14, padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--muted-foreground)', marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: '1.7rem', fontWeight: 700, color: 'var(--foreground)', lineHeight: 1 }}>{value}</div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <ShieldCheck size={19} />
            </div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ color: 'var(--foreground)', fontSize: '1.3rem', fontWeight: 700, lineHeight: 1.2 }}>Admin Users</h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.83rem', marginTop: 3 }}>Manage internal super admin staff</p>
        </div>
        <button onClick={() => setCreateOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, cursor: 'pointer', background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', border: 'none', color: '#fff', fontSize: '0.82rem', fontWeight: 600 }}>
          <Plus size={15} /> Add Admin
        </button>
      </div>

      {/* Table card */}
      <div style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        {/* Controls */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 260 }}>
            <Search size={14} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none' }} />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search admins..." style={{ paddingLeft: 28, paddingRight: 10, height: 34, borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)', fontSize: '0.8rem', outline: 'none', width: '100%' }} />
          </div>
          <Dropdown<RoleFilter> label="Role" options={['all', ...ADMIN_ROLES]} value={roleFilter} onChange={v => { setRoleFilter(v); setPage(1); }} getOptionLabel={o => o === 'all' ? 'All Roles' : o} />
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr><TH>User</TH><TH>Email</TH><TH>Role</TH><TH>Last Active</TH><TH>Status</TH><TH right>Actions</TH></tr>
            </thead>
            <tbody>
              {paginated.map((u, i) => {
                const rs = ROLE_STYLE[u.role];
                const ss = STATUS_CONFIG[u.status];
                return (
                  <tr key={u.id} style={{ borderBottom: i < paginated.length - 1 ? '1px solid var(--border)' : 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                    <td style={{ padding: '11px 14px' }}>
                      <button onClick={() => setViewTarget(u)} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', backgroundColor: u.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 700 }}>{u.initials}</span>
                        </div>
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>{u.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)' }}>{u.id}</div>
                        </div>
                      </button>
                    </td>
                    <td style={{ padding: '11px 14px' }}><span style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', fontFamily: 'monospace' }}>{u.email}</span></td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ display: 'inline-block', backgroundColor: rs.bg, color: rs.color, border: `1px solid ${rs.border}`, fontSize: '0.7rem', fontWeight: 700, padding: '3px 9px', borderRadius: 99 }}>{u.role}</span>
                    </td>
                    <td style={{ padding: '11px 14px' }}><span style={{ fontSize: '0.82rem', color: 'var(--muted-foreground)' }}>{u.lastActive}</span></td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: ss.dot }} />
                        <span style={{ fontSize: '0.82rem', fontWeight: 500, color: ss.color }}>{u.status}</span>
                      </div>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                        <button onClick={() => setEditTarget(u)} title="Edit"
                          style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--background)')}>
                          <Pencil size={13} />
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
                <tr><td colSpan={6} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>No admins match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)' }}>Showing {start}–{end} of {filtered.length} admins</span>
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
      </div>
    </div>
  );
}
