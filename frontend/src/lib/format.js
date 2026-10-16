const dateFmt = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function parse(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const fmtDate = (v) => (parse(v) ? dateFmt.format(parse(v)) : '—');
export const fmtDateTime = (v) => (parse(v) ? dateTimeFmt.format(parse(v)) : '—');
export const fmtPct = (v, digits = 1) => (v == null ? '—' : `${Number(v).toFixed(digits)}%`);
export const fmtProb = (v) => (v == null ? '—' : `${(Number(v) * 100).toFixed(1)}%`);
export const titleCase = (s) => (s ? s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ') : '—');

/** yyyy-MM-ddTHH:mm in local time, for datetime-local inputs. */
export function toLocalInput(date = new Date()) {
  const d = new Date(date);
  d.setSeconds(0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function todayIso() {
  return toLocalInput().slice(0, 10);
}
