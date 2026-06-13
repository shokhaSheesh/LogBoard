import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search, Building2, CheckCircle2, Clock, XCircle,
  MoreVertical, Plus, Download, Eye, EyeOff, Pencil, Trash2, X,
  Phone, Send, Shield, Camera, ChevronDown, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { FilterTabs, type TabItem } from '@/components/shared/FilterTabs';
import { Dropdown } from '@/components/shared/Dropdown';
import { DeleteConfirmModal } from '@/components/shared/DeleteConfirmModal';

// ── Types ─────────────────────────────────────────────────────────────────────

type Status = 'Active' | 'Pending' | 'Suspended';
type Plan   = 'Enterprise' | 'Professional' | 'Starter' | 'Basic';

interface Company {
  id: string;
  mc: string;
  name: string;
  initials: string;
  logo?: string;
  logoColor: string;
  owner: string;
  ownerPhone: string;
  ownerTelegram: string;
  ownerInitials: string;
  ownerColor: string;
  login: string;
  password: string;
  plan: Plan;
  planExpiry: string;
  registeredDate: string;
  status: Status;
  eld: string;
}

// ── Data ──────────────────────────────────────────────────────────────────────

const SEED: Company[] = [
  { id:'CMP-00041', mc:'MC-481290', name:'Acme Corp',         initials:'AC', logoColor:'#2563EB', owner:'James Whitfield',  ownerPhone:'+1 (214) 555-0192', ownerTelegram:'@jwhitfield',   ownerInitials:'JW', ownerColor:'#6366F1', login:'acme.corp',     password:'Acme@2024!',   plan:'Enterprise',   planExpiry:'Dec 31, 2026', registeredDate:'Jan 12, 2023', status:'Active',    eld:'Samsara'     },
  { id:'CMP-00042', mc:'MC-372841', name:'Helios Systems',    initials:'HS', logoColor:'#8B5CF6', owner:'Maria Gonzalez',   ownerPhone:'+1 (312) 555-0438', ownerTelegram:'@mgonzalez',    ownerInitials:'MG', ownerColor:'#10B981', login:'helios.sys',    password:'Heli0s#Pro',   plan:'Professional', planExpiry:'Sep 15, 2026', registeredDate:'Feb 3, 2023',  status:'Active',    eld:'Motive'      },
  { id:'CMP-00043', mc:'MC-519034', name:'Orbital Labs',      initials:'OL', logoColor:'#10B981', owner:'Derek Osei',       ownerPhone:'+1 (404) 555-0271', ownerTelegram:'@dereklab',     ownerInitials:'DO', ownerColor:'#F59E0B', login:'orbital.labs',  password:'Orb!tal99',    plan:'Starter',      planExpiry:'Mar 20, 2026', registeredDate:'Feb 19, 2023', status:'Pending',   eld:'None'        },
  { id:'CMP-00044', mc:'MC-284716', name:'Zenith Finance',    initials:'ZF', logoColor:'#F59E0B', owner:'Linda Park',       ownerPhone:'+1 (650) 555-0384', ownerTelegram:'@lindapark_z',  ownerInitials:'LP', ownerColor:'#EC4899', login:'zenith.fin',    password:'Z3n!th$2025',  plan:'Enterprise',   planExpiry:'Jun 30, 2026', registeredDate:'Mar 7, 2023',  status:'Active',    eld:'Omnitracs'   },
  { id:'CMP-00045', mc:'MC-637508', name:'Nova Networks',     initials:'NN', logoColor:'#EC4899', owner:'Chris Adeyemi',    ownerPhone:'+1 (469) 555-0517', ownerTelegram:'@chrisa_nn',    ownerInitials:'CA', ownerColor:'#2563EB', login:'nova.networks', password:'Nov@Net#01',   plan:'Basic',        planExpiry:'Jan 10, 2026', registeredDate:'Mar 22, 2023', status:'Suspended', eld:'None'        },
  { id:'CMP-00046', mc:'MC-193472', name:'Apex Freight',      initials:'AF', logoColor:'#14B8A6', owner:'Samantha Lee',     ownerPhone:'+1 (713) 555-0629', ownerTelegram:'@samlee_apex',  ownerInitials:'SL', ownerColor:'#8B5CF6', login:'apex.freight',  password:'Ap3xFr8!ght',  plan:'Professional', planExpiry:'Nov 28, 2025', registeredDate:'Apr 5, 2023',  status:'Active',    eld:'KeepTruckin' },
  { id:'CMP-00047', mc:'MC-748321', name:'Crestline Cargo',   initials:'CC', logoColor:'#6366F1', owner:'Tobias Müller',    ownerPhone:'+49 30 555-0741',   ownerTelegram:'@tmueller',     ownerInitials:'TM', ownerColor:'#14B8A6', login:'crestline.crg', password:'Cr3st!2024',   plan:'Starter',      planExpiry:'Apr 5, 2026',  registeredDate:'Apr 18, 2023', status:'Active',    eld:'PeopleNet'   },
  { id:'CMP-00048', mc:'MC-826493', name:'Summit Logistics',  initials:'SL', logoColor:'#F97316', owner:'Amara Nwosu',      ownerPhone:'+1 (832) 555-0853', ownerTelegram:'@anwosu_sum',   ownerInitials:'AN', ownerColor:'#F97316', login:'summit.logi',   password:'Summ!t@9',     plan:'Enterprise',   planExpiry:'Aug 14, 2026', registeredDate:'May 2, 2023',  status:'Pending',   eld:'Samsara'     },
  { id:'CMP-00049', mc:'MC-461827', name:'BlueSky Haulers',   initials:'BH', logoColor:'#0EA5E9', owner:'Ryan Torres',      ownerPhone:'+1 (972) 555-0964', ownerTelegram:'@rtorres_bsh',  ownerInitials:'RT', ownerColor:'#0EA5E9', login:'bluesky.haul',  password:'BlueSky$22',   plan:'Basic',        planExpiry:'Feb 28, 2026', registeredDate:'May 14, 2023', status:'Active',    eld:'None'        },
  { id:'CMP-00050', mc:'MC-539184', name:'IronBridge Co.',    initials:'IB', logoColor:'#64748B', owner:'Fatima Al-Rashid', ownerPhone:'+966 50 555-1075',  ownerTelegram:'@fatima_ib',    ownerInitials:'FA', ownerColor:'#6366F1', login:'ironbridge.co', password:'Ir0nBr!dge#',  plan:'Professional', planExpiry:'Oct 22, 2025', registeredDate:'May 29, 2023', status:'Active',    eld:'Motive'      },
  { id:'CMP-00051', mc:'MC-712056', name:'Vanguard Fleet',    initials:'VF', logoColor:'#DC2626', owner:'Kwame Asante',     ownerPhone:'+233 24 555-1186',  ownerTelegram:'@kasante_vg',   ownerInitials:'KA', ownerColor:'#10B981', login:'vanguard.flt',  password:'V@ngr!d2024',  plan:'Enterprise',   planExpiry:'May 5, 2026',  registeredDate:'Jun 10, 2023', status:'Suspended', eld:'Omnitracs'   },
  { id:'CMP-00052', mc:'MC-384720', name:'Trident Supply',    initials:'TS', logoColor:'#7C3AED', owner:'Priya Sharma',     ownerPhone:'+91 98 555-1297',   ownerTelegram:'@psharma_ts',   ownerInitials:'PS', ownerColor:'#EC4899', login:'trident.sup',   password:'Tr!d3nt$up',   plan:'Starter',      planExpiry:'Jul 18, 2026', registeredDate:'Jun 23, 2023', status:'Active',    eld:'None'        },
  { id:'CMP-00053', mc:'MC-627435', name:'Redline Transport', initials:'RT', logoColor:'#EF4444', owner:'Marcus Webb',      ownerPhone:'+1 (615) 555-1308', ownerTelegram:'@mwebb_red',    ownerInitials:'MW', ownerColor:'#F59E0B', login:'redline.trans',  password:'R3dL!ne#23',   plan:'Basic',        planExpiry:'Dec 12, 2025', registeredDate:'Jul 4, 2023',  status:'Pending',   eld:'KeepTruckin' },
  { id:'CMP-00054', mc:'MC-291563', name:'Clearpath Inc.',    initials:'CI', logoColor:'#059669', owner:'Naomi Okafor',     ownerPhone:'+234 80 555-1419',  ownerTelegram:'@nokafor_cp',   ownerInitials:'NO', ownerColor:'#2563EB', login:'clearpath.inc', password:'Cl3@rP@th99',  plan:'Professional', planExpiry:'Sep 3, 2026',  registeredDate:'Jul 17, 2023', status:'Active',    eld:'Samsara'     },
  { id:'CMP-00055', mc:'MC-853209', name:'Fusion Carriers',   initials:'FC', logoColor:'#D97706', owner:'Ethan Blackwell',  ownerPhone:'+1 (503) 555-1520', ownerTelegram:'@eblackwell',   ownerInitials:'EB', ownerColor:'#8B5CF6', login:'fusion.carr',   password:'Fus!0nC@rr',   plan:'Enterprise',   planExpiry:'Mar 31, 2027', registeredDate:'Aug 1, 2023',  status:'Active',    eld:'PeopleNet'   },
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

const ELD_COLOR: Record<string, string> = {
  Samsara:     '#2563EB',
  Motive:      '#7C3AED',
  Omnitracs:   '#059669',
  PeopleNet:   '#B45309',
  KeepTruckin: '#0891B2',
  None:        '#94A3B8',
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
const ELD_OPTIONS = ['None', 'Samsara', 'Motive', 'Omnitracs', 'PeopleNet', 'KeepTruckin'];

const PER_PAGE = 10;
let _nextId = 56;

// ── Tiny inline SVG icons ─────────────────────────────────────────────────────

function CreditCardIcon() {
  return <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect width={20} height={14} x={2} y={5} rx={2}/><line x1={2} x2={22} y1={10} y2={10}/></svg>;
}
function CalendarIcon() {
  return <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect width={18} height={18} x={3} y={4} rx={2} ry={2}/><line x1={16} x2={16} y1={2} y2={6}/><line x1={8} x2={8} y1={2} y2={6}/><line x1={3} x2={21} y1={10} y2={10}/></svg>;
}
function TruckIcon() {
  return <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/><rect width={7} height={7} x={14} y={10} rx={1}/><circle cx={7.5} cy={17.5} r={2.5}/><circle cx={17.5} cy={17.5} r={2.5}/></svg>;
}

// ── Date utilities ────────────────────────────────────────────────────────────

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_HDRS    = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function calDays(y: number, m: number): (number | null)[] {
  const first = new Date(y, m, 1).getDay();
  const count = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = Array(first).fill(null);
  for (let d = 1; d <= count; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);
  return cells;
}
function yearBase(y: number) { return Math.floor(y / 12) * 12; }
function parseDStr(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
function fmtDStr(d: Date): string {
  return `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

// ── CustomSelect ──────────────────────────────────────────────────────────────

function CustomSelect({ value, options, onChange }: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen]           = useState(false);
  const [ready, setReady]         = useState(false);
  const trigRef                   = useRef<HTMLButtonElement>(null);
  const popRef                    = useRef<HTMLDivElement>(null);
  const [pos, setPos]             = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (trigRef.current?.contains(e.target as Node)) return;
      if (popRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  // After popup renders, measure its real height and flip above if needed
  useEffect(() => {
    if (!open || ready || !popRef.current || !trigRef.current) return;
    const pop  = popRef.current.getBoundingClientRect();
    const trig = trigRef.current.getBoundingClientRect();
    if (pop.bottom > window.innerHeight - 8) {
      setPos(p => ({ ...p, top: Math.max(8, trig.top - pop.height - 4) }));
    }
    setReady(true);
  }, [open, ready]);

  function toggle() {
    if (!open && trigRef.current) {
      const r = trigRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left, width: r.width });
      setReady(false);
    }
    setOpen(o => !o);
  }

  return (
    <>
      <button ref={trigRef} type="button" onClick={toggle}
        style={{
          width: '100%', padding: '7px 11px', borderRadius: 8,
          border: `1px solid ${open ? '#93C5FD' : 'var(--border)'}`,
          fontSize: '0.82rem', color: 'var(--foreground)', backgroundColor: 'var(--card)',
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 6, outline: 'none',
        }}
        onMouseEnter={(e) => { if (!open) (e.currentTarget as HTMLButtonElement).style.borderColor = '#93C5FD'; }}
        onMouseLeave={(e) => { if (!open) (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; }}
      >
        <span>{value}</span>
        <ChevronDown size={13} style={{ flexShrink: 0, opacity: 0.5, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />
      </button>

      {open && (
        <div ref={popRef} style={{
          position: 'fixed', top: pos.top, left: pos.left, width: pos.width,
          zIndex: 9999, backgroundColor: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
          overflow: 'hidden', maxHeight: 220, overflowY: 'auto',
          opacity: ready ? 1 : 0, transition: 'opacity 80ms',
        }}>
          {options.map((o) => (
            <button key={o} type="button" onClick={() => { onChange(o); setOpen(false); }}
              style={{
                width: '100%', padding: '8px 12px', textAlign: 'left', fontSize: '0.82rem',
                border: 'none', cursor: 'pointer', display: 'block',
                backgroundColor: o === value ? '#EFF6FF' : 'transparent',
                color: o === value ? '#2563EB' : 'var(--foreground)',
                fontWeight: o === value ? 600 : 400,
              }}
              onMouseEnter={(e) => { if (o !== value) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--muted)'; }}
              onMouseLeave={(e) => { if (o !== value) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
            >{o}</button>
          ))}
        </div>
      )}
    </>
  );
}

// ── DatePicker ────────────────────────────────────────────────────────────────

function DatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen]   = useState(false);
  const [view, setView]   = useState<'day' | 'month' | 'year'>('day');
  const [ready, setReady] = useState(false);
  const parsed = parseDStr(value);
  const today  = new Date();

  const [cur, setCur] = useState(() => {
    const d = parsed || today;
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const trigRef = useRef<HTMLButtonElement>(null);
  const popRef  = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (trigRef.current?.contains(e.target as Node)) return;
      if (popRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  // After popup renders, measure real height and flip above if needed
  useEffect(() => {
    if (!open || ready || !popRef.current || !trigRef.current) return;
    const pop  = popRef.current.getBoundingClientRect();
    const trig = trigRef.current.getBoundingClientRect();
    if (pop.bottom > window.innerHeight - 8) {
      setPos(p => ({ ...p, top: Math.max(8, trig.top - pop.height - 4) }));
    }
    setReady(true);
  }, [open, ready]);

  function handleOpen() {
    if (!open && trigRef.current) {
      const r = trigRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left, width: r.width });
      const d = parsed || today;
      setCur({ y: d.getFullYear(), m: d.getMonth() });
      setView('day');
      setReady(false);
    }
    setOpen(o => !o);
  }

  const base    = yearBase(cur.y);
  const days    = calDays(cur.y, cur.m);
  const selDay  = parsed && parsed.getFullYear() === cur.y && parsed.getMonth() === cur.m ? parsed.getDate() : -1;
  const isToday = (d: number) => today.getFullYear() === cur.y && today.getMonth() === cur.m && today.getDate() === d;

  const NavBtn = ({ onClick, icon }: { onClick: () => void; icon: React.ReactNode }) => (
    <button type="button" onClick={onClick}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: '4px 6px', borderRadius: 6, display: 'flex' }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
    >{icon}</button>
  );

  const HeadBtn = ({ label, onClick }: { label: string; onClick: () => void }) => (
    <button type="button" onClick={onClick}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--foreground)', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 3, padding: '4px 8px', borderRadius: 6 }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      {label} <ChevronDown size={12} style={{ opacity: 0.5 }} />
    </button>
  );

  return (
    <>
      <button ref={trigRef} type="button" onClick={handleOpen}
        style={{
          width: '100%', padding: '7px 11px', borderRadius: 8,
          border: `1px solid ${open ? '#93C5FD' : 'var(--border)'}`,
          fontSize: '0.82rem', backgroundColor: 'var(--muted)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
          color: value ? 'var(--foreground)' : 'var(--muted-foreground)', outline: 'none',
        }}
        onMouseEnter={(e) => { if (!open) (e.currentTarget as HTMLButtonElement).style.borderColor = '#93C5FD'; }}
        onMouseLeave={(e) => { if (!open) (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; }}
      >
        <span>{value || 'Select date'}</span>
        <CalendarIcon />
      </button>

      {open && (
        <div ref={popRef} style={{
          position: 'fixed', top: pos.top, left: pos.left, width: Math.max(pos.width, 268),
          zIndex: 9999, backgroundColor: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 14, boxShadow: '0 12px 32px rgba(0,0,0,0.16)', padding: 12,
          opacity: ready ? 1 : 0, transition: 'opacity 80ms',
        }}>

          {/* ── Day view ── */}
          {view === 'day' && <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <NavBtn onClick={() => { const d = new Date(cur.y, cur.m - 1); setCur({ y: d.getFullYear(), m: d.getMonth() }); }} icon={<ChevronLeft size={15} />} />
              <HeadBtn label={`${MONTH_SHORT[cur.m]} ${cur.y}`} onClick={() => setView('month')} />
              <NavBtn onClick={() => { const d = new Date(cur.y, cur.m + 1); setCur({ y: d.getFullYear(), m: d.getMonth() }); }} icon={<ChevronRight size={15} />} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
              {DAY_HDRS.map(h => (
                <div key={h} style={{ textAlign: 'center', fontSize: '0.65rem', fontWeight: 700, color: 'var(--muted-foreground)', padding: '3px 0' }}>{h}</div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
              {days.map((d, i) => (
                <button key={i} type="button" disabled={!d} onClick={() => d && (onChange(fmtDStr(new Date(cur.y, cur.m, d))), setOpen(false))}
                  style={{
                    aspectRatio: '1', borderRadius: '50%', border: 'none', cursor: d ? 'pointer' : 'default',
                    fontSize: '0.78rem', fontWeight: d === selDay || (d !== null && isToday(d)) ? 600 : 400,
                    backgroundColor: d === selDay ? '#2563EB' : 'transparent',
                    color: d === selDay ? '#fff' : (d !== null && isToday(d)) ? '#2563EB' : d ? 'var(--foreground)' : 'transparent',
                    outline: (d !== null && isToday(d) && d !== selDay) ? '2px solid #2563EB' : 'none',
                    outlineOffset: -2,
                  }}
                  onMouseEnter={(e) => { if (d && d !== selDay) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--muted)'; }}
                  onMouseLeave={(e) => { if (d !== selDay) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
                >{d ?? ''}</button>
              ))}
            </div>
            {value && (
              <button type="button" onClick={() => { onChange(''); setOpen(false); }}
                style={{ marginTop: 8, width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--muted-foreground)', padding: '3px 0', textAlign: 'center' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--foreground)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted-foreground)')}
              >Clear</button>
            )}
          </>}

          {/* ── Month view ── */}
          {view === 'month' && <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <NavBtn onClick={() => setCur(c => ({ ...c, y: c.y - 1 }))} icon={<ChevronLeft size={15} />} />
              <HeadBtn label={`${cur.y}`} onClick={() => setView('year')} />
              <NavBtn onClick={() => setCur(c => ({ ...c, y: c.y + 1 }))} icon={<ChevronRight size={15} />} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
              {MONTH_SHORT.map((m, mi) => {
                const isSel = !!(parsed && parsed.getFullYear() === cur.y && parsed.getMonth() === mi);
                const isCur = today.getFullYear() === cur.y && today.getMonth() === mi;
                return (
                  <button key={m} type="button" onClick={() => { setCur(c => ({ ...c, m: mi })); setView('day'); }}
                    style={{
                      padding: '9px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      fontSize: '0.82rem', fontWeight: isSel || isCur ? 600 : 400,
                      backgroundColor: isSel ? '#2563EB' : isCur ? '#EFF6FF' : 'transparent',
                      color: isSel ? '#fff' : isCur ? '#2563EB' : 'var(--foreground)',
                    }}
                    onMouseEnter={(e) => { if (!isSel) (e.currentTarget as HTMLButtonElement).style.backgroundColor = isCur ? '#DBEAFE' : 'var(--muted)'; }}
                    onMouseLeave={(e) => { if (!isSel) (e.currentTarget as HTMLButtonElement).style.backgroundColor = isCur ? '#EFF6FF' : 'transparent'; }}
                  >{m}</button>
                );
              })}
            </div>
          </>}

          {/* ── Year view ── */}
          {view === 'year' && <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <NavBtn onClick={() => setCur(c => ({ ...c, y: yearBase(c.y) - 1 }))} icon={<ChevronLeft size={15} />} />
              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--foreground)' }}>{base} – {base + 11}</span>
              <NavBtn onClick={() => setCur(c => ({ ...c, y: yearBase(c.y) + 12 }))} icon={<ChevronRight size={15} />} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
              {Array.from({ length: 12 }, (_, i) => base + i).map(y => {
                const isSel = !!(parsed && parsed.getFullYear() === y);
                const isCur = today.getFullYear() === y;
                return (
                  <button key={y} type="button" onClick={() => { setCur(c => ({ ...c, y })); setView('month'); }}
                    style={{
                      padding: '9px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      fontSize: '0.82rem', fontWeight: isSel || isCur ? 600 : 400,
                      backgroundColor: isSel ? '#2563EB' : isCur ? '#EFF6FF' : 'transparent',
                      color: isSel ? '#fff' : isCur ? '#2563EB' : 'var(--foreground)',
                    }}
                    onMouseEnter={(e) => { if (!isSel) (e.currentTarget as HTMLButtonElement).style.backgroundColor = isCur ? '#DBEAFE' : 'var(--muted)'; }}
                    onMouseLeave={(e) => { if (!isSel) (e.currentTarget as HTMLButtonElement).style.backgroundColor = isCur ? '#EFF6FF' : 'transparent'; }}
                  >{y}</button>
                );
              })}
            </div>
          </>}

        </div>
      )}
    </>
  );
}

// ── Logo upload ───────────────────────────────────────────────────────────────

function LogoUpload({ initials, logoColor, logo, onChange }: {
  initials: string;
  logoColor: string;
  logo: string;
  onChange: (v: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [hover, setHover] = useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { if (typeof ev.target?.result === 'string') onChange(ev.target.result); };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '4px 0 8px' }}>
      <div
        onClick={() => fileRef.current?.click()}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          width: 64, height: 64, borderRadius: 12, cursor: 'pointer', position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          backgroundColor: logoColor + '22', color: logoColor,
          border: `2px dashed ${logoColor}55`, overflow: 'hidden',
        }}
      >
        {logo
          ? <img src={logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>{initials || '?'}</span>
        }
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 10,
          opacity: hover ? 1 : 0, transition: 'opacity 150ms',
        }}>
          <Camera size={20} color="#fff" />
        </div>
      </div>
      <div>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: 3 }}>Company Logo</div>
        <button type="button" onClick={() => fileRef.current?.click()}
          style={{ fontSize: '0.75rem', color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 500 }}
        >
          {logo ? 'Change logo' : 'Upload logo'}
        </button>
        {logo && (
          <button type="button" onClick={() => onChange('')}
            style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 10px', fontWeight: 500 }}
          >
            Remove
          </button>
        )}
        <div style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', marginTop: 3 }}>PNG, JPG — up to 2 MB</div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  );
}

// ── Detail modal ──────────────────────────────────────────────────────────────

function CompanyDetailModal({ company, onClose, onLogoChange }: {
  company: Company;
  onClose: () => void;
  onLogoChange: (logo: string) => void;
}) {
  const [showPass, setShowPass] = useState(false);
  const [logoHover, setLogoHover] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { if (typeof ev.target?.result === 'string') onLogoChange(ev.target.result); };
    reader.readAsDataURL(file);
    e.target.value = '';
  }
  const plan   = PLAN_STYLE[company.plan];
  const status = STATUS_CONFIG[company.status];
  const eldColor = ELD_COLOR[company.eld] ?? '#94A3B8';

  interface RowProps { icon: React.ReactNode; label: string; value: React.ReactNode; mono?: boolean; last?: boolean; }
  const Row = ({ icon, label, value, mono = false, last = false }: RowProps) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '11px 0', borderBottom: last ? 'none' : '1px solid var(--border)' }}>
      <span style={{ marginTop: 2, color: 'var(--muted-foreground)', flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>
          {label}
        </div>
        <div style={{ fontSize: '0.83rem', color: 'var(--foreground)', fontWeight: 500, fontFamily: mono ? "'JetBrains Mono','Courier New',monospace" : 'inherit' }}>
          {value}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="rounded-2xl shadow-2xl w-full"
        style={{ backgroundColor: 'var(--card)', maxWidth: 520, border: '1px solid var(--border)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)' }}>Company Details</h2>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg"
            style={{ color: 'var(--muted-foreground)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--muted)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-4 flex-1">

          {/* Identity hero */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, padding: 16, borderRadius: 12, backgroundColor: 'var(--muted)' }}>
            <div
              onClick={() => fileRef.current?.click()}
              onMouseEnter={() => setLogoHover(true)}
              onMouseLeave={() => setLogoHover(false)}
              style={{ width: 56, height: 56, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: company.logoColor + '22', color: company.logoColor, cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
            >
              {company.logo
                ? <img src={company.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>{company.initials}</span>
              }
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 10, opacity: logoHover ? 1 : 0, transition: 'opacity 150ms' }}>
                <Camera size={16} color="#fff" />
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoFile} />
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--foreground)', lineHeight: 1.2, marginBottom: 6 }}>{company.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: "'JetBrains Mono','Courier New',monospace", fontSize: '0.7rem', color: 'var(--muted-foreground)', backgroundColor: 'var(--card)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 6 }}>
                  {company.mc}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, backgroundColor: plan.bg, color: plan.color }}>
                  {company.plan}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.7rem', fontWeight: 500, color: status.color }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: status.dot, display: 'inline-block' }} />
                  {company.status}
                </span>
              </div>
            </div>
          </div>

          {/* Detail rows */}
          <Row icon={<Shield size={14} />}       label="MC Number"           value={company.mc}           mono />
          <Row icon={<Building2 size={14} />}    label="Company Name"        value={company.name} />
          <Row
            icon={
              <div style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: company.ownerColor + '33', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.45rem', fontWeight: 700, color: company.ownerColor }}>{company.ownerInitials}</span>
              </div>
            }
            label="Owner Name"
            value={company.owner}
          />
          <Row icon={<Phone size={14} />}        label="Owner Phone Number"  value={company.ownerPhone}   mono />
          <Row icon={<Send size={14} />}         label="Owner Telegram"      value={company.ownerTelegram} mono />
          <Row icon={<Shield size={14} />}       label="Login"               value={company.login}         mono />
          <Row
            icon={<Eye size={14} />}
            label="Password"
            value={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: "'JetBrains Mono','Courier New',monospace" }}>
                  {showPass ? company.password : '••••••••••'}
                </span>
                <button
                  onClick={() => setShowPass((v) => !v)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex', padding: 2 }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--foreground)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted-foreground)'; }}
                >
                  {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            }
          />
          <Row
            icon={<CreditCardIcon />}
            label="Plan"
            value={<span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, backgroundColor: plan.bg, color: plan.color }}>{company.plan}</span>}
          />
          <Row icon={<CalendarIcon />}           label="Plan Expiry Date"    value={company.planExpiry} />
          <Row
            icon={<TruckIcon />}
            label="ELD"
            value={<span style={{ fontWeight: 600, color: eldColor }}>{company.eld}</span>}
            last
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose}
            className="w-full py-2 rounded-lg"
            style={{ fontSize: '0.83rem', fontWeight: 500, color: 'var(--foreground)', backgroundColor: 'var(--muted)', border: '1px solid var(--border)', cursor: 'pointer' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#E5E7EB'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--muted)'; }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

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
          style={{ top: 'calc(100% + 4px)', backgroundColor: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,0.10)', minWidth: 160 }}
          onClick={(e) => e.stopPropagation()}
        >
          {[
            { icon: <Eye size={14} />,    label: 'View Details', color: 'var(--foreground)', action: onView },
            { icon: <Pencil size={14} />, label: 'Edit Company', color: 'var(--foreground)', action: onEdit },
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

interface FormState {
  mc: string; name: string; owner: string; ownerPhone: string; ownerTelegram: string;
  login: string; password: string; plan: Plan; planExpiry: string; eld: string; status: Status;
  logo: string;
}
const EMPTY_FORM: FormState = {
  mc: '', name: '', owner: '', ownerPhone: '', ownerTelegram: '',
  login: '', password: '', plan: 'Starter', planExpiry: '', eld: 'None', status: 'Active',
  logo: '',
};

function CompanyModal({ mode, initial, onClose, onSave }: {
  mode: 'create' | 'edit';
  initial?: Partial<FormState>;
  onClose: () => void;
  onSave: (f: FormState) => void;
}) {
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM, ...initial });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  function validate() {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim())  e.name = 'Required';
    if (!form.owner.trim()) e.owner = 'Required';
    if (!form.login.trim()) e.login = 'Required';
    return e;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave(form);
  }

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const inputStyle = (key: keyof FormState) => ({
    width: '100%', padding: '7px 11px', borderRadius: 8,
    border: `1px solid ${errors[key] ? '#EF4444' : 'var(--border)'}`,
    fontSize: '0.82rem', color: 'var(--foreground)', backgroundColor: 'var(--muted)',
    outline: 'none', boxSizing: 'border-box' as const,
  });

  const labelStyle = { display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 4 } as const;

  const Field = ({ label, fkey, type = 'text', placeholder = '' }: { label: string; fkey: keyof FormState; type?: string; placeholder?: string }) => (
    <div>
      <label style={labelStyle}>{label}</label>
      <input type={type} value={form[fkey] as string} placeholder={placeholder} onChange={set(fkey)} style={inputStyle(fkey)} />
      {errors[fkey] && <span style={{ fontSize: '0.7rem', color: '#EF4444', marginTop: 2, display: 'block' }}>{errors[fkey]}</span>}
    </div>
  );

  const Select = ({ label, fkey, options }: { label: string; fkey: keyof FormState; options: string[] }) => (
    <div>
      <label style={labelStyle}>{label}</label>
      <CustomSelect value={form[fkey] as string} options={options} onChange={(v) => setForm(f => ({ ...f, [fkey]: v }))} />
    </div>
  );

  const DateField = ({ label, fkey }: { label: string; fkey: keyof FormState }) => (
    <div>
      <label style={labelStyle}>{label}</label>
      <DatePicker value={form[fkey] as string} onChange={(v) => setForm(f => ({ ...f, [fkey]: v }))} />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
      <div className="rounded-2xl shadow-2xl w-full"
        style={{ backgroundColor: 'var(--card)', maxWidth: 480, maxHeight: '90vh', display: 'flex', flexDirection: 'column', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
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

        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5 flex flex-col gap-3">
          <LogoUpload
            initials={form.name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'}
            logoColor="#2563EB"
            logo={form.logo}
            onChange={(v) => setForm(f => ({ ...f, logo: v }))}
          />
          <div style={{ borderTop: '1px solid var(--border)', marginBottom: 4 }} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="MC Number" fkey="mc" placeholder="MC-000000" />
            <Field label="Company Name" fkey="name" placeholder="e.g. Acme Corp" />
          </div>
          <Field label="Owner Name" fkey="owner" placeholder="e.g. Jane Smith" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Owner Phone" fkey="ownerPhone" placeholder="+1 (555) 000-0000" />
            <Field label="Owner Telegram" fkey="ownerTelegram" placeholder="@username" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Login" fkey="login" placeholder="company.login" />
            <Field label="Password" fkey="password" type="password" placeholder="••••••••" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Plan" fkey="plan" options={['Enterprise', 'Professional', 'Starter', 'Basic']} />
            <DateField label="Plan Expiry Date" fkey="planExpiry" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="ELD Provider" fkey="eld" options={ELD_OPTIONS} />
            <Select label="Status" fkey="status" options={['Active', 'Pending', 'Suspended']} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-lg"
              style={{ fontSize: '0.83rem', fontWeight: 500, color: 'var(--foreground)', backgroundColor: 'var(--muted)', border: '1px solid var(--border)', cursor: 'pointer' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#E5E7EB'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--muted)'; }}
            >
              Cancel
            </button>
            <button type="submit"
              className="flex-1 py-2 rounded-lg"
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
  const [rows, setRows]                 = useState<Company[]>(SEED);
  const [tab, setTab]                   = useState<TabId>('Active');
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all');
  const [planFilter,   setPlanFilter]   = useState<'all' | Plan>('all');
  const [page, setPage]                 = useState(1);

  const [createOpen,   setCreateOpen]   = useState(false);
  const [editTarget,   setEditTarget]   = useState<Company | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const [viewTarget,   setViewTarget]   = useState<Company | null>(null);

  const filtered = useMemo(() => rows.filter((c) => {
    if (tab !== 'all' && c.status !== tab) return false;
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (planFilter   !== 'all' && c.plan   !== planFilter)   return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !c.name.toLowerCase().includes(q) &&
        !c.owner.toLowerCase().includes(q) &&
        !c.mc.toLowerCase().includes(q) &&
        !c.login.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  }), [rows, tab, statusFilter, planFilter, search]);

  const totalCount     = rows.length;
  const activeCount    = rows.filter(c => c.status === 'Active').length;
  const suspendedCount = rows.filter(c => c.status === 'Suspended').length;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  function goPage(p: number) { setPage(Math.min(Math.max(1, p), totalPages)); }

  const COLORS = ['#2563EB','#8B5CF6','#10B981','#F59E0B','#EC4899','#14B8A6','#6366F1','#F97316'];

  function handleCreate(f: FormState) {
    const words    = f.name.split(' ');
    const initials = words.map((w) => w[0]).slice(0, 2).join('').toUpperCase();
    const newRow: Company = {
      id:            `CMP-000${_nextId++}`,
      mc:            f.mc || `MC-${Math.floor(100000 + Math.random() * 900000)}`,
      name:          f.name,
      initials,
      logoColor:     COLORS[_nextId % COLORS.length],
      owner:         f.owner,
      ownerPhone:    f.ownerPhone,
      ownerTelegram: f.ownerTelegram,
      ownerInitials: f.owner.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase(),
      ownerColor:    COLORS[(_nextId + 3) % COLORS.length],
      login:         f.login,
      password:      f.password,
      plan:          f.plan,
      planExpiry:    f.planExpiry || 'Dec 31, 2026',
      registeredDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status:        f.status,
      eld:           f.eld,
      logo:          f.logo || undefined,
    };
    setRows((prev) => [newRow, ...prev]);
    setCreateOpen(false);
  }

  function handleEdit(f: FormState) {
    if (!editTarget) return;
    setRows((prev) => prev.map((c) => c.id === editTarget.id ? {
      ...c,
      mc: f.mc, name: f.name, owner: f.owner, ownerPhone: f.ownerPhone,
      ownerTelegram: f.ownerTelegram, login: f.login, password: f.password,
      plan: f.plan, planExpiry: f.planExpiry, status: f.status, eld: f.eld,
      logo: f.logo || undefined,
    } : c));
    setEditTarget(null);
  }

  function handleLogoChange(id: string, logo: string) {
    setRows((prev) => prev.map((c) => c.id === id ? { ...c, logo: logo || undefined } : c));
    setViewTarget((prev) => prev && prev.id === id ? { ...prev, logo: logo || undefined } : prev);
  }

  function handleDelete(id: string) {
    setRows((prev) => prev.filter((c) => c.id !== id));
    setDeleteTarget(null);
    if (paginated.length === 1 && page > 1) setPage((p) => p - 1);
  }

  const start = filtered.length === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const end   = Math.min(page * PER_PAGE, filtered.length);

  const TH = ({ children }: { children: React.ReactNode }) => (
    <th style={{ textAlign: 'left', padding: '9px 14px', fontSize: '0.68rem', fontWeight: 600, color: 'var(--muted-foreground)', letterSpacing: '0.07em', textTransform: 'uppercase', backgroundColor: 'var(--muted)', whiteSpace: 'nowrap' }}>
      {children}
    </th>
  );

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: 'var(--background)' }}>

      {/* Modals */}
      {viewTarget   && <CompanyDetailModal company={viewTarget} onClose={() => setViewTarget(null)} onLogoChange={(logo) => handleLogoChange(viewTarget.id, logo)} />}
      {createOpen   && <CompanyModal mode="create" onClose={() => setCreateOpen(false)} onSave={handleCreate} />}
      {editTarget   && (
        <CompanyModal
          mode="edit"
          initial={{
            mc: editTarget.mc, name: editTarget.name, owner: editTarget.owner,
            ownerPhone: editTarget.ownerPhone, ownerTelegram: editTarget.ownerTelegram,
            login: editTarget.login, password: editTarget.password,
            plan: editTarget.plan, planExpiry: editTarget.planExpiry,
            status: editTarget.status, eld: editTarget.eld,
            logo: editTarget.logo ?? '',
          }}
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

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: 'Total',     value: totalCount,     icon: <Building2 size={19} />, iconBg: '#2563EB' },
          { label: 'Active',    value: activeCount,    icon: <CheckCircle2 size={19} />, iconBg: '#10B981' },
          { label: 'Suspended', value: suspendedCount, icon: <XCircle size={19} />,  iconBg: '#EF4444' },
        ].map(({ label, value, icon, iconBg }) => (
          <div key={label} style={{ backgroundColor: 'var(--card)', borderRadius: 14, padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--muted-foreground)', marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: '1.7rem', fontWeight: 700, color: 'var(--foreground)', lineHeight: 1 }}>{value}</div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff' }}>
              {icon}
            </div>
          </div>
        ))}
      </div>

      {/* Page header */}
      <div className="flex items-start justify-between mb-5">
        <div />
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 500, color: 'var(--foreground)', backgroundColor: 'var(--card)', border: '1px solid var(--border)', cursor: 'pointer' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--card)')}
          >
            <Download size={15} /> Export
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600, color: '#fff', background: 'linear-gradient(135deg,#2563EB 0%,#1D4ED8 100%)', border: 'none', cursor: 'pointer' }}
          >
            <Plus size={15} /> New Company
          </button>
        </div>
      </div>

      {/* Card */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>

        {/* Controls bar */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 flex-wrap" style={{ borderBottom: '1px solid var(--border)' }}>
          <FilterTabs<TabId> tabs={TABS} active={tab} onChange={(id) => { setTab(id); setPage(1); }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', width: 220 }}>
              <Search size={14} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search companies..."
                style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '0.8rem', color: 'var(--foreground)', width: '100%' }}
              />
            </div>
            <Dropdown<'all' | Status> label="Status" options={STATUS_OPTS} value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1); }} />
            <Dropdown<'all' | Plan>   label="Plan"   options={PLAN_OPTS}   value={planFilter}   onChange={(v) => { setPlanFilter(v);   setPage(1); }} />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <TH>MC</TH>
                <TH>Name</TH>
                <TH>Owner Name</TH>
                <TH>Login</TH>
                <TH>Plan</TH>
                <TH>Plan Expiry</TH>
                <TH>Registered</TH>
                <TH>Status</TH>
                <TH>ELD</TH>
                <TH>Actions</TH>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '56px 0', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>
                    No companies match your filters.
                  </td>
                </tr>
              ) : paginated.map((c, i) => {
                const plan     = PLAN_STYLE[c.plan];
                const status   = STATUS_CONFIG[c.status];
                const eldColor = ELD_COLOR[c.eld] ?? '#94A3B8';
                return (
                  <tr key={c.id}
                    style={{ borderBottom: i < paginated.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'default' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FAFBFF')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {/* MC */}
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ fontFamily: "'JetBrains Mono','Courier New',monospace", fontSize: '0.7rem', color: 'var(--muted-foreground)', letterSpacing: '0.02em' }}>
                        {c.mc}
                      </span>
                    </td>

                    {/* Name */}
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: c.logoColor + '1A', color: c.logoColor, overflow: 'hidden' }}>
                          {c.logo
                            ? <img src={c.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span style={{ fontSize: '0.6rem', fontWeight: 700 }}>{c.initials}</span>
                          }
                        </div>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--foreground)', whiteSpace: 'nowrap' }}>{c.name}</span>
                      </div>
                    </td>

                    {/* Owner Name */}
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: c.ownerColor + '22', color: c.ownerColor }}>
                          <span style={{ fontSize: '0.55rem', fontWeight: 700 }}>{c.ownerInitials}</span>
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--foreground)', whiteSpace: 'nowrap' }}>{c.owner}</span>
                      </div>
                    </td>

                    {/* Login */}
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ fontFamily: "'JetBrains Mono','Courier New',monospace", fontSize: '0.72rem', color: 'var(--foreground)', backgroundColor: 'var(--muted)', padding: '2px 8px', borderRadius: 5, whiteSpace: 'nowrap' }}>
                        {c.login}
                      </span>
                    </td>

                    {/* Plan */}
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, backgroundColor: plan.bg, color: plan.color, whiteSpace: 'nowrap' }}>
                        {c.plan}
                      </span>
                    </td>

                    {/* Plan Expiry */}
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{c.planExpiry}</span>
                    </td>

                    {/* Registered */}
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{c.registeredDate}</span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: status.dot, flexShrink: 0, display: 'inline-block' }} />
                        <span style={{ fontSize: '0.78rem', fontWeight: 500, color: status.color, whiteSpace: 'nowrap' }}>{c.status}</span>
                      </div>
                    </td>

                    {/* ELD */}
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: eldColor, whiteSpace: 'nowrap' }}>{c.eld}</span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '11px 14px' }}>
                      <ActionsMenu
                        company={c}
                        onView={() => setViewTarget(c)}
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)' }}>
            Showing {start}–{end} of {filtered.length} companies
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={() => goPage(page - 1)} disabled={page === 1}
              style={{ padding: '5px 12px', borderRadius: 7, fontSize: '0.78rem', fontWeight: 500, cursor: page === 1 ? 'not-allowed' : 'pointer', color: page === 1 ? 'var(--muted-foreground)' : 'var(--foreground)', backgroundColor: 'var(--card)', border: '1px solid var(--border)', opacity: page === 1 ? 0.5 : 1 }}
            >
              Prev
            </button>

            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = totalPages <= 7 ? i + 1 : i < 3 ? i + 1 : i === 3 ? -1 : totalPages - (6 - i);
              if (p === -1) return <span key="ellipsis" style={{ padding: '0 4px', color: 'var(--muted-foreground)', fontSize: '0.78rem' }}>…</span>;
              return (
                <button key={p} onClick={() => goPage(p)}
                  style={{ width: 30, height: 30, borderRadius: 7, fontSize: '0.78rem', fontWeight: p === page ? 600 : 400, cursor: 'pointer', backgroundColor: p === page ? '#2563EB' : 'transparent', color: p === page ? '#fff' : 'var(--muted-foreground)', border: 'none' }}
                  onMouseEnter={(e) => { if (p !== page) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--muted)'; }}
                  onMouseLeave={(e) => { if (p !== page) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
                >
                  {p}
                </button>
              );
            })}

            <button
              onClick={() => goPage(page + 1)} disabled={page === totalPages}
              style={{ padding: '5px 12px', borderRadius: 7, fontSize: '0.78rem', fontWeight: 500, cursor: page === totalPages ? 'not-allowed' : 'pointer', color: page === totalPages ? 'var(--muted-foreground)' : 'var(--foreground)', backgroundColor: 'var(--card)', border: '1px solid var(--border)', opacity: page === totalPages ? 0.5 : 1 }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
