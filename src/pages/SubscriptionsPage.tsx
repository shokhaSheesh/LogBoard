import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2, Plus, Pencil, Trash2, X, Loader2,
  ChevronLeft, ChevronRight, ChevronDown,
  CreditCard, Clock, XCircle, Activity,
} from 'lucide-react';
import { Dropdown } from '@/components/shared/Dropdown';
import { DeleteConfirmModal } from '@/components/shared/DeleteConfirmModal';
import { api, ApiException } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type SubStatus = 'Active' | 'Pending' | 'Suspended';

interface ApiPlan {
  id: string; name: string; color: string; price: number;
  duration: number; features: string[]; popular: boolean;
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
  features: string[]; popular: boolean;
}
interface SubForm {
  company_id: string; plan_id: string; amount_paid: string; currency: string;
  period_start: string; period_end: string; status: SubStatus; note: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const COLOR_PRESETS = ['#2563EB', '#7C3AED', '#059669', '#C2410C', '#0891B2', '#DB2777', '#D97706', '#64748B'];
const MONTH_SHORT   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_HDRS      = ['Su','Mo','Tu','We','Th','Fr','Sa'];

const SUB_STATUS: Record<SubStatus, { dot: string; color: string; bg: string; border: string }> = {
  Active:    { dot: '#22C55E', color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0' },
  Pending:   { dot: '#F59E0B', color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },
  Suspended: { dot: '#EF4444', color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA' },
};

const EMPTY_PLAN_FORM: PlanForm = { name: '', color: COLOR_PRESETS[0], price: '', duration: '', features: ['', '', '', ''], popular: false };
const PER_PAGE = 10;

// ── Date helpers ──────────────────────────────────────────────────────────────

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
function todayDisplay(): string { return fmtDStr(new Date()); }
function addDaysDisplay(display: string, days: number): string {
  const d = parseDStr(display);
  if (!d) return '';
  d.setDate(d.getDate() + days);
  return fmtDStr(d);
}
function displayToISO(display: string): string {
  const d = parseDStr(display);
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}T00:00:00Z`;
}
function isoToDisplay(iso: string | null | undefined): string {
  if (!iso) return '';
  return fmtDStr(new Date(iso));
}
function fmtDateShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
function isExpired(periodEnd: string): boolean {
  return !!periodEnd && new Date(periodEnd) < new Date();
}

// ── Shared styles ─────────────────────────────────────────────────────────────

function badgeBg(hex: string) { return hex + '18'; }

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.75rem', fontWeight: 600,
  color: 'var(--muted-foreground)', marginBottom: 5, letterSpacing: '0.03em',
};

// ── CalendarIcon ──────────────────────────────────────────────────────────────

function CalendarIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect width={18} height={18} x={3} y={4} rx={2} ry={2}/>
      <line x1={16} x2={16} y1={2} y2={6}/><line x1={8} x2={8} y1={2} y2={6}/><line x1={3} x2={21} y1={10} y2={10}/>
    </svg>
  );
}

// ── CustomSelect (string options) ─────────────────────────────────────────────

function CustomSelect({ value, options, onChange }: {
  value: string; options: string[]; onChange: (v: string) => void;
}) {
  const [open, setOpen]   = useState(false);
  const [ready, setReady] = useState(false);
  const trigRef           = useRef<HTMLButtonElement>(null);
  const popRef            = useRef<HTMLDivElement>(null);
  const [pos, setPos]     = useState({ top: 0, left: 0, width: 0 });

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

  useEffect(() => {
    if (!open || ready || !popRef.current || !trigRef.current) return;
    const pop  = popRef.current.getBoundingClientRect();
    const trig = trigRef.current.getBoundingClientRect();
    if (pop.bottom > window.innerHeight - 8)
      setPos(p => ({ ...p, top: Math.max(8, trig.top - pop.height - 4) }));
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
        style={{ width: '100%', padding: '7px 11px', borderRadius: 8, border: `1px solid ${open ? '#93C5FD' : 'var(--border)'}`, fontSize: '0.82rem', color: 'var(--foreground)', backgroundColor: 'var(--card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, outline: 'none', boxSizing: 'border-box' }}
        onMouseEnter={e => { if (!open) (e.currentTarget.style.borderColor = '#93C5FD'); }}
        onMouseLeave={e => { if (!open) (e.currentTarget.style.borderColor = 'var(--border)'); }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value || <span style={{ color: 'var(--muted-foreground)' }}>Select…</span>}</span>
        <ChevronDown size={13} style={{ flexShrink: 0, opacity: 0.5, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />
      </button>
      {open && createPortal(
        <div ref={popRef} style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999, backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.14)', overflow: 'hidden', maxHeight: 220, overflowY: 'auto', opacity: ready ? 1 : 0, transition: 'opacity 80ms' }}>
          {options.map(o => (
            <button key={o} type="button" onClick={() => { onChange(o); setOpen(false); }}
              style={{ width: '100%', padding: '8px 12px', textAlign: 'left', fontSize: '0.82rem', border: 'none', cursor: 'pointer', display: 'block', backgroundColor: o === value ? '#EFF6FF' : 'transparent', color: o === value ? '#2563EB' : 'var(--foreground)', fontWeight: o === value ? 600 : 400 }}
              onMouseEnter={e => { if (o !== value) (e.currentTarget.style.backgroundColor = 'var(--muted)'); }}
              onMouseLeave={e => { if (o !== value) (e.currentTarget.style.backgroundColor = 'transparent'); }}
            >{o}</button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

// ── SelectPicker (labeled options — value ≠ label) ────────────────────────────

function SelectPicker({ value, options, placeholder, onChange }: {
  value: string;
  options: { value: string; label: string }[];
  placeholder: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen]   = useState(false);
  const [ready, setReady] = useState(false);
  const trigRef           = useRef<HTMLButtonElement>(null);
  const popRef            = useRef<HTMLDivElement>(null);
  const [pos, setPos]     = useState({ top: 0, left: 0, width: 0 });

  const selectedLabel = options.find(o => o.value === value)?.label ?? '';

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

  useEffect(() => {
    if (!open || ready || !popRef.current || !trigRef.current) return;
    const pop  = popRef.current.getBoundingClientRect();
    const trig = trigRef.current.getBoundingClientRect();
    if (pop.bottom > window.innerHeight - 8)
      setPos(p => ({ ...p, top: Math.max(8, trig.top - pop.height - 4) }));
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
        style={{ width: '100%', padding: '7px 11px', borderRadius: 8, border: `1px solid ${open ? '#93C5FD' : 'var(--border)'}`, fontSize: '0.82rem', color: selectedLabel ? 'var(--foreground)' : 'var(--muted-foreground)', backgroundColor: 'var(--card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, outline: 'none', boxSizing: 'border-box' }}
        onMouseEnter={e => { if (!open) (e.currentTarget.style.borderColor = '#93C5FD'); }}
        onMouseLeave={e => { if (!open) (e.currentTarget.style.borderColor = 'var(--border)'); }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedLabel || placeholder}</span>
        <ChevronDown size={13} style={{ flexShrink: 0, opacity: 0.5, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />
      </button>
      {open && createPortal(
        <div ref={popRef} style={{ position: 'fixed', top: pos.top, left: pos.left, width: Math.max(pos.width, 240), zIndex: 9999, backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.14)', overflow: 'hidden', maxHeight: 240, overflowY: 'auto', opacity: ready ? 1 : 0, transition: 'opacity 80ms' }}>
          {options.map(o => (
            <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); }}
              style={{ width: '100%', padding: '9px 12px', textAlign: 'left', fontSize: '0.82rem', border: 'none', cursor: 'pointer', display: 'block', backgroundColor: o.value === value ? '#EFF6FF' : 'transparent', color: o.value === value ? '#2563EB' : 'var(--foreground)', fontWeight: o.value === value ? 600 : 400 }}
              onMouseEnter={e => { if (o.value !== value) (e.currentTarget.style.backgroundColor = 'var(--muted)'); }}
              onMouseLeave={e => { if (o.value !== value) (e.currentTarget.style.backgroundColor = 'transparent'); }}
            >{o.label}</button>
          ))}
          {options.length === 0 && (
            <div style={{ padding: '10px 12px', fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>No options available</div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}

// ── DatePicker ────────────────────────────────────────────────────────────────

function DatePicker({ value, onChange, placeholder = 'Select date' }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const [open, setOpen]   = useState(false);
  const [view, setView]   = useState<'day' | 'month' | 'year'>('day');
  const [ready, setReady] = useState(false);
  const parsed  = parseDStr(value);
  const today   = new Date();
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

  useEffect(() => {
    if (!open || ready || !popRef.current || !trigRef.current) return;
    const pop  = popRef.current.getBoundingClientRect();
    const trig = trigRef.current.getBoundingClientRect();
    if (pop.bottom > window.innerHeight - 8)
      setPos(p => ({ ...p, top: Math.max(8, trig.top - pop.height - 4) }));
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

  const base   = yearBase(cur.y);
  const days   = calDays(cur.y, cur.m);
  const selDay = parsed && parsed.getFullYear() === cur.y && parsed.getMonth() === cur.m ? parsed.getDate() : -1;
  const isToday = (d: number) => today.getFullYear() === cur.y && today.getMonth() === cur.m && today.getDate() === d;

  const NavBtn = ({ onClick, icon }: { onClick: () => void; icon: React.ReactNode }) => (
    <button type="button" onClick={onClick}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: '4px 6px', borderRadius: 6, display: 'flex' }}
      onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--muted)')}
      onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent')}
    >{icon}</button>
  );

  const HeadBtn = ({ label, onClick }: { label: string; onClick: () => void }) => (
    <button type="button" onClick={onClick}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--foreground)', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 3, padding: '4px 8px', borderRadius: 6 }}
      onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--muted)')}
      onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent')}
    >{label} <ChevronDown size={12} style={{ opacity: 0.5 }} /></button>
  );

  return (
    <>
      <button ref={trigRef} type="button" onClick={handleOpen}
        style={{ width: '100%', padding: '7px 11px', borderRadius: 8, border: `1px solid ${open ? '#93C5FD' : 'var(--border)'}`, fontSize: '0.82rem', backgroundColor: 'var(--card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, color: value ? 'var(--foreground)' : 'var(--muted-foreground)', outline: 'none', boxSizing: 'border-box' }}
        onMouseEnter={e => { if (!open) (e.currentTarget as HTMLButtonElement).style.borderColor = '#93C5FD'; }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; }}
      >
        <span>{value || placeholder}</span>
        <CalendarIcon />
      </button>

      {open && createPortal(
        <div ref={popRef} style={{ position: 'fixed', top: pos.top, left: pos.left, width: Math.max(pos.width, 268), zIndex: 9999, backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: '0 12px 32px rgba(0,0,0,0.16)', padding: 12, opacity: ready ? 1 : 0, transition: 'opacity 80ms' }}>

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
                <button key={i} type="button" disabled={!d}
                  onClick={() => d && (onChange(fmtDStr(new Date(cur.y, cur.m, d))), setOpen(false))}
                  style={{ aspectRatio: '1', borderRadius: '50%', border: 'none', cursor: d ? 'pointer' : 'default', fontSize: '0.78rem', fontWeight: d === selDay || (d !== null && isToday(d)) ? 600 : 400, backgroundColor: d === selDay ? '#2563EB' : 'transparent', color: d === selDay ? '#fff' : (d !== null && isToday(d)) ? '#2563EB' : d ? 'var(--foreground)' : 'transparent', outline: (d !== null && isToday(d) && d !== selDay) ? '2px solid #2563EB' : 'none', outlineOffset: -2 }}
                  onMouseEnter={e => { if (d && d !== selDay) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--muted)'; }}
                  onMouseLeave={e => { if (d !== selDay) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
                >{d ?? ''}</button>
              ))}
            </div>
            {value && (
              <button type="button" onClick={() => { onChange(''); setOpen(false); }}
                style={{ marginTop: 8, width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--muted-foreground)', padding: '3px 0', textAlign: 'center' }}
                onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--foreground)')}
                onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--muted-foreground)')}
              >Clear</button>
            )}
          </>}

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
                    style={{ padding: '9px 4px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: isSel || isCur ? 600 : 400, backgroundColor: isSel ? '#2563EB' : isCur ? '#EFF6FF' : 'transparent', color: isSel ? '#fff' : isCur ? '#2563EB' : 'var(--foreground)' }}
                    onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLButtonElement).style.backgroundColor = isCur ? '#DBEAFE' : 'var(--muted)'; }}
                    onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLButtonElement).style.backgroundColor = isCur ? '#EFF6FF' : 'transparent'; }}
                  >{m}</button>
                );
              })}
            </div>
          </>}

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
                    style={{ padding: '9px 4px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: isSel || isCur ? 600 : 400, backgroundColor: isSel ? '#2563EB' : isCur ? '#EFF6FF' : 'transparent', color: isSel ? '#fff' : isCur ? '#2563EB' : 'var(--foreground)' }}
                    onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLButtonElement).style.backgroundColor = isCur ? '#DBEAFE' : 'var(--muted)'; }}
                    onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLButtonElement).style.backgroundColor = isCur ? '#EFF6FF' : 'transparent'; }}
                  >{y}</button>
                );
              })}
            </div>
          </>}
        </div>,
        document.body
      )}
    </>
  );
}

// ── PlanModal ─────────────────────────────────────────────────────────────────

function PlanModal({ mode, initial, onClose, onSave }: {
  mode: 'create' | 'edit'; initial: PlanForm;
  onClose: () => void; onSave: (f: PlanForm) => Promise<void>;
}) {
  const [form, setForm]               = useState<PlanForm>(initial);
  const [saving, setSaving]           = useState(false);
  const [serverError, setServerError] = useState('');

  const inp: React.CSSProperties = { width: '100%', height: 38, padding: '0 11px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)', fontSize: '0.83rem', outline: 'none', boxSizing: 'border-box' };

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
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Professional" style={inp} required />
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Price ($)</label>
                <input type="number" min={0} value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="e.g. 149" style={inp} required />
              </div>
              <div>
                <label style={labelStyle}>Duration (days) <span style={{ color: '#EF4444' }}>*</span></label>
                <input type="number" min={1} value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} placeholder="e.g. 30" style={inp} required />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Features</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {form.features.map((feat, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6 }}>
                    <input value={feat} onChange={e => { const features = [...form.features]; features[i] = e.target.value; setForm(f => ({ ...f, features })); }} placeholder={`Feature ${i + 1}`} style={{ ...inp, flex: 1 }} />
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
                style={{ width: 38, height: 22, borderRadius: 99, flexShrink: 0, backgroundColor: form.popular ? '#2563EB' : 'var(--muted)', position: 'relative', transition: 'background 0.2s', cursor: 'pointer' }}>
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

// ── SubscriptionModal ─────────────────────────────────────────────────────────

function SubscriptionModal({ mode, initial, companies, plans, onClose, onSave }: {
  mode: 'create' | 'edit'; initial: SubForm;
  companies: ApiCompanyLight[]; plans: ApiPlan[];
  onClose: () => void; onSave: (f: SubForm) => Promise<void>;
}) {
  const [form, setForm]               = useState<SubForm>(initial);
  const [saving, setSaving]           = useState(false);
  const [serverError, setServerError] = useState('');

  const inp: React.CSSProperties = { width: '100%', height: 38, padding: '0 11px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--foreground)', fontSize: '0.83rem', outline: 'none', boxSizing: 'border-box' };

  const companyOpts = companies.map(c => ({ value: c.id, label: `${c.name} — MC #${c.mc}` }));
  const planOpts    = plans.map(p => ({ value: p.id, label: `${p.name}  ·  $${p.price} / ${p.duration}d` }));

  function handlePlanChange(planId: string) {
    const plan = plans.find(p => p.id === planId);
    setForm(f => ({
      ...f, plan_id: planId,
      amount_paid: plan ? String(plan.price) : f.amount_paid,
      period_end:  plan ? addDaysDisplay(f.period_start || todayDisplay(), plan.duration) : f.period_end,
    }));
  }

  function handleStartChange(date: string) {
    const plan = plans.find(p => p.id === form.plan_id);
    setForm(f => ({
      ...f, period_start: date,
      period_end: plan ? addDaysDisplay(date, plan.duration) : f.period_end,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setServerError('');
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
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)' }}>{mode === 'create' ? 'Record Payment' : 'Edit Subscription'}</h2>
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
                <div style={{ ...inp, display: 'flex', alignItems: 'center', backgroundColor: 'var(--muted)', cursor: 'not-allowed', opacity: 0.7 }}>
                  {companies.find(c => c.id === form.company_id)?.name ?? form.company_id}
                </div>
              ) : (
                <SelectPicker
                  value={form.company_id}
                  options={companyOpts}
                  placeholder="Select a company…"
                  onChange={v => setForm(f => ({ ...f, company_id: v }))}
                />
              )}
            </div>

            {/* Plan */}
            <div>
              <label style={labelStyle}>Plan <span style={{ color: '#EF4444' }}>*</span></label>
              <SelectPicker
                value={form.plan_id}
                options={planOpts}
                placeholder="Select a plan…"
                onChange={handlePlanChange}
              />
            </div>

            {/* Amount + Currency */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 12 }}>
              <div>
                <label style={labelStyle}>Amount Paid ($)</label>
                <input type="number" min={0} step="0.01" value={form.amount_paid} onChange={e => setForm(f => ({ ...f, amount_paid: e.target.value }))} placeholder="0.00" style={inp} />
              </div>
              <div>
                <label style={labelStyle}>Currency</label>
                <input value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} placeholder="USD" style={inp} />
              </div>
            </div>

            {/* Period */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Period Start</label>
                <DatePicker value={form.period_start} onChange={handleStartChange} placeholder="Select start date" />
              </div>
              <div>
                <label style={labelStyle}>Period End</label>
                <DatePicker value={form.period_end} onChange={v => setForm(f => ({ ...f, period_end: v }))} placeholder="Select end date" />
              </div>
            </div>

            {/* Status */}
            <div>
              <label style={labelStyle}>Status</label>
              <CustomSelect
                value={form.status}
                options={['Active', 'Pending', 'Suspended']}
                onChange={v => setForm(f => ({ ...f, status: v as SubStatus }))}
              />
            </div>

            {/* Note */}
            <div>
              <label style={labelStyle}>Note</label>
              <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="e.g. Invoice #INV-001 or external payment ref" style={inp} />
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
              style={{ flex: 2, height: 38, borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', border: 'none', color: '#fff', fontSize: '0.83rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: saving ? 0.8 : 1 }}
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {mode === 'create' ? 'Record Payment' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SubscriptionsPage() {
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
  const [subCounts, setSubCounts]     = useState({ total: 0, active: 0, pending: 0, suspended: 0 });
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

  const fetchSubs = useCallback(async () => {
    setSubLoading(true); setSubError('');
    try {
      const qs = new URLSearchParams();
      if (statusFilter !== 'all')  qs.set('status',     statusFilter);
      if (planIdFilter !== 'all')  qs.set('plan_id',    planIdFilter);
      if (companyFilter !== 'all') qs.set('company_id', companyFilter);
      const q = qs.toString();
      const body = await api.getBody<{ data: ApiSubscription[]; stats?: { total?: number; active?: number; pending?: number; suspended?: number } }>(`/subscriptions${q ? `?${q}` : ''}`);
      const data = body.data ?? [];
      setSubs(data);
      setSubCounts({
        total:     body.stats?.total     ?? data.length,
        active:    body.stats?.active    ?? data.filter(s => s.status === 'Active').length,
        pending:   body.stats?.pending   ?? data.filter(s => s.status === 'Pending').length,
        suspended: body.stats?.suspended ?? data.filter(s => s.status === 'Suspended').length,
      });
    } catch { setSubError('Failed to load subscriptions. Please refresh.'); }
    finally { setSubLoading(false); }
  }, [statusFilter, planIdFilter, companyFilter]);

  useEffect(() => {
    if (section === 'ledger') { setSubPage(1); fetchSubs(); }
  }, [section, fetchSubs]);

  async function handlePlanSave(f: PlanForm): Promise<void> {
    const price    = parseInt(f.price)    || 0;
    const duration = parseInt(f.duration) || 30;
    const features = f.features.filter(ft => ft.trim() !== '');
    const payload  = { name: f.name, color: f.color, price, duration, features, popular: f.popular };
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
    setDeletingPlan(true);
    try { await api.delete(`/plans/${id}`); setPlans(p => p.filter(pl => pl.id !== id)); setDeletePlan(null); }
    finally { setDeletingPlan(false); }
  }

  async function handleSubSave(f: SubForm): Promise<void> {
    const payload = {
      company_id:   f.company_id,
      plan_id:      f.plan_id,
      amount_paid:  parseFloat(f.amount_paid) || 0,
      currency:     f.currency || 'USD',
      period_start: f.period_start ? displayToISO(f.period_start) : undefined,
      period_end:   f.period_end   ? displayToISO(f.period_end)   : undefined,
      status:       f.status,
      note:         f.note,
    };
    if (subModal === 'create') {
      const created = await api.post<ApiSubscription>('/subscriptions', payload);
      setSubs(s => [created, ...s]);
      setSubCounts(c => ({ ...c, total: c.total + 1, [created.status.toLowerCase()]: (c as Record<string, number>)[created.status.toLowerCase()] + 1 }));
    } else if (editSub) {
      const { company_id: _cid, ...rest } = payload;
      const updated = await api.put<ApiSubscription>(`/subscriptions/${editSub.id}`, rest);
      setSubs(s => s.map(sub => sub.id === editSub.id ? updated : sub));
    }
    setSubModal(null);
  }

  async function handleSubDelete(id: string) {
    setDeletingSub(true);
    try {
      await api.delete(`/subscriptions/${id}`);
      const removed = subs.find(s => s.id === id);
      setSubs(s => s.filter(sub => sub.id !== id));
      if (removed) setSubCounts(c => ({ ...c, total: Math.max(0, c.total - 1), [removed.status.toLowerCase()]: Math.max(0, (c as Record<string, number>)[removed.status.toLowerCase()] - 1) }));
      setDeleteSub(null);
    } finally { setDeletingSub(false); }
  }

  const planInitial: PlanForm = editPlan
    ? { name: editPlan.name, color: editPlan.color, price: String(editPlan.price), duration: String(editPlan.duration), features: [...editPlan.features, ''], popular: editPlan.popular }
    : EMPTY_PLAN_FORM;

  const subInitial: SubForm = editSub
    ? { company_id: editSub.company_id, plan_id: editSub.plan_id, amount_paid: String(editSub.amount_paid), currency: editSub.currency, period_start: isoToDisplay(editSub.period_start), period_end: isoToDisplay(editSub.period_end), status: editSub.status, note: editSub.note ?? '' }
    : { company_id: '', plan_id: '', amount_paid: '', currency: 'USD', period_start: todayDisplay(), period_end: '', status: 'Active', note: '' };

  const subTotalPages = Math.max(1, Math.ceil(subs.length / PER_PAGE));
  const subRows       = subs.slice((subPage - 1) * PER_PAGE, subPage * PER_PAGE);

  const companyName = (id: string) => companies.find(c => c.id === id)?.name ?? id;
  const planColor   = (planId: string) => plans.find(p => p.id === planId)?.color ?? '#64748B';

  const companyFilterOpts = ['all', ...companies.map(c => c.id)];
  const planIdFilterOpts  = ['all', ...plans.map(p => p.id)];

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: 'var(--background)' }}>

      {planModal && <PlanModal mode={planModal} initial={planInitial} onClose={() => setPlanModal(null)} onSave={handlePlanSave} />}
      {subModal  && <SubscriptionModal mode={subModal} initial={subInitial} companies={companies} plans={plans} onClose={() => setSubModal(null)} onSave={handleSubSave} />}
      {deletePlan && <DeleteConfirmModal title="Delete Plan?" description={<>Permanently delete the <strong style={{ color: 'var(--foreground)' }}>{deletePlan.name}</strong> plan. This cannot be undone.</>} onConfirm={() => handlePlanDelete(deletePlan.id)} onCancel={() => setDeletePlan(null)} loading={deletingPlan} />}
      {deleteSub  && <DeleteConfirmModal title="Delete Subscription?" description={<>Remove this subscription for <strong style={{ color: 'var(--foreground)' }}>{companyName(deleteSub.company_id)}</strong>. This may affect the company's plan status.</>} onConfirm={() => handleSubDelete(deleteSub.id)} onCancel={() => setDeleteSub(null)} loading={deletingSub} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ color: 'var(--foreground)', fontSize: '1.3rem', fontWeight: 700, lineHeight: 1.2 }}>Subscriptions</h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.83rem', marginTop: 3 }}>
            {section === 'plans' ? 'Manage subscription plan tiers' : 'Payment ledger — record and track carrier subscriptions'}
          </p>
        </div>
        {section === 'plans' ? (
          <button onClick={() => { setEditPlan(null); setPlanModal('create'); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, cursor: 'pointer', background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', border: 'none', color: '#fff', fontSize: '0.82rem', fontWeight: 600 }}>
            <Plus size={15} /> Create Plan
          </button>
        ) : (
          <button onClick={() => { setEditSub(null); setSubModal('create'); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, cursor: 'pointer', background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', border: 'none', color: '#fff', fontSize: '0.82rem', fontWeight: 600 }}>
            <Plus size={15} /> Record Payment
          </button>
        )}
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 24, borderBottom: '2px solid var(--border)' }}>
        {(['plans', 'ledger'] as const).map(s => (
          <button key={s} onClick={() => setSection(s)}
            style={{ padding: '8px 18px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', background: 'none', border: 'none', borderBottom: `2px solid ${section === s ? '#2563EB' : 'transparent'}`, marginBottom: -2, color: section === s ? '#2563EB' : 'var(--muted-foreground)', transition: 'color 0.15s' }}
          >
            {s === 'plans' ? 'Plans' : 'Payment Ledger'}
          </button>
        ))}
      </div>

      {/* ── Plans ─────────────────────────────────────────────────────────── */}
      {section === 'plans' && (
        <>
          {planLoading && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '80px 0', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}><Loader2 size={18} className="animate-spin" /> Loading plans…</div>}
          {!planLoading && planError && <div style={{ textAlign: 'center', padding: '80px 0', color: '#B91C1C', fontSize: '0.85rem' }}>{planError}</div>}
          {!planLoading && !planError && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
              {plans.map(plan => (
                <div key={plan.id} style={{ position: 'relative', backgroundColor: 'var(--card)', border: `1px solid ${plan.popular ? plan.color : 'var(--border)'}`, borderRadius: 14, padding: '22px 22px 20px', boxShadow: plan.popular ? `0 4px 20px ${plan.color}15` : undefined }}>
                  {plan.popular && <div style={{ position: 'absolute', top: 14, right: 14, backgroundColor: plan.color, color: '#fff', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.04em', padding: '3px 8px', borderRadius: 99 }}>MOST POPULAR</div>}
                  <div style={{ marginBottom: 14 }}>
                    <span style={{ display: 'inline-block', backgroundColor: plan.color + '18', color: plan.color, border: `1px solid ${plan.color}40`, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', padding: '3px 10px', borderRadius: 99, textTransform: 'uppercase', marginBottom: 10 }}>{plan.name}</span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--foreground)', lineHeight: 1 }}>${plan.price}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: 4 }}>{plan.duration} day{plan.duration !== 1 ? 's' : ''} billing cycle</div>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {plan.features.map(f => (
                      <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.8rem', color: 'var(--foreground)' }}>
                        <CheckCircle2 size={14} color="#22C55E" style={{ flexShrink: 0 }} />{f}
                      </li>
                    ))}
                  </ul>
                  <div style={{ paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
                    <button onClick={() => { setEditPlan(plan); setPlanModal('edit'); }}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 0', borderRadius: 8, cursor: 'pointer', backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)', fontSize: '0.78rem', fontWeight: 500 }}
                      onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--muted)')}
                      onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--background)')}
                    ><Pencil size={13} /> Edit</button>
                    <button onClick={() => setDeletePlan(plan)}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 0', borderRadius: 8, cursor: 'pointer', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.78rem', fontWeight: 500 }}
                      onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#FEE2E2')}
                      onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#FEF2F2')}
                    ><Trash2 size={13} /> Delete</button>
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
        </>
      )}

      {/* ── Ledger ────────────────────────────────────────────────────────── */}
      {section === 'ledger' && (
        <>
          {/* KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
            {[
              { label: 'Total',     value: subCounts.total,     icon: <Activity size={18} />,   iconBg: '#EFF6FF', iconColor: '#2563EB' },
              { label: 'Active',    value: subCounts.active,    icon: <CreditCard size={18} />, iconBg: '#F0FDF4', iconColor: '#16A34A' },
              { label: 'Pending',   value: subCounts.pending,   icon: <Clock size={18} />,      iconBg: '#FFFBEB', iconColor: '#D97706' },
              { label: 'Suspended', value: subCounts.suspended, icon: <XCircle size={18} />,    iconBg: '#FEF2F2', iconColor: '#DC2626' },
            ].map(card => (
              <div key={card.label} style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: card.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: card.iconColor }}>{card.icon}</div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--foreground)', lineHeight: 1 }}>{card.value}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: 3 }}>{card.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Dropdown label="Status" options={['all', 'Active', 'Pending', 'Suspended'] as ('all' | SubStatus)[]} value={statusFilter} onChange={v => { setStatusFilter(v); setSubPage(1); }} getOptionLabel={v => v === 'all' ? 'All Statuses' : v} />
            <Dropdown label="Plan" options={planIdFilterOpts as string[]} value={planIdFilter} onChange={v => { setPlanIdFilter(v); setSubPage(1); }} getOptionLabel={id => id === 'all' ? 'All Plans' : (plans.find(p => p.id === id)?.name ?? id)} />
            <Dropdown label="Company" options={companyFilterOpts as string[]} value={companyFilter} onChange={v => { setCompanyFilter(v); setSubPage(1); }} getOptionLabel={id => id === 'all' ? 'All Companies' : companyName(id)} />
          </div>

          {subLoading && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '80px 0', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}><Loader2 size={18} className="animate-spin" /> Loading subscriptions…</div>}
          {!subLoading && subError && <div style={{ textAlign: 'center', padding: '80px 0', color: '#B91C1C', fontSize: '0.85rem' }}>{subError}</div>}

          {!subLoading && !subError && (
            <div style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--muted)' }}>
                    {['Company', 'Plan', 'Amount', 'Period', 'Status', 'Note', ''].map(h => (
                      <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted-foreground)', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {subRows.map((sub, i) => {
                    const ss  = SUB_STATUS[sub.status];
                    const col = planColor(sub.plan_id);
                    const exp = isExpired(sub.period_end);
                    return (
                      <tr key={sub.id} style={{ borderBottom: i < subRows.length - 1 ? '1px solid var(--border)' : 'none', backgroundColor: 'var(--card)' }}
                        onMouseEnter={e => ((e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'var(--muted)')}
                        onMouseLeave={e => ((e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'var(--card)')}
                      >
                        <td style={{ padding: '13px 16px' }}>
                          <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--foreground)' }}>{companyName(sub.company_id)}</span>
                        </td>
                        <td style={{ padding: '13px 16px' }}>
                          <span style={{ display: 'inline-block', backgroundColor: col + '18', color: col, border: `1px solid ${col}40`, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em', padding: '2px 9px', borderRadius: 99, textTransform: 'uppercase' }}>{sub.plan_name}</span>
                        </td>
                        <td style={{ padding: '13px 16px' }}>
                          <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--foreground)' }}>${sub.amount_paid.toLocaleString()}</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', marginLeft: 4 }}>{sub.currency}</span>
                        </td>
                        <td style={{ padding: '13px 16px' }}>
                          <div style={{ fontSize: '0.78rem', color: 'var(--foreground)' }}>{fmtDateShort(sub.period_start)} → {fmtDateShort(sub.period_end)}</div>
                          {exp && <span style={{ display: 'inline-block', marginTop: 3, backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.63rem', fontWeight: 700, padding: '1px 6px', borderRadius: 4, letterSpacing: '0.03em' }}>EXPIRED</span>}
                        </td>
                        <td style={{ padding: '13px 16px' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, backgroundColor: ss.bg, border: `1px solid ${ss.border}`, borderRadius: 99, padding: '3px 10px' }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: ss.dot, flexShrink: 0 }} />
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: ss.color }}>{sub.status}</span>
                          </div>
                        </td>
                        <td style={{ padding: '13px 16px', maxWidth: 160 }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }} title={sub.note}>{sub.note || '—'}</span>
                        </td>
                        <td style={{ padding: '13px 16px' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button onClick={() => { setEditSub(sub); setSubModal('edit'); }}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, border: '1px solid var(--border)', backgroundColor: 'var(--background)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500, color: 'var(--foreground)', whiteSpace: 'nowrap' }}
                              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--muted)')}
                              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--background)')}
                            ><Pencil size={12} /> Edit</button>
                            <button onClick={() => setDeleteSub(sub)}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, border: '1px solid #FECACA', backgroundColor: '#FEF2F2', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500, color: '#DC2626', whiteSpace: 'nowrap' }}
                              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#FEE2E2')}
                              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#FEF2F2')}
                            ><Trash2 size={12} /> Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {subs.length === 0 && (
                    <tr><td colSpan={7} style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>
                      No subscriptions recorded. Click "Record Payment" to add one.
                    </td></tr>
                  )}
                </tbody>
              </table>

              {subTotalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)' }}>
                    Showing {(subPage - 1) * PER_PAGE + 1}–{Math.min(subPage * PER_PAGE, subs.length)} of {subs.length}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setSubPage(p => Math.max(1, p - 1))} disabled={subPage === 1}
                      style={{ display: 'flex', alignItems: 'center', padding: '5px 10px', borderRadius: 7, border: '1px solid var(--border)', backgroundColor: 'var(--background)', cursor: subPage === 1 ? 'not-allowed' : 'pointer', color: 'var(--foreground)', opacity: subPage === 1 ? 0.4 : 1, fontSize: '0.78rem', gap: 4 }}>
                      <ChevronLeft size={13} /> Prev
                    </button>
                    <button onClick={() => setSubPage(p => Math.min(subTotalPages, p + 1))} disabled={subPage === subTotalPages}
                      style={{ display: 'flex', alignItems: 'center', padding: '5px 10px', borderRadius: 7, border: '1px solid var(--border)', backgroundColor: 'var(--background)', cursor: subPage === subTotalPages ? 'not-allowed' : 'pointer', color: 'var(--foreground)', opacity: subPage === subTotalPages ? 0.4 : 1, fontSize: '0.78rem', gap: 4 }}>
                      Next <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
