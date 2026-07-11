import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

export interface SearchSelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

/**
 * A labeled, searchable, scrollable select rendered through a portal so it
 * escapes transformed/overflow-clipped ancestors (e.g. centered modals).
 */
export function SearchSelect({
  value, options, placeholder, onChange, disabled = false, searchable = true,
}: {
  value: string;
  options: SearchSelectOption[];
  placeholder: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  searchable?: boolean;
}) {
  const [open, setOpen]   = useState(false);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState('');
  const trigRef           = useRef<HTMLButtonElement>(null);
  const popRef            = useRef<HTMLDivElement>(null);
  const searchRef         = useRef<HTMLInputElement>(null);
  const [pos, setPos]     = useState({ top: 0, left: 0, width: 0 });

  const selectedLabel = options.find(o => o.value === value)?.label ?? '';
  const filtered = query.trim()
    ? options.filter(o => (o.label + ' ' + (o.sublabel ?? '')).toLowerCase().includes(query.toLowerCase()))
    : options;

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

  useEffect(() => {
    if (open && searchable) setTimeout(() => searchRef.current?.focus(), 60);
    else setQuery('');
  }, [open, searchable]);

  function toggle() {
    if (disabled) return;
    if (!open && trigRef.current) {
      const r = trigRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left, width: r.width });
      setReady(false);
    }
    setOpen(o => !o);
  }

  return (
    <>
      <button ref={trigRef} type="button" onClick={toggle} disabled={disabled}
        style={{ width: '100%', padding: '7px 11px', borderRadius: 8, border: `1px solid ${open ? '#93C5FD' : 'var(--border)'}`, fontSize: '0.82rem', color: selectedLabel ? 'var(--foreground)' : 'var(--muted-foreground)', backgroundColor: disabled ? 'var(--muted)' : 'var(--card)', cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, outline: 'none', boxSizing: 'border-box', opacity: disabled ? 0.7 : 1 }}
        onMouseEnter={e => { if (!open && !disabled) (e.currentTarget.style.borderColor = '#93C5FD'); }}
        onMouseLeave={e => { if (!open) (e.currentTarget.style.borderColor = 'var(--border)'); }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedLabel || placeholder}</span>
        <ChevronDown size={13} style={{ flexShrink: 0, opacity: 0.5, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />
      </button>
      {open && createPortal(
        <div ref={popRef} style={{ position: 'fixed', top: pos.top, left: pos.left, width: Math.max(pos.width, 260), zIndex: 9999, backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.14)', overflow: 'hidden', opacity: ready ? 1 : 0, transition: 'opacity 80ms' }}>
          {searchable && (
            <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
              <input ref={searchRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search…"
                style={{ width: '100%', height: 32, padding: '0 10px', borderRadius: 6, border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => (e.currentTarget.style.borderColor = '#93C5FD')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
            </div>
          )}
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.map(o => (
              <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); }}
                style={{ width: '100%', padding: '9px 12px', textAlign: 'left', border: 'none', cursor: 'pointer', display: 'block', backgroundColor: o.value === value ? '#EFF6FF' : 'transparent' }}
                onMouseEnter={e => { if (o.value !== value) (e.currentTarget.style.backgroundColor = 'var(--muted)'); }}
                onMouseLeave={e => { if (o.value !== value) (e.currentTarget.style.backgroundColor = 'transparent'); }}
              >
                <div style={{ fontSize: '0.82rem', color: o.value === value ? '#2563EB' : 'var(--foreground)', fontWeight: o.value === value ? 600 : 400 }}>{o.label}</div>
                {o.sublabel && <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', marginTop: 1 }}>{o.sublabel}</div>}
              </button>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: '10px 12px', fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>No results</div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
