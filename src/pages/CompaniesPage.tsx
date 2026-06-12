import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search, Building2, CheckCircle2, Clock, XCircle,
  MoreVertical, Plus, Download, Eye, Pencil, Trash2, X,
} from 'lucide-react';
import { FilterTabs, type TabItem } from '@/components/shared/FilterTabs';
import { Dropdown } from '@/components/shared/Dropdown';
import { DeleteConfirmModal } from '@/components/shared/DeleteConfirmModal';

// ── Types ─────────────────────────────────────────────────────────────────────

type Status = 'Active' | 'Pending' | 'Suspended';
type Plan   = 'Enterprise' | 'Professional' | 'Starter' | 'Basic';

interface Company {
  id: string;
  name: string;
  initials: string;
  logoColor: string;
  owner: string;
  ownerEmail: string;
  ownerInitials: string;
  ownerColor: string;
  plan: Plan;
  registeredDate: string;
  status: Status;
}

// ── Data ──────────────────────────────────────────────────────────────────────

const SEED: Company[] = [
  { id:'CMP-00041', name:'Acme Corp',        initials:'AC', logoColor:'#2563EB', owner:'James Whitfield',   ownerEmail:'james@acme.io',       ownerInitials:'JW', ownerColor:'#6366F1', plan:'Enterprise',   registeredDate:'Jan 12, 2023', status:'Active'    },
  { id:'CMP-00042', name:'Helios Systems',   initials:'HS', logoColor:'#8B5CF6', owner:'Maria Gonzalez',    ownerEmail:'maria@helios.io',      ownerInitials:'MG', ownerColor:'#10B981', plan:'Professional', registeredDate:'Feb 3, 2023',  status:'Active'    },
  { id:'CMP-00043', name:'Orbital Labs',     initials:'OL', logoColor:'#10B981', owner:'Derek Osei',        ownerEmail:'derek@orbital.dev',    ownerInitials:'DO', ownerColor:'#F59E0B', plan:'Starter',      registeredDate:'Feb 19, 2023', status:'Pending'   },
  { id:'CMP-00044', name:'Zenith Finance',   initials:'ZF', logoColor:'#F59E0B', owner:'Linda Park',        ownerEmail:'linda@zenith.com',     ownerInitials:'LP', ownerColor:'#EC4899', plan:'Enterprise',   registeredDate:'Mar 7, 2023',  status:'Active'    },
  { id:'CMP-00045', name:'Nova Networks',    initials:'NN', logoColor:'#EC4899', owner:'Chris Adeyemi',     ownerEmail:'chris@novanet.io',     ownerInitials:'CA', ownerColor:'#2563EB', plan:'Basic',        registeredDate:'Mar 22, 2023', status:'Suspended' },
  { id:'CMP-00046', name:'Apex Freight',     initials:'AF', logoColor:'#14B8A6', owner:'Samantha Lee',      ownerEmail:'sam@apexfreight.com',  ownerInitials:'SL', ownerColor:'#8B5CF6', plan:'Professional', registeredDate:'Apr 5, 2023',  status:'Active'    },
  { id:'CMP-00047', name:'Crestline Cargo',  initials:'CC', logoColor:'#6366F1', owner:'Tobias Müller',     ownerEmail:'tobias@crestline.de',  ownerInitials:'TM', ownerColor:'#14B8A6', plan:'Starter',      registeredDate:'Apr 18, 2023', status:'Active'    },
  { id:'CMP-00048', name:'Summit Logistics', initials:'SL', logoColor:'#F97316', owner:'Amara Nwosu',       ownerEmail:'amara@summitlogi.co',  ownerInitials:'AN', ownerColor:'#F97316', plan:'Enterprise',   registeredDate:'May 2, 2023',  status:'Pending'   },
  { id:'CMP-00049', name:'BlueSky Haulers',  initials:'BH', logoColor:'#0EA5E9', owner:'Ryan Torres',       ownerEmail:'ryan@bluesky.io',      ownerInitials:'RT', ownerColor:'#0EA5E9', plan:'Basic',        registeredDate:'May 14, 2023', status:'Active'    },
  { id:'CMP-00050', name:'IronBridge Co.',   initials:'IB', logoColor:'#64748B', owner:'Fatima Al-Rashid',  ownerEmail:'fatima@ironbridge.sa', ownerInitials:'FA', ownerColor:'#6366F1', plan:'Professional', registeredDate:'May 29, 2023', status:'Active'    },
  { id:'CMP-00051', name:'Vanguard Fleet',   initials:'VF', logoColor:'#DC2626', owner:'Kwame Asante',      ownerEmail:'kwame@vanguard.gh',    ownerInitials:'KA', ownerColor:'#10B981', plan:'Enterprise',   registeredDate:'Jun 10, 2023', status:'Suspended' },
  { id:'CMP-00052', name:'Trident Supply',   initials:'TS', logoColor:'#7C3AED', owner:'Priya Sharma',      ownerEmail:'priya@trident.in',     ownerInitials:'PS', ownerColor:'#EC4899', plan:'Starter',      registeredDate:'Jun 23, 2023', status:'Active'    },
  { id:'CMP-00053', name:'Redline Transport',initials:'RT', logoColor:'#EF4444', owner:'Marcus Webb',       ownerEmail:'marcus@redline.com',   ownerInitials:'MW', ownerColor:'#F59E0B', plan:'Basic',        registeredDate:'Jul 4, 2023',  status:'Pending'   },
  { id:'CMP-00054', name:'Clearpath Inc.',   initials:'CI', logoColor:'#059669', owner:'Naomi Okafor',      ownerEmail:'naomi@clearpath.ng',   ownerInitials:'NO', ownerColor:'#2563EB', plan:'Professional', registeredDate:'Jul 17, 2023', status:'Active'    },
  { id:'CMP-00055', name:'Fusion Carriers',  initials:'FC', logoColor:'#D97706', owner:'Ethan Blackwell',   ownerEmail:'ethan@fusioncarr.co',  ownerInitials:'EB', ownerColor:'#8B5CF6', plan:'Enterprise',   registeredDate:'Aug 1, 2023',  status:'Active'    },
];

// ── Config ────────────────────────────────────────────────────────────────────

const PLAN_STYLE: Record<Plan, { bg: string; color: string }> = {
  Enterprise:   { bg: '#EFF6FF', color: '#2563EB' },
  Professional: { bg: '#F5F3FF', color: '#7C3AED' },
  Starter:      { bg: '#ECFDF5', color: '#059669' },
  Basic:        { bg: '#FFF7ED', color: '#C2410C' },
};

const STATUS_CONFIG: Record<Status, { dot: string; color: string }> = {
  Active:    { dot: '#22C55E', color: '#15803D' },
  Pending:   { dot: '#F59E0B', color: '#B45309' },
  Suspended: { dot: '#EF4444', color: '#B91C1C' },
};

type TabId = 'all' | Status;
const TABS: TabItem<TabId>[] = [
  { id: 'all',       label: 'All',       count: 462, icon: <Building2 size={13} />    },
  { id: 'Active',    label: 'Active',    count: 450, icon: <CheckCircle2 size={13} /> },
  { id: 'Pending',   label: 'Pending',   count: 12,  icon: <Clock size={13} />        },
  { id: 'Suspended', label: 'Suspended', count: 5,   icon: <XCircle size={13} />      },
];

const STATUS_OPTS: ('all' | Status)[] = ['all', 'Active', 'Pending', 'Suspended'];
const PLAN_OPTS:   ('all' | Plan)[]   = ['all', 'Enterprise', 'Professional', 'Starter', 'Basic'];

const PER_PAGE = 10;
let _nextId = 56;

// ── Row actions dropdown ──────────────────────────────────────────────────────

function ActionsMenu({ company, onView, onEdit, onDelete }: {
  company: Company;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
        style={{ color: 'var(--muted-foreground)', backgroundColor: 'transparent' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--muted)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
      >
        <MoreVertical size={16} />
      </button>

      {open && (
        <div
          className="absolute right-0 z-30 rounded-xl overflow-hidden py-1"
          style={{
            top: 'calc(100% + 4px)',
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
            minWidth: 160,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {[
            { icon: <Eye size={14} />,    label: 'View Details',  color: 'var(--foreground)', action: onView   },
            { icon: <Pencil size={14} />, label: 'Edit Company',  color: 'var(--foreground)', action: onEdit   },
          ].map(({ icon, label, color, action }) => (
            <button key={label} onClick={() => { action(); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 transition-colors"
              style={{ fontSize: '0.8rem', color, backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--muted)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
            >
              {icon} {label}
            </button>
          ))}
          <div style={{ borderTop: '1px solid var(--border)', margin: '2px 0' }} />
          <button onClick={() => { onDelete(); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 transition-colors"
            style={{ fontSize: '0.8rem', color: '#DC2626', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#FEF2F2'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
          >
            <Trash2 size={14} /> Delete Company
          </button>
        </div>
      )}
    </div>
  );
}

// ── Company form modal (create / edit) ────────────────────────────────────────

interface FormState { name: string; ownerName: string; ownerEmail: string; plan: Plan; status: Status; }
const EMPTY_FORM: FormState = { name: '', ownerName: '', ownerEmail: '', plan: 'Starter', status: 'Active' };

function CompanyModal({ mode, initial, onClose, onSave }: {
  mode: 'create' | 'edit';
  initial?: Partial<FormState>;
  onClose: () => void;
  onSave: (f: FormState) => void;
}) {
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM, ...initial });
  const [errors, setErrors] = useState<Partial<FormState>>({});

  function validate() {
    const e: Partial<FormState> = {};
    if (!form.name.trim())      e.name = 'Required';
    if (!form.ownerName.trim()) e.ownerName = 'Required';
    return e;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave(form);
  }

  const field = (label: string, key: keyof FormState, type = 'text', placeholder = '') => (
    <div>
      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, color: 'var(--muted-foreground)', marginBottom: 5 }}>
        {label}
      </label>
      <input
        type={type}
        value={form[key] as string}
        placeholder={placeholder}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        style={{
          width: '100%', padding: '8px 12px', borderRadius: 8,
          border: `1px solid ${errors[key] ? '#EF4444' : 'var(--border)'}`,
          fontSize: '0.83rem', color: 'var(--foreground)',
          backgroundColor: 'var(--muted)', outline: 'none',
          boxSizing: 'border-box',
        }}
      />
      {errors[key] && <span style={{ fontSize: '0.72rem', color: '#EF4444', marginTop: 3, display: 'block' }}>{errors[key]}</span>}
    </div>
  );

  const selectField = <T extends string>(label: string, key: keyof FormState, options: T[]) => (
    <div>
      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, color: 'var(--muted-foreground)', marginBottom: 5 }}>
        {label}
      </label>
      <select
        value={form[key] as string}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value as T }))}
        style={{
          width: '100%', padding: '8px 12px', borderRadius: 8,
          border: '1px solid var(--border)', fontSize: '0.83rem',
          color: 'var(--foreground)', backgroundColor: 'var(--card)', outline: 'none',
          boxSizing: 'border-box', cursor: 'pointer',
        }}
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
      <div className="rounded-2xl shadow-2xl w-full overflow-hidden"
        style={{ backgroundColor: 'var(--card)', maxWidth: 440, border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)' }}>
            {mode === 'create' ? 'Add New Company' : 'Edit Company'}
          </h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg"
            style={{ color: 'var(--muted-foreground)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--muted)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          {field('Company Name', 'name', 'text', 'e.g. Acme Corp')}
          {field('Owner Name', 'ownerName', 'text', 'e.g. Jane Smith')}
          {field('Owner Email', 'ownerEmail', 'email', 'jane@company.com')}
          <div className="grid grid-cols-2 gap-3">
            {selectField<Plan>('Plan', 'plan', ['Enterprise', 'Professional', 'Starter', 'Basic'])}
            {selectField<Status>('Status', 'status', ['Active', 'Pending', 'Suspended'])}
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-lg transition-colors"
              style={{ fontSize: '0.83rem', fontWeight: 500, color: 'var(--foreground)', backgroundColor: 'var(--muted)', border: '1px solid var(--border)', cursor: 'pointer' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#E5E7EB'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--muted)'; }}
            >
              Cancel
            </button>
            <button type="submit"
              className="flex-1 py-2 rounded-lg transition-colors"
              style={{ fontSize: '0.83rem', fontWeight: 600, color: '#fff', background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', border: 'none', cursor: 'pointer' }}
            >
              {mode === 'create' ? 'Add Company' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CompaniesPage() {
  const [rows, setRows]               = useState<Company[]>(SEED);
  const [tab, setTab]                 = useState<TabId>('Active');
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all');
  const [planFilter,   setPlanFilter]   = useState<'all' | Plan>('all');
  const [page, setPage]               = useState(1);

  const [createOpen,   setCreateOpen]   = useState(false);
  const [editTarget,   setEditTarget]   = useState<Company | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);

  const filtered = useMemo(() => rows.filter((c) => {
    if (tab !== 'all' && c.status !== tab) return false;
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (planFilter   !== 'all' && c.plan   !== planFilter)   return false;
    if (search) {
      const q = search.toLowerCase();
      if (!c.name.toLowerCase().includes(q) && !c.owner.toLowerCase().includes(q) && !c.id.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [rows, tab, statusFilter, planFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  function goPage(p: number) { setPage(Math.min(Math.max(1, p), totalPages)); }

  function handleCreate(f: FormState) {
    const words = f.name.split(' ');
    const initials = words.map((w) => w[0]).slice(0, 2).join('').toUpperCase();
    const COLORS = ['#2563EB','#8B5CF6','#10B981','#F59E0B','#EC4899','#14B8A6','#6366F1','#F97316'];
    const newCompany: Company = {
      id: `CMP-000${_nextId++}`,
      name: f.name,
      initials,
      logoColor: COLORS[_nextId % COLORS.length],
      owner: f.ownerName,
      ownerEmail: f.ownerEmail,
      ownerInitials: f.ownerName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase(),
      ownerColor: COLORS[(_nextId + 3) % COLORS.length],
      plan: f.plan,
      registeredDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: f.status,
    };
    setRows((prev) => [newCompany, ...prev]);
    setCreateOpen(false);
  }

  function handleEdit(f: FormState) {
    if (!editTarget) return;
    setRows((prev) => prev.map((c) => c.id === editTarget.id ? { ...c, name: f.name, owner: f.ownerName, ownerEmail: f.ownerEmail, plan: f.plan, status: f.status } : c));
    setEditTarget(null);
  }

  function handleDelete(id: string) {
    setRows((prev) => prev.filter((c) => c.id !== id));
    setDeleteTarget(null);
    if (paginated.length === 1 && page > 1) setPage((p) => p - 1);
  }

  const start = filtered.length === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const end   = Math.min(page * PER_PAGE, filtered.length);

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: 'var(--background)' }}>

      {/* Modals */}
      {createOpen && (
        <CompanyModal mode="create" onClose={() => setCreateOpen(false)} onSave={handleCreate} />
      )}
      {editTarget && (
        <CompanyModal
          mode="edit"
          initial={{ name: editTarget.name, ownerName: editTarget.owner, ownerEmail: editTarget.ownerEmail, plan: editTarget.plan, status: editTarget.status }}
          onClose={() => setEditTarget(null)}
          onSave={handleEdit}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          title="Delete Company?"
          description={<>You are about to permanently delete <strong style={{ color: 'var(--foreground)' }}>{deleteTarget.name}</strong>. This cannot be undone.</>}
          onConfirm={() => handleDelete(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Page header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 style={{ color: 'var(--foreground)', fontSize: '1.3rem', fontWeight: 700, lineHeight: 1.2 }}>
            Companies
          </h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.83rem', marginTop: 3 }}>
            Total Companies: <strong style={{ color: 'var(--foreground)' }}>450 active</strong>, 12 pending
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:8, fontSize:'0.82rem', fontWeight:500, color:'var(--foreground)', backgroundColor:'var(--card)', border:'1px solid var(--border)', cursor:'pointer' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--card)')}
          >
            <Download size={15} /> Export
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:8, fontSize:'0.82rem', fontWeight:600, color:'#fff', background:'linear-gradient(135deg,#2563EB 0%,#1D4ED8 100%)', border:'none', cursor:'pointer' }}
          >
            <Plus size={15} /> New Company
          </button>
        </div>
      </div>

      {/* Card */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor:'var(--card)', border:'1px solid var(--border)' }}>

        {/* Controls bar */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 flex-wrap" style={{ borderBottom:'1px solid var(--border)' }}>
          <FilterTabs<TabId>
            tabs={TABS}
            active={tab}
            onChange={(id) => { setTab(id); setPage(1); }}
          />

          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {/* Search */}
            <div style={{ display:'flex', alignItems:'center', gap:8, backgroundColor:'var(--muted)', border:'1px solid var(--border)', borderRadius:8, padding:'7px 12px', width:220 }}>
              <Search size={14} style={{ color:'var(--muted-foreground)', flexShrink:0 }} />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search companies..."
                style={{ background:'transparent', border:'none', outline:'none', fontSize:'0.8rem', color:'var(--foreground)', width:'100%' }}
              />
            </div>
            <Dropdown<'all' | Status>
              label="Status"
              options={STATUS_OPTS}
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v); setPage(1); }}
            />
            <Dropdown<'all' | Plan>
              label="Plan"
              options={PLAN_OPTS}
              value={planFilter}
              onChange={(v) => { setPlanFilter(v); setPage(1); }}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--border)' }}>
                {['#', 'Company', 'Owner', 'Plan', 'Registered', 'Status', 'Actions'].map((h) => (
                  <th key={h} style={{ textAlign:'left', padding:'9px 16px', fontSize:'0.7rem', fontWeight:600, color:'var(--muted-foreground)', letterSpacing:'0.07em', textTransform:'uppercase', backgroundColor:'var(--muted)', whiteSpace:'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign:'center', padding:'56px 0', color:'var(--muted-foreground)', fontSize:'0.85rem' }}>
                    No companies match your filters.
                  </td>
                </tr>
              ) : paginated.map((c, i) => {
                const plan   = PLAN_STYLE[c.plan];
                const status = STATUS_CONFIG[c.status];
                return (
                  <tr key={c.id}
                    style={{ borderBottom: i < paginated.length - 1 ? '1px solid var(--border)' : 'none', cursor:'default' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FAFBFF')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {/* ID */}
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ fontFamily:"'JetBrains Mono','Courier New',monospace", fontSize:'0.7rem', color:'var(--muted-foreground)', letterSpacing:'0.02em' }}>
                        {c.id}
                      </span>
                    </td>

                    {/* Company */}
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:34, height:34, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, backgroundColor: c.logoColor + '1A', color: c.logoColor }}>
                          <span style={{ fontSize:'0.62rem', fontWeight:700 }}>{c.initials}</span>
                        </div>
                        <span style={{ fontSize:'0.83rem', fontWeight:600, color:'var(--foreground)', whiteSpace:'nowrap' }}>{c.name}</span>
                      </div>
                    </td>

                    {/* Owner */}
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                        <div style={{ width:30, height:30, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, backgroundColor: c.ownerColor + '22', color: c.ownerColor }}>
                          <span style={{ fontSize:'0.58rem', fontWeight:700 }}>{c.ownerInitials}</span>
                        </div>
                        <div>
                          <div style={{ fontSize:'0.8rem', fontWeight:500, color:'var(--foreground)', whiteSpace:'nowrap' }}>{c.owner}</div>
                          <div style={{ fontSize:'0.72rem', color:'var(--muted-foreground)', whiteSpace:'nowrap' }}>{c.ownerEmail}</div>
                        </div>
                      </div>
                    </td>

                    {/* Plan */}
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ display:'inline-block', padding:'3px 10px', borderRadius:999, fontSize:'0.72rem', fontWeight:600, backgroundColor: plan.bg, color: plan.color, whiteSpace:'nowrap' }}>
                        {c.plan}
                      </span>
                    </td>

                    {/* Registered */}
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ fontSize:'0.8rem', color:'var(--muted-foreground)', whiteSpace:'nowrap' }}>{c.registeredDate}</span>
                    </td>

                    {/* Status */}
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ width:7, height:7, borderRadius:'50%', backgroundColor: status.dot, flexShrink:0, display:'inline-block' }} />
                        <span style={{ fontSize:'0.8rem', fontWeight:500, color: status.color, whiteSpace:'nowrap' }}>{c.status}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ padding:'12px 16px' }}>
                      <ActionsMenu
                        company={c}
                        onView={() => {}}
                        onEdit={() => setEditTarget(c)}
                        onDelete={() => setDeleteTarget(c)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 16px', borderTop:'1px solid var(--border)' }}>
          <span style={{ fontSize:'0.78rem', color:'var(--muted-foreground)' }}>
            Showing {start}–{end} of {filtered.length} companies
          </span>
          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            <button
              onClick={() => goPage(page - 1)} disabled={page === 1}
              style={{ padding:'5px 12px', borderRadius:7, fontSize:'0.78rem', fontWeight:500, cursor: page === 1 ? 'not-allowed' : 'pointer', color: page === 1 ? 'var(--muted-foreground)' : 'var(--foreground)', backgroundColor:'var(--card)', border:'1px solid var(--border)', opacity: page === 1 ? 0.5 : 1 }}
            >
              Prev
            </button>

            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = totalPages <= 7 ? i + 1 : i < 3 ? i + 1 : i === 3 ? -1 : totalPages - (6 - i);
              if (p === -1) return <span key="ellipsis" style={{ padding:'0 4px', color:'var(--muted-foreground)', fontSize:'0.78rem' }}>…</span>;
              return (
                <button key={p} onClick={() => goPage(p)}
                  style={{ width:30, height:30, borderRadius:7, fontSize:'0.78rem', fontWeight: p === page ? 600 : 400, cursor:'pointer', backgroundColor: p === page ? '#2563EB' : 'transparent', color: p === page ? '#fff' : 'var(--muted-foreground)', border:'none' }}
                  onMouseEnter={(e) => { if (p !== page) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--muted)'; }}
                  onMouseLeave={(e) => { if (p !== page) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
                >
                  {p}
                </button>
              );
            })}

            <button
              onClick={() => goPage(page + 1)} disabled={page === totalPages}
              style={{ padding:'5px 12px', borderRadius:7, fontSize:'0.78rem', fontWeight:500, cursor: page === totalPages ? 'not-allowed' : 'pointer', color: page === totalPages ? 'var(--muted-foreground)' : 'var(--foreground)', backgroundColor:'var(--card)', border:'1px solid var(--border)', opacity: page === totalPages ? 0.5 : 1 }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
