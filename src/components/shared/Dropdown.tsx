import { useState } from 'react';
import { CheckCircle2, ChevronDown, SlidersHorizontal } from 'lucide-react';

interface DropdownProps<T extends string> {
  label: string;
  options: T[];
  value: T;
  onChange: (value: T) => void;
  /** Optional: render a custom label for each option. Defaults to the option value itself,
   *  with "all" rendered as "All {label}s". */
  getOptionLabel?: (option: T) => string;
}

export function Dropdown<T extends string>({
  label,
  options,
  value,
  onChange,
  getOptionLabel,
}: DropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const isActive = value !== ('all' as T);

  function resolveLabel(opt: T) {
    if (getOptionLabel) return getOptionLabel(opt);
    return opt === 'all' ? `All ${label}s` : opt;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg px-3 py-2 transition-colors"
        style={{
          backgroundColor: isActive ? '#EFF6FF' : 'var(--card)',
          border: `1px solid ${isActive ? '#93C5FD' : 'var(--border)'}`,
          fontSize: '0.8rem',
          fontWeight: 500,
          color: isActive ? '#2563EB' : 'var(--foreground)',
          whiteSpace: 'nowrap',
        }}
      >
        <SlidersHorizontal size={13} />
        {isActive ? value : label}
        <ChevronDown size={13} style={{ opacity: 0.6 }} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 z-20 rounded-lg overflow-hidden shadow-lg py-1"
            style={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              minWidth: 150,
              top: 'calc(100% + 4px)',
            }}
          >
            {options.map((opt) => {
              const selected = opt === value;
              return (
                <button
                  key={opt}
                  onClick={() => { onChange(opt); setOpen(false); }}
                  className="w-full flex items-center justify-between px-3 py-2 transition-colors text-left"
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: selected ? 600 : 400,
                    color: selected ? '#2563EB' : 'var(--foreground)',
                    backgroundColor: selected ? '#EFF6FF' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!selected) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--muted)';
                  }}
                  onMouseLeave={(e) => {
                    if (!selected) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                  }}
                >
                  <span>{resolveLabel(opt)}</span>
                  {selected && <CheckCircle2 size={13} />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
