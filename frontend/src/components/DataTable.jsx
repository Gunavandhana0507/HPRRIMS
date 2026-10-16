import { ChevronLeft, ChevronRight } from 'lucide-react';
import { EmptyState, ErrorState, Spinner, cx } from './ui';

/**
 * columns: [{ key, header, render?(row), className?, hideBelow? ('sm'|'md'|'lg') }]
 */
const HIDE = { sm: 'hidden sm:table-cell', md: 'hidden md:table-cell', lg: 'hidden lg:table-cell' };

export function DataTable({ columns, rows, loading, error, onRetry, empty, rowKey = 'id', caption, onRowClick }) {
  if (loading && !rows?.length) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (!rows?.length) return empty || <EmptyState title="Nothing to show yet" />;
  return (
    <div className={cx('overflow-x-auto', loading && 'opacity-60 transition-opacity')} aria-busy={loading || undefined}>
      <table className="w-full border-collapse text-left text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-line bg-sunken/60">
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cx('whitespace-nowrap px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-muted', HIDE[c.hideBelow], c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[rowKey]} onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cx('border-b border-line last:border-0', onRowClick && 'cursor-pointer hover:bg-brand-50/50')}>
              {columns.map((c) => (
                <td key={c.key} className={cx('px-4 py-3 align-top', HIDE[c.hideBelow], c.className)}>
                  {c.render ? c.render(row) : row[c.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({ page, totalPages, totalElements, size, onPage }) {
  if (!totalElements) return null;
  const from = page * size + 1;
  const to = Math.min(totalElements, (page + 1) * size);
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-ink-muted">
      <p className="tabular">{from}–{to} of {totalElements}</p>
      <div className="flex items-center gap-1">
        <button type="button" disabled={page === 0} onClick={() => onPage(page - 1)}
          className="inline-flex h-8 items-center gap-1 rounded px-2 font-semibold text-ink-soft hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-40">
          <ChevronLeft className="h-4 w-4" aria-hidden /> Previous
        </button>
        <span className="tabular px-2">Page {page + 1} of {Math.max(totalPages, 1)}</span>
        <button type="button" disabled={page + 1 >= totalPages} onClick={() => onPage(page + 1)}
          className="inline-flex h-8 items-center gap-1 rounded px-2 font-semibold text-ink-soft hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-40">
          Next <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </nav>
  );
}
