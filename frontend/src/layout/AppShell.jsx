import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import { ROLE_LABEL, useAuth } from '../auth/AuthContext';
import { NAV } from './nav';
import { cx } from '../components/ui';

export function Logo({ compact = false }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="6" fill="#0F766E" />
        <path d="M13 7h6v6h6v6h-6v6h-6v-6H7v-6h6z" fill="#fff" />
      </svg>
      {!compact && (
        <span className="leading-tight">
          <span className="block text-base font-bold tracking-wide text-ink">HPRRIMS</span>
          <span className="block text-xs text-ink-muted">Records · Readmissions · ICU</span>
        </span>
      )}
    </span>
  );
}

function Sidebar({ items, onNavigate }) {
  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5 px-3 py-4">
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to} to={to} end onClick={onNavigate}
          className={({ isActive }) => cx(
            'flex items-center gap-3 rounded px-3 py-2 text-sm font-semibold transition-colors',
            isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-soft hover:bg-sunken hover:text-ink',
          )}
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export function AppShell() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const items = NAV.filter((n) => n.roles.includes(user.role));

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[15.5rem_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-surface lg:flex">
        <div className="border-b border-line px-5 py-4"><Link to="/" aria-label="HPRRIMS home"><Logo /></Link></div>
        <div className="flex-1 overflow-y-auto"><Sidebar items={items} /></div>
        <p className="border-t border-line px-5 py-3 text-xs text-ink-muted">Synthetic demo data only. Not for clinical use.</p>
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button type="button" className="absolute inset-0 bg-ink/40" aria-label="Close navigation" onClick={() => setOpen(false)} />
          <div className="relative flex h-full w-72 max-w-[85%] flex-col bg-surface shadow-pop">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <Logo />
              <button type="button" onClick={() => setOpen(false)} className="rounded p-1 text-ink-muted hover:bg-sunken" aria-label="Close navigation">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto"><Sidebar items={items} onNavigate={() => setOpen(false)} /></div>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setOpen(true)} className="rounded p-1.5 text-ink-soft hover:bg-sunken lg:hidden" aria-label="Open navigation">
              <Menu className="h-5 w-5" aria-hidden />
            </button>
            <span className="lg:hidden"><Logo compact /></span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right leading-tight">
              <p className="text-sm font-semibold text-ink">{user.fullName}</p>
              <p className="text-xs text-ink-muted">{ROLE_LABEL[user.role]}{user.specialization ? ` · ${user.specialization}` : ''}</p>
            </div>
            <button type="button" onClick={() => logout()} className="inline-flex h-9 items-center gap-2 rounded border border-line px-3 text-sm font-semibold text-ink-soft hover:bg-sunken hover:text-ink">
              <LogOut className="h-4 w-4" aria-hidden /><span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
