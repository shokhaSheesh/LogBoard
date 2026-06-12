import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface DeleteConfirmModalProps {
  title: string;
  description: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  icon?: ReactNode;
}

export function DeleteConfirmModal({
  title,
  description,
  onConfirm,
  onCancel,
  confirmLabel = 'Yes, Delete',
  icon,
}: DeleteConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="rounded-2xl shadow-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--card)',
          width: '100%',
          maxWidth: 400,
          border: '1px solid var(--border)',
        }}
      >
        <div className="px-6 py-5">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
            style={{ backgroundColor: '#FEF2F2' }}
          >
            {icon ?? <AlertTriangle size={20} style={{ color: '#DC2626' }} />}
          </div>
          <h3
            style={{
              color: 'var(--foreground)',
              fontSize: '1rem',
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            {title}
          </h3>
          <p
            style={{
              color: 'var(--muted-foreground)',
              fontSize: '0.83rem',
              lineHeight: 1.6,
            }}
          >
            {description}
          </p>
        </div>

        <div className="flex gap-2 px-6 pb-5">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg py-2 transition-colors"
            style={{
              fontSize: '0.83rem',
              fontWeight: 500,
              color: 'var(--foreground)',
              backgroundColor: 'var(--muted)',
              border: '1px solid var(--border)',
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#E5E7EB')
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--muted)')
            }
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-lg py-2 transition-colors"
            style={{
              fontSize: '0.83rem',
              fontWeight: 600,
              backgroundColor: '#DC2626',
              color: '#ffffff',
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#B91C1C')
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#DC2626')
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
