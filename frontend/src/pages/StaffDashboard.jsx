import { Link } from 'react-router-dom';
import { BedDouble, ClipboardPlus, LogOut, Search, UserPlus } from 'lucide-react';
import { useApi } from '../lib/useApi';
import { Card, EmptyState, ErrorState, Spinner, StatCard } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { AdmissionStatusBadge, PageHeader, PatientLink, ReadmissionFlag } from '../components/domain';
import { fmtDateTime } from '../lib/format';

const ACTIONS = [
  { to: '/patients/new', label: 'Register patient', icon: UserPlus },
  { to: '/patients', label: 'Search patient', icon: Search },
  { to: '/admissions/new', label: 'Create admission', icon: ClipboardPlus },
  { to: '/admissions?status=ADMITTED', label: 'Record discharge', icon: LogOut },
  { to: '/icu/requests/new', label: 'Request ICU bed', icon: BedDouble },
];

export default function StaffDashboard() {
  const { data: d, loading, error, reload } = useApi('/dashboard/staff');
  if (loading && !d) return <Spinner label="Loading ward activity" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const cols = (dateKey, dateLabel) => [
    { key: 'patient', header: 'Patient', render: (a) => <PatientLink id={a.patientId} code={a.patientCode} name={a.patientName} /> },
    { key: 'doctorName', header: 'Doctor', hideBelow: 'md' },
    { key: dateKey, header: dateLabel, render: (a) => fmtDateTime(a[dateKey]), hideBelow: 'sm' },
    { key: 'status', header: 'Status', render: (a) => <div className="flex flex-wrap gap-1"><AdmissionStatusBadge status={a.status} /><ReadmissionFlag admission={a} compact /></div> },
    { key: 'go', header: <span className="sr-only">Open</span>, render: (a) => <Link to={`/admissions/${a.id}`} className="text-sm font-semibold text-brand-700 hover:underline">Open</Link> },
  ];

  return (
    <>
      <PageHeader title="Ward desk" description="Today's admissions and discharges, ICU requests and bed availability." />
      <nav aria-label="Quick actions" className="mb-6 flex flex-wrap gap-2">
        {ACTIONS.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className="inline-flex h-10 items-center gap-2 rounded border border-line bg-surface px-4 text-sm font-semibold text-ink hover:border-brand-600 hover:text-brand-700">
            <Icon className="h-4 w-4 text-brand-600" aria-hidden />{label}
          </Link>
        ))}
      </nav>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total patients" value={d.totalPatients} />
        <StatCard label="Active admissions" value={d.activeAdmissions} tone="brand" />
        <StatCard label="Today's admissions" value={d.todaysAdmissions} />
        <StatCard label="Today's discharges" value={d.todaysDischarges} />
        <StatCard label="Pending ICU requests" value={d.pendingIcuRequests} tone={d.pendingIcuRequests ? 'warn' : undefined} />
        <StatCard label="Available ICU beds" value={d.availableIcuBeds} tone={d.availableIcuBeds ? 'ok' : 'bad'} />
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Card title="Admitted today" bodyClassName="p-0">
          <DataTable caption="Admitted today" rows={d.todaysAdmissionList} columns={cols('admittedAt', 'Admitted')}
            empty={<EmptyState title="No admissions recorded today" action={<Link to="/admissions/new" className="text-sm font-semibold text-brand-700 hover:underline">Create an admission</Link>} />} />
        </Card>
        <Card title="Discharged today" bodyClassName="p-0">
          <DataTable caption="Discharged today" rows={d.todaysDischargeList} columns={cols('dischargedAt', 'Discharged')}
            empty={<EmptyState title="No discharges recorded today" />} />
        </Card>
      </div>
    </>
  );
}
