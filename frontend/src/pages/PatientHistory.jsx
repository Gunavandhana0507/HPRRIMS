import { Link, useParams } from 'react-router-dom';
import { useApi } from '../lib/useApi';
import { Badge, Card, EmptyState, ErrorState, Spinner, cx } from '../components/ui';
import { AdmissionStatusBadge, PageHeader, ReadmissionFlag, RiskIndicator } from '../components/domain';
import { fmtDateTime } from '../lib/format';

function RecordEntry({ r }) {
  return (
    <li className="border-l-2 border-line py-1 pl-4">
      <p className="text-xs text-ink-muted">{fmtDateTime(r.createdAt)} · {r.doctorName}{r.corrected && ' · corrected'}</p>
      {r.diagnosis && <p className="mt-1 text-sm"><span className="font-semibold">Diagnosis:</span> {r.diagnosis}</p>}
      {r.prescription && <p className="mt-1 whitespace-pre-wrap text-sm"><span className="font-semibold">Prescription:</span> {r.prescription}</p>}
      {r.treatmentNotes && <p className="mt-1 whitespace-pre-wrap text-sm text-ink-soft">{r.treatmentNotes}</p>}
    </li>
  );
}

export default function PatientHistory() {
  const { id } = useParams();
  const { data, loading, error, reload } = useApi(`/patients/${id}/history`);
  if (loading && !data) return <Spinner label="Loading admission history" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const { patient, entries, medicalRecordsVisible } = data;

  return (
    <>
      <PageHeader
        title={`Admission history · ${patient.fullName}`}
        description={`${entries.length} admission(s), oldest first.${medicalRecordsVisible ? '' : ' Medical record entries are not shown for your role.'}`}
        breadcrumbs={[{ label: 'Patients', to: '/patients' }, { label: patient.patientCode, to: `/patients/${id}` }, { label: 'History' }]}
      />
      {!entries.length && <Card><EmptyState title="This patient has no admissions yet" /></Card>}
      <ol className="flex flex-col gap-4">
        {entries.map(({ admission: a, records, predictions, current }, i) => (
          <li key={a.id}>
            <Card className={cx(current && 'border-brand-600 ring-1 ring-brand-600')}
              title={(
                <span className="flex flex-wrap items-center gap-2">
                  <span>Admission {i + 1}</span>
                  {current ? <Badge tone="brand">Current</Badge> : <Badge>Historical</Badge>}
                  <AdmissionStatusBadge status={a.status} />
                  <ReadmissionFlag admission={a} />
                </span>
              )}
              actions={<Link to={`/admissions/${a.id}`} className="text-sm font-semibold text-brand-700 hover:underline">Open admission</Link>}
            >
              <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div><dt className="text-ink-muted">Admitted</dt><dd className="mt-0.5 font-semibold">{fmtDateTime(a.admittedAt)}</dd></div>
                <div><dt className="text-ink-muted">Discharged</dt><dd className="mt-0.5 font-semibold">{fmtDateTime(a.dischargedAt)}</dd></div>
                <div><dt className="text-ink-muted">Reason</dt><dd className="mt-0.5 font-semibold">{a.reason}</dd></div>
                <div><dt className="text-ink-muted">Assigned doctor</dt><dd className="mt-0.5 font-semibold">{a.doctorName}</dd></div>
              </dl>
              {a.dischargeSummary && (
                <div className="mt-4 rounded bg-sunken/60 p-3 text-sm">
                  <p className="font-semibold">Discharge summary</p>
                  <p className="mt-1 whitespace-pre-wrap text-ink-soft">{a.dischargeSummary}</p>
                  {a.followUpNotes && <p className="mt-2 text-ink-soft"><span className="font-semibold text-ink">Follow-up:</span> {a.followUpNotes}</p>}
                </div>
              )}
              {medicalRecordsVisible && (
                <div className="mt-4">
                  <p className="text-sm font-semibold">Medical records ({records.length})</p>
                  {records.length ? <ul className="mt-2 flex flex-col gap-3">{records.map((r) => <RecordEntry key={r.id} r={r} />)}</ul>
                    : <p className="mt-1 text-sm text-ink-muted">No entries.</p>}
                </div>
              )}
              {predictions?.length > 0 && (
                <div className="mt-4 flex flex-col gap-2">
                  <p className="text-sm font-semibold">Readmission risk predictions</p>
                  {predictions.map((p) => (
                    <div key={p.id} className="flex flex-wrap items-center gap-3 text-sm">
                      <RiskIndicator probability={p.probability} level={p.riskLevel} />
                      <span className="text-ink-muted">{fmtDateTime(p.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </li>
        ))}
      </ol>
    </>
  );
}
