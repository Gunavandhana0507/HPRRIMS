import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);
const ICON = { ok: CheckCircle2, bad: AlertTriangle, info: Info };
const TONE = {
  ok: 'border-ok-600/30 text-ok-700',
  bad: 'border-bad-600/30 text-bad-700',
  info: 'border-brand-600/30 text-brand-800',
};

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const dismiss = useCallback((id) => setItems((list) => list.filter((t) => t.id !== id)), []);
  const push = useCallback((tone, message) => {
    const id = `${Date.now()}-${Math.random()}`;
    setItems((list) => [...list.slice(-3), { id, tone, message }]);
    setTimeout(() => dismiss(id), tone === 'bad' ? 7000 : 4500);
  }, [dismiss]);
  const api = useMemo(() => ({
    success: (m) => push('ok', m), error: (m) => push('bad', m), info: (m) => push('info', m),
  }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(24rem,calc(100%-2rem))] flex-col gap-2">
        {items.map((t) => {
          const Icon = ICON[t.tone];
          return (
            <div key={t.id} role={t.tone === 'bad' ? 'alert' : 'status'}
              className={`pointer-events-auto flex items-start gap-3 rounded-lg border bg-surface px-4 py-3 text-sm shadow-pop ${TONE[t.tone]}`}>
              <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <p className="flex-1 text-ink">{t.message}</p>
              <button type="button" onClick={() => dismiss(t.id)} className="rounded text-ink-muted hover:text-ink" aria-label="Dismiss notification">
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
