import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ClipboardPlus } from 'lucide-react';
import { api, errorMessage, fieldErrors } from '../lib/api';
import { useApi, useDebounced } from '../lib/useApi';
import { useToast } from '../components/Toast';
import { Alert, Button, Card, Input, SearchBar, Select, Spinner, Textarea } from '../components/ui';
import { PageHeader, ReadmissionFlag } from '../components/domain';
import { toLocalInput } from '../lib/format';

function PatientPicker({ value, onChange, error }) {
  const [q, setQ] = useState('');
  const dq = useDebounced(q.trim());
  const { data, loading } = useApi(dq.length >= 2 ? '/patients' : null, { q: dq, size: 8 });
  if (value) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-line bg-sunken/50 px-3 py-2">
        <div>
          <p className="font-semibold">{value.fullName}</p>
          <p className="font-mono text-xs text-ink-muted">{value.patientCode} · {value.age} y</p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => onChange(null)}>Change</Button>
      </div>
    );
  }
  return (
    <div>
      <SearchBar label="Find patient" value={q} onChange={setQ} placeholder="Type a Patient ID or at least 2 letters of the name" />
      {error && <p role="alert" className="mt-1 text-xs font-semibold text-bad-600">{error}</p>}
      {loading && <Spinner className="py-3" label="Searching" />}
      {data && (
        <ul className="mt-2 divide-y divide-line rounded border border-line" aria-label="Matching patients">
          {data.content.length === 0 && <li className="px-3 py-2 text-sm text-ink-muted">No patients found.</li>}
          {data.content.map((p) => (
            <li key={p.id}>
              <button type="button" disabled={p.currentAdmissionStatus === 'ADMITTED'} onClick={() => onChange(p)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60">
                <span><span className="font-semibold">{p.fullName}</span> <span className="font-mono text-xs text-ink-muted">{p.patientCode}</span></span>
                <span className="text-xs text-ink-muted">{p.currentAdmissionStatus === 'ADMITTED' ? 'Already admitted' : `${p.age} y`}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AdmissionNew() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const doctors = useApi('/users/doctors');
  const [patient, setPatient] = useState(null);
  const [form, setForm] = useState({ doctorId: '', admittedAt: toLocalInput(), reason: '', ward: '' });
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState(null);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null);

  useEffect(() => {
    const pid = params.get('patientId');
    if (pid) api.get(`/patients/${pid}`).then((r) => setPatient(r.data.patient)).catch(() => {});
  }, [params]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const v = {};
    if (!patient) v.patientId = 'Select a patient';
    if (!form.doctorId) v.doctorId = 'Assign a doctor';
    if (!form.admittedAt) v.admittedAt = 'Admission date and time is required';
    else if (new Date(form.admittedAt) > new Date(Date.now() + 5 * 60000)) v.admittedAt = 'Admission time cannot be in the future';
    if (!form.reason.trim()) v.reason = 'Admission reason is required';
    setErrors(v);
    setFailure(null);
    if (Object.keys(v).length) return;
    setSaving(true);
    try {
      const res = await api.post('/admissions', {
        patientId: patient.id, doctorId: Number(form.doctorId), admittedAt: `${form.admittedAt}:00`, reason: form.reason.trim(), ward: form.ward.trim() || null,
      });
      setCreated(res.data);
      toast.success('Admission created.');
    } catch (err) {
      setErrors(fieldErrors(err));
      setFailure(errorMessage(err, 'The admission could not be created.'));
    } finally {
      setSaving(false);
    }
  };

  if (created) {
    return (
      <Card className="mx-auto max-w-xl">
        <h1 className="text-xl font-semibold">Admission created for {created.patientName}</h1>
        <p className="mt-1 text-sm text-ink-muted">Assigned to {created.doctorName}. The readmission check ran on the server.</p>
        <div className="mt-4">
          {created.readmission
            ? <Alert tone="warn" title="Readmission detected">Admitted {created.daysSincePreviousDischarge} day(s) after the previous discharge, within the {created.readmissionWindowDays}-day window. <ReadmissionFlag admission={created} compact /></Alert>
            : <Alert tone="ok" title="Not a readmission">{created.previousAdmissionId ? `Previous discharge was ${created.daysSincePreviousDischarge} day(s) earlier, outside the ${created.readmissionWindowDays}-day window.` : 'No previous discharge on record.'}</Alert>}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={() => navigate(`/admissions/${created.id}`)}>Open admission</Button>
          <Button variant="secondary" onClick={() => navigate(`/patients/${created.patientId}`)}>Patient profile</Button>
        </div>
      </Card>
    );
  }

  return (
    <>
      <PageHeader title="Create admission" description="Admits an existing patient. A patient can have only one active admission."
        breadcrumbs={[{ label: 'Admissions', to: '/admissions' }, { label: 'New' }]} />
      <form onSubmit={submit} noValidate className="max-w-3xl">
        <Card>
          {failure && <div className="mb-4"><Alert tone="bad" title="Not saved">{failure}</Alert></div>}
          <div className="flex flex-col gap-4">
            <div>
              <p className="mb-1.5 text-sm font-semibold">Patient <span className="text-bad-600" aria-hidden>*</span></p>
              <PatientPicker value={patient} onChange={setPatient} error={errors.patientId} />
              <p className="mt-1 text-xs text-ink-muted">Not registered yet? <Link to="/patients/new" className="font-semibold text-brand-700 hover:underline">Register the patient</Link> first.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Assigned doctor" required value={form.doctorId} onChange={set('doctorId')} error={errors.doctorId || doctors.error}
                disabled={doctors.loading}>
                <option value="">{doctors.loading ? 'Loading doctors…' : 'Select a doctor'}</option>
                {doctors.data?.map((d) => <option key={d.id} value={d.id}>{d.fullName}{d.specialization ? ` · ${d.specialization}` : ''}</option>)}
              </Select>
              <Input label="Admission date and time" required type="datetime-local" max={toLocalInput()} value={form.admittedAt} onChange={set('admittedAt')} error={errors.admittedAt} />
            </div>
            <Textarea label="Reason for admission" required rows={3} value={form.reason} onChange={set('reason')} error={errors.reason} />
            <Input label="Ward" value={form.ward} onChange={set('ward')} error={errors.ward} placeholder="e.g. General Ward A" />
          </div>
          <div className="mt-6 flex justify-end gap-2 border-t border-line pt-5">
            <Link to="/admissions" className="inline-flex h-10 items-center rounded px-4 text-sm font-semibold text-ink-soft hover:bg-sunken">Cancel</Link>
            <Button type="submit" loading={saving} icon={ClipboardPlus}>Create admission</Button>
          </div>
        </Card>
      </form>
    </>
  );
}
