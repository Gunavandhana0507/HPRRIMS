import { Link, useNavigate, useParams } from 'react-router-dom';
import { BedDouble, ClipboardPlus, FilePlus2, History, LogOut, Pencil } from 'lucide-react';
import { useApi } from '../lib/useApi';
import { useAuth } from '../auth/AuthContext';
import { Button, Card, EmptyState, ErrorState, Spinner } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { AdmissionStatusBadge, IcuStatusBadge, PageHeader, PatientCard, PriorityBadge, ReadmissionFlag, RiskIndicator } from '../components/domain';
import { fmtDateTime } from '../lib/format';

export default function PatientProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const { data, loading, error, reload, status } = useApi(`/patients/${id}`);
  if (loading && !data) return <Spinner label="Loading patient profile" />;
  if (error) return <ErrorState message={status === 404 ? 'This patient does not exist.' : error} onRetry={status === 404 ? undefined : reload} />;

  const { patient, activeAdmission: active, previousAdmissions, predictions, icuRequests, readmissionCount } = data;
  const isStaff = hasRole('STAFF');

  return (
    <>
      <PageHeader
        title="Patient profile"
        breadcrumbs={[{ label: 'Patients', to: '/patients' }, { label: patient.patientCode }]}
        actions={(
          <>
            <Button variant="secondary" icon={History} onClick={() => navigate(`/patients/${id}/history`)}>View history</Button>
            {hasRole('STAFF', 'ADMIN') && <Button variant="secondary" icon={Pencil} onClick={() => navigate(`/patients/${id}/edit`)}>Correct details</Button>}
            {isStaff && !active && <Button icon={ClipboardPlus} onClick={() => navigate(`/admissions/new?patientId=${id}`)}>Create admission</Button>}
          </>
        )}
      />
      <PatientCard patient={patient} showContact={!!patient.contactNumber} />

      <Card title="Current admission" className="mt-6"
        actions={active && (
          <>
            {hasRole('DOCTOR') && <Button size="sm" icon={FilePlus2} onClick={() => navigate(`/admissions/${active.id}/records`)}>Add medical record</Button>}
            {isStaff && <Button size="sm" variant="secondary" icon={BedDouble} onClick={() => navigate(`/icu/requests/new?admissionId=${active.id}`)}>Request ICU</Button>}
            {isStaff && <Button size="sm" icon={LogOut} onClick={() => navigate(`/admissions/${active.id}/discharge`)}>Record discharge</Button>}
          </>
        )}>
        {active ? (
          <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div><dt className="text-ink-muted">Admitted</dt><dd className="mt-0.5 font-semibold">{fmtDateTime(active.admittedAt)}</dd></div>
            <div><dt className="text-ink-muted">Reason</dt><dd className="mt-0.5 font-semibold">{active.reason}</dd></div>
            <div><dt className="text-ink-muted">Doctor</dt><dd className="mt-0.5 font-semibold">{active.doctorName}</dd></div>
            <div><dt className="text-ink-muted">Readmission</dt><dd className="mt-0.5"><ReadmissionFlag admission={active} /></dd></div>
            <div className="sm:col-span-2 lg:col-span-4">
              <Link to={`/admissions/${active.id}`} className="text-sm font-semibold text-brand-700 hover:underline">Open admission details</Link>
            </div>
          </dl>
        ) : <EmptyState title="Not currently admitted">{readmissionCount ? `${readmissionCount} past admission(s) were flagged as readmissions.` : undefined}</EmptyState>}
      </Card>

      <Card title={`Previous admissions (${previousAdmissions.length})`} className="mt-6" bodyClassName="p-0">
        <DataTable
          caption="Previous admissions" rows={previousAdmissions}
          empty={<EmptyState title="No previous admissions" />}
          columns={[
            { key: 'admittedAt', header: 'Admitted', render: (a) => fmtDateTime(a.admittedAt) },
            { key: 'dischargedAt', header: 'Discharged', render: (a) => fmtDateTime(a.dischargedAt), hideBelow: 'sm' },
            { key: 'reason', header: 'Reason', hideBelow: 'md' },
            { key: 'summary', header: 'Discharge summary', hideBelow: 'lg', render: (a) => <span className="line-clamp-2 text-ink-soft">{a.dischargeSummary || '—'}</span> },
            { key: 'flag', header: 'Status', render: (a) => <div className="flex flex-wrap gap-1"><AdmissionStatusBadge status={a.status} /><ReadmissionFlag admission={a} compact /></div> },
            { key: 'go', header: <span className="sr-only">Open</span>, render: (a) => <Link className="text-sm font-semibold text-brand-700 hover:underline" to={`/admissions/${a.id}`}>Open</Link> },
          ]}
        />
      </Card>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Card title="Saved readmission risk predictions" bodyClassName="p-0">
          {predictions == null
            ? <EmptyState title="Not available for your role" />
            : (
              <DataTable caption="Predictions" rows={predictions}
                empty={<EmptyState title="No predictions saved">A prediction is requested automatically at discharge.</EmptyState>}
                columns={[
                  { key: 'risk', header: 'Risk', render: (p) => <RiskIndicator probability={p.probability} level={p.riskLevel} /> },
                  { key: 'createdAt', header: 'Saved', render: (p) => fmtDateTime(p.createdAt), hideBelow: 'sm' },
                ]} />
            )}
        </Card>
        <Card title="ICU requests" bodyClassName="p-0">
          <DataTable caption="ICU requests" rows={icuRequests}
            empty={<EmptyState title="No ICU requests" />}
            columns={[
              { key: 'createdAt', header: 'Requested', render: (r) => fmtDateTime(r.createdAt) },
              { key: 'priority', header: 'Advisory priority', render: (r) => <PriorityBadge level={r.priorityLevel} status={r.scoringStatus} /> },
              { key: 'status', header: 'Status', render: (r) => <span className="flex flex-wrap items-center gap-1"><IcuStatusBadge status={r.status} />{r.bedNumber && <span className="font-mono text-xs">{r.bedNumber}</span>}</span> },
            ]} />
        </Card>
      </div>
    </>
  );
}
