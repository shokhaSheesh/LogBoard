import { useEffect } from 'react';

// Escape closes the dialog it is used in. Off while `enabled` is false (e.g. mid-save).
export function useEscape(onClose: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose, enabled]);
}
