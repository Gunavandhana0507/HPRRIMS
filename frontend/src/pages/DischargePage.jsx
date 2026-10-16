import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { LogOut, Save } from 'lucide-react';
import { api, errorMessage, fieldErrors } from '../lib/api';
import { useApi } from '../lib/useApi';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import { Alert, Button, Card, ErrorState, Input, Spinner, Textarea } from '../components/ui';
import { PageHeader } from '../components/domain';
import { PredictionPanel } from './AdmissionDetail';
import { fmtDateTime, toLocalInput } from '../lib/format';

export default function DischargePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { hasRole } = useAuth();
  const { data: a, loading, error, reload } = useApi(`/admissions/${id}`);
  const [form, setForm] = useState({ dischargedAt: toLocalInput(), dischargeSummary: '', followUpNotes: '', reason: '' });
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState(null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  const editing = a && a.status === 'DISCHARGED';
  useEffect(() => {
    if (editing) {
      setForm({ dischargedAt: a.dischargedAt.slice(0, 16), dischargeSummary: a.dischargeSummary || '', followUpNotes: a.followUpNotes || '', reason: '' });
    }
  }, [editing, a]);

  if (loading && !a) return <Spinner label="Loading admission" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const staffWindowOpen = a.staffEditableUntil && new Date(a.staffEditableUntil) > new Date();
  const isAdmin = hasRole('ADMIN');
  const needsReason = editing && isAdmin;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const v = {};
    if (!form.dischargedAt) v.dischargedAt = 'Discharge date and time is required';
    else if (new Date(form.dischargedAt) < new Date(a.admittedAt)) v.dischargedAt = `Must be after the admission time (${fmtDateTime(a.admittedAt)})`;
    else if (new Date(form.dischargedAt) > new Date(Date.now() + 5 * 60000)) v.dischargedAt = 'Discharge time cannot be in the future';
    if (!form.dischargeSummary.trim()) v.dischargeSummary = 'Discharge summary is required';
    if (needsReason && !form.reason.trim()) v.reason = 'Admin corrections require a reason for the audit log';
    setErrors(v);
    setFailure(null);
    if (Object.keys(v).length) return;
    setSaving(true);
    const body = { dischargedAt: `${form.dischargedAt}:00`, dischargeSummary: form.dischargeSummary.trim(), followUpNotes: form.followUpNotes.trim() || null };
    try {
      if (editing) {
        await api.put(`/admissions/${id}/discharge`, { ...body, reason: form.reason.trim() || null });
        toast.success('Discharge details updated.');
        navigate(`/admissions/${id}`);
      } else {
        const res = await api.post(`/admissions/${id}/discharge`, body);
        setResult(res.data);
        toast.success('Patient discharged.');
      }
    } catch (err) {
      setErrors(fieldErrors(err));
      setFailure(errorMessage(err, 'The discharge could not be saved.'));
    } finally {
      setSaving(false);
    }
  };

  if (result) {
    const outcome = result.prediction;
    return (
      <>
        <PageHeader title={`${result.admission.patientName} discharged`} breadcrumbs={[{ label: 'Admissions', to: '/admissions' }, { label: `#${id}`, to: `/admissions/${id}` }, { label: 'Discharge' }]} />
        <div className="grid gap-4 xl:grid-cols-2">
          <Card title="Discharge recorded">
            <p className="text-sm">Discharged {fmtDateTime(result.admission.dischargedAt)}. Staff can edit these details until {fmtDateTime(result.admission.staffEditableUntil)}.</p>
            {outcome?.status === 'UNAVAILABLE' && <div className="mt-3"><Alert tone="warn" title="Prediction temporarily unavailable">{outcome.message || 'The ML service did not respond. You can retry from the prediction panel.'}</Alert></div>}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => navigate(`/admissions/${id}`)}>Open admission</Button>
              <Button variant="secondary" onClick={() => navigate(`/patients/${result.admission.patientId}`)}>Patient profile</Button>
            </div>
          </Card>
          <PredictionPanel admission={{ ...result.admission, latestPrediction: outcome?.prediction || result.admission.latestPrediction }}
            onChange={async () => { const r = await api.get(`/admissions/${id}`); setResult((x) => ({ ...x, admission: r.data, prediction: { status: r.data.predictionStatus, prediction: r.data.latestPrediction } })); }} />
        </div>
      </>
    );
  }

  const blocked = editing && !isAdmin && !staffWindowOpen;
  return (
    <>
      <PageHeader
        title={editing ? 'Edit discharge details' : 'Record discharge'}
        description={`${a.patientName} (${a.patientCode}) · admitted ${fmtDateTime(a.admittedAt)} · ${a.doctorName}`}
        breadcrumbs={[{ label: 'Admissions', to: '/admissions' }, { label: `#${id}`, to: `/admissions/${id}` }, { label: 'Discharge' }]}
      />
      {blocked ? (
        <Alert tone="warn" title="Editing window closed">Staff can edit discharge details for {''}a limited time after discharge. This admission was discharged on {fmtDateTime(a.dischargedAt)}. Ask an administrator to make an audited correction.</Alert>
      ) : (
        <form onSubmit={submit} noValidate className="max-w-3xl">
          <Card>
            {failure && <div className="mb-4"><Alert tone="bad" title="Not saved">{failure}</Alert></div>}
            {editing && isAdmin && <div className="mb-4"><Alert tone="info">Admin correction. Your reason is stored in the audit log.</Alert></div>}
            <div className="flex flex-col gap-4">
              <Input label="Discharge date and time" required type="datetime-local" min={a.admittedAt.slice(0, 16)} max={toLocalInput()}
                value={form.dischargedAt} onChange={set('dischargedAt')} error={errors.dischargedAt} className="sm:max-w-xs" />
              <Textarea label="Discharge summary" required rows={6} value={form.dischargeSummary} onChange={set('dischargeSummary')} error={errors.dischargeSummary}
                hint="Condition at discharge, treatment given and medications on discharge." />
              <Textarea label="Follow-up notes" rows={3} value={form.followUpNotes} onChange={set('followUpNotes')} error={errors.followUpNotes} />
              {editing && <Textarea label="Reason for change" required={needsReason} rows={2} value={form.reason} onChange={set('reason')} error={errors.reason} />}
            </div>
            <div className="mt-6 flex justify-end gap-2 border-t border-line pt-5">
              <Link to={`/admissions/${id}`} className="inline-flex h-10 items-center rounded px-4 text-sm font-semibold text-ink-soft hover:bg-sunken">Cancel</Link>
              <Button type="submit" loading={saving} icon={editing ? Save : LogOut}>{editing ? 'Save changes' : 'Discharge patient'}</Button>
            </div>
          </Card>
        </form>
      )}
    </>
  );
}
