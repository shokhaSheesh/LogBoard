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
            className="flex items-center gap-1.5 transition-colors"
            style={{
              height: 36,
              padding: '0 11px',
              borderRadius: 8,
              backgroundColor: isActive ? 'var(--primary-soft)' : 'var(--card)',
              border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border)'}`,
              fontSize: 13,
              fontWeight: isActive ? 600 : 500,
              color: isActive ? 'var(--primary)' : 'var(--foreground)',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
            }}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span
                className="rounded-full px-1.5 py-0.5 leading-none"
                style={{ backgroundColor: isActive ? 'var(--card)' : 'var(--muted)', color: isActive ? 'var(--primary)' : 'var(--muted-foreground)', fontSize: 11, fontWeight: 600 }}
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
