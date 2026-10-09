import type { ReactNode } from 'react';
import { Loader2, Search } from 'lucide-react';

// The small pieces every list page is built from, so the pages read as one console:
// a page body, the table card with its toolbar, the search box, the two button kinds,
// the row action buttons and the pager.

export function Page({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--background)', padding: 20 }}>
      {children}
    </div>
  );
}

// KPI cards sit in one strip above the table.
export function KpiRow({ children, cols = 3 }: { children: ReactNode; cols?: number }) {
  return <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 12, marginBottom: 14 }}>{children}</div>;
}

export function Card({ children }: { children: ReactNode }) {
  return <div style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>{children}</div>;
}

// Toolbar inside the table card: search, then filters, and the primary action on the right.
export function Toolbar({ children, action }: { children?: ReactNode; action?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
      {/* Filters wrap among themselves; the action keeps its place at the top right. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>{children}</div>
      {action}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder = 'Search' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div style={{ position: 'relative', width: 240 }}>
      <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none' }} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: '100%', height: 36, padding: '0 10px 0 30px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--foreground)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--primary-soft)'; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
      />
    </div>
  );
}

export function PrimaryButton({ children, icon, onClick, disabled }: { children: ReactNode; icon?: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px', borderRadius: 8, border: 'none', backgroundColor: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.backgroundColor = '#136F3D'; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--primary)'; }}
    >
      {icon}{children}
    </button>
  );
}

// A row's icon action. Quiet until hovered; `danger` turns red on hover.
export function IconButton({ children, title, onClick, danger, disabled, busy }: { children: ReactNode; title: string; onClick: () => void; danger?: boolean; disabled?: boolean; busy?: boolean }) {
  const off = disabled || busy;
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={off}
      style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--muted-foreground)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: off ? 'not-allowed' : 'pointer', opacity: disabled ? 0.35 : 1 }}
      onMouseEnter={(e) => {
        if (off) return;
        e.currentTarget.style.backgroundColor = danger ? '#FEF2F2' : 'var(--muted)';
        e.currentTarget.style.color = danger ? '#DC2626' : 'var(--foreground)';
        e.currentTarget.style.borderColor = danger ? '#FECACA' : 'var(--border)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.color = 'var(--muted-foreground)';
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
    >
      {busy ? <Loader2 size={13} className="animate-spin" /> : children}
    </button>
  );
}

export function RowActions({ children }: { children: ReactNode }) {
  return <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>{children}</div>;
}

// The one "nothing here" mark.
export function Dash() {
  return <span aria-label="None" style={{ fontSize: 13, color: 'var(--muted-foreground)', userSelect: 'none' }}>—</span>;
}

export function TableState({ loading, error, onRetry, what }: { loading: boolean; error?: string; onRetry?: () => void; what: string }) {
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '56px 16px', color: 'var(--muted-foreground)', fontSize: 13 }}>
        <Loader2 size={16} className="animate-spin" /> Loading {what}…
      </div>
    );
  }
  if (!error) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '56px 16px', color: '#DC2626', fontSize: 13 }}>
      {error}
      {onRetry && (
        <button onClick={onRetry} style={{ fontSize: 12.5, fontWeight: 600, color: '#DC2626', background: 'none', border: '1px solid #FECACA', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>Retry</button>
      )}
    </div>
  );
}

export function Pager({ page, totalPages, total, perPage, onPage }: { page: number; totalPages: number; total: number; perPage: number; onPage: (p: number) => void }) {
  if (total === 0) return null;
  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1);
  const step = (disabled: boolean): React.CSSProperties => ({ height: 30, padding: '0 11px', borderRadius: 7, border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--foreground)', fontSize: 12.5, fontWeight: 500, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.45 : 1 });
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderTop: '1px solid var(--border)' }}>
      <span style={{ fontSize: 12.5, color: 'var(--muted-foreground)' }}>{start}–{end} of {total}</span>
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button onClick={() => onPage(page - 1)} disabled={page === 1} style={step(page === 1)}>Prev</button>
          {pages.map((p, i) => (
            <span key={p} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {i > 0 && pages[i - 1] !== p - 1 && <span style={{ fontSize: 12.5, color: 'var(--muted-foreground)', padding: '0 2px' }}>…</span>}
              <button onClick={() => onPage(p)} style={{ minWidth: 30, height: 30, borderRadius: 7, border: 'none', backgroundColor: p === page ? 'var(--primary)' : 'transparent', color: p === page ? '#fff' : 'var(--muted-foreground)', fontSize: 12.5, fontWeight: p === page ? 600 : 400, cursor: 'pointer' }}>{p}</button>
            </span>
          ))}
          <button onClick={() => onPage(page + 1)} disabled={page === totalPages} style={step(page === totalPages)}>Next</button>
        </div>
      )}
    </div>
  );
}
