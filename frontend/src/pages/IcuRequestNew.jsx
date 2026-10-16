import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { BedDouble } from 'lucide-react';
import { api, errorMessage, fieldErrors } from '../lib/api';
import { useApi } from '../lib/useApi';
import { useToast } from '../components/Toast';
import { Alert, Button, Card, Input, Select, Textarea } from '../components/ui';
import { PageHeader, PriorityBadge } from '../components/domain';
import { fmtProb } from '../lib/format';

const FIELDS = [
  ['heartRate', 'Heart rate (bpm)', 20, 250, 1],
  ['systolicBp', 'Systolic BP (mmHg)', 40, 260, 1],
  ['respiratoryRate', 'Respiratory rate (/min)', 4, 60, 1],
  ['spo2', 'SpO2 (%)', 50, 100, 1],
  ['temperature', 'Temperature (°C)', 30, 43, 0.1],
  ['gcs', 'Glasgow Coma Scale', 3, 15, 1],
  ['comorbidityCount', 'Comorbidities (count)', 0, 20, 1],
];

export default function IcuRequestNew() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const active = useApi('/admissions', { status: 'ADMITTED', size: 100 });
  const [form, setForm] = useState({ admissionId: params.get('admissionId') || '', requiresVentilation: 'false', clinicalNotes: '',
    ...Object.fromEntries(FIELDS.map(([k]) => [k, ''])) });
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState(null);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const v = {};
    if (!form.admissionId) v.admissionId = 'Select an active admission';
    FIELDS.forEach(([k, label, min, max]) => {
      const n = Number(form[k]);
      if (form[k] === '') v[k] = 'Required';
      else if (Number.isNaN(n) || n < min || n > max) v[k] = `${label.split(' (')[0]} must be ${min}-${max}`;
    });
    setErrors(v);
    setFailure(null);
    if (Object.keys(v).length) return;
    setSaving(true);
    try {
      const body = { ...Object.fromEntries(FIELDS.map(([k]) => [k, Number(form[k])])), admissionId: Number(form.admissionId),
        requiresVentilation: form.requiresVentilation === 'true', clinicalNotes: form.clinicalNotes.trim() || null };
      const res = await api.post('/icu/requests', body);
      setCreated(res.data);
      toast.success('ICU request submitted.');
    } catch (err) {
      setErrors(fieldErrors(err));
      setFailure(errorMessage(err, 'The ICU request could not be submitted.'));
    } finally {
      setSaving(false);
    }
  };

  if (created) {
    return (
      <Card className="mx-auto max-w-xl">
        <h1 className="text-xl font-semibold">ICU request submitted for {created.patientName}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          Advisory priority: <PriorityBadge level={created.priorityLevel} status={created.scoringStatus} />
          {created.priorityScore != null && <span className="tabular text-ink-muted">score {fmtProb(created.priorityScore)}</span>}
        </div>
        {created.scoringStatus === 'UNAVAILABLE' && <div className="mt-3"><Alert tone="warn">The scoring service was unavailable. The request was saved and can be rescored from the ICU page.</Alert></div>}
        <p className="mt-3 text-sm text-ink-muted">An administrator reviews pending requests and allocates beds.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={() => navigate('/icu')}>Go to ICU page</Button>
          <Button variant="secondary" onClick={() => navigate(`/admissions/${created.admissionId}`)}>Open admission</Button>
        </div>
      </Card>
    );
  }

  return (
    <>
      <PageHeader title="Request ICU bed" description="Enter current clinical indicators. The server calculates an advisory priority score."
        breadcrumbs={[{ label: 'ICU', to: '/icu' }, { label: 'New request' }]} />
      <form onSubmit={submit} noValidate className="max-w-3xl">
        <Card>
          {failure && <div className="mb-4"><Alert tone="bad" title="Not submitted">{failure}</Alert></div>}
          <Select label="Active admission" required value={form.admissionId} onChange={set('admissionId')} error={errors.admissionId || active.error} disabled={active.loading}>
            <option value="">{active.loading ? 'Loading admissions…' : 'Select a patient'}</option>
            {active.data?.content.map((a) => <option key={a.id} value={a.id}>{a.patientName} · {a.patientCode} · {a.doctorName}</option>)}
          </Select>
          <fieldset className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <legend className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">Clinical indicators</legend>
            {FIELDS.map(([k, label, min, max, step]) => (
              <Input key={k} label={label} required type="number" inputMode="decimal" min={min} max={max} step={step} value={form[k]} onChange={set(k)} error={errors[k]} />
            ))}
            <Select label="Ventilation required" required value={form.requiresVentilation} onChange={set('requiresVentilation')}>
              <option value="false">No</option><option value="true">Yes</option>
            </Select>
          </fieldset>
          <Textarea label="Clinical notes" rows={3} className="mt-4" value={form.clinicalNotes} onChange={set('clinicalNotes')} error={errors.clinicalNotes} />
          <div className="mt-6 flex justify-end gap-2 border-t border-line pt-5">
            <Link to="/icu" className="inline-flex h-10 items-center rounded px-4 text-sm font-semibold text-ink-soft hover:bg-sunken">Cancel</Link>
            <Button type="submit" loading={saving} icon={BedDouble}>Submit request</Button>
          </div>
        </Card>
      </form>
    </>
  );
}
