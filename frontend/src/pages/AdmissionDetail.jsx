import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Activity, BedDouble, FilePlus2, LogOut, Pencil, RefreshCw, UserCog } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useApi } from '../lib/useApi';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import { Alert, Button, Card, EmptyState, ErrorState, Modal, Select, Spinner } from '../components/ui';
import { AdmissionStatusBadge, IcuStatusBadge, PageHeader, PriorityBadge, ReadmissionFlag, RiskIndicator } from '../components/domain';
import { fmtDateTime } from '../lib/format';

function Lifecycle({ a }) {
  const steps = [
    { label: 'Admitted', at: a.admittedAt, by: a.createdByName, done: true },
    { label: 'Under care', at: null, by: a.doctorName, done: true },
    { label: 'Discharged', at: a.dischargedAt, by: a.dischargedByName, done: a.status === 'DISCHARGED' },
  ];
  return (
    <ol className="grid gap-3 sm:grid-cols-3" aria-label="Admission lifecycle">
      {steps.map((s, i) => (
        <li key={s.label} className={`rounded border px-3 py-2 ${s.done ? 'border-brand-600/40 bg-brand-50' : 'border-dashed border-line'}`}>
          <p className="text-xs text-ink-muted">Step {i + 1}</p>
          <p className="font-semibold">{s.label}</p>
          <p className="text-xs text-ink-soft">{s.at ? fmtDateTime(s.at) : s.done ? '' : 'Pending'}{s.by ? ` · ${s.by}` : ''}</p>
        </li>
      ))}
    </ol>
  );
}

export function PredictionPanel({ admission, onChange }) {
  const { hasRole } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const a = admission;
  const p = a.latestPrediction;
  const canRun = a.status === 'DISCHARGED' && (hasRole('STAFF', 'ADMIN') || (hasRole('DOCTOR')));
  const run = async () => {
    setBusy(true);
    try {
      const res = await api.post(`/admissions/${a.id}/predictions`, null, { params: { retry: !!p || a.predictionStatus === 'UNAVAILABLE' } });
      if (res.data.status === 'AVAILABLE') toast.success('Readmission risk prediction saved.');
      else toast.error(res.data.message || 'The prediction service is unavailable.');
      onChange();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card title="Readmission risk (advisory)" actions={canRun && (
      <Button size="sm" variant="secondary" icon={p ? RefreshCw : Activity} loading={busy} onClick={run}>
        {a.predictionStatus === 'UNAVAILABLE' ? 'Retry prediction' : p ? 'Run again' : 'Request prediction'}
      </Button>
    )}>
      {a.status !== 'DISCHARGED' && !p && <p className="text-sm text-ink-muted">A prediction is generated automatically when the patient is discharged.</p>}
      {a.predictionStatus === 'UNAVAILABLE' && (
        <Alert tone="warn" title="Prediction temporarily unavailable">The machine learning service could not be reached. The discharge was saved. Use Retry prediction once the service is running.</Alert>
      )}
      {p && (
        <div className="mt-2 flex flex-col gap-3">
          <RiskIndicator probability={p.probability} level={p.riskLevel} />
          <p className="text-xs text-ink-muted">Saved {fmtDateTime(p.createdAt)} · {p.modelVersion}{p.requestedByName ? ` · requested by ${p.requestedByName}` : ''}</p>
          {p.topFactors?.length > 0 && (
            <div>
              <p className="text-sm font-semibold">Largest contributing factors</p>
              <ul className="mt-1 text-sm text-ink-soft">
                {p.topFactors.map((f) => (
                  <li key={f.feature} className="flex justify-between gap-4 border-b border-line py-1 last:border-0">
                    <span>{f.label} <span className="text-ink-muted">({f.value})</span></span>
                    <span className={`tabular font-semibold ${f.contribution > 0 ? 'text-bad-700' : 'text-ok-700'}`}>{f.contribution > 0 ? 'raises' : 'lowers'} risk</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-ink-muted">Trained on synthetic data. Use alongside clinical judgement only.</p>
        </div>
      )}
    </Card>
  );
}

export default function AdmissionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const toast = useToast();
  const { data: a, loading, error, reload } = useApi(`/admissions/${id}`);
  const doctors = useApi(hasRole('STAFF', 'ADMIN') ? '/users/doctors' : null);
  const [reassign, setReassign] = useState(null);
  const [saving, setSaving] = useState(false);

  if (loading && !a) return <Spinner label="Loading admission" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const active = a.status === 'ADMITTED';
  const editable = !active && a.staffEditableUntil && new Date(a.staffEditableUntil) > new Date();

  const doReassign = async () => {
    setSaving(true);
    try {
      await api.patch(`/admissions/${id}/doctor`, { doctorId: Number(reassign) });
      toast.success('Doctor reassigned.');
      setReassign(null);
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title={`Admission · ${a.patientName}`}
        breadcrumbs={[{ label: 'Admissions', to: '/admissions' }, { label: `#${a.id}` }]}
        actions={(
          <>
            {hasRole('DOCTOR', 'ADMIN') && <Button variant="secondary" icon={FilePlus2} onClick={() => navigate(`/admissions/${id}/records`)}>Medical records</Button>}
            {hasRole('STAFF') && active && <Button variant="secondary" icon={BedDouble} onClick={() => navigate(`/icu/requests/new?admissionId=${id}`)}>Request ICU</Button>}
            {hasRole('STAFF', 'ADMIN') && active && <Button variant="secondary" icon={UserCog} onClick={() => setReassign(String(a.doctorId))}>Reassign doctor</Button>}
            {hasRole('STAFF') && active && <Button icon={LogOut} onClick={() => navigate(`/admissions/${id}/discharge`)}>Record discharge</Button>}
            {((hasRole('STAFF') && editable) || (hasRole('ADMIN') && !active)) && (
              <Button variant="secondary" icon={Pencil} onClick={() => navigate(`/admissions/${id}/discharge`)}>Edit discharge</Button>
            )}
          </>
        )}
      />
      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <AdmissionStatusBadge status={a.status} /><ReadmissionFlag admission={a} />
          <Link to={`/patients/${a.patientId}`} className="ml-auto text-sm font-semibold text-brand-700 hover:underline">{a.patientCode} · patient profile</Link>
        </div>
        <Lifecycle a={a} />
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="text-ink-muted">Reason</dt><dd className="mt-0.5 font-semibold">{a.reason}</dd></div>
          <div><dt className="text-ink-muted">Doctor</dt><dd className="mt-0.5 font-semibold">{a.doctorName}{a.doctorId === user.id && ' (you)'}</dd></div>
          <div><dt className="text-ink-muted">Ward</dt><dd className="mt-0.5 font-semibold">{a.ward || '—'}</dd></div>
          <div><dt className="text-ink-muted">Length of stay</dt><dd className="mt-0.5 font-semibold">{a.lengthOfStayDays != null ? `${a.lengthOfStayDays} days` : '—'}</dd></div>
          <div className="sm:col-span-2 lg:col-span-4"><dt className="text-ink-muted">Readmission check</dt><dd className="mt-0.5">
            {a.previousAdmissionId
              ? `Previous discharge ${a.daysSincePreviousDischarge} day(s) before this admission; window ${a.readmissionWindowDays} days.`
              : 'No previous discharge on record.'}
          </dd></div>
        </dl>
        {!active && (
          <div className="mt-5 rounded bg-sunken/60 p-4 text-sm">
            <p className="font-semibold">Discharge summary</p>
            <p className="mt-1 whitespace-pre-wrap text-ink-soft">{a.dischargeSummary}</p>
            {a.followUpNotes && <p className="mt-2"><span className="font-semibold">Follow-up:</span> {a.followUpNotes}</p>}
            <p className="mt-2 text-xs text-ink-muted">Recorded {fmtDateTime(a.dischargeRecordedAt)} by {a.dischargedByName}. {editable ? `Staff can edit until ${fmtDateTime(a.staffEditableUntil)}.` : 'Staff edit window has closed; admin corrections are audited.'}</p>
          </div>
        )}
      </Card>
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <PredictionPanel admission={a} onChange={reload} />
        <Card title="ICU requests" bodyClassName={a.icuRequests?.length ? 'p-0' : undefined}>
          {!a.icuRequests?.length ? <EmptyState title="No ICU requests for this admission" /> : (
            <ul className="divide-y divide-line">
              {a.icuRequests.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                  <span>{fmtDateTime(r.createdAt)}</span>
                  <span className="flex items-center gap-2"><PriorityBadge level={r.priorityLevel} status={r.scoringStatus} /><IcuStatusBadge status={r.status} />{r.bedNumber && <span className="font-mono text-xs">{r.bedNumber}</span>}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <Modal open={reassign != null} onClose={() => setReassign(null)} title="Reassign doctor"
        footer={<><Button variant="secondary" onClick={() => setReassign(null)}>Cancel</Button><Button loading={saving} onClick={doReassign} disabled={!reassign}>Save</Button></>}>
        <Select label="Doctor" value={reassign || ''} onChange={(e) => setReassign(e.target.value)}>
          {doctors.data?.map((d) => <option key={d.id} value={d.id}>{d.fullName}{d.specialization ? ` · ${d.specialization}` : ''}</option>)}
        </Select>
      </Modal>
    </>
  );
}
