import { useState, useMemo } from 'react';
import { Search, Plus, Pencil, Trash2, X, Users, Eye, EyeOff } from 'lucide-react';
import { FilterTabs, type TabItem } from '@/components/shared/FilterTabs';
import { Dropdown } from '@/components/shared/Dropdown';
import { DeleteConfirmModal } from '@/components/shared/DeleteConfirmModal';

// ── Types ─────────────────────────────────────────────────────────────────────

type Status = 'Active' | 'Suspended';
type Role   = 'Owner' | 'Dispatcher' | 'Updater' | 'Driver';

interface BoardUser {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  email: string;
  phone: string;
  company: string;
  role: Role;
  joinedDate: string;
  status: Status;
  password: string;
}

interface FormState {
  name: string; email: string; phone: string;
  company: string; role: Role; status: Status; password: string;
}

// ── Config ────────────────────────────────────────────────────────────────────

const PER_PAGE = 10;

const STATUS_CONFIG: Record<Status, { dot: string; color: string }> = {
  Active:    { dot: '#22C55E', color: '#15803D' },
  Suspended: { dot: '#EF4444', color: '#B91C1C' },
};

const ROLE_STYLE: Record<Role, { bg: string; color: string; border: string }> = {
  Owner:      { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
  Dispatcher: { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' },
  Updater:    { bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' },
  Driver:     { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
};

const ROLES: Role[] = ['Owner', 'Dispatcher', 'Updater', 'Driver'];
const STATUSES: Status[] = ['Active', 'Suspended'];

const AVATAR_COLORS = ['#6366F1','#10B981','#F59E0B','#EC4899','#2563EB','#8B5CF6','#14B8A6','#F97316','#0EA5E9','#DC2626'];

// ── Seed Data ─────────────────────────────────────────────────────────────────

const SEED: BoardUser[] = [
  { id:'BU-001', name:'James Whitfield',  initials:'JW', avatarColor:'#6366F1', email:'j.whitfield@acmecorp.io',   phone:'+1 (214) 555-0192', company:'Acme Corp',         role:'Owner',      joinedDate:'Jan 12, 2023', status:'Active',    password:'Acme@2024!'   },
  { id:'BU-002', name:'Maria Gonzalez',   initials:'MG', avatarColor:'#10B981', email:'m.gonzalez@helios.io',      phone:'+1 (312) 555-0438', company:'Helios Systems',    role:'Dispatcher', joinedDate:'Feb 3, 2023',  status:'Active',    password:'Heli0s#Pro'   },
  { id:'BU-003', name:'Derek Osei',       initials:'DO', avatarColor:'#F59E0B', email:'d.osei@orbitallabs.io',     phone:'+1 (404) 555-0271', company:'Orbital Labs',      role:'Updater',    joinedDate:'Feb 19, 2023', status:'Active',    password:'Orb!tal99'    },
  { id:'BU-004', name:'Linda Park',       initials:'LP', avatarColor:'#EC4899', email:'l.park@zenithfin.io',       phone:'+1 (650) 555-0384', company:'Zenith Finance',    role:'Owner',      joinedDate:'Mar 7, 2023',  status:'Active',    password:'Z3n!th$2025'  },
  { id:'BU-005', name:'Chris Adeyemi',    initials:'CA', avatarColor:'#2563EB', email:'c.adeyemi@novanet.io',      phone:'+1 (469) 555-0517', company:'Nova Networks',     role:'Dispatcher', joinedDate:'Mar 22, 2023', status:'Suspended', password:'Nov@Net#01'   },
  { id:'BU-006', name:'Samantha Lee',     initials:'SL', avatarColor:'#8B5CF6', email:'s.lee@apexfreight.io',      phone:'+1 (713) 555-0629', company:'Apex Freight',      role:'Driver',     joinedDate:'Apr 5, 2023',  status:'Active',    password:'Ap3xFr8!ght'  },
  { id:'BU-007', name:'Tobias Müller',    initials:'TM', avatarColor:'#14B8A6', email:'t.muller@crestline.io',     phone:'+49 30 555-0741',   company:'Crestline Cargo',   role:'Dispatcher', joinedDate:'Apr 18, 2023', status:'Active',    password:'Cr3st!2024'   },
  { id:'BU-008', name:'Amara Nwosu',      initials:'AN', avatarColor:'#F97316', email:'a.nwosu@summitlogi.io',     phone:'+1 (832) 555-0853', company:'Summit Logistics',  role:'Updater',    joinedDate:'May 2, 2023',  status:'Active',    password:'Summ!t@9'     },
  { id:'BU-009', name:'Ryan Torres',      initials:'RT', avatarColor:'#0EA5E9', email:'r.torres@bluesky.io',       phone:'+1 (972) 555-0964', company:'BlueSky Haulers',   role:'Driver',     joinedDate:'May 14, 2023', status:'Active',    password:'BlueSky$22'   },
  { id:'BU-010', name:'Fatima Al-Rashid', initials:'FA', avatarColor:'#6366F1', email:'f.alrashid@ironbridge.io',  phone:'+966 50 555-1075',  company:'IronBridge Co.',    role:'Owner',      joinedDate:'May 29, 2023', status:'Active',    password:'Ir0nBr!dge#'  },
  { id:'BU-011', name:'Kwame Asante',     initials:'KA', avatarColor:'#10B981', email:'k.asante@vanguard.io',      phone:'+233 24 555-1186',  company:'Vanguard Fleet',    role:'Dispatcher', joinedDate:'Jun 10, 2023', status:'Suspended', password:'V@ngr!d2024'  },
  { id:'BU-012', name:'Priya Sharma',     initials:'PS', avatarColor:'#EC4899', email:'p.sharma@trident.io',       phone:'+91 98 555-1297',   company:'Trident Supply',    role:'Updater',    joinedDate:'Jun 23, 2023', status:'Active',    password:'Tr!d3nt$up'   },
  { id:'BU-013', name:'Marcus Webb',      initials:'MW', avatarColor:'#F59E0B', email:'m.webb@redline.io',         phone:'+1 (615) 555-1308', company:'Redline Transport', role:'Driver',     joinedDate:'Jul 4, 2023',  status:'Active',    password:'R3dL!ne#23'   },
  { id:'BU-014', name:'Naomi Okafor',     initials:'NO', avatarColor:'#2563EB', email:'n.okafor@clearpath.io',     phone:'+234 80 555-1419',  company:'Clearpath Inc.',    role:'Owner',      joinedDate:'Jul 17, 2023', status:'Active',    password:'Cl3@rP@th99'  },
  { id:'BU-015', name:'Ethan Blackwell',  initials:'EB', avatarColor:'#8B5CF6', email:'e.blackwell@fusion.io',     phone:'+1 (503) 555-1520', company:'Fusion Carriers',   role:'Dispatcher', joinedDate:'Aug 1, 2023',  status:'Active',    password:'Fus!0nC@rr'   },
  { id:'BU-016', name:'Sofia Reyes',      initials:'SR', avatarColor:'#14B8A6', email:'s.reyes@acmecorp.io',       phone:'+1 (512) 555-1631', company:'Acme Corp',         role:'Updater',    joinedDate:'Aug 14, 2023', status:'Active',    password:'S0f!aR3yes'   },
  { id:'BU-017', name:'James Obi',        initials:'JO', avatarColor:'#F97316', email:'j.obi@helios.io',           phone:'+234 80 555-1742',  company:'Helios Systems',    role:'Driver',     joinedDate:'Aug 28, 2023', status:'Suspended', password:'J@mes0b!99'   },
  { id:'BU-018', name:'Hana Yoshida',     initials:'HY', avatarColor:'#DC2626', email:'h.yoshida@apexfreight.io',  phone:'+81 90 555-1853',   company:'Apex Freight',      role:'Owner',      joinedDate:'Sep 9, 2023',  status:'Active',    password:'H@naY0sh!da'  },
  { id:'BU-019', name:'Leo Fernandez',    initials:'LF', avatarColor:'#059669', email:'l.fernandez@summit.io',     phone:'+1 (305) 555-1964', company:'Summit Logistics',  role:'Dispatcher', joinedDate:'Sep 22, 2023', status:'Active',    password:'Le0Fern@ndez' },
  { id:'BU-020', name:'Ava Mitchell',     initials:'AM', avatarColor:'#7C3AED', email:'a.mitchell@ironbridge.io',  phone:'+1 (206) 555-2075', company:'IronBridge Co.',    role:'Updater',    joinedDate:'Oct 5, 2023',  status:'Active',    password:'Av@M!tch3ll'  },
];

let _nextId = SEED.length + 1;
const COMPANIES = Array.from(new Set(SEED.map(u => u.company))).sort();

type TabId = 'all' | Status;
const TABS: TabItem<TabId>[] = [
  { id: 'all',       label: 'All' },
  { id: 'Active',    label: 'Active' },
  { id: 'Suspended', label: 'Suspended' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

// ── UserModal (Create / Edit) ─────────────────────────────────────────────────

function UserModal({
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
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 50, width: 500, backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)' }}>
            {mode === 'create' ? 'Add Board User' : 'Edit Board User'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: 4, display: 'flex', borderRadius: 6 }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
            <X size={17} />
          </button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave(form); }}>
          <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '65vh', overflowY: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>Full Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="John Doe" style={inp} required />
              </div>
              <div>
                <label style={lbl}>Phone</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 (555) 000-0000" style={inp} />
              </div>
            </div>
            <div>
              <label style={lbl}>Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="user@company.io" style={inp} required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>Company</label>
                <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Company name" style={inp} required />
              </div>
              <div>
                <label style={lbl}>Role</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {ROLES.map(r => {
                    const s = ROLE_STYLE[r];
                    const active = form.role === r;
                    return (
                      <button key={r} type="button" onClick={() => setForm(f => ({ ...f, role: r }))}
                        style={{ padding: '5px 10px', borderRadius: 99, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, backgroundColor: active ? s.bg : 'var(--background)', border: `1px solid ${active ? s.color : 'var(--border)'}`, color: active ? s.color : 'var(--muted-foreground)' }}>
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>
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
              {mode === 'create' ? 'Add User' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ── UserDetailModal ───────────────────────────────────────────────────────────

function UserDetailModal({ user, onClose, onEdit }: { user: BoardUser; onClose: () => void; onEdit: () => void }) {
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
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 50, width: 480, backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)' }}>User Details</h2>
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
          <Field label="User ID"   value={user.id} mono />
          <Field label="Joined"    value={user.joinedDate} />
          <Field label="Email"     value={user.email} mono />
          <Field label="Phone"     value={user.phone} />
          <Field label="Company"   value={user.company} />
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

        {/* Footer */}
        <div style={{ display: 'flex', gap: 8, padding: '14px 22px', borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} style={{ flex: 1, height: 38, borderRadius: 8, cursor: 'pointer', backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)', fontSize: '0.83rem', fontWeight: 500 }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--background)')}>
            Close
          </button>
          <button onClick={onEdit} style={{ flex: 2, height: 38, borderRadius: 8, cursor: 'pointer', background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', border: 'none', color: '#fff', fontSize: '0.83rem', fontWeight: 600 }}>
            Edit User
          </button>
        </div>
      </div>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type CompanyFilter = 'all' | string;
type RoleFilter    = 'all' | Role;

const EMPTY_FORM: FormState = { name: '', email: '', phone: '', company: '', role: 'Owner', status: 'Active', password: '' };

export default function BoardUsersPage() {
  const [rows, setRows]                 = useState<BoardUser[]>(SEED);
  const [tab, setTab]                   = useState<TabId>('all');
  const [search, setSearch]             = useState('');
  const [companyFilter, setCompanyFilter] = useState<CompanyFilter>('all');
  const [roleFilter, setRoleFilter]     = useState<RoleFilter>('all');
  const [page, setPage]                 = useState(1);

  const [createOpen, setCreateOpen]     = useState(false);
  const [editTarget, setEditTarget]     = useState<BoardUser | null>(null);
  const [viewTarget, setViewTarget]     = useState<BoardUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BoardUser | null>(null);

  const filtered = useMemo(() => {
    let r = rows;
    if (tab !== 'all')           r = r.filter(u => u.status  === tab);
    if (companyFilter !== 'all') r = r.filter(u => u.company === companyFilter);
    if (roleFilter    !== 'all') r = r.filter(u => u.role    === roleFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.company.toLowerCase().includes(q));
    }
    return r;
  }, [rows, tab, search, companyFilter, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const start      = filtered.length === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const end        = Math.min(page * PER_PAGE, filtered.length);
  function goPage(p: number) { setPage(Math.min(Math.max(1, p), totalPages)); }

  function handleCreate(f: FormState) {
    const ini = initials(f.name);
    const newUser: BoardUser = {
      id: `BU-${String(_nextId++).padStart(3, '0')}`,
      name: f.name, initials: ini,
      avatarColor: AVATAR_COLORS[_nextId % AVATAR_COLORS.length],
      email: f.email, phone: f.phone, company: f.company,
      role: f.role, status: f.status, password: f.password,
      joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };
    setRows(p => [newUser, ...p]);
    setCreateOpen(false);
  }

  function handleEdit(f: FormState) {
    if (!editTarget) return;
    setRows(p => p.map(u => u.id === editTarget.id ? { ...u, ...f, initials: initials(f.name) } : u));
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
      {createOpen   && <UserModal mode="create" initial={EMPTY_FORM} onClose={() => setCreateOpen(false)} onSave={handleCreate} />}
      {editTarget   && <UserModal mode="edit" initial={{ name: editTarget.name, email: editTarget.email, phone: editTarget.phone, company: editTarget.company, role: editTarget.role, status: editTarget.status, password: editTarget.password }} onClose={() => setEditTarget(null)} onSave={handleEdit} />}
      {viewTarget   && <UserDetailModal user={viewTarget} onClose={() => setViewTarget(null)} onEdit={() => { setEditTarget(viewTarget); setViewTarget(null); }} />}
      {deleteTarget && <DeleteConfirmModal title="Delete User" description={<>Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This action cannot be undone.</>} onCancel={() => setDeleteTarget(null)} onConfirm={() => handleDelete(deleteTarget.id)} />}

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
              <Users size={19} />
            </div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ color: 'var(--foreground)', fontSize: '1.3rem', fontWeight: 700, lineHeight: 1.2 }}>Board Users</h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.83rem', marginTop: 3 }}>Management of all users within tenant workspaces</p>
        </div>
        <button onClick={() => setCreateOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, cursor: 'pointer', background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', border: 'none', color: '#fff', fontSize: '0.82rem', fontWeight: 600 }}>
          <Plus size={15} /> Add Board User
        </button>
      </div>

      {/* Table card */}
      <div style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        {/* Controls */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <FilterTabs<TabId> tabs={TABS} active={tab} onChange={t => { setTab(t); setPage(1); }} />
          <div style={{ flex: 1 }} />
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none' }} />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search users..." style={{ paddingLeft: 28, paddingRight: 10, height: 34, borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)', fontSize: '0.8rem', outline: 'none', width: 190 }} />
          </div>
          <Dropdown<CompanyFilter> label="Company" options={['all', ...COMPANIES]} value={companyFilter} onChange={v => { setCompanyFilter(v); setPage(1); }} getOptionLabel={o => o === 'all' ? 'All Companies' : o} />
          <Dropdown<RoleFilter> label="Role" options={['all', ...ROLES]} value={roleFilter} onChange={v => { setRoleFilter(v); setPage(1); }} getOptionLabel={o => o === 'all' ? 'All Roles' : o} />
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr><TH>User</TH><TH>Email</TH><TH>Company</TH><TH>Role</TH><TH>Joined</TH><TH>Status</TH><TH right>Actions</TH></tr>
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
                    <td style={{ padding: '11px 14px' }}><span style={{ fontSize: '0.83rem', color: 'var(--foreground)' }}>{u.company}</span></td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ display: 'inline-block', backgroundColor: rs.bg, color: rs.color, border: `1px solid ${rs.border}`, fontSize: '0.7rem', fontWeight: 700, padding: '3px 9px', borderRadius: 99 }}>{u.role}</span>
                    </td>
                    <td style={{ padding: '11px 14px' }}><span style={{ fontSize: '0.82rem', color: 'var(--muted-foreground)' }}>{u.joinedDate}</span></td>
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
                <tr><td colSpan={7} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>No users match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)' }}>Showing {start}–{end} of {filtered.length} users</span>
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
