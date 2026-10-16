import { forwardRef, useEffect, useId, useRef } from 'react';
import { AlertTriangle, Inbox, Loader2, RefreshCw, Search, X } from 'lucide-react';

const cx = (...c) => c.filter(Boolean).join(' ');
export { cx };

const BTN = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-600/50',
  secondary: 'bg-surface text-ink border border-line hover:bg-sunken active:bg-line disabled:text-ink-muted',
  danger: 'bg-bad-600 text-white hover:bg-bad-700 disabled:bg-bad-600/50',
  ghost: 'text-ink-soft hover:bg-sunken hover:text-ink disabled:text-ink-muted',
};

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, icon: Icon, className, children, disabled, type = 'button', ...rest }, ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded font-semibold transition-colors disabled:cursor-not-allowed whitespace-nowrap',
        size === 'sm' ? 'h-8 px-3 text-sm' : 'h-10 px-4 text-sm',
        BTN[variant], className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : Icon && <Icon className="h-4 w-4" aria-hidden />}
      {children}
    </button>
  );
});

export function Field({ label, error, hint, required, children, id, className }) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-semibold text-ink">
          {label}{required && <span className="text-bad-600" aria-hidden> *</span>}
        </label>
      )}
      {children}
      {hint && !error && <p id={`${id}-hint`} className="text-xs text-ink-muted">{hint}</p>}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

export function FieldError({ id, message }) {
  if (!message) return null;
  return <p id={id} role="alert" className="text-xs font-semibold text-bad-600">{message}</p>;
}

const control = (error) => cx(
  'w-full rounded border bg-surface px-3 text-base text-ink placeholder:text-ink-muted/70 transition-colors',
  'focus-visible:ring-offset-0 focus-visible:border-brand-600 disabled:bg-sunken disabled:text-ink-muted',
  error ? 'border-bad-600' : 'border-line hover:border-ink-muted/50',
);

function useFieldId(id) {
  const auto = useId();
  return id || auto;
}

export const Input = forwardRef(function Input({ label, error, hint, required, id, className, ...rest }, ref) {
  const fid = useFieldId(id);
  return (
    <Field label={label} error={error} hint={hint} required={required} id={fid} className={className}>
      <input
        ref={ref} id={fid} required={required}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${fid}-error` : hint ? `${fid}-hint` : undefined}
        className={cx(control(error), 'h-10')}
        {...rest}
      />
    </Field>
  );
});

export function DateInput(props) {
  return <Input type={props.type || 'date'} {...props} />;
}

export function Select({ label, error, hint, required, id, className, children, ...rest }) {
  const fid = useFieldId(id);
  return (
    <Field label={label} error={error} hint={hint} required={required} id={fid} className={className}>
      <select
        id={fid} required={required}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${fid}-error` : hint ? `${fid}-hint` : undefined}
        className={cx(control(error), 'h-10 pr-8')}
        {...rest}
      >
        {children}
      </select>
    </Field>
  );
}

export function Textarea({ label, error, hint, required, id, className, rows = 4, ...rest }) {
  const fid = useFieldId(id);
  return (
    <Field label={label} error={error} hint={hint} required={required} id={fid} className={className}>
      <textarea
        id={fid} rows={rows} required={required}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${fid}-error` : hint ? `${fid}-hint` : undefined}
        className={cx(control(error), 'py-2 leading-relaxed')}
        {...rest}
      />
    </Field>
  );
}

export function SearchBar({ value, onChange, placeholder, label = 'Search', className }) {
  const id = useId();
  return (
    <div className={cx('relative', className)}>
      <label htmlFor={id} className="sr-only">{label}</label>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
      <input
        id={id} type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className={cx(control(false), 'h-10 pl-9')}
      />
    </div>
  );
}

export function Spinner({ label = 'Loading', className }) {
  return (
    <div role="status" className={cx('flex items-center justify-center gap-2 py-10 text-sm text-ink-muted', className)}>
      <Loader2 className="h-5 w-5 animate-spin text-brand-600" aria-hidden />
      <span>{label}…</span>
    </div>
  );
}

export function EmptyState({ title, children, action, icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <Icon className="mb-3 h-7 w-7 text-ink-muted" aria-hidden />
      <p className="font-semibold text-ink">{title}</p>
      {children && <p className="mt-1 max-w-md text-sm text-ink-muted">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div role="alert" className="flex flex-col items-center px-6 py-10 text-center">
      <AlertTriangle className="mb-3 h-7 w-7 text-bad-600" aria-hidden />
      <p className="font-semibold text-ink">Could not load this information</p>
      <p className="mt-1 max-w-md text-sm text-ink-muted">{message}</p>
      {onRetry && <Button variant="secondary" size="sm" icon={RefreshCw} className="mt-4" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function Alert({ tone = 'info', title, children, action }) {
  const tones = {
    info: 'border-brand-100 bg-brand-50 text-brand-800',
    ok: 'border-ok-600/20 bg-ok-50 text-ok-700',
    warn: 'border-warn-600/25 bg-warn-50 text-warn-700',
    bad: 'border-bad-600/20 bg-bad-50 text-bad-700',
  };
  return (
    <div role={tone === 'bad' ? 'alert' : 'status'} className={cx('flex flex-wrap items-start justify-between gap-3 rounded border px-4 py-3 text-sm', tones[tone])}>
      <div>
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-0.5' : ''}>{children}</div>}
      </div>
      {action}
    </div>
  );
}

const BADGE = {
  neutral: 'bg-sunken text-ink-soft',
  brand: 'bg-brand-50 text-brand-700',
  ok: 'bg-ok-50 text-ok-700',
  warn: 'bg-warn-50 text-warn-700',
  bad: 'bg-bad-50 text-bad-700',
};

export function Badge({ tone = 'neutral', children, className }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold', BADGE[tone], className)}>
      {children}
    </span>
  );
}

export function Card({ title, actions, children, className, bodyClassName, as: Tag = 'section' }) {
  return (
    <Tag className={cx('rounded-lg border border-line bg-surface shadow-card', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cx('p-5', bodyClassName)}>{children}</div>
    </Tag>
  );
}

export function StatCard({ label, value, hint, tone }) {
  const tones = { ok: 'text-ok-700', warn: 'text-warn-700', bad: 'text-bad-700', brand: 'text-brand-700' };
  return (
    <div className="rounded-lg border border-line bg-surface px-4 py-3 shadow-card">
      <p className="text-sm text-ink-muted">{label}</p>
      <p className={cx('tabular mt-1 text-2xl font-semibold', tones[tone] || 'text-ink')}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      className={cx('w-[calc(100%-2rem)] rounded-lg bg-surface p-0 text-ink shadow-pop backdrop:bg-ink/40', size === 'lg' ? 'max-w-2xl' : 'max-w-lg')}
    >
      {open && (
        <div>
          <header className="flex items-center justify-between border-b border-line px-5 py-3">
            <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
            <button type="button" onClick={onClose} className="rounded p-1 text-ink-muted hover:bg-sunken hover:text-ink" aria-label="Close dialog">
              <X className="h-5 w-5" aria-hidden />
            </button>
          </header>
          <div className="px-5 py-4">{children}</div>
          {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}

export function ConfirmDialog({ open, title, children, confirmLabel = 'Confirm', tone = 'primary', loading, onConfirm, onClose }) {
  return (
    <Modal
      open={open} onClose={onClose} title={title}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant={tone} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </>
      )}
    >
      <div className="text-sm text-ink-soft">{children}</div>
    </Modal>
  );
}
