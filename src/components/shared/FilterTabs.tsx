import type { ReactNode } from 'react';

export interface TabItem<T extends string> {
  id: T;
  label: string;
  count?: number;
  icon?: ReactNode;
}

interface FilterTabsProps<T extends string> {
  tabs: TabItem<T>[];
  active: T;
  onChange: (id: T) => void;
}

export function FilterTabs<T extends string>({ tabs, active, onChange }: FilterTabsProps<T>) {
  return (
    <div className="flex items-center gap-1.5">
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition-all"
            style={{
              backgroundColor: isActive ? '#2563EB' : 'transparent',
              border: `1.5px solid ${isActive ? '#2563EB' : 'var(--border)'}`,
              fontSize: '0.78rem',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? '#ffffff' : 'var(--muted-foreground)',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.borderColor = '#93C5FD';
                el.style.color = '#2563EB';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.borderColor = 'var(--border)';
                el.style.color = 'var(--muted-foreground)';
              }
            }}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span
                className="rounded-full px-1.5 py-0.5 leading-none"
                style={{
                  backgroundColor: isActive ? 'rgba(255,255,255,0.22)' : 'var(--muted)',
                  color: isActive ? '#ffffff' : 'var(--muted-foreground)',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
