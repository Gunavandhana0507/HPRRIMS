import { Link } from 'react-router-dom';
import { Repeat } from 'lucide-react';
import { Badge, cx } from './ui';
import { fmtDate, fmtProb, titleCase } from '../lib/format';

export function AdmissionStatusBadge({ status }) {
  if (!status) return <Badge>Not admitted</Badge>;
  return status === 'ADMITTED' ? <Badge tone="brand">Admitted</Badge> : <Badge tone="neutral">Discharged</Badge>;
}

export function ReadmissionFlag({ admission, compact = false }) {
  if (!admission?.readmission) return compact ? null : <span className="text-sm text-ink-muted">No</span>;
  return (
    <Badge tone="warn" className="whitespace-nowrap">
      <Repeat className="h-3 w-3" aria-hidden />
      Readmission{!compact && admission.daysSincePreviousDischarge != null && ` · ${admission.daysSincePreviousDischarge}d after discharge`}
    </Badge>
  );
}

const RISK_TONE = { LOW: 'ok', MEDIUM: 'warn', HIGH: 'bad' };
const RISK_BAR = { LOW: 'bg-ok-600', MEDIUM: 'bg-warn-600', HIGH: 'bg-bad-600' };

export function RiskBadge({ level }) {
  if (!level) return <Badge>Not scored</Badge>;
  return <Badge tone={RISK_TONE[level]}>{titleCase(level)} risk</Badge>;
}

export function RiskIndicator({ probability, level, className }) {
  const pct = Math.round((probability ?? 0) * 100);
  return (
    <div className={cx('flex items-center gap-3', className)}>
      <div
        className="h-2 w-28 overflow-hidden rounded-full bg-sunken" role="meter" aria-valuemin={0} aria-valuemax={100}
        aria-valuenow={pct} aria-label="Readmission probability"
      >
        <div className={cx('h-full rounded-full', RISK_BAR[level] || 'bg-ink-muted')} style={{ width: `${pct}%` }} />
      </div>
      <span className="tabular text-sm font-semibold text-ink">{fmtProb(probability)}</span>
      <RiskBadge level={level} />
    </div>
  );
}

const PRIORITY_TONE = { CRITICAL: 'bad', HIGH: 'bad', MEDIUM: 'warn', LOW: 'ok' };
export function PriorityBadge({ level, status }) {
  if (status === 'UNAVAILABLE') return <Badge tone="warn">Score unavailable</Badge>;
  if (!level) return <Badge>Not scored</Badge>;
  return <Badge tone={PRIORITY_TONE[level] || 'neutral'}>{titleCase(level)}</Badge>;
}

const ICU_STATUS_TONE = { PENDING: 'warn', ALLOCATED: 'brand', REJECTED: 'bad', CANCELLED: 'neutral', RELEASED: 'neutral' };
export function IcuStatusBadge({ status }) {
  return <Badge tone={ICU_STATUS_TONE[status] || 'neutral'}>{titleCase(status)}</Badge>;
}

const BED_TONE = { AVAILABLE: 'ok', OCCUPIED: 'brand', MAINTENANCE: 'neutral' };
export function BedStatusBadge({ status }) {
  return <Badge tone={BED_TONE[status] || 'neutral'}>{titleCase(status)}</Badge>;
}

export function PatientLink({ id, code, name }) {
  return (
    <Link to={`/patients/${id}`} className="group block">
      <span className="font-semibold text-ink group-hover:text-brand-700 group-hover:underline">{name}</span>
      <span className="block font-mono text-xs text-ink-muted">{code}</span>
    </Link>
  );
}

export function PatientCard({ patient, showContact }) {
  const rows = [
    ['Date of birth', `${fmtDate(patient.dateOfBirth)} (${patient.age} y)`],
    ['Gender', titleCase(patient.gender)],
    ...(showContact ? [
      ['Contact', patient.contactNumber],
      ['Email', patient.email || '—'],
      ['Address', patient.address || '—'],
      ['Emergency contact', patient.emergencyContactName ? `${patient.emergencyContactName} · ${patient.emergencyContactNumber || 'no number'}` : '—'],
    ] : []),
    ['Registered', `${fmtDate(patient.registeredAt)}${patient.registeredBy ? ` by ${patient.registeredBy}` : ''}`],
  ];
  return (
    <div className="rounded-lg border border-line bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm text-brand-700">{patient.patientCode}</p>
          <h1 className="mt-0.5 text-2xl font-semibold">{patient.fullName}</h1>
        </div>
        <AdmissionStatusBadge status={patient.currentAdmissionStatus} />
      </div>
      <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-ink-muted">{k}</dt>
            <dd className="mt-0.5 font-semibold text-ink">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function PageHeader({ title, description, actions, breadcrumbs }) {
  return (
    <div className="mb-6">
      {breadcrumbs && (
        <nav aria-label="Breadcrumb" className="mb-2">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-ink-muted">
            {breadcrumbs.map((b, i) => (
              <li key={b.label} className="flex items-center gap-1.5">
                {i > 0 && <span aria-hidden>/</span>}
                {b.to ? <Link to={b.to} className="hover:text-ink hover:underline">{b.label}</Link> : <span aria-current="page" className="text-ink-soft">{b.label}</span>}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-sm text-ink-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}
